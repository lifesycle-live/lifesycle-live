import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';

interface Relay { id: string; process: ChildProcessWithoutNullStreams; sequence: number; lastAt: number; error?: string; }
const relays = new Map<string, Relay>();
export function stopRelay(broadcastId: string) {
  const relay = relays.get(broadcastId);
  if (relay) { relay.process.kill(); relays.delete(broadcastId); }
}
export async function startRelay(broadcastId: string, target: string) {
  if (relays.has(broadcastId)) throw new Error('A camera is already sending to this broadcast. Stop it first.');
  if (relays.size >= 4) throw new Error('Video relay capacity reached.');
  const url = new URL(target);
  if (!['rtmp:', 'rtmps:'].includes(url.protocol) || !/(^|\.)rtmp\.youtube\.com$/.test(url.hostname)) throw new Error('Invalid YouTube ingest target');
  if (typeof ffmpegPath !== 'string') throw new Error('FFmpeg is not installed on this server.');
  const child = spawn(process.env.FFMPEG_PATH || ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-fflags', '+genpts', '-i', 'pipe:0',
    '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
    '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '2500k',
    '-c:a', 'aac', '-ar', '44100', '-b:a', '128k', '-f', 'flv', target,
  ], { windowsHide: true });
  const relay: Relay = { id: randomUUID(), process: child, sequence: 0, lastAt: Date.now() };
  relays.set(broadcastId, relay);
  child.stderr.on('data', () => { /* FFmpeg may print the secret stream URL: never log it. */ });
  child.stdout.resume();
  child.stdin.on('error', () => { relay.error = 'Video encoder input failed. Restart camera transmission.'; });
  child.on('exit', () => { relay.error = 'Video encoder stopped. Check YouTube connection and restart transmission.'; });
  child.on('error', () => { relay.error = 'Could not launch FFmpeg.'; });
  await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', () => { stopRelay(broadcastId); reject(new Error('Could not launch FFmpeg.')); }); });
  return relay.id;
}
export async function pushRelay(broadcastId: string, id: string, sequence: number, data: Buffer) {
  const relay = relays.get(broadcastId);
  if (!relay || relay.id !== id) throw new Error('Transmission expired. Restart camera transmission.');
  if (relay.error) throw new Error(relay.error);
  if (sequence !== relay.sequence) throw new Error('Video chunks arrived out of order. Restart transmission.');
  if (relay.process.stdin.writableLength > 4 * 1024 * 1024) throw new Error('Video connection is too slow. Restart transmission.');
  relay.sequence++;
  relay.lastAt = Date.now();
  await new Promise<void>((resolve, reject) => relay.process.stdin.write(data, error => error ? reject(new Error('Video upload failed.')) : resolve()));
}
const timer = setInterval(() => { for (const [id, relay] of relays) if (Date.now() - relay.lastAt > 20000) stopRelay(id); }, 5000);
timer.unref();
export function stopAllRelays() { for (const id of relays.keys()) stopRelay(id); }
