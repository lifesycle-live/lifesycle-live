# Browser camera to YouTube

The web live dashboard captures one camera + microphone MediaStream. A muted
video element previews that same stream. MediaRecorder emits ordered WebM
(VP8/Opus or VP9/Opus) chunks every 500 ms. Authenticated POSTs upload them in
sequence to `/broadcasts/:id/video/chunk`. FFmpeg transcodes the continuous
stream to 720p H.264/AAC and publishes FLV to the stored YouTube RTMP target.
The browser cannot supply an arbitrary destination. Routes check broadcast
ownership and active status. Stream URLs and FFmpeg stderr are not logged.

Use Chrome/Edge on localhost or HTTPS. In the live dashboard press **Send camera
+ microphone to YouTube** and grant camera/microphone access. Sending is distinct
from YouTube-confirmed live status. The YouTube monitor displays the provider's
output. Rotating the phone shell or switching monitor tabs does not remount the
capture element or stop the stream. The overlay is presenter-only, not burned
into outgoing video.

The server installs `ffmpeg-static`; `FFMPEG_PATH` can override its executable.
It must have outbound YouTube RTMP access and sufficient CPU. Start/chunk/stop
requests use the same access token as the rest of the API. Ending the broadcast
stops the encoder; closing/leaving the dashboard stops local tracks and requests
relay shutdown. A 20-second inactivity watchdog handles disconnected browsers.
Chunk queue limits stop transmission rather than accumulating unbounded delay.
There is a four-encoder per-process limit. Sessions are process-local; deployments
with multiple workers require sticky routing or a shared media service.

Validation: app/server TypeScript, Expo web export, local FFmpeg H.264/AAC encode,
and unauthenticated live route rejection. Real camera-to-YouTube playback still
requires a signed-in browser session and provider confirmation; no synthetic
footage was sent to YouTube for testing. This implementation is web-only; native
Expo camera transmission remains unimplemented.
