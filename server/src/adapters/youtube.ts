import { env, isConfigured } from "../env.js";
import { IngestInfo, PlatformAdapter, PlatformNotConfiguredError, RawComment } from "./types.js";

/** Real implementation, pending credentials — see facebook.ts for the pattern. */
export class YoutubeAdapter implements PlatformAdapter {
  readonly platform = "youtube" as const;
  // YouTube Live Chat only exposes messages via polling liveChatMessages.list
  // (it returns a pollingIntervalMillis to respect), no push/webhook option.
  readonly commentFreshness = "live" as const;

  get configured(): boolean {
    return isConfigured(env.youtube.clientId, env.youtube.clientSecret);
  }

  async publish(_broadcastId: string): Promise<IngestInfo> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    // TODO: create a liveBroadcast + liveStream via YouTube Live Streaming
    // API, bind them, return the cdn.ingestionInfo rtmp URL/stream name.
    throw new Error("YouTube Live Streaming API integration not implemented yet.");
  }

  async end(_broadcastId: string): Promise<void> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    throw new Error("YouTube Live Streaming API integration not implemented yet.");
  }

  async fetchComments(_broadcastId: string, _ingest: IngestInfo, _since: Date | null): Promise<RawComment[]> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    // TODO: liveChatMessages.list against the liveChatId bound to this
    // broadcast's liveBroadcast resource, map each item to
    // { externalId: item.id, authorName: item.authorDetails.displayName,
    // text: item.snippet.displayMessage, postedAt: new Date(item.snippet.publishedAt) }.
    throw new Error("YouTube Live Streaming API integration not implemented yet.");
  }
}
