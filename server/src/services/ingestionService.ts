import { AppDataSource } from "../data-source.js";
import { Broadcast } from "../entities/Broadcast.js";
import { EngagementEvent } from "../entities/EngagementEvent.js";
import { getAdapter } from "../adapters/registry.js";
import { IngestInfo, PlatformId } from "../adapters/types.js";
import { aiService } from "./aiService.js";

const POLL_INTERVAL_MS = 6000;

interface MinimalLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

interface PollState {
  timer: NodeJS.Timeout;
  /** In-process dedupe cache, keyed `${platform}:${externalId}` — avoids a DB round-trip for comments already handled this run. */
  seenExternalIds: Set<string>;
  /** Per-platform "fetch comments after this timestamp" cursor. */
  cursor: Partial<Record<PlatformId, Date | null>>;
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

  const state: PollState = {
    seenExternalIds: new Set(),
    cursor: {},
    timer: setInterval(() => {
      void pollOnce(broadcast.id, platforms, ingestByPlatform, state, log);
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

    let comments;
    try {
      comments = await adapter.fetchComments(broadcastId, ingest, state.cursor[platform] ?? null);
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
