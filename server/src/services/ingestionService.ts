import { AppDataSource } from "../data-source.js";
import { Broadcast } from "../entities/Broadcast.js";
import { EngagementEvent } from "../entities/EngagementEvent.js";
import { getAdapter } from "../adapters/registry.js";
import { IngestInfo, PlatformId } from "../adapters/types.js";
import { getOAuthProvider } from "../oauth/registry.js";
import { resolveAgentConnection } from "../oauth/refresh.js";
import { aiService } from "./aiService.js";
import { buildLeadCaptureUrl } from "../routes/leadCapture.js";

// Adapters may internally honour a provider-mandated minimum interval (YouTube
// does this via pollingIntervalMillis). The short scheduler keeps new messages
// moving as soon as each provider allows without blindly hammering its API.
const POLL_INTERVAL_MS = 1000;

interface MinimalLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

interface PollState {
  timer: NodeJS.Timeout;
  polling: boolean;
  /** In-process dedupe cache, keyed `${platform}:${externalId}` — avoids a DB round-trip for comments already handled this run. */
  seenExternalIds: Set<string>;
  /** Per-platform "fetch comments after this timestamp" cursor. */
  cursor: Partial<Record<PlatformId, Date | null>>;
  /** Per-platform last time postCallToAction was (re)sent, for adapters with ctaRepeatMs set. */
  lastCtaAt: Partial<Record<PlatformId, number>>;
}

const activePolls = new Map<string, PollState>();

/**
 * Starts polling every configured, comment-capable platform for a live
 * broadcast and turns new comments into AI-classified EngagementEvent rows
 * that the app's existing `/broadcasts/:id/engagement` polling picks up.
 * Idempotent — calling twice for the same broadcast id is a no-op, so it's
 * safe to call unconditionally whenever a broadcast becomes "live".
 */
export function startIngestion(broadcast: Broadcast, log: MinimalLogger): void {
  if (activePolls.has(broadcast.id)) return;

  const platforms = JSON.parse(broadcast.platforms) as PlatformId[];
  const ingestByPlatform = (broadcast.ingest ? JSON.parse(broadcast.ingest) : {}) as Partial<
    Record<PlatformId, IngestInfo>
  >;

  // Seeded to "now" for every platform so the first postCallToAction resend
  // (see pollOnce) waits a full ctaRepeatMs after the initial post that
  // routes/broadcasts.ts already sent right after publish — otherwise the
  // first poll tick fires a near-immediate duplicate.
  const now = Date.now();
  const state: PollState = {
    polling: false,
    seenExternalIds: new Set(),
    cursor: {},
    lastCtaAt: Object.fromEntries(platforms.map((p) => [p, now])) as Partial<Record<PlatformId, number>>,
    timer: setInterval(() => {
      if (state.polling) return;
      state.polling = true;
      void pollOnce(broadcast.id, broadcast.agentId, platforms, ingestByPlatform, state, log)
        .catch(err => log.warn({ err, broadcastId: broadcast.id }, 'engagement poll failed'))
        .finally(() => { state.polling = false; });
    }, POLL_INTERVAL_MS),
  };
  activePolls.set(broadcast.id, state);
  log.info({ broadcastId: broadcast.id, platforms }, "started engagement ingestion");
}

/** Stops polling for a broadcast. Safe to call even if ingestion was never started (e.g. broadcast failed to go live). */
export function stopIngestion(broadcastId: string, log?: MinimalLogger): void {
  const state = activePolls.get(broadcastId);
  if (!state) return;
  clearInterval(state.timer);
  activePolls.delete(broadcastId);
  log?.info({ broadcastId }, "stopped engagement ingestion");
}

async function pollOnce(
  broadcastId: string,
  agentId: string,
  platforms: PlatformId[],
  ingestByPlatform: Partial<Record<PlatformId, IngestInfo>>,
  state: PollState,
  log: MinimalLogger,
): Promise<void> {
  const engagementEvents = AppDataSource.getRepository(EngagementEvent);

  for (const platform of platforms) {
    const adapter = getAdapter(platform);
    const ingest = ingestByPlatform[platform];
    // No adapter (assisted-only platform, e.g. Instagram/TikTok) or the
    // platform failed to configure/publish — nothing to poll yet.
    if (!adapter || !adapter.configured || !ingest) continue;

    if (adapter.postCallToAction && adapter.ctaRepeatMs) {
      const due = (state.lastCtaAt[platform] ?? 0) + adapter.ctaRepeatMs <= Date.now();
      const ctaUrl = due ? buildLeadCaptureUrl(broadcastId) : null;
      if (ctaUrl) {
        state.lastCtaAt[platform] = Date.now();
        const context = getOAuthProvider(platform)
          ? { agentId, connection: await resolveAgentConnection(agentId, platform) }
          : { agentId };
        adapter
          .postCallToAction(broadcastId, context, ingest, ctaUrl)
          .catch((err) => log.warn({ err, broadcastId, platform }, "CTA resend failed"));
      }
    }

    let comments;
    try {
      // Re-resolved every poll (rather than cached from publish()) so a
      // token rotated mid-broadcast via oauth/refresh.ts is picked up.
      const context = getOAuthProvider(platform)
        ? { agentId, connection: await resolveAgentConnection(agentId, platform) }
        : { agentId };
      comments = await adapter.fetchComments(broadcastId, context, ingest, state.cursor[platform] ?? null);
    } catch (err) {
      log.warn({ err, broadcastId, platform }, "comment fetch failed, will retry next poll");
      continue;
    }

    if (comments.length === 0) continue;

    for (const comment of comments) {
      if (comment.postedAt > (state.cursor[platform] ?? new Date(0))) {
        state.cursor[platform] = comment.postedAt;
      }

      const dedupeKey = `${platform}:${comment.externalId}`;
      if (state.seenExternalIds.has(dedupeKey)) continue;
      state.seenExternalIds.add(dedupeKey);

      const existing = await engagementEvents.findOne({
        where: { broadcastId, platform, externalId: comment.externalId },
      });
      if (existing) continue;

      let intent: EngagementEvent["intent"] = "other";
      let intentConfidence = 0;
      try {
        const classification = await aiService.classifyIntent(comment.text);
        intent = classification.intent;
        intentConfidence = classification.confidence;
      } catch (err) {
        log.warn({ err, broadcastId, platform }, "intent classification failed, saving comment as 'other'");
      }

      await engagementEvents.save(
        engagementEvents.create({
          broadcastId,
          platform,
          externalId: comment.externalId,
          freshness: adapter.commentFreshness,
          authorName: comment.authorName,
          text: comment.text,
          intent,
          intentConfidence,
          dismissed: false,
        }),
      );
    }
  }
}
