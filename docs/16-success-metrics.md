# 16 — Success Metrics & KPIs

Metric families for measuring adoption and product success, each tied to a specific risk or assumption elsewhere in the doc set that it validates or disproves.

## Adoption

| Metric | What it validates |
|---|---|
| % of active agents running ≥1 broadcast/month | Whether the core "video is underused (26%) but wanted (73% seller preference)" gap from [02-market-research.md](02-market-research.md) is actually closing |
| Broadcasts per agent per month | Habit formation — the retention/stickiness thesis in [15-commercial-impact.md](15-commercial-impact.md) depends on this being sustained, not a one-time trial |
| Platform mix per broadcast (one-click vs. assisted) | Sanity-checks that the honest MVP framing from [04-technical-feasibility.md](04-technical-feasibility.md) is landing correctly — if agents overwhelmingly ignore the one-click platforms in favor of assisted ones, the platform-priority assumptions need revisiting |

## Engagement capture quality

| Metric | What it validates |
|---|---|
| % of comments correctly classified (spot-checked against agent overrides) | Direct measure of the AI classification accuracy flagged as make-or-break in [10-ai-features.md](10-ai-features.md) |
| % of AI-suggested lead/task conversions accepted vs. dismissed by agents | Whether confidence in auto-create (the V2 feature gated in [13-feature-prioritization.md](13-feature-prioritization.md)) is warranted yet |
| Feed latency per platform (webhook vs. poll vs. post-hoc) against the targets implied in [05-api-research.md](05-api-research.md) | Confirms the platform-capability disclosures in the live dashboard ([12-ux-wireframes.md](12-ux-wireframes.md)) match reality |

## Lead outcomes

| Metric | What it validates |
|---|---|
| Leads generated per broadcast | Core commercial metric feeding [15-commercial-impact.md](15-commercial-impact.md) |
| Conversion rate of broadcast-sourced leads vs. other CRM lead sources | Whether broadcast leads are genuinely higher-intent (as the product thesis assumes) or just higher-volume, lower-quality |
| Time-to-first-response on broadcast-sourced leads | Whether the automated task/sequence routing in [09-crm-integration.md](09-crm-integration.md) is actually faster than manual capture, the core efficiency claim |

## Reliability

| Metric | What it validates |
|---|---|
| Broadcast failure/interruption rate | Whether the managed-infra reliability assumption in [11-infrastructure.md](11-infrastructure.md) holds in practice |
| Adapter uptime/health per platform | Early-warning signal for the platform-dependency risk in [07-risk-analysis.md](07-risk-analysis.md) — a declining trend on one adapter should trigger the escalation path defined there before agents notice breakage |

## Commercial

| Metric | What it validates |
|---|---|
| Attach rate to CRM subscriptions (bundled) or purchase rate (add-on) | Tests the pricing/packaging hypothesis in [15-commercial-impact.md](15-commercial-impact.md) |
| Retention delta: accounts using Lifesycle Live vs. not | The central strategic bet — that this feature increases switching cost, not just usage |

## How to use this in practice

Recommend instrumenting **engagement capture quality** and **lead outcomes** first, ahead of broad rollout — per the pilot recommendation closing [15-commercial-impact.md](15-commercial-impact.md), these are the metrics that validate or invalidate the product's core mechanism before further investment, and should gate the MVP → V2 decision in [13-feature-prioritization.md](13-feature-prioritization.md) rather than adoption volume alone.
