import { env } from "../env.js";
import { getYoutubeAccessToken, youtubeConfigured } from "../services/youtubeOAuth.js";
import { IngestInfo, PlatformAdapter, PlatformNotConfiguredError, PublishContext, RawComment } from "./types.js";

const API = "https://www.googleapis.com/youtube/v3";
// This adapter uses one project-level credential. Stop all its requests after
// quota exhaustion until Google's next Pacific calendar day (DST-aware).
const quotaDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let exhaustedDay: string | undefined;
const quotaMessage = 'YouTube API quota is exhausted for this Google Cloud project. New broadcasts cannot start until the quota resets at midnight Pacific Time or Google approves more quota. Reconnecting your YouTube account will not reset it.';
const statusRequests = new Map<string, { expiresAt: number; result: Promise<string> }>();

async function yt<T>(
  path: string,
  init: { method?: string; query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  if (exhaustedDay === quotaDay()) throw new Error(quotaMessage);
  const token = await getYoutubeAccessToken();
  const url = `${API}${path}${init.query ? `?${new URLSearchParams(init.query)}` : ""}`;
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let reasons: string[] = [];
    try {
      const payload = JSON.parse(text) as { error?: { errors?: { reason?: string }[] } };
      reasons = payload.error?.errors?.map(error => error.reason ?? '') ?? [];
    } catch { /* Keep the original diagnostic for non-JSON errors. */ }
    if (reasons.includes('quotaExceeded') || reasons.includes('dailyLimitExceeded')) {
      exhaustedDay = quotaDay();
      statusRequests.clear();
      throw new Error(quotaMessage);
    }
    throw new Error(`YouTube API ${init.method ?? "GET"} ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

/**
 * Real YouTube Live Streaming API integration.
 *
 * publish(): creates a reusable-free liveStream (RTMP ingestion target) + a
 * liveBroadcast, binds them, and turns on auto start/stop so YouTube flips
 * the broadcast to "live" by itself as soon as an encoder starts pushing to
 * the returned rtmpUrl/streamKey (OBS, a hardware encoder, or a phone RTMP
 * app — in-app camera push still needs the native module in
 * app/src/live/rtmpStreamer.ts).
 *
 * Comments come from liveChatMessages.list (poll-only; no webhook) against
 * the liveChatId captured at publish time — see docs/05-api-research.md.
 */
export class YoutubeAdapter implements PlatformAdapter {
  private readonly chatPollState = new Map<string, { nextPageToken?: string; nextAllowedAt: number }>();
  async getStatus(ingest: IngestInfo): Promise<string> {
    const id = ingest.providerRef?.broadcastId;
    if (!id) throw new Error("Missing YouTube broadcast reference");
    if (exhaustedDay === quotaDay()) throw new Error(quotaMessage);
    const cached = statusRequests.get(id);
    if (cached && cached.expiresAt > Date.now()) return cached.result;
    for (const [key, entry] of statusRequests) if (entry.expiresAt <= Date.now()) statusRequests.delete(key);
    const result = yt<{ items: { status: { lifeCycleStatus: string } }[] }>("/liveBroadcasts", { query: { part: "status", id } }).then(data => {
      if (!data.items[0]) throw new Error("YouTube broadcast unavailable");
      return data.items[0].status.lifeCycleStatus;
    });
    statusRequests.set(id, { expiresAt: Date.now() + 30000, result });
    return result;
  }
  readonly platform = "youtube" as const;
  readonly commentFreshness = "live" as const;
  // Live chat scrolls and the Data API has no "pin" endpoint — resend the
  // CTA every 5 minutes so it stays visible to new viewers.
  readonly ctaRepeatMs = 5 * 60 * 1000;

  get configured(): boolean {
    return youtubeConfigured();
  }

  // context is unused until YouTube's per-agent OAuth lands (TASKS.md Day 2)
  // — this adapter still authenticates via the single .env refresh token.
  async publish(broadcastId: string, _context: PublishContext): Promise<IngestInfo> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);

    const stream = await yt<{
      id: string;
      cdn: { ingestionInfo: { ingestionAddress: string; streamName: string } };
    }>("/liveStreams", {
      method: "POST",
      query: { part: "snippet,cdn,contentDetails" },
      body: {
        snippet: { title: `Lifesycle Live ${broadcastId}` },
        cdn: { frameRate: "variable", ingestionType: "rtmp", resolution: "variable" },
        contentDetails: { isReusable: false },
      },
    });

    const broadcast = await yt<{ id: string }>("/liveBroadcasts", {
      method: "POST",
      query: { part: "snippet,status,contentDetails" },
      body: {
        snippet: {
          title: `Property tour — ${new Date().toLocaleDateString("en-GB")}`,
          scheduledStartTime: new Date().toISOString(),
        },
        status: { privacyStatus: env.youtube.privacyStatus, selfDeclaredMadeForKids: false },
        contentDetails: {
          enableAutoStart: true,
          enableAutoStop: true,
          latencyPreference: env.youtube.latencyPreference,
        },
      },
    });

    await yt("/liveBroadcasts/bind", {
      method: "POST",
      query: { part: "id,contentDetails", id: broadcast.id, streamId: stream.id },
    });

    const details = await yt<{ items: { snippet: { liveChatId?: string } }[] }>("/liveBroadcasts", {
      query: { part: "snippet", id: broadcast.id },
    });
    const liveChatId = details.items[0]?.snippet.liveChatId ?? "";

    return {
      rtmpUrl: stream.cdn.ingestionInfo.ingestionAddress,
      streamKey: stream.cdn.ingestionInfo.streamName,
      watchUrl: `https://www.youtube.com/watch?v=${broadcast.id}`,
      providerRef: { broadcastId: broadcast.id, streamId: stream.id, liveChatId },
    };
  }

  /**
   * Posts the lead-capture link into YouTube's live chat. The Data API has
   * no endpoint to pin a chat message (only YouTube Studio's UI can do
   * that) — callers should re-invoke this periodically while live so the
   * link doesn't scroll out of view (see ingestionService's CTA resend).
   */
  async postCallToAction(_broadcastId: string, _context: PublishContext, ingest: IngestInfo, url: string): Promise<void> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    const liveChatId = ingest.providerRef?.liveChatId;
    if (!liveChatId) return;

    await yt("/liveChat/messages", {
      method: "POST",
      query: { part: "snippet" },
      body: {
        snippet: {
          liveChatId,
          type: "textMessageEvent",
          textMessageDetails: {
            messageText: `Interested in this property? Drop your details here and we'll reach out: ${url}`,
          },
        },
      },
    });
  }

  async end(_broadcastId: string, _context: PublishContext, ingest?: IngestInfo): Promise<void> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    const ytBroadcastId = ingest?.providerRef?.broadcastId;
    const liveChatId = ingest?.providerRef?.liveChatId;
    if (liveChatId) this.chatPollState.delete(liveChatId);
    if (!ytBroadcastId) return;
    // Only a broadcast that actually went live can transition to complete;
    // if the encoder never connected, just leave it (auto-stop handles it).
    try {
      await yt("/liveBroadcasts/transition", {
        method: "POST",
        query: { part: "id,status", id: ytBroadcastId, broadcastStatus: "complete" },
      });
    } catch {
      /* not live / already complete — nothing to do */
    }
  }

  async fetchComments(
    _broadcastId: string,
    _context: PublishContext,
    ingest: IngestInfo,
    since: Date | null,
  ): Promise<RawComment[]> {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    const liveChatId = ingest.providerRef?.liveChatId;
    if (!liveChatId) return [];

    const pollState = this.chatPollState.get(liveChatId);
    if (pollState && Date.now() < pollState.nextAllowedAt) return [];
    // Also back off on failed requests; otherwise the one-second scheduler
    // retries a denied/ended chat indefinitely and consumes more quota.
    this.chatPollState.set(liveChatId, { ...pollState, nextAllowedAt: Date.now() + 60000 });

    const data = await yt<{
      nextPageToken?: string;
      pollingIntervalMillis?: number;
      items: {
        id: string;
        snippet: { displayMessage?: string; publishedAt: string };
        authorDetails: { displayName: string };
      }[];
    }>("/liveChat/messages", {
      query: {
        part: "snippet,authorDetails",
        liveChatId,
        maxResults: "200",
        ...(pollState?.nextPageToken ? { pageToken: pollState.nextPageToken } : {}),
      },
    });

    this.chatPollState.set(liveChatId, {
      nextPageToken: data.nextPageToken,
      nextAllowedAt: Date.now() + Math.max(10000, data.pollingIntervalMillis ?? 10000),
    });

    return data.items
      .map((item) => ({
        externalId: item.id,
        authorName: item.authorDetails.displayName,
        text: item.snippet.displayMessage ?? "",
        postedAt: new Date(item.snippet.publishedAt),
      }))
      .filter((c) => c.text.length > 0 && (!since || c.postedAt > since));
  }
}
