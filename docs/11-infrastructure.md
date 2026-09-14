# 11 — Infrastructure Recommendations

Covers the Media Ingest / Restream Relay layer from [06-system-architecture.md](06-system-architecture.md): streaming, storage, recordings, scalability, reliability.

> **2026-09 deepening note**: the original version of this doc covered the RTMPS media relay
> in the abstract. The implemented server (`server/`) has since exposed a second, more
> immediate infrastructure gap: comment/engagement **ingestion** — not the media relay — is
> the part of the system that is actually built and running today, and its current
> architecture is a single point of failure. This revision adds a concrete remediation path
> for that, reconciled against the real code in `server/src/services/ingestionService.ts`,
> `server/src/data-source.ts`, and `server/src/env.ts`. Note also: the DB is **Supabase
> Postgres**, not Oracle — any Oracle-era assumption elsewhere in the doc set is stale.

## Build vs. buy: RTMPS ingest/relay

| Option | Pros | Cons |
|---|---|---|
| Self-hosted (nginx-rtmp, SRS, OvenMediaEngine) | Full control, potentially lower marginal cost at very high volume | Team owns uptime/scaling/security of a real-time media pipeline — a specialist discipline; directly conflicts with the reliability risk flagged in [07-risk-analysis.md](07-risk-analysis.md) ("agent-facing, embarrassing failure mid-broadcast") |
| Managed (Mux, AWS IVS, Cloudflare Stream) | SLA-backed, encoding/transcoding handled, faster to ship, lets engineering focus on the CRM-integration layer that's the actual differentiator | Per-minute cost at scale; less control over edge cases |

**Recommendation: start managed.** The differentiated value of Lifesycle Live is the CRM integration and engagement pipeline (per [01](01-product-discovery.md) non-goals — "not building a competing general-purpose streaming platform"), not the media relay itself. Revisit self-hosting only if usage volume makes the managed cost structure a genuine problem.

### Indicative pricing (for cost modeling, confirm against current vendor rate cards at build time)

- **Cloudflare Stream**: ~$1 / 1,000 minutes stored + ~$5 / 1,000 minutes delivered, no separate encoding fee, RTMPS ingest included at the same per-minute rate [[Cloudflare Stream pricing]](https://blog.blazingcdn.com/en-us/cloudflare-streaming-pricing-2025-breakdown-live-vod).
- **Mux**: ~$0.07/min encoding + ~$0.025/min delivery — roughly 5–8x Cloudflare's cost, but strongest analytics tooling [[Video streaming pricing comparison]](https://www.buildmvpfast.com/api-costs/video).
- **AWS IVS / MediaConvert+CloudFront**: comparable range (~$80–$200/month for a normalized 100k delivery-minute + 10k stored-minute workload), best if the org is already deep in the AWS ecosystem [[Video streaming pricing comparison]](https://www.buildmvpfast.com/api-costs/video).

Given Lifesycle's likely usage shape (many short, low-concurrency broadcasts rather than few high-volume ones), Cloudflare Stream's flat per-minute model is the cheapest starting default; Mux is worth a second look once analytics depth (viewer retention curves, QoE data) becomes a product requirement.

## Recording storage & retention

- Every broadcast produces one canonical recording (per the shared-relay design in [06](06-system-architecture.md)), regardless of how many platforms it published to.
- Retention policy needs a legal sign-off, not just a technical default — ties directly to the consent/data-handling risk in [07-risk-analysis.md](07-risk-analysis.md). Recommend configurable per-brokerage retention windows rather than one hardcoded global policy, since consent and data-retention obligations vary by jurisdiction.
- Cross-border storage location should follow the same jurisdictional logic noted in [07](07-risk-analysis.md).

## Scalability

- Concurrency profile is "many small broadcasts," not "few massive ones" — a brokerage with 50 agents might have a handful going live at any moment, each with a modest viewer count. This favors managed infrastructure with elastic per-broadcast provisioning over a fixed-capacity self-hosted cluster.
- The adapter architecture in [06](06-system-architecture.md) means scaling a new platform integration doesn't require re-architecting the relay — it's an additive adapter.
- YouTube API quota (flagged in [05-api-research.md](05-api-research.md)) is the one hard external scaling constraint that needs a proactive quota-increase request from Google ahead of any broad rollout, not just organic monitoring.

## Reliability

- Target: managed relay SLA (check current vendor SLA commitments at contract time) should exceed what a small in-house ops team could realistically guarantee for a real-time media pipeline.
- Fallback behavior when the relay degrades: per the edge case in [08-user-journeys.md](08-user-journeys.md), the agent needs a clear, immediate failure signal and a manual continuation path (e.g., "continue directly in the platform's own app") rather than a silent drop.
- Adapter health monitoring: automated checks per platform adapter (per the mitigation in [07-risk-analysis.md](07-risk-analysis.md)) so a platform-side API change is caught by monitoring before it's caught by an agent mid-broadcast.

## Summary recommendation

Start with a managed streaming vendor (Cloudflare Stream as default, Mux if analytics depth is prioritized) for the relay/recording layer, keep retention policy brokerage-configurable rather than hardcoded, secure YouTube API quota ahead of scale, and invest in adapter health monitoring as a standing operational practice rather than a one-time launch task.
