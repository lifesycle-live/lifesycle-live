export type PlatformId = "facebook" | "youtube" | "zoom" | "linkedin" | "instagram" | "tiktok";

export interface IngestInfo {
  rtmpUrl: string;
  streamKey: string;
}

/**
 * A single comment/question pulled from a platform, before AI classification
 * or persistence. `externalId` is whatever the platform uses to identify the
 * comment (Graph API comment id, YouTube liveChatMessage id, ...) — it's the
 * de-dup key so polling the same window twice doesn't create duplicate
 * EngagementEvent rows.
 */
export interface RawComment {
  externalId: string;
  authorName: string;
  text: string;
  postedAt: Date;
}

/**
 * How fresh comments from this platform can realistically be, given its
 * comment-retrieval mechanism (webhook vs. short poll vs. slow poll) — see
 * docs/05-api-research.md. Surfaced to the agent via EngagementEvent.freshness
 * so the UI can be honest about latency instead of implying everything is
 * instant.
 */
export type CommentFreshness = "live" | "delayed" | "pending";

/**
 * Per docs/06-system-architecture.md: every platform implements the same
 * operations regardless of how different the underlying mechanism is.
 * Adapters that require credentials not yet present in .env throw
 * PlatformNotConfiguredError rather than returning fabricated ingest info.
 */
export interface PlatformAdapter {
  readonly platform: PlatformId;
  readonly configured: boolean;
  readonly commentFreshness: CommentFreshness;
  publish(broadcastId: string): Promise<IngestInfo>;
  end(broadcastId: string): Promise<void>;
  /**
   * Pull comments posted since `since` (exclusive) for the given broadcast.
   * `ingest` is whatever publish() returned for this platform, in case the
   * implementation needs the stream/video id embedded there.
   */
  fetchComments(broadcastId: string, ingest: IngestInfo, since: Date | null): Promise<RawComment[]>;
}

export class PlatformNotConfiguredError extends Error {
  constructor(public readonly platform: PlatformId) {
    super(
      `${platform} is not configured yet. Add the required credentials to server/.env ` +
        `(see .env.example) to enable it — see docs/05-api-research.md for what each platform needs.`,
    );
    this.name = "PlatformNotConfiguredError";
  }
}
