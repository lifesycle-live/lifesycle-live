import { env, isConfigured } from "../env.js";
import { IngestInfo, PlatformAdapter, PlatformNotConfiguredError, RawComment } from "./types.js";

/** Real implementation, pending credentials — see facebook.ts for the pattern. */
export class ZoomAdapter implements PlatformAdapter {
  readonly platform = "zoom" as const;
  // Zoom's in-meeting chat isn't exposed as a live poll/webhook feed the way
  // Facebook/YouTube comments are — realistically only available after the
  // fact (meeting chat history / recording transcript), so it lands as
  // "delayed" rather than "live".
  readonly commentFreshness = "delayed" as const;

  get configured(): boolean {
    return isConfigured(env.zoom.accountId, env.zoom.clientId, env.zoom.clientSecret);
  }

  async publish(_broadcastId: string): Promise<IngestInfo> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    // TODO: create a Zoom meeting/webinar via Server-to-Server OAuth, enable
    // "Allow live streaming" RTMP config, return the meeting's RTMP target.
    throw new Error("Zoom RTMP relay integration not implemented yet.");
  }

  async end(_broadcastId: string): Promise<void> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    throw new Error("Zoom RTMP relay integration not implemented yet.");
  }

  async fetchComments(_broadcastId: string, _ingest: IngestInfo, _since: Date | null): Promise<RawComment[]> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    // TODO: pull in-meeting chat via the Zoom meeting/webinar chat API once
    // Zoom exposes it for this meeting, map to RawComment[].
    throw new Error("Zoom chat retrieval not implemented yet.");
  }
}
