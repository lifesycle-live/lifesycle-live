# Lifesycle Live™ — Research & Product Discovery

Status: **Complete.** Both Phase 1 (decision-critical research) and Phase 2 (execution-detail docs) are fully written.

## Mission recap

Research, validate, and design the concept of Lifesycle Live™ — a live-streaming platform integrated into the Lifesycle CRM that lets estate agents go live with one click while the CRM automatically captures engagement, generates leads, and applies AI before, during, and after every broadcast. This is a **research and product-proposal exercise**, not a build — the goal is to give engineering and business leadership what they need to decide whether and how to build it.

## Document set

### Phase 1 — decision-critical (complete)

| # | Document | Answers |
|---|---|---|
| 01 | [Product Discovery](01-product-discovery.md) | What are we building, for whom, and why |
| 02 | [Market Research](02-market-research.md) | How real estate already uses live video; demand signals |
| 03 | [Competitor Analysis](03-competitor-analysis.md) | Who else does this, how well, and the gap Lifesycle can fill |
| 04 | [Technical Feasibility](04-technical-feasibility.md) | Can "one-click" live actually work per platform |
| 05 | [API Research](05-api-research.md) | Auth, ingest, chat, webhooks, limits per platform |
| 06 | [System Architecture](06-system-architecture.md) | High-level architecture proposal |
| 07 | [Risk Analysis](07-risk-analysis.md) | Technical, legal, moderation, platform-dependency risk |

### Phase 2 — execution detail (complete)

| # | Document | Answers |
|---|---|---|
| 08 | [User Journeys](08-user-journeys.md) | Pre/live/post lifecycle, diagrammed |
| 09 | [CRM Integration Proposal](09-crm-integration.md) | How leads/comments/appointments/tasks map to CRM objects |
| 10 | [AI Feature Proposals](10-ai-features.md) | AI before/during/after the broadcast |
| 11 | [Infrastructure Recommendations](11-infrastructure.md) | Streaming, storage, scaling, reliability |
| 12 | [UX/UI Wireframes](12-ux-wireframes.md) | Agent and viewer flow wireframes |
| 13 | [Feature Prioritisation](13-feature-prioritization.md) | MVP / V2 / roadmap |
| 14 | [Cost Estimation](14-cost-estimation.md) | Infra, third-party, AI, ops costs |
| 15 | [Commercial Impact](15-commercial-impact.md) | Business value case |
| 16 | [Success Metrics & KPIs](16-success-metrics.md) | Adoption and product-success measures |
| 17 | [Final Presentation](17-final-presentation.md) | Leadership pitch narrative |

**Start here if short on time**: [17-final-presentation.md](17-final-presentation.md) is the synthesized leadership pitch covering every other document.

## Headline finding (read this first)

True one-click "start a live broadcast on Facebook, Instagram, TikTok, YouTube, Zoom, and LinkedIn simultaneously" is **not uniformly achievable** because the platforms differ sharply in what they open to third-party apps:

- **Feasible today via official APIs**: Facebook Live (Graph API Live Video API + RTMPS), YouTube Live (Live Streaming API), Zoom (RTMP restream out of a Zoom meeting/webinar).
- **Feasible only through an approved partner tier / RTMP relay, not a direct native API**: LinkedIn Live (must go through an approved broadcast partner or generic RTMP ingest; advance scheduling now mandatory).
- **Not feasible as a genuine one-click native integration**: Instagram Live (no public third-party "start a live broadcast" API — only RTMP via Instagram's own Live Producer for Business/Creator accounts, not app-triggerable) and TikTok Live (no official public live-broadcasting API at all; third-party PC streaming access has been actively revoked in 2026).

This reshapes the product: Lifesycle Live's realistic MVP is a **CRM-native broadcast studio with true one-click on Facebook, YouTube, and Zoom-sourced RTMP restreaming**, plus **"assisted" (not one-click) flows for Instagram, TikTok, and LinkedIn** where the agent starts the stream in the platform's own app/tool and Lifesycle attaches to it for chat capture, analytics, and lead automation. See [04-technical-feasibility.md](04-technical-feasibility.md) for the full per-platform breakdown.
