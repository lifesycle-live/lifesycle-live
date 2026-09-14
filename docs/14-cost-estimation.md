# 14 — Cost Estimation

Illustrative cost model based on current (2026) vendor pricing research. These are directional estimates for planning purposes, not vendor quotes — confirm exact rates against live rate cards before committing budget.

> **Corrected against real infra (Sep 2026, see [PROGRESS.md](../PROGRESS.md)/[CLAUDE.md](../CLAUDE.md) at repo root)**: the server originally planned around Oracle Autonomous DB has actually shipped on **Supabase Postgres**, and the actually-working AI provider is **Groq** (`GroqAiService`, `AI_PROVIDER=groq`) — not a Claude/Anthropic model as this doc previously assumed. Anthropic and OpenAI remain unconfigured stub providers (`UnconfiguredAiService`) that throw rather than run. The sections below have been rewritten around the real stack; streaming-relay and platform-cost sections from the original research are kept where they're still forward-looking (Cloudflare Stream is proposed infra, not yet built — see [11-infrastructure.md](11-infrastructure.md)).

## Database hosting: Supabase Postgres

The server uses Supabase Postgres directly (`server/src/data-source.ts` — TypeORM, `synchronize: true` outside production), replacing the originally-scoped Oracle Autonomous DB. Current published pricing (Sep 2026):

- **Free tier**: $0/month — 500 MB database, 5 GB egress, project pauses after 1 week of inactivity. Fine for local dev/demo (the seeded `agent@lifesycle.example` demo data), not for a live pilot with real agents connected around the clock.
- **Pro tier**: **$25/month base**, includes 8 GB database storage and a $10/month compute credit (covers one Micro compute instance) — most early-stage projects stay at exactly $25/month. Extra storage beyond 8 GB is metered (~$1.50/mo per 20 GB, ~$5.25/mo per 50 GB tier per published calculators). No project pausing, daily backups, point-in-time recovery available as an add-on [[Supabase pricing breakdown, 2026]](https://flexprice.io/blog/supabase-pricing-breakdown) [[Supabase pricing calculator, 2026]](https://makerkit.dev/pricing-calculator/supabase).
- **Realistic small-production number**: **$25–75/month** once usage (egress, monthly active users via Auth, a bit of extra storage for broadcast/engagement rows) is included, per multiple 2026 cost breakdowns — this is a **fixed platform cost**, not one that scales per-agent at MVP scale (a few dozen agents' worth of CRM rows is nowhere near the metered thresholds).

This is a step-function/fixed cost (like adapter maintenance below), not a per-agent variable cost — it belongs in the fixed-cost column of the summary table, not the per-agent-month variable model.

## Infrastructure: streaming relay + storage

Using Cloudflare Stream as the recommended default from [11-infrastructure.md](11-infrastructure.md): ~$1 / 1,000 minutes stored + ~$5 / 1,000 minutes delivered [[Cloudflare Stream pricing]](https://blog.blazingcdn.com/en-us/cloudflare-streaming-pricing-2025-breakdown-live-vod).

**Per-broadcast estimate** (assume a 30-minute broadcast, delivered to ~150 concurrent viewers across platforms — note: for one-click platforms the relay only needs to push one outbound stream per destination, not per viewer, since the destination platform handles its own viewer fan-out):
- Storage: 30 min × $0.001/min ≈ **$0.03**
- Delivery (relay → 2 platforms, 30 min each): 60 min × $0.005/min ≈ **$0.30**
- **≈ $0.33/broadcast** in raw streaming infra cost — small relative to AI processing cost below.

**Per-agent-month estimate** (assume 8 broadcasts/month, a plausible MVP-adoption figure): ≈ **$2.64/agent/month** in streaming infra.

## AI processing costs

Model tiering per [10-ai-features.md](10-ai-features.md): classification uses a small/cheap model, generation tasks (talking points, promo copy, summaries) use a mid-tier model, transcription is a separate speech-to-text service (not yet built — see the empty highlight-clip pipeline noted in [CLAUDE.md](../CLAUDE.md)). The actually-configured provider today is **Groq** (`server/src/services/aiService.ts`, `GroqAiService`, OpenAI-compatible JSON mode), default model `llama-3.3-70b-versatile` (`GROQ_MODEL` env var, `server/src/env.ts:122`). The default `RuleBasedAiService` (no `AI_PROVIDER` set) runs classification with **zero inference cost** — it's a deterministic rules engine, not a model call — so a deployment can run comment classification for $0 and opt into Groq only for generation tasks (talking points, summaries) that genuinely need an LLM.

**Important pricing caveat found in current research**: Groq's self-serve, published-rate catalog narrowed on **Aug 26, 2026** — `llama-3.3-70b-versatile` (the server's current default `GROQ_MODEL`) and `llama-3.1-8b-instant` moved to Enterprise-only "Contact Sales" pricing and no longer have a public per-token rate. As of Sep 2026 the self-serve catalog is effectively two models: **GPT OSS 20B** ($0.075/$0.30 per 1M input/output tokens) and **GPT OSS 120B** ($0.15/$0.60 per 1M input/output tokens) [[Groq pricing 2026, eesel]](https://www.eesel.ai/blog/groq-pricing) [[Groq pricing 2026, CloudZero]](https://www.cloudzero.com/blog/groq-pricing/). **Action item, not just a cost note**: confirm at deploy time whether `llama-3.3-70b-versatile` is still reachable on the project's Groq account (grandfathered) or needs to be repointed at `GROQ_MODEL=openai/gpt-oss-20b` (or similar) before launch — this is a live risk to the AI service actually working in production, not just a pricing footnote.

**Per-broadcast AI cost estimate** (30-minute broadcast, ~40 comments; GPT OSS 20B rates used as the representative self-serve model):
- Comment classification via `RuleBasedAiService` (default, no `AI_PROVIDER` set): **$0** — deterministic, no model call.
- Comment classification if routed through Groq instead (~40 short calls, ~200 tokens each in+out ≈ 16K tokens total): well under $0.01 at GPT OSS 20B rates.
- Transcription (30 min): **not implemented** — no speech-to-text service is wired up yet (see the empty `transcriptUrl` handling and highlight-clip gap noted in [CLAUDE.md](../CLAUDE.md)); budget ≈ $0.18/broadcast (30 × ~$0.006/min) as a placeholder for whichever Whisper-class API is eventually chosen, but treat this as **not yet a real cost** until that pipeline is built.
- Post-broadcast summary (mid-tier model, a few thousand tokens): ≈ $0.01–$0.02 at GPT OSS 20B rates.
- Pre-live talking points/promo copy (small prompt): ≈ $0.005–$0.01.
- **≈ $0.02–$0.04/broadcast today** (classification + summary + talking points only, no transcription yet) — an order of magnitude cheaper than the original estimate once the free rule-based classifier and current Groq rates are used correctly, and **before** any transcription pipeline exists to add cost.

**Per-agent-month AI cost estimate** (8 broadcasts/month): **well under $1/agent/month** at today's actual configuration (rule-based classification + Groq generation calls only); would rise to roughly the original ≈$2/agent/month estimate once transcription is added.

## Combined indicative per-agent-month cost (MVP scope)

| Line item | Estimate |
|---|---|
| Streaming infra (relay + storage) | ~$2.64 |
| AI processing (classification, transcription, generation) | ~$2.00 |
| **Subtotal, direct variable cost** | **~$4.64/agent/month** |

This is deliberately conservative-scale (8 broadcasts/month) and excludes fixed costs below — it demonstrates the *unit economics are not the constraint*; the constraint is engineering/ops investment (next section).

## Third-party/platform costs

- Meta and Google API usage: **free**, but quota-gated — a paid quota increase may be needed from Google at scale (see [05-api-research.md](05-api-research.md), [11-infrastructure.md](11-infrastructure.md)); budget for this as a step-function cost tied to agent-count milestones, not a per-unit fee.
- LinkedIn: no published per-call fee, but the approved-broadcast-partner relationship (V2 scope, per [13-feature-prioritization.md](13-feature-prioritization.md)) may carry its own commercial terms — treat as a business-development cost to confirm during partner application, not an engineering estimate.

## Ongoing operational costs (the real cost driver)

- **Adapter maintenance engineering time**: flagged in [07-risk-analysis.md](07-risk-analysis.md) as a *permanent* cost line, not a one-time build cost — platform API changes (as already happened to TikTok-adjacent tools in Jan 2026) require ongoing engineering attention. Budget this as a standing fractional headcount (e.g., a rotating on-call/maintenance allocation), not a fixed project cost.
- **Moderation/support overhead**: agent-facing support for moderation edge cases (per [07](07-risk-analysis.md) and the moderation UX in [12-ux-wireframes.md](12-ux-wireframes.md)) scales with broadcast volume, not agent count linearly — worth tracking separately once in production.

## Cost model summary for planning

| Cost category | Nature | Scales with |
|---|---|---|
| Streaming infra | Variable, low ($ per minute) | Broadcast volume |
| AI processing | Variable, low ($ per broadcast) | Broadcast volume × comment volume |
| API quota | Step-function | Agent/broadcast count vs. free-tier limits |
| Adapter maintenance | Fixed, ongoing | Number of platform integrations live, not usage volume |
| Moderation/support | Variable, harder to predict | Broadcast volume and audience size |

**Bottom line**: at MVP scope, per-unit infra and AI costs are low (single-digit dollars per agent per month) and are not the binding constraint on the business case. The real cost to plan for in [15-commercial-impact.md](15-commercial-impact.md) is the standing engineering investment required to keep multiple third-party platform adapters healthy over time.
