# 17 — Final Presentation: Pitching Lifesycle Live™ to Leadership

*A narrative pitch synthesizing docs 01–16. Written to be presented, not just read.*

---

## 1. The problem

Estate agents already go live — on Facebook, Instagram, TikTok, YouTube, Zoom. But every one of those broadcasts happens *outside* the CRM. The comments, the "is this still available?", the "can I book a viewing?" — it all either gets manually copied in afterward, or it's simply lost.

We already know agents will use video: 89% use Facebook, 65% Instagram, and TikTok usage doubled year-over-year to 28% [[02-market-research.md](02-market-research.md)]. We know video works: 403% more inquiries, 73% of sellers prefer video-using agents. And we know the capture problem is real and already costly — even structured, in-person open-house tools capture under 30% of visitor leads. Nobody has solved this for the *live* case.

## 2. The gap

We checked. Every major real estate CRM — BoldTrail, Follow Up Boss, Lofty, BoomTown — is racing on AI lead-scoring and qualification. None of them treat a live broadcast as a CRM event [[03-competitor-analysis.md](03-competitor-analysis.md)]. Matterport and Zillow's 3D tools are excellent — and entirely pre-recorded, zero interactivity. The closest proof-of-model is outside our industry entirely: live-commerce platforms like CommentSold have driven ~$4B in sales on exactly this mechanic — live chat converting into a structured backend record — for retail. Nobody has built it for property.

This is white space, not a feature race we're entering late.

## 3. The honest technical plan

We did not assume "one-click to everywhere" was achievable — we checked every platform's actual API [[04-technical-feasibility.md](04-technical-feasibility.md), [05-api-research.md](05-api-research.md)]:

- **Facebook, YouTube, Zoom**: full, documented, sanctioned APIs. True one-click is achievable and buildable now.
- **LinkedIn**: only via an approved broadcast partner, and only scheduled — LinkedIn removed instant live entirely from June 2026.
- **Instagram**: no third-party publish API exists at all. Agents start natively; we listen and assist around it.
- **TikTok**: no official API exists. Third-party access has already been revoked industry-wide once this year. We will never depend on it.

We are not overpromising. The MVP pitch is: **one-click on the platforms that support it, full CRM capture and AI assistance on every platform regardless.**

## 4. The architecture

One design absorbs all of that platform variance: every platform — however we reach it — feeds a single normalized `EngagementEvent` pipeline. AI classifies each comment (question / viewing request / valuation ask / spam). High-intent events become CRM leads and tasks automatically or with one-click confirmation. The platform-specific mess lives in isolated adapters; nothing else in the system needs to know or care whether a given comment arrived via webhook, polling, or a post-event batch pull [[06-system-architecture.md](06-system-architecture.md)].

## 5. The roadmap

**MVP**: Facebook + YouTube one-click, Zoom relay, the classification-and-capture engine, basic AI prep, recording + transcript, mandatory consent disclosure.
**V2**: LinkedIn via partner relay, Instagram assisted mode, highlight-clip generation, brokerage admin dashboard.
**Future**: TikTok, kept permanently optional and disableable — never load-bearing [[13-feature-prioritization.md](13-feature-prioritization.md)].

## 6. The economics

The unit economics are not the risk. At MVP scale, streaming infra and AI processing together run roughly **$4.64 per agent per month** [[14-cost-estimation.md](14-cost-estimation.md)] — a rounding error against what this feature could do for retention and lead volume. The real, ongoing cost is engineering attention to keep third-party adapters healthy as platforms change their APIs — which we've already seen happen once this year to comparable tools on TikTok. That's a budgetable, predictable line item, not an open-ended risk, provided we resource it as a standing responsibility [[07-risk-analysis.md](07-risk-analysis.md)].

## 7. The business case

- For agents: less manual work, more captured leads, a reason to finally close the video-adoption gap (only 26% currently use video consistently, despite 73% of sellers wanting it).
- For Lifesycle: a workflow-embedded feature that increases switching cost, cross-sells into our existing nurture engine, and is currently unmatched by any competitor.
- Packaging: leans toward bundling into an existing higher CRM tier to maximize adoption and defensive value — pending real willingness-to-pay validation [[15-commercial-impact.md](15-commercial-impact.md)].

## 8. The ask

This research validates the concept is technically sound, commercially differentiated, and honestly scoped. What it cannot validate from public research alone is real-world classification accuracy and lead-conversion rates with our own agents and our own CRM.

**The ask**: approve a small internal pilot — a handful of agents, MVP-scope platforms only (Facebook + YouTube) — to validate the two assumptions the entire commercial case rests on: that AI can classify live comments accurately enough to trust, and that broadcast-sourced leads convert at a rate that justifies the investment. Everything in this research points toward yes. The pilot is how we find out before committing to the full build.

---

*Supporting detail for every claim above is in [00-index.md](00-index.md) and the linked research documents.*
