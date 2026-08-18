import { env, isConfigured } from "../env.js";
import { IngestInfo, PlatformAdapter, PlatformNotConfiguredError, RawComment } from "./types.js";

/**
 * Real implementation, pending credentials. Once FACEBOOK_APP_ID/SECRET and
 * a page access token are in .env, replace the body of publish()/end() with
 * calls to the Graph API Live Video endpoints per docs/05-api-research.md —
 * the interface (and every caller) stays the same.
 */
export class FacebookAdapter implements PlatformAdapter {
  readonly platform = "facebook" as const;
  // Graph API delivers comments via the /{live-video-id}/comments edge
  // (short-poll) or a comment webhook subscription — either way this is
  // close to real-time once implemented.
  readonly commentFreshness = "live" as const;

  get configured(): boolean {
    return isConfigured(env.facebook.appId, env.facebook.appSecret, env.facebook.pageAccessToken);
  }

  async publish(_broadcastId: string): Promise<IngestInfo> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    // TODO: POST /{page-id}/live_videos via Graph API, return the returned
    // stream_url as rtmpUrl/streamKey split.
    throw new Error("Facebook Graph API integration not implemented yet.");
  }

  async end(_broadcastId: string): Promise<void> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    throw new Error("Facebook Graph API integration not implemented yet.");
  }

  async fetchComments(_broadcastId: string, _ingest: IngestInfo, _since: Date | null): Promise<RawComment[]> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    // TODO: GET /{live-video-id}/comments?since=... via Graph API, map each
    // comment to { externalId: comment.id, authorName: comment.from.name,
    // text: comment.message, postedAt: new Date(comment.created_time) }.
    throw new Error("Facebook Graph API integration not implemented yet.");
  }
}
