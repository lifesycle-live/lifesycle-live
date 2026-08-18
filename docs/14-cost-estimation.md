# 14 — Cost Estimation

Illustrative cost model based on current (2026) vendor pricing research. These are directional estimates for planning purposes, not vendor quotes — confirm exact rates against live rate cards before committing budget.

## Infrastructure: streaming relay + storage

Using Cloudflare Stream as the recommended default from [11-infrastructure.md](11-infrastructure.md): ~$1 / 1,000 minutes stored + ~$5 / 1,000 minutes delivered [[Cloudflare Stream pricing]](https://blog.blazingcdn.com/en-us/cloudflare-streaming-pricing-2025-breakdown-live-vod).

**Per-broadcast estimate** (assume a 30-minute broadcast, delivered to ~150 concurrent viewers across platforms — note: for one-click platforms the relay only needs to push one outbound stream per destination, not per viewer, since the destination platform handles its own viewer fan-out):
- Storage: 30 min × $0.001/min ≈ **$0.03**
- Delivery (relay → 2 platforms, 30 min each): 60 min × $0.005/min ≈ **$0.30**
- **≈ $0.33/broadcast** in raw streaming infra cost — small relative to AI processing cost below.

**Per-agent-month estimate** (assume 8 broadcasts/month, a plausible MVP-adoption figure): ≈ **$2.64/agent/month** in streaming infra.

## AI processing costs

Model tiering per [10-ai-features.md](10-ai-features.md): classification uses a small/cheap model, generation tasks (talking points, promo copy, summaries) use a mid-tier model, transcription is a separate speech-to-text service.

Reference rates (Aug 2026): Claude Haiku 4.5 ≈ $1/$5 per 1M input/output tokens; Claude Sonnet 5 ≈ $2/$10 per 1M tokens (input/output) through Aug 31, 2026, then $3/M input from Sep 1; Whisper-class transcription ≈ $0.006/minute [[Claude API pricing]](https://benchlm.ai/anthropic/api-pricing) [[LLM API pricing comparison 2026]](https://www.cloudzero.com/blog/llm-api-pricing-comparison/).

**Per-broadcast AI cost estimate** (30-minute broadcast, ~40 comments):
- Comment classification (small model, ~40 short calls, ~200 tokens each in+out): well under $0.01
- Transcription (30 min): 30 × $0.006 ≈ **$0.18**
- Post-broadcast summary + highlight-clip selection (mid-tier model, a few thousand tokens): ≈ $0.02–$0.05
- Pre-live talking points/promo copy (mid-tier model, small prompt): ≈ $0.01–$0.02
- **≈ $0.25–$0.30/broadcast** in AI processing — the same order of magnitude as streaming infra, not a dominant cost driver at this usage scale.

**Per-agent-month AI cost estimate** (8 broadcasts/month): ≈ **$2/agent/month**.

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
