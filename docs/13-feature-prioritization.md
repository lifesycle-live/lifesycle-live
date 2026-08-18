# 13 — Feature Prioritisation

MVP / V2 / future roadmap, sequenced by feasibility ([04](04-technical-feasibility.md)), the AI build-order logic in [10-ai-features.md](10-ai-features.md), and risk posture in [07-risk-analysis.md](07-risk-analysis.md).

## MVP

| Feature | Why it's MVP |
|---|---|
| One-click publish to Facebook Live and YouTube Live | Only platforms with full, sanctioned, documented one-click APIs ([04](04-technical-feasibility.md)) |
| Zoom-sourced ingest/relay for private/webinar-style sessions | Feasible today, useful for valuation calls and small-group opens |
| Unified engagement pipeline + comment intent classification | The core, load-bearing AI feature ([10](10-ai-features.md)) — without this, there's no CRM differentiation at all |
| Lead/task creation from classified comments, confirmation-required by default | Delivers the central value proposition from [01-product-discovery.md](01-product-discovery.md) safely |
| Basic pre-live AI prep (talking points, promo copy) | Low-cost, high-visible-value, builds agent trust in the product early |
| Post-live recording + transcript | Foundation for highlight clips (V2) and required for compliance/audit ([07](07-risk-analysis.md)) |
| Recording-consent disclosure step | Non-negotiable given the legal risk in [07-risk-analysis.md](07-risk-analysis.md) — must ship with MVP, not after |

## V2

| Feature | Why it's V2, not MVP |
|---|---|
| LinkedIn Live via approved-partner RTMP relay | Requires a business-development/partner-approval process independent of engineering timeline ([05](05-api-research.md)); also scheduled-only per LinkedIn's June 2026 policy, so UX must already support scheduling flows built out first |
| Instagram "assisted" mode (pre/post AI support + post-hoc Graph API comment pull) | Valuable but not blocking — agents can go live on Instagram from day one and get value later once this ships |
| AI highlight-clip generation for Reels/Shorts repurposing | Depends on a validated transcript/recording pipeline from MVP being stable first |
| Brokerage-level admin oversight dashboard | Needed once there's real multi-agent usage data to show — premature before MVP has live usage |
| Auto-create (vs. confirmation-required) lead creation, as an opt-in | Only safe to offer once classification accuracy is proven in production ([10](10-ai-features.md) accuracy/trust note) |

## Future / opportunistic

| Feature | Why it's deferred |
|---|---|
| TikTok chat capture, explicitly experimental and independently disableable | No official API exists at all, and third-party access has already been revoked industry-wide once in 2026 ([07](07-risk-analysis.md)) — only worth building once TikTok's posture stabilizes, and must never be load-bearing |
| Live translation/captioning | Nice-to-have, not differentiating vs. the core lead-capture value prop |
| In-stream scheduling of viewings directly from AI-classified requests (self-serve booking link in agent's auto-reply) | Depends on calendar-integration maturity beyond this research's scope |

## Sequencing logic

1. Ship the platforms and the classification engine that make the product's central claim true (MVP).
2. Extend platform coverage where the extension requires partner relationships or degrades gracefully (V2).
3. Treat platforms with no reliable API (TikTok) as permanently optional, not "coming eventually" — this is a risk-management stance carried from [07-risk-analysis.md](07-risk-analysis.md), not a resourcing gap.

Final scoring against commercial value is in [15-commercial-impact.md](15-commercial-impact.md); cost implications per tier are in [14-cost-estimation.md](14-cost-estimation.md).
