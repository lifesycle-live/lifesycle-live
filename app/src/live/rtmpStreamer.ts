/**
 * RTMPS streaming spike notes (see docs/04-technical-feasibility.md,
 * docs/06-system-architecture.md, and the mobile plan's build sequence
 * step 3).
 *
 * Finding: Expo's managed `expo-camera` module provides camera preview and
 * photo/video capture, but has no built-in RTMP(S) publish capability —
 * confirmed against Expo SDK docs. Pushing an RTMPS stream from a bare
 * camera feed requires either:
 *   (a) a bare/config-plugin native module such as `react-native-nodemediaclient`
 *       or a custom native module wrapping HaishinKit (iOS) / rtmp-rtsp-stream-client-java
 *       (Android), or
 *   (b) ejecting from Expo Go to a development build (`expo prebuild`) so a
 *       native RTMP module can be linked — this is required regardless of
 *       which native library is chosen, since RTMP push is not available
 *       in Expo Go.
 *
 * This cannot be finished as a pure code spike — it needs verification on a
 * physical device (RTMP push does not work in iOS/Android simulators) once
 * a development build is set up. That verification is the literal next
 * step before this module can be implemented for real.
 *
 * Until then, this module defines the interface the Live Dashboard screen
 * codes against, with a mock implementation so the rest of the app is
 * buildable and demoable now. Swapping in a real native module means
 * implementing this interface — nothing above this file should need to
 * change.
 */

export interface RtmpStreamer {
  start(rtmpUrl: string, streamKey: string): Promise<void>;
  stop(): Promise<void>;
  isStreaming(): boolean;
}

class MockRtmpStreamer implements RtmpStreamer {
  private streaming = false;

  async start(_rtmpUrl: string, _streamKey: string): Promise<void> {
    this.streaming = true;
  }

  async stop(): Promise<void> {
    this.streaming = false;
  }

  isStreaming(): boolean {
    return this.streaming;
  }
}

export const rtmpStreamer: RtmpStreamer = new MockRtmpStreamer();
