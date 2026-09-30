import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';

interface Relay { id: string; process: ChildProcessWithoutNullStreams; sequence: number; lastAt: number; error?: string; }
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
export function stopRelay(broadcastId: string) {
  const relay = relays.get(broadcastId);
  if (relay) { relay.process.kill(); relays.delete(broadcastId); }
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

export async function startRelay(broadcastId: string, target: string, platform = 'youtube') {
  if (relays.has(broadcastId)) throw new Error('A camera is already sending to this broadcast. Stop it first.');
  if (relays.size >= 4) throw new Error('Video relay capacity reached.');
  assertIngestTarget(target);
  if (typeof ffmpegPath !== 'string') throw new Error('FFmpeg is not installed on this server.');
  const { width, height } = FRAME_SIZE[platform] ?? DEFAULT_FRAME_SIZE;
  const child = spawn(process.env.FFMPEG_PATH || ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-fflags', '+genpts', '-probesize', '500k', '-analyzeduration', '1000000', '-i', 'pipe:0',
    '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    // Meta's RTMP ingest closes the connection on a Constrained
    // Baseline stream, which is what the ultrafast preset produces
    // (observed 2026-09-29: connection accepted, then
    // av_interleaved_write_frame(): End of file after a few frames).
    '-profile:v', 'high', '-level', '4.1',
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '2500k',
    '-c:a', 'aac', '-ar', '44100', '-b:a', '128k', '-f', 'flv', target,
  ], { windowsHide: true });
  const relay: Relay = { id: randomUUID(), process: child, sequence: 0, lastAt: Date.now() };
  relays.set(broadcastId, relay);
  child.stderr.on('data', () => { /* FFmpeg may print the secret stream URL: never log it. */ });
  child.stdout.resume();
  child.stdin.on('error', () => { relay.error = 'Video encoder input failed. Restart camera transmission.'; });
  child.on('exit', () => { relay.error = 'Video encoder stopped. Check the destination connection and restart transmission.'; });
  child.on('error', () => { relay.error = 'Could not launch FFmpeg.'; });
  await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', () => { stopRelay(broadcastId); reject(new Error('Could not launch FFmpeg.')); }); });
  return relay.id;
}
export async function pushRelay(broadcastId: string, id: string, sequence: number, data: Buffer) {
  const relay = relays.get(broadcastId);
  if (!relay || relay.id !== id) throw new Error('Transmission expired. Restart camera transmission.');
  if (relay.error) throw new Error(relay.error);
  if (sequence !== relay.sequence) throw new Error('Video chunks arrived out of order. Restart transmission.');
  // Opening the RTMP connection takes seconds (39s was observed on a first
  // Instagram connect), and FFmpeg does not read stdin while it does. The
  // browser keeps uploading at ~325 KB/s throughout, so a limit sized for
  // steady state rejected a stream that was merely still connecting. This
  // bounds the buffer at roughly a minute of backlog instead.
  if (relay.process.stdin.writableLength > 24 * 1024 * 1024) throw new Error('Video connection is too slow. Restart transmission.');
  relay.sequence++;
  relay.lastAt = Date.now();
  // Hand the chunk to the encoder without waiting for it to be consumed.
  // FFmpeg stops reading stdin while it opens the RTMP connection, which took
  // 39s on a first Instagram connect (measured 2026-09-29); awaiting the flush
  // stalled that upload, and since the browser uploads chunks in order the
  // whole queue backed up until the tab gave up. The writableLength guard
  // above is what bounds the buffer instead.
  relay.process.stdin.write(data, (error) => { if (error) relay.error = 'Video upload failed.'; });
}
const timer = setInterval(() => { for (const [id, relay] of relays) if (Date.now() - relay.lastAt > 20000) stopRelay(id); }, 5000);
timer.unref();
export function stopAllRelays() { for (const id of relays.keys()) stopRelay(id); }
