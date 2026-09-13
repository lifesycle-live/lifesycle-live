import { env, isConfigured } from "../env.js";
import { IngestInfo, PlatformAdapter, PlatformNotConfiguredError, PublishContext, RawComment } from "./types.js";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Facebook's `stream_url` is a full RTMPS URL with the stream key as its
 * last path segment (e.g. `rtmps://rtmp-api.facebook.com:443/rtmp/<key>`) —
 * split it the way the rest of this codebase expects rtmpUrl/streamKey pairs.
 */
function splitStreamUrl(streamUrl: string): { rtmpUrl: string; streamKey: string } {
  const idx = streamUrl.lastIndexOf("/");
  if (idx === -1) return { rtmpUrl: streamUrl, streamKey: "" };
  return { rtmpUrl: streamUrl.slice(0, idx), streamKey: streamUrl.slice(idx + 1) };
}

/**
 * Real implementation against the Graph API Live Video edges — see
 * docs/05-api-research.md and docs/18-platform-integration-plan.md. Each
 * agent's own Page access token comes from their PlatformConnection row
 * (`context.connection`, populated by the `/auth/facebook/*` OAuth flow in
 * routes/oauth.ts) — this adapter never reads a single shared credential.
 */
export class FacebookAdapter implements PlatformAdapter {
  readonly platform = "facebook" as const;
  // Graph API delivers comments via the /{live-video-id}/comments edge
  // (short-poll) — close to real-time once a viewer posts.
  readonly commentFreshness = "live" as const;

  get configured(): boolean {
    return isConfigured(env.facebook.appId, env.facebook.appSecret);
  }

  private requireConnection(context: PublishContext) {
    if (!this.configured) throw new PlatformNotConfiguredError(this.platform);
    if (!context.connection) {
      throw new Error(
        "No Facebook Page connected for this agent yet — connect one via the Connect Accounts screen first.",
      );
    }
    return context.connection;
  }

  async publish(_broadcastId: string, context: PublishContext): Promise<IngestInfo> {
    const connection = this.requireConnection(context);

    const res = await fetch(`${GRAPH_BASE}/${connection.externalAccountId}/live_videos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        access_token: connection.accessToken,
        status: "LIVE_NOW",
        title: `Lifesycle Live — ${connection.externalAccountName}`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Facebook live_videos create failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { id: string; stream_url: string };
    const { rtmpUrl, streamKey } = splitStreamUrl(data.stream_url);

    return {
      rtmpUrl,
      streamKey,
      watchUrl: `https://www.facebook.com/${connection.externalAccountId}/videos/${data.id}`,
      // Needed by end()/fetchComments() below — same pattern as YouTube's providerRef.
      providerRef: { liveVideoId: data.id },
    };
  }

  /**
   * Posts the lead-capture link as the first comment on the live video.
   * Facebook's Graph API has no "pin comment" endpoint, but a comment
   * posted immediately after go-live sorts near the top of `filter=stream`
   * chronological order for the first viewers — close enough to a pinned
   * CTA without fabricating a pin that doesn't exist.
   */
  async postCallToAction(_broadcastId: string, context: PublishContext, ingest: IngestInfo, url: string): Promise<void> {
    const connection = this.requireConnection(context);
    const liveVideoId = ingest.providerRef?.liveVideoId;
    if (!liveVideoId) return;

    const res = await fetch(`${GRAPH_BASE}/${liveVideoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        access_token: connection.accessToken,
        message: `Interested in this property? Drop your details here and we'll reach out: ${url}`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Facebook postCallToAction failed (${res.status}): ${await res.text()}`);
    }
  }

  async end(_broadcastId: string, context: PublishContext, ingest?: IngestInfo): Promise<void> {
    const connection = this.requireConnection(context);
    const liveVideoId = ingest?.providerRef?.liveVideoId;
    if (!liveVideoId) return; // never went live — nothing to end.

    // Best-effort: an already-ended or never-started live video 400s here;
    // that's not actionable, so don't fail the broadcast's end() over it —
    // mirrors YoutubeAdapter.end().
    await fetch(`${GRAPH_BASE}/${liveVideoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: connection.accessToken, end_live_video: "true" }),
    }).catch(() => undefined);
  }

  async fetchComments(
    _broadcastId: string,
    context: PublishContext,
    ingest: IngestInfo,
    since: Date | null,
  ): Promise<RawComment[]> {
    const connection = this.requireConnection(context);
    const liveVideoId = ingest.providerRef?.liveVideoId;
    if (!liveVideoId) return [];

    const params = new URLSearchParams({
      access_token: connection.accessToken,
      filter: "stream",
      order: "reverse_chronological",
    });
    if (since) params.set("since", String(Math.floor(since.getTime() / 1000)));

    const res = await fetch(`${GRAPH_BASE}/${liveVideoId}/comments?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Facebook comments fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      data: { id: string; message?: string; from?: { name: string }; created_time: string }[];
    };

    return data.data
      .filter((c) => Boolean(c.message))
      .map((c) => ({
        externalId: c.id,
        authorName: c.from?.name ?? "Facebook user",
        text: c.message ?? "",
        postedAt: new Date(c.created_time),
      }));
  }
}
