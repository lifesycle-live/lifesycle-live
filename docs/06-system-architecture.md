# 06 — High-Level System Architecture

This is a proposal, not a build spec — intended to show engineering leadership that the platform constraints in [04](04-technical-feasibility.md)/[05](05-api-research.md) can be absorbed by one coherent design rather than one-off integrations per platform.

> **2026-09 update — reconciled with the actual build.** The sections below (through "Why this shape") are the original Phase 1 proposal and remain directionally correct: the layering (CRM core / Engagement Pipeline / Broadcast Orchestration / adapters) is exactly what shipped. Two things have changed since this doc was written, and one gap has become concrete enough to design around — see **"As-built: what actually shipped"**, **"Ingestion polling architecture (current + scale-out redesign)"**, and **"AI classification in the pipeline"** below.
>
> **Database correction**: this doc and earlier Phase 1/2 docs describe the datastore as Oracle Autonomous DB. That was true at the start of the build (`server/CLAUDE.md` still documents TypeORM 0.3 on "Oracle Autonomous DB" — stale). The server has since **migrated to Supabase-hosted Postgres** (`server/src/data-source.ts`: `type: "postgres"`, connecting via `DATABASE_URL` to Supabase's pooled connection string). This was a datastore swap only — TypeORM stayed the ORM, `synchronize: true` still governs non-production schema creation, and the JSON-in-text-column pattern for `Broadcast.platforms`/`Broadcast.ingest` is unchanged. It matters for this doc specifically because it unlocks **Postgres `LISTEN`/`NOTIFY`** as a same-database option for the scale-out design discussed below — something Oracle Autonomous DB didn't offer as cleanly.

## Design principle

Every platform, whether it's a true one-click RTMPS publish (Facebook, YouTube) or an agent-native stream Lifesycle merely attaches to (Instagram, TikTok, LinkedIn), should look the same to the rest of the CRM: a **Broadcast** entity with a stream of **Engagement Events** (comments, reactions, viewing requests) flowing into the CRM's existing lead/task pipeline. The integration-specific complexity is isolated in one layer; nothing above it should need to know whether a given platform was "pushed to" or "listened to."

## Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Lifesycle CRM core (existing)                                  │
│  Contacts · Properties · Leads · Tasks · Appointments · Valuations│
└───────────────▲─────────────────────────────────────────────────┘
                 │ structured events (lead created, task created, ...)
┌───────────────┴─────────────────────────────────────────────────┐
│  Engagement Pipeline                                             │
│  - Comment/reaction ingestion & normalization                    │
│  - Intent classification (AI): question / viewing request /      │
│    valuation ask / spam                                          │
│  - Lead/task creation + de-dup against existing contacts         │
└───────────────▲─────────────────────────────────────────────────┘
                 │ normalized "Engagement Event" objects
┌───────────────┴─────────────────────────────────────────────────┐
│  Broadcast Orchestration Layer                                   │
│  - Broadcast entity (property, agent, start/end, platforms[])    │
│  - Per-platform adapter interface: publish() / listen() /        │
│    end() / fetchRecording()                                      │
└──┬─────────┬─────────┬─────────┬─────────┬─────────┬────────────┘
   │         │         │         │         │         │
┌──▼──┐   ┌──▼───┐  ┌──▼──┐   ┌──▼────┐ ┌──▼──────┐ ┌▼───────┐
│ FB   │   │YouTube│  │Zoom │   │LinkedIn│ │Instagram│ │TikTok  │
│adapter│  │adapter│  │adapter│ │adapter │ │adapter  │ │adapter │
│(publish│  │(publish│ │(relay │ │(RTMP   │ │(listen- │ │(listen-│
│ + RTMPS│  │+ RTMPS)│ │source/│ │via     │ │only,    │ │only,   │
│ +      │  │+ chat  │ │restream│ │partner)│ │post-hoc │ │experi- │
│ webhook)│  │poll)  │  │target)│ │        │ │Graph API)│ │mental) │
└───┬───┘   └───┬───┘  └───┬───┘ └───┬────┘ └───┬─────┘ └───┬────┘
    │           │          │         │          │           │
    └───────────┴──────────┴─────────┴──────────┴───────────┘
              Media Ingest / Restream Relay (RTMPS server,
              e.g. self-hosted or managed like Mux/AWS IVS)
                          + Recording storage
```

### Broadcast Orchestration Layer
Owns the `Broadcast` object (which property, which agent, which platforms, scheduled vs. instant, status). Exposes a uniform adapter interface so every platform integration implements the same four operations, even though what happens underneath differs enormously (compare Facebook's `publish()` — call the Graph API and start pushing RTMPS — against Instagram's `publish()` — which can only mean "show the agent instructions to start natively in-app and register that a broadcast is now associated with this property").

### Per-platform adapters
Each adapter encapsulates exactly the platform-specific behavior documented in [05-api-research.md](05-api-research.md): auth flow, ingest mechanism (RTMPS push vs. relay-through-Zoom vs. no push at all), comment retrieval (webhook-pushed vs. polled vs. unavailable), and recording retrieval. New platforms are added by writing one new adapter, not by touching the orchestration layer or the engagement pipeline.

### Media ingest / restream relay
A central RTMPS ingest point (self-hosted media server, or a managed service such as Mux, AWS IVS, or Cloudflare Stream) that the agent's camera/browser pushes to once; the relay fans that single stream out to every platform whose adapter supports true publish (Facebook, YouTube), and separately records it for the CRM's own on-demand playback and AI post-processing. This avoids the agent's device needing multiple simultaneous upload connections and centralizes recording capture regardless of platform mix.

### Engagement Pipeline
Normalizes every inbound comment/reaction/question — regardless of source platform or whether it arrived via webhook (Facebook) or polling (YouTube) or a post-event batch pull (Instagram) — into one `EngagementEvent` schema, then runs AI intent classification (see [10-ai-features.md](10-ai-features.md), Phase 2) to decide whether an event should become a CRM lead, a task ("book a viewing"), or be ignored (spam/small talk). De-duplicates against existing CRM contacts by matching platform identity to known contact records where possible.

### CRM core
Unchanged in shape — Broadcasts and Engagement Events simply become new sources feeding the CRM's existing Lead, Task, and Appointment objects, the same way a web form or portal enquiry does today. Full mapping detail is Phase 2 ([09-crm-integration.md](09-crm-integration.md)).

## Why this shape

- **Isolates platform volatility**: TikTok's 2026 access revocations, or a future Instagram policy change, is contained to one adapter — it cannot ripple into the CRM data model or the lead pipeline.
- **Makes the "honest one-click" promise from [04](04-technical-feasibility.md) implementable**: adapters can differ wildly in capability without the product surface (or the CRM schema) needing to special-case each platform.
- **Reuses one recording/storage path** regardless of how many platforms a given broadcast touched, simplifying AI post-processing (clip generation, transcript, highlight detection) to operate on one canonical recording rather than N platform-specific ones.

Infrastructure sizing, vendor choice for the media relay, and storage/retention policy are covered in Phase 2 ([11-infrastructure.md](11-infrastructure.md)).

## As-built: what actually shipped

The MVP narrowed and simplified the proposal above in ways worth recording, since a reader comparing this doc to the code should not conclude the two have diverged in intent:

| Layer | Proposal (this doc, original) | As-built (`server/src/`) |
|---|---|---|
| Broadcast Orchestration | Generic `Broadcast` entity + uniform adapter interface | `entities/Broadcast.ts` + `adapters/types.ts` `PlatformAdapter` (`publish` / `end` / `fetchComments`, plus `configured`, `commentFreshness`, optional `postCallToAction`) — matches the proposal closely |
| Adapter registry | Six adapters (FB, YouTube, Zoom, LinkedIn, Instagram, TikTok) | `adapters/registry.ts` registers **only** `facebook`, `youtube`, `zoom` — the platforms with a genuine one-click publish path. Instagram/TikTok/LinkedIn are **intentionally absent from the registry**, not stubbed-and-throwing; they're handled entirely as "assisted" (agent starts natively, Lifesycle only offers a CTA link and identity-linked OAuth for attribution) |
| Media ingest / restream relay | A central self-hosted or managed (Mux/IVS/Cloudflare) RTMPS relay fanning one agent upload out to every platform | Not built as a shared relay. Each configured adapter's `publish()` provisions its own platform-native ingest target directly (Facebook Graph Live Video API, YouTube Live Streaming API, Zoom's own RTMP source) and the client encoder pushes to each independently for now. `server/src/routes/videoRelay.ts` + `services/videoRelay.ts` exist as an in-progress browser-video-relay path (see `docs/19-browser-video-relay.md`), not yet the "one push, N platforms" relay this doc originally proposed |
| Engagement Pipeline | Webhook-or-poll ingestion → AI intent classification → lead/task creation | Built as described, but the mechanism is **uniformly polling**, not webhook-driven, even for Facebook (see below) |
| AI | "AI intent classification" as a Phase 2 placeholder | Real, working `AiService` interface with two live implementations — see "AI classification in the pipeline" below |

## Ingestion polling architecture (current + scale-out redesign)

### Current implementation

`server/src/services/ingestionService.ts` is the Engagement Pipeline's real implementation today. It is deliberately simple and explicitly *not* the production-scale design:

- **One `setInterval` per live broadcast**, started by `startIngestion()` when `POST /broadcasts` successfully publishes to at least one platform, stopped by `stopIngestion()` on `POST /broadcasts/:id/end`. The poll tick is `POLL_INTERVAL_MS = 1000` (1s), with a per-poll re-entrancy guard (`state.polling`) so a slow round-trip doesn't stack overlapping calls.
- **All state lives in a module-level `Map<string, PollState>`** (`activePolls`), keyed by broadcast id. `PollState` holds the timer handle, an in-process `Set` of already-seen `${platform}:${externalId}` comment keys (avoids a DB round-trip for the common case), a per-platform "fetch after this timestamp" cursor, and a per-platform last-CTA-post timestamp.
- Each tick iterates every platform on the broadcast, calls that platform's adapter (`fetchComments`), classifies new comments (see next section), and saves them as `EngagementEvent` rows — DB uniqueness on `(broadcastId, platform, externalId)` is the second, authoritative dedupe layer behind the in-memory `Set`.
- Even Facebook — which supports a push webhook per `docs/05-api-research.md` — is polled today rather than webhook-driven; no webhook receiver exists in `server/src/routes/`. The "freshness" distinction this doc's Live Journey section describes (webhook = near-instant vs. poll = short interval) is therefore **not yet true in the running system** for Facebook; everything is currently poll-driven at ~1s granularity, which happens to read as "near real-time" at demo scale but is not the same mechanism.

### Why this doesn't scale past one server instance

This is a correct and honest MVP shape, but it has three specific single-instance assumptions baked in that a reader should not miss:

1. **State is process-local.** `activePolls` is an in-memory `Map`. A second server instance (for horizontal scaling, or a rolling deploy) has no visibility into what the first instance is polling — either broadcasts get polled twice (duplicate API calls against Facebook/YouTube rate limits, though DB uniqueness prevents duplicate `EngagementEvent` rows) or, if requests aren't sticky-routed back to the instance that called `startIngestion()`, a broadcast can end up polled by nobody.
2. **State is lost on restart/crash.** A deploy, crash, or dyno recycle mid-broadcast drops every `PollState` — cursors, dedupe cache, the works. A broadcast in progress goes silent (no more comments ingested) until the next full restart of ingestion is manually re-triggered; there's no persisted "resume ingestion for all currently-live broadcasts on boot" step in `src/index.ts` today.
3. **Poll fan-out is O(live broadcasts × platforms), not decoupled from request-serving capacity.** Every additional concurrent live broadcast adds another `setInterval` competing for the same Node event loop that's also serving HTTP requests. There's no backpressure, no independent scaling of "how many broadcasts can we ingest for" versus "how many HTTP requests can we serve."

None of this matters yet — one Node process comfortably handles the handful of concurrent broadcasts a pilot brokerage will run — but it's the first thing that breaks under multi-instance deployment, which is a near-term goal per `PROGRESS.md` ("Sunucuyu HTTPS'te kalıcı domain'de deploy etme").

### Recommended production redesign: queue + worker pool

The standard fix for "in-process poll loop with process-local state" is to externalize both the *schedule* and the *state* so any worker process can pick up any broadcast's next poll tick. Concretely:

1. **Move the schedule into a durable queue.** Rather than a `setInterval` per broadcast held in memory, enqueue one "poll broadcast X on platform Y" job per tick into a queue (Redis-backed — e.g. BullMQ — or SQS), with the job re-enqueuing itself (with a delay) after each run. Any worker process pulling from the queue can execute the next tick; broadcasts aren't pinned to the instance that started them. This is the standard pattern for webhook/polling fan-out at scale: a thin receiving/scheduling layer plus an independently-scalable worker pool consuming a queue, auto-scaled on queue depth (Hookdeck's webhook fan-out guide and the BullMQ horizontal-scaling literature both converge on this shape — see Sources).
2. **Move the poll state into the database or Redis, not a `Map`.** The per-platform cursor and CTA-repeat timestamp are small, and Postgres is already in the request path — a `broadcast_poll_state` table (or a Redis hash keyed by broadcast id) makes state survive a process restart and be visible to every worker. The in-memory `seenExternalIds` `Set` can be dropped entirely once the DB uniqueness check is the only dedupe layer, trading a small amount of redundant work (a `findOne` per comment, already happening today as the second check) for correctness across restarts.
3. **On boot, requeue ingestion for every `status = 'live'` broadcast.** Closes the "deploy drops all in-flight ingestion" gap — a worker starting up re-derives its job list from the DB (`SELECT id FROM broadcast WHERE status = 'live'`) instead of trusting in-memory state that no longer exists.
4. **Where Postgres `LISTEN`/`NOTIFY` fits — and where it doesn't.** Now that the datastore is Supabase Postgres (see correction above), `LISTEN`/`NOTIFY` is available as a lightweight, no-extra-infrastructure way to **push** newly-inserted `EngagementEvent` rows to connected app clients or a websocket gateway (replacing the app's current `/broadcasts/:id/engagement` polling with a live push once a row lands) — the literature is consistent that this is exactly what `LISTEN`/`NOTIFY` is good at: waking a listener, cache invalidation, small-fanout live updates. It is **not** a good fit for the poll-scheduling problem itself: it gives at-most-once delivery with no acknowledgement, replay, or dead-letter semantics, so a worker that's briefly down silently misses ticks rather than catching up (see Adriano Caloiaro's and the Chat2DB writeups on Postgres queuing, and the DEV Community "I removed Redis" piece for the caveats). A pragmatic two-tier design: **Redis/BullMQ (or SQS) for the durable poll-scheduling queue**, **Postgres `LISTEN`/`NOTIFY` for the last-mile push from new `EngagementEvent` rows to live app clients**.
5. **Longer-term, replace polling with real webhooks where the platform offers them.** Facebook's Graph API does support webhook subscriptions for page comments per `docs/05-api-research.md` — building the receiver (`POST /webhooks/facebook`, subscription verification, signature check) would remove Facebook from the poll loop entirely and cut its comment latency from ~1s-poll to genuinely event-driven, leaving polling only for platforms (YouTube, Zoom) that don't offer a push option.

None of this is built — it's the recommended next architecture once concurrent live broadcasts across multiple server instances becomes a real requirement, not before.

## AI classification in the pipeline

`server/src/services/aiService.ts` defines the `AiService` interface the Engagement Pipeline depends on (`classifyIntent`, `generatePrep`, `generateTask`) — routes and `ingestionService.ts` only ever call through this interface, per the original design principle of isolating platform/provider volatility. Two implementations exist today, selected once at boot by `createAiService()` based on `AI_PROVIDER`:

- **`RuleBasedAiService`** (default — `AI_PROVIDER` unset): real, deterministic keyword-matching logic, not mock data. `classifyIntent` checks a comment's lowercased text against ordered signal lists (spam URLs/"click here" → `spam`; "viewing"/"book"/"still available" → `viewing_request`; "worth"/"valuation" → `valuation_ask`; question words/"?" → `question`; else `other`), each intent carrying a fixed confidence (0.5–0.75). `generatePrep` fills the AI-prep panel from templated strings built from the property's address/price — genuinely useful, but explicitly not an LLM.
- **`GroqAiService`** (`AI_PROVIDER=groq` + `GROQ_API_KEY` set): calls Groq's OpenAI-compatible chat completions endpoint with `response_format: json_object`, one system prompt per capability (classify / prep / draft-task). Returns are validated and clamped before use (confidence forced into `[0,1]`, intent forced into the known enum, title/description length-capped) so a malformed LLM response degrades to a safe default rather than corrupting an `EngagementEvent` or `Task`.
- **`UnconfiguredAiService`** (`AI_PROVIDER=anthropic`/`openai` without the matching key, or any unimplemented provider): throws a clear, actionable error rather than silently falling back — consistent with the repo's "honest scaffold" rule that stubs must fail loudly, never fabricate.

Where this sits in the pipeline: `ingestionService.ts`'s `pollOnce()` calls `aiService.classifyIntent(comment.text)` **per new comment, synchronously in the poll tick**, before saving the `EngagementEvent` row. A classification failure is caught and logged, and the comment is still saved with `intent: "other"` / `intentConfidence: 0` rather than being dropped — engagement capture is never blocked by AI availability. This synchronous-in-the-poll-loop placement is the other reason the scale-out redesign above matters: once ingestion moves to a worker-pool/queue model, LLM calls (Groq's ~1-3s p50 latency) become a natural per-job cost that queue-based workers absorb far better than a `setInterval` tick that must stay fast to avoid re-entrancy pileup.

Sources consulted for the scale-out recommendation above:
- [Webhook Fan-Out and Multicasting — Hookdeck](https://hookdeck.com/webhooks/guides/webhook-fan-out-and-multicasting)
- [How to Scale BullMQ Workers Horizontally — OneUptime](https://oneuptime.com/blog/post/2026-01-21-bullmq-horizontal-scaling/view)
- [Scaling Webhooks: Fan-Out, DLQs & Idempotency — Bhagya Rana, Medium](https://medium.com/@bhagyarana80/scaling-webhooks-fan-out-dlqs-idempotency-ebe412ae55d1)
- [Postgres LISTEN/NOTIFY: Pub/Sub Without a Broker — Chat2DB](https://chat2db.ai/resources/blog/postgres-listen-notify-guide)
- [Choose Postgres queue technology — Adriano Caloiaro](https://adriano.fyi/posts/2023-09-24-choose-postgres-queue-technology/)
- [Do You Need Redis? PostgreSQL Does Queuing, Locking, & Pub/Sub — Atomic Object](https://spin.atomicobject.com/redis-postgresql/)

## Recommended high-level diagram (as-built + near-term target)

The box diagram earlier in this doc still holds as the target shape. The version below reflects what to actually draw for engineering leadership today — as-built pieces in plain boxes, the recommended near-term queue/worker addition marked `[proposed]`:

```
┌────────────────────────────────────────────────────────────────────┐
│  App (Expo/React Native) — GoLiveSetup, LiveDashboard, Report tabs  │
└───────────────▲───────────────────────────────────────────────────┘
                 │ REST (Fastify), JWT bearer
┌───────────────┴───────────────────────────────────────────────────┐
│  server/ (Fastify + TypeORM, single Node process today)            │
│                                                                     │
│  routes/broadcasts.ts ── POST /broadcasts ──► adapter.publish()    │
│         │ status: live                          per platform       │
│         ▼                                                          │
│  services/ingestionService.ts (in-process setInterval, 1s tick,    │
│  process-local `Map<broadcastId, PollState>`)                      │
│         │ fetchComments()                                          │
│         ▼                                                          │
│  services/aiService.ts (RuleBasedAiService | GroqAiService)         │
│         │ classifyIntent()                                         │
│         ▼                                                          │
│  EngagementEvent rows (Supabase Postgres)                          │
│         │                                                           │
│         ▼                                                          │
│  [proposed] Postgres LISTEN/NOTIFY ──► push to app instead of      │
│  the app's current /broadcasts/:id/engagement poll                 │
└───────────────┬─────────┬─────────┬─────────────────────────────────┘
                │         │         │
           ┌────▼──┐  ┌───▼───┐ ┌───▼──┐
           │Facebook│  │YouTube│ │ Zoom │   (adapters/registry.ts —
           │adapter │  │adapter│ │adapter│   Instagram/TikTok/LinkedIn
           └────────┘  └───────┘ └───────┘   deliberately absent: assisted-only)

[proposed, not built] ── scale-out path ──►
┌──────────────────────────────────────────────────────────────────┐
│  Redis/BullMQ (or SQS) durable poll-schedule queue                │
│  "poll broadcast X / platform Y" jobs, re-enqueued per tick        │
└───────────────┬────────────────────────────────────────────────────┘
                 ▼
        Horizontally-scaled worker pool (N processes, no process-local
        state — cursors/dedupe read from Postgres/Redis, not memory),
        auto-scaled on queue depth
```
