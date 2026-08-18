# 10 — AI Feature Proposals

AI opportunities organized by lifecycle stage, each tied back to a concrete downstream consumer elsewhere in the doc set.

## Before the broadcast

| Feature | What it does | Feeds |
|---|---|---|
| Talking-point generation | Drafts 3–5 discussion points from the property record (features, area, price positioning) | Agent prep panel, [08-user-journeys.md](08-user-journeys.md) §2 |
| Promo copy generation | Per-platform caption/promo text, tuned to each platform's format norms (short vertical-friendly for TikTok/Reels, longer for Facebook) | Pre-live journey |
| Best-time-to-go-live suggestion | Uses historical engagement data (per agent/area) to recommend a start time | Pre-live journey |

## During the broadcast

| Feature | What it does | Feeds |
|---|---|---|
| Comment intent classification | Classifies each normalized `EngagementEvent` as question / viewing request / valuation ask / spam | Core mechanism behind [09-crm-integration.md](09-crm-integration.md) lead/task creation |
| Priority triage queue | Surfaces high-intent comments to the agent in real time so nothing gets buried in a fast-moving feed | Live dashboard, [12-ux-wireframes.md](12-ux-wireframes.md) |
| Live captioning/translation (optional) | Auto-captions the stream and optionally translates viewer questions | V2/future — see [13-feature-prioritization.md](13-feature-prioritization.md) |

## After the broadcast

| Feature | What it does | Feeds |
|---|---|---|
| Highlight clip generation | Cuts short vertical clips from the recording for repurposing to Reels/Shorts/TikTok | Directly answers the market gap in [02-market-research.md](02-market-research.md): short-form video (<60s) drives 2.5x more shares, but only 26% of agents consistently produce video content today |
| Transcript + searchable summary | Full transcript, indexed for later search/reference | Recording `Asset` object in [09-crm-integration.md](09-crm-integration.md) |
| Engagement-based lead scoring | Scores leads by behavior during the stream (asked a question vs. reacted only vs. requested a viewing) | Feeds existing CRM lead-scoring/nurture pipeline |
| Suggested follow-up sequence per lead | Pre-selects a nurture template based on classified intent (viewing request vs. valuation ask get different sequences) | [09-crm-integration.md](09-crm-integration.md) follow-up automation |

## Classification approach (technical note)

Comment intent classification is a short-context, low-latency classification task, well suited to a small/cheap model tier rather than a frontier reasoning model — this materially affects the cost model in [14-cost-estimation.md](14-cost-estimation.md). Talking-point/promo generation and post-broadcast summaries are longer-context generation tasks better suited to a mid-tier model. Transcription is a distinct, separately-priced service (speech-to-text, not an LLM call).

## Build sequencing implication

Comment intent classification is the highest-leverage AI feature — it's the mechanism that makes the entire CRM-integration value proposition real, not a nice-to-have layered on top. It should be built and validated for accuracy before investing in the "nicer to have" generation features (talking points, promo copy, highlight clips), which are valuable but not load-bearing for the core pitch in [01-product-discovery.md](01-product-discovery.md). This ordering is reflected in [13-feature-prioritization.md](13-feature-prioritization.md).

## Accuracy and trust

Misclassification has a real cost: a false-positive "viewing request" creates a low-quality CRM lead, and a false negative silently loses a real buyer signal — the exact failure mode Lifesycle Live is meant to solve, so getting this wrong undermines the entire product. This is why [09-crm-integration.md](09-crm-integration.md) recommends defaulting new brokerages to confirmation-required rather than full auto-create, and why "engagement capture quality" is proposed as a first-class KPI in [16-success-metrics.md](16-success-metrics.md).
