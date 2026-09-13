export type PlatformId = "facebook" | "youtube" | "zoom" | "linkedin" | "instagram" | "tiktok" | "x";

export interface IngestInfo {
  rtmpUrl: string;
  streamKey: string;
  /** Public URL where viewers watch the stream, when the platform has one. */
  watchUrl?: string;
  /**
   * Opaque platform-specific resource ids the adapter needs on later calls
   * (end / fetchComments) — e.g. YouTube's liveBroadcast id + liveChatId.
   * Persisted as part of `broadcast.ingest` and handed back to the adapter.
   */
  providerRef?: Record<string, string>;
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
 * Per-call context an adapter needs beyond the broadcast id. `connection` is
 * this agent's resolved PlatformConnection (accessToken + external account
 * id/name) for platforms with a per-agent OAuth flow registered in
 * `oauth/registry.ts` — undefined for platforms still on a single
 * server-wide credential in .env (youtube, until its per-agent OAuth lands —
 * see TASKS.md Day 2).
 */
export interface PublishContext {
  agentId: string;
  connection?: {
    accessToken: string;
    externalAccountId: string;
    externalAccountName: string;
  };
}

/**
 * Per docs/06-system-architecture.md: every platform implements the same
 * operations regardless of how different the underlying mechanism is.
 * Adapters that require credentials not yet present in .env throw
 * PlatformNotConfiguredError rather than returning fabricated ingest data.
 */
export interface PlatformAdapter {
  readonly platform: PlatformId;
  readonly configured: boolean;
  readonly commentFreshness: CommentFreshness;
  publish(broadcastId: string, context: PublishContext): Promise<IngestInfo>;
  /**
   * Best-effort: post the lead-capture link (`/go/:broadcastId`, see
   * routes/leadCapture.ts) into this platform's comments/chat as a
   * call-to-action, for platforms whose API allows the broadcaster to write
   * a comment/chat message during a live broadcast. Not every platform can
   * do this — Zoom/LinkedIn/Instagram/TikTok have no such API (see
   * TASKS.md "Yorumdan lead" section) — so this is optional; adapters that
   * can't support it simply don't implement it, and callers must treat a
   * missing implementation and a thrown error the same way (log, don't fail
   * the broadcast over it).
   */
  postCallToAction?(broadcastId: string, context: PublishContext, ingest: IngestInfo, url: string): Promise<void>;
  /**
   * Set only by adapters whose platform can't pin/keep a chat message
   * visible (e.g. YouTube live chat scrolls) — ingestionService re-invokes
   * `postCallToAction` on this cadence while the broadcast stays live.
   * Platforms where one post is enough (Facebook: a comment just sits
   * there) leave this unset.
   */
  readonly ctaRepeatMs?: number;
  /** `ingest` is whatever publish() returned for this platform, if the broadcast got that far. */
  end(broadcastId: string, context: PublishContext, ingest?: IngestInfo): Promise<void>;
  /**
   * Pull comments posted since `since` (exclusive) for the given broadcast.
   * `ingest` is whatever publish() returned for this platform, in case the
   * implementation needs the stream/video id embedded there.
   */
  fetchComments(broadcastId: string, context: PublishContext, ingest: IngestInfo, since: Date | null): Promise<RawComment[]>;
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
