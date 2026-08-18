# 07 — Risk Analysis

## Technical / platform-dependency risk

| Risk | Likelihood | Impact | Notes / mitigation |
|---|---|---|---|
| TikTok revokes or never grants usable access | High — already happened to Streamlabs, StreamElements, Restream.io in Jan 2026 [[Streamlabs advisory]](https://support.streamlabs.com/hc/en-us/articles/35259691237147-Streamlabs-x-TikTok-Streaming-Access-Revoked-Suspended) | Low if scoped correctly | Never make TikTok integration load-bearing (see [04](04-technical-feasibility.md)); ship it as an optional, independently-disableable module |
| Instagram tightens Graph API further (it already excludes personal accounts and caps at ~200 calls/hr, 25 posts/day) [[Instagram API Pricing 2026]](https://www.getphyllo.com/post/instagram-api-pricing-explained-iv) | Medium | Medium | Design the Instagram adapter as post-hoc/assisted only from day one, so a further tightening degrades gracefully rather than breaking a promised feature |
| LinkedIn's June 2026 mandatory-advance-scheduling rule interacts badly with a "one-click, right now" UX [[LinkedIn scheduling rule]](https://www.netinfluencer.com/linkedin-to-require-advance-scheduling-for-all-live-streams-starting-june/) | Certain (already announced) | Low | Product copy and UX must clearly present LinkedIn as "schedule ahead," not "go live now," so the constraint is platform policy, not a Lifesycle bug |
| YouTube API quota exhaustion at scale | Medium | Medium | Request a Google quota increase before broad rollout; monitor per-agent broadcast volume against allocation |
| Meta app review rejection or permission revocation for Live Video Publishing | Low–Medium | High (blocks the strongest MVP platform) | Apply early, follow Meta's use-case documentation precisely, maintain a compliance contact for review appeals |
| RTMPS relay/media-ingest outage during a live broadcast | Low (assuming a managed provider) | High (agent-facing, embarrassing failure mid-broadcast) | Use a managed, SLA-backed media service (see [11-infrastructure.md](11-infrastructure.md)) rather than self-hosting the ingest path in early versions |
| Any single platform silently changes API behavior without notice (common industry pattern per research) | Medium, ongoing | Medium per incident | The adapter-isolation architecture in [06](06-system-architecture.md) exists specifically to contain this — monitor each adapter with automated health checks |

## Legal / privacy risk

- **Recording consent**: live broadcasts capture the agent, potentially the property owner/occupants, and viewer comments containing personal data (names, phone numbers volunteered in chat). Consent and disclosure requirements (e.g., UK/EU GDPR, and equivalent regimes wherever Lifesycle operates) must be addressed before recording starts — likely a pre-broadcast consent/disclosure step in the product, not just a policy document.
- **Comment/lead data provenance**: converting a public platform comment into a CRM lead record means importing personal data from a third-party platform into Lifesycle's systems. This needs a documented lawful basis and should respect each platform's developer terms on data use and retention (not just general privacy law) — Meta and Google both impose their own data-use restrictions on API-sourced data in their developer agreements, independent of GDPR.
- **Minors and safeguarding**: open comment sections on public listings can include anyone; standard platform-level moderation tools (see below) need to be paired with Lifesycle's own basic content-safety filtering before AI auto-converts a comment into a lead record.
- **Cross-border data transfer**: if Lifesycle's ingest/storage infrastructure is hosted outside the customer's jurisdiction, standard cross-border transfer safeguards apply to both the video recordings and the captured engagement data.

## Moderation risk

- Platforms differ sharply in what moderation tooling is exposed: Facebook and YouTube both expose real API-level comment/ban controls (comment CRUD, `liveChatBans`/`liveChatModerators`); Instagram is standard comment tools only (no live-specific moderation API found in research); TikTok has none available to a third party at all [[YouTube moderation]](https://developers.google.com/youtube/v3/live/docs/liveBroadcasts) — see [05](05-api-research.md) cross-platform table.
- **Mitigation**: build one moderation UX in Lifesycle that operates uniformly over the normalized `EngagementEvent` stream (hide/flag/convert-to-lead), and let each adapter implement "push the hide/ban action back to the source platform" only where the platform actually supports it — falling back to "hide within Lifesycle only" elsewhere. This must be surfaced honestly in the UI (agents need to know when a "hide" only hides locally vs. also hides on the live platform).
- **Reputational risk**: an offensive or off-topic comment left unmoderated on a Lifesycle-orchestrated broadcast reflects on both the agent and the Lifesycle brand — moderation latency (webhook-driven platforms will be much faster than poll-driven ones) should be an explicit product SLA per platform.

## Platform dependency / business risk

- The product's differentiated value depends on API access Lifesycle does not control. A single platform's policy shift can invalidate a chunk of the roadmap with no notice — this already happened in-market in January 2026 to comparable third-party streaming tools on TikTok.
- **Mitigation strategy**: 
  1. Never present any single platform's integration as mission-critical to the core value proposition — the CRM-native lead capture and AI assistance must hold value even if every "assisted" (non-one-click) platform integration were removed tomorrow.
  2. Maintain adapter health monitoring and a clear internal escalation path when a platform's API behavior changes.
  3. Budget ongoing engineering capacity for adapter maintenance as a permanent cost line (see [14-cost-estimation.md](14-cost-estimation.md)), not a one-time build.

## Risk register summary

| Category | Highest-severity risk | Owner recommendation |
|---|---|---|
| Technical | TikTok/Instagram access instability | Product: keep these platforms non-critical by design |
| Legal | Recording/comment consent & cross-border data handling | Legal + Product: build consent step into MVP flow, not deferred |
| Moderation | Inconsistent moderation capability across platforms | Product + Eng: uniform in-CRM moderation UX with honest capability disclosure |
| Business | Dependency on third-party platform goodwill | Leadership: treat as an ongoing operational risk, not a one-time integration risk |
