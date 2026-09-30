import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';

/**
 * One encoder per destination rather than one shared output: the platforms
 * disagree on frame size (Instagram takes 9:16 only, YouTube 16:9), and a
 * single encode cannot satisfy both. Each leg is fed the same camera chunks.
 */
interface Leg {
  platform: string;
  target: string;
  bitrateKbps: number;
  process: ChildProcessWithoutNullStreams;
  /** How many times this destination has been reconnected. */
  restarts: number;
  /** True between an encoder dying and its replacement being ready. */
  restarting: boolean;
  /** When the current encoder started, so a leg that has been stable for a while gets its budget back. */
  startedAt: number;
  /** When this encoder first published a frame — everything before it is time spent opening the RTMP connection. */
  publishingAt?: number;
  /** Set once the destination is given up on; the leg then stays down. */
  error?: string;
  /** Last FFmpeg progress line ("frame=... speed=1.0x"), for the health readout. */
  progress?: string;
  /** Last FFmpeg message that was not progress, with any publish URL removed. */
  detail?: string;
}
/** How much camera time one uploaded chunk carries — the browser's MediaRecorder timeslice. */
const CHUNK_SECONDS = 0.5;

interface Relay {
  id: string;
  /** The agent who started this relay, so a chunk can be authorised in memory. */
  agentId: string;
  legs: Leg[];
  sequence: number;
  lastAt: number;
  startedAt: number;
  /**
   * The first camera chunk. MediaRecorder emits the WebM header — EBML, the
   * segment info and the track definitions — only once, at the start, so a
   * replacement encoder would see nothing but headerless clusters and refuse
   * the input. Keeping it is what makes reconnecting possible at all.
   */
  header?: Buffer;
}
const relays = new Map<string, Relay>();

/**
 * Hosts the encoder is allowed to publish to. This guard exists so a caller
 * cannot point FFmpeg at an arbitrary server, so it is widened per platform
 * rather than removed. YouTube hands out `rtmp.youtube.com`; Instagram Live
 * Producer issues a fresh `edgetee-upload-*.xx.fbcdn.net` host per broadcast;
 * Facebook Live publishes to `live-api-s.facebook.com`
 * (docs/05-api-research.md).
 */
const INGEST_HOSTS = [/(^|\.)rtmp\.youtube\.com$/, /(^|\.)fbcdn\.net$/, /^live-api-s\.facebook\.com$/];

/** Throws unless `target` is an RTMP(S) URL on a known live-ingest host. */
export function assertIngestTarget(target: string): void {
  let url: URL;
  try { url = new URL(target); } catch { throw new Error('Ingest target is not a valid URL.'); }
  if (!['rtmp:', 'rtmps:'].includes(url.protocol) || !INGEST_HOSTS.some((host) => host.test(url.hostname))) {
    throw new Error('Ingest target is not a recognised live host (YouTube, Instagram or Facebook).');
  }
}

/**
 * Output frame size per destination. Instagram Live is vertical only and
 * drops a landscape stream — the RTMP connection is accepted and then closed
 * with `av_interleaved_write_frame(): End of file` (observed 2026-09-29), so
 * this is a hard requirement rather than a preference. YouTube takes 16:9.
 */
const FRAME_SIZE: Record<string, { width: number; height: number }> = {
  instagram: { width: 720, height: 1280 },
};
const DEFAULT_FRAME_SIZE = { width: 1280, height: 720 };

/**
 * Video bitrate budget, in kbps, shared across destinations: every leg is an
 * independent upload from this machine, so the total is what the connection
 * has to carry. The budget is set well under the ~12-17 Mbps measured here
 * (2026-09-30) rather than at it, because the headroom is what absorbs a
 * jittery link — but two destinations still get the full single-stream rate,
 * since bandwidth was measured and ruled out as the cause of the drops.
 */
const TOTAL_VIDEO_BITRATE_KBPS = 5000;
const MAX_VIDEO_BITRATE_KBPS = 2500;
const MIN_VIDEO_BITRATE_KBPS = 900;

/**
 * How often one destination may be reconnected before it is given up on. A
 * dropped RTMP connection is ordinary on a home upload and both Meta ingests
 * hold the broadcast open for a while — that is the "Live video paused" the
 * viewer sees — so reconnecting recovers the stream where the old behaviour
 * ended the whole broadcast. A key that has genuinely expired fails every
 * time, and this is what stops that retrying for ever.
 */
const MAX_LEG_RESTARTS = 10;
const LEG_RESTART_DELAY_MS = 1000;
/**
 * A leg that has published this long is counted as recovered and gets its
 * reconnect budget back. Without this an hour-long broadcast would run out
 * over blips that were minutes apart, while a key that is simply wrong still
 * fails within a second or two and never earns the reset.
 */
const LEG_STABLE_MS = 60000;

/**
 * How far a destination may trail real time before its encoder is restarted.
 *
 * An RTMP ingest accepts at about real time, so lost time is never worked off:
 * measured here (2026-09-30), a 15-second gap in the camera feed left the
 * stream exactly 16 seconds behind for as long as it ran, publishing steadily
 * at 1x and never catching up. Repeat that a few times and the broadcast sits
 * 47 seconds late while the encoder, the bandwidth and the network all measure
 * healthy — which is exactly what was observed. Note the input queue stays
 * empty throughout, so backlog cannot detect this; only the published time can.
 *
 * Restarting throws the stale timeline away and resumes from live video. The
 * platform shows the brief pause it shows for any reconnect.
 */
const MAX_LEG_LAG_SECONDS = 12;

/**
 * How much camera data may pile up in a publishing encoder's input. This is
 * the opposite failure — the browser delivering faster than the ingest takes
 * it — and it is also unrecoverable, so it is handled the same way.
 */
const MAX_LEG_BACKLOG_BYTES = 3 * 1024 * 1024;

function encoderArgs(platform: string, target: string, bitrateKbps: number): string[] {
  const { width, height } = FRAME_SIZE[platform] ?? DEFAULT_FRAME_SIZE;
  return [
    // -stats keeps FFmpeg's progress line coming on stderr; it is the only
    // way to tell a starved upload (speed drops below 1x) from a rejected
    // one, and the relay used to discard stderr entirely.
    '-hide_banner', '-loglevel', 'error', '-stats', '-fflags', '+genpts', '-probesize', '500k', '-analyzeduration', '1000000', '-i', 'pipe:0',
    // No -tune zerolatency: it turns off lookahead and slice-based rate
    // control, so the encoder can only correct after it has overshot and the
    // output arrives in bursts. Meta's ingest holds a small buffer and shows
    // a burst-fed stream as "Live video paused". The cost is about a second
    // of added latency, which a property viewing does not notice.
    '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-preset', 'veryfast',
    // What zerolatency was also doing, and the only part of it Facebook needs:
    // its RTMP ingest does not accept B-frames. Dropping the tune let veryfast
    // apply its default bframes=3, and Facebook then refused every connection
    // with an I/O error while Instagram, which does accept them, kept
    // publishing from the same camera (measured 2026-09-30: 56 B-frames in
    // three seconds, 10 failed Facebook connects, Instagram live throughout).
    '-bf', '0',
    // Meta's RTMP ingest closes the connection on a Constrained
    // Baseline stream, which is what the ultrafast preset produces
    // (observed 2026-09-29: connection accepted, then
    // av_interleaved_write_frame(): End of file after a few frames).
    '-profile:v', 'high', '-level', '4.1',
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    // bufsize at twice the rate is the usual VBV window; at one second the
    // encoder had to correct on every frame it overshot.
    '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60',
    '-b:v', `${bitrateKbps}k`, '-maxrate', `${bitrateKbps}k`, '-bufsize', `${bitrateKbps * 2}k`,
    // The camera chunks arrive over HTTP and so land in bursts. Without
    // resampling to a continuous clock the audio track develops gaps, and
    // Meta's ingest treats a gapped track as a stalled stream.
    '-af', 'aresample=async=1:min_hard_comp=0.100:first_pts=0',
    '-c:a', 'aac', '-ar', '44100', '-b:a', '128k', '-f', 'flv', target,
  ];
}

function ffmpegBinary(): string {
  const binary = process.env.FFMPEG_PATH || (typeof ffmpegPath === 'string' ? ffmpegPath : '');
  if (!binary) throw new Error('FFmpeg is not installed on this server.');
  return binary;
}

/** Starts an encoder for `leg` and wires it up. Used for the first run and every reconnect. */
function spawnEncoder(broadcastId: string, leg: Leg): ChildProcessWithoutNullStreams {
  const child = spawn(ffmpegBinary(), encoderArgs(leg.platform, leg.target, leg.bitrateKbps), { windowsHide: true });
  leg.process = child;
  leg.startedAt = Date.now();
  leg.publishingAt = undefined;
  // FFmpeg prints the full publish URL — which contains the stream key —
  // when a connection fails, so nothing from stderr is ever logged. Only
  // the last line is kept, with any URL stripped, to explain a leg that
  // dropped and to expose the encoder's real-time speed.
  child.stderr.on('data', (buffer: Buffer) => {
    const line = buffer.toString().split(/[\r\n]+/).filter((part) => part.trim()).pop();
    if (!line) return;
    const safe = line.replace(/rtmps?:\/\/\S+/gi, '<destination>').trim().slice(0, 200);
    if (safe.startsWith('frame=')) { leg.progress = safe; leg.publishingAt ??= Date.now(); } else leg.detail = safe;
  });
  child.stdout.resume();
  // A leg dropping out must not take the others down, so it is reconnected on
  // its own and only gives up after MAX_LEG_RESTARTS.
  child.stdin.on('error', () => reconnectLeg(broadcastId, leg, child));
  child.on('exit', () => reconnectLeg(broadcastId, leg, child));
  child.on('error', () => { leg.error ??= `${leg.platform}: could not launch FFmpeg.`; });
  return child;
}

/**
 * Brings one destination back after its encoder died, without interrupting
 * the others. The replacement is fed the stored WebM header first so it can
 * make sense of the clusters that follow.
 */
function reconnectLeg(broadcastId: string, leg: Leg, dead: ChildProcessWithoutNullStreams): void {
  const relay = relays.get(broadcastId);
  // A stopped relay, a leg already given up on, a reconnect already under way,
  // or a stale event from an encoder that has since been replaced.
  if (!relay || !relay.legs.includes(leg) || leg.error || leg.restarting || leg.process !== dead) return;
  if (!relay.header) { leg.error = `${leg.platform}: the camera stopped before this destination connected.`; return; }
  if (Date.now() - leg.startedAt >= LEG_STABLE_MS) leg.restarts = 0;
  if (leg.restarts >= MAX_LEG_RESTARTS) {
    leg.error = `${leg.platform}: the connection kept dropping. Check that destination's stream key and start again.`;
    return;
  }
  leg.restarting = true;
  leg.restarts += 1;
  const timer = setTimeout(() => {
    const current = relays.get(broadcastId);
    if (!current || !current.legs.includes(leg) || leg.error || !current.header) return;
    const child = spawnEncoder(broadcastId, leg);
    child.stdin.write(current.header);
    leg.restarting = false;
  }, LEG_RESTART_DELAY_MS);
  timer.unref();
}

/**
 * Ends one destination without touching the others. FFmpeg cannot act on
 * SIGTERM while it is blocked opening an RTMP connection that never
 * completes, so an unreachable destination would otherwise leave the encoder
 * running for good.
 */
function killLeg(leg: Leg) {
  leg.process.kill();
  const forced = setTimeout(() => leg.process.kill('SIGKILL'), 5000);
  forced.unref();
  leg.process.once('exit', () => clearTimeout(forced));
}
export function stopRelay(broadcastId: string) {
  const relay = relays.get(broadcastId);
  if (!relay) return;
  // Dropped from the map first, so a reconnect scheduled by the encoders this
  // is about to kill finds nothing to bring back.
  relays.delete(broadcastId);
  for (const leg of relay.legs) killLeg(leg);
}

export async function startRelay(broadcastId: string, agentId: string, destinations: { platform: string; target: string }[]) {
  if (relays.has(broadcastId)) throw new Error('A camera is already sending to this broadcast. Stop it first.');
  if (!destinations.length) throw new Error('No destination selected for this camera.');
  const running = [...relays.values()].reduce((total, relay) => total + relay.legs.length, 0);
  if (running + destinations.length > 4) throw new Error('Video relay capacity reached.');
  destinations.forEach(({ target }) => assertIngestTarget(target));
  ffmpegBinary();

  const relay: Relay = { id: randomUUID(), agentId, legs: [], sequence: 0, lastAt: Date.now(), startedAt: Date.now() };
  relays.set(broadcastId, relay);
  const bitrateKbps = Math.max(MIN_VIDEO_BITRATE_KBPS, Math.min(MAX_VIDEO_BITRATE_KBPS, Math.floor(TOTAL_VIDEO_BITRATE_KBPS / destinations.length)));
  try {
    for (const { platform, target } of destinations) {
      const leg = { platform, target, bitrateKbps, restarts: 0, restarting: false, startedAt: Date.now() } as Leg;
      relay.legs.push(leg);
      const child = spawnEncoder(broadcastId, leg);
      await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', () => reject(new Error('Could not launch FFmpeg.'))); });
    }
  } catch (error) {
    stopRelay(broadcastId);
    throw error;
  }
  return relay.id;
}
export async function pushRelay(broadcastId: string, id: string, sequence: number, data: Buffer) {
  const relay = relays.get(broadcastId);
  if (!relay || relay.id !== id) throw new Error('Transmission expired. Restart camera transmission.');
  // The browser resends a chunk whose response it never got, so the one just
  // taken is acknowledged again instead of ending the transmission over a
  // blip. Anything further out of order still means the stream is broken.
  if (sequence === relay.sequence - 1) return;
  if (sequence !== relay.sequence) throw new Error('Video chunks arrived out of order. Restart transmission.');
  // Backpressure is per destination: one platform accepting data slowly must
  // not end the transmission to the others, which is what a shared check did.
  // Only a leg that has started publishing is held to the limit — until then
  // FFmpeg is opening its RTMP connection and does not read stdin at all, and
  // that buffering is expected. Once it is publishing, a backlog that keeps
  // growing is a delay that will never be recovered, so the leg is restarted
  // rather than left running permanently late.
  for (const leg of relay.legs) {
    if (leg.error || leg.restarting || !leg.publishingAt) continue;
    const lagging = (legLagSeconds(leg) ?? 0) > MAX_LEG_LAG_SECONDS;
    if (!lagging && leg.process.stdin.writableLength <= MAX_LEG_BACKLOG_BYTES) continue;
    // Killing it drops the stale timeline with the process; the exit handler
    // reconnects the leg and feeds it the stored header, and the encoder
    // starts again from whatever the camera is sending now.
    killLeg(leg);
  }
  // Only when every destination has been given up on is the transmission over.
  // A leg that is merely reconnecting still counts as alive, so a dropped
  // connection costs a few seconds of that platform rather than the broadcast.
  if (relay.legs.every((leg) => leg.error)) {
    throw new Error(relay.legs.map((leg) => `${leg.error}${leg.detail ? ` (${leg.detail})` : ''}`).join(' ') || 'Video encoder stopped.');
  }
  relay.sequence++;
  relay.lastAt = Date.now();
  if (!relay.header) relay.header = data;
  // Hand the chunk to each encoder without waiting for it to be consumed.
  // FFmpeg stops reading stdin while it opens the RTMP connection, which took
  // 39s on a first Instagram connect (measured 2026-09-29); awaiting the flush
  // stalled that upload, and since the browser uploads chunks in order the
  // whole queue backed up until the tab gave up. The writableLength guard
  // above is what bounds the buffer instead.
  for (const leg of relay.legs) {
    if (leg.error || leg.restarting) continue;
    const child = leg.process;
    child.stdin.write(data, () => { /* a failed write reaches us as the stdin 'error' event, which reconnects the leg. */ });
  }
}

/**
 * Seconds of video this encoder has published, read from FFmpeg's progress
 * line. Compared against how long it has been running it says whether the
 * encoder is keeping up with real time: a gap that stays flat is just the
 * connection latency, while one that grows means the camera feed is starving
 * and the platform will run its buffer dry and pause.
 */
function publishedSeconds(progress?: string): number | undefined {
  const match = progress?.match(/time=(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : undefined;
}

/**
 * How far behind real time this destination is, in seconds — what the viewer
 * is actually behind by, including the time the encoder spent connecting.
 * Undefined until the encoder has published anything. The dashboard and the
 * restart check read the same function so they cannot disagree.
 */
function legLagSeconds(leg: Leg): number | undefined {
  const published = publishedSeconds(leg.progress);
  if (published === undefined) return undefined;
  return Math.max(0, (Date.now() - leg.startedAt) / 1000 - published);
}

/**
 * The agent a running relay belongs to, or undefined when none is running.
 * Lets the chunk route authorise without a database round trip; the relay
 * only exists between start and stop, and ending a broadcast stops it.
 */
export function relayOwner(broadcastId: string): string | undefined {
  return relays.get(broadcastId)?.agentId;
}

/** Per-destination state, so the dashboard can say which leg dropped out. */
export function relayStatus(broadcastId: string): { sending: boolean; destinations: RelayDestinationStatus[]; cameraSeconds: number; relaySeconds: number } {
  const relay = relays.get(broadcastId);
  return {
    sending: !!relay,
    destinations: (relay?.legs ?? []).map((leg) => {
      const lag = legLagSeconds(leg);
      return {
        platform: leg.platform,
        error: leg.error,
        detail: leg.detail,
        backlogBytes: leg.process.stdin.writableLength,
        reconnects: leg.restarts,
        reconnecting: leg.restarting,
        behindSeconds: lag === undefined ? undefined : Math.round(lag * 10) / 10,
        connectSeconds: leg.publishingAt === undefined ? undefined : Math.round((leg.publishingAt - leg.startedAt) / 100) / 10,
      };
    }),
    // Seconds of camera the browser has actually handed over. Compared with
    // how long the relay has been running it separates a browser that cannot
    // upload fast enough from an encoder or ingest that cannot keep up — the
    // two produce the same symptom on the platform.
    cameraSeconds: relay ? Math.round(relay.sequence * CHUNK_SECONDS * 10) / 10 : 0,
    relaySeconds: relay ? Math.round((Date.now() - relay.startedAt) / 100) / 10 : 0,
  };
}
interface RelayDestinationStatus {
  platform: string;
  error?: string;
  detail?: string;
  backlogBytes: number;
  reconnects: number;
  reconnecting: boolean;
  /** How far the published stream trails real time, in seconds. */
  behindSeconds?: number;
  /** How long this encoder spent opening its RTMP connection before it published anything. */
  connectSeconds?: number;
}
const timer = setInterval(() => { for (const [id, relay] of relays) if (Date.now() - relay.lastAt > 20000) stopRelay(id); }, 5000);
timer.unref();
export function stopAllRelays() { for (const id of relays.keys()) stopRelay(id); }
