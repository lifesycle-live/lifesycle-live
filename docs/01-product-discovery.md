# 01 — Product Discovery

## Problem statement

Estate agents already broadcast live property tours on Facebook Live, Instagram Live, TikTok Live, YouTube Live, and Zoom — but each of those platforms runs completely outside the CRM. Every comment, question, viewing request, and buyer signal generated during a live event either has to be manually copied into the CRM afterward or is simply lost. There is no system today that treats a live broadcast as a *CRM event* with leads, tasks, and follow-ups attached to it automatically.

## Vision

Lifesycle Live™ turns a live property broadcast into a first-class CRM object. An agent starts a broadcast from inside Lifesycle; every comment, reaction, and question streaming in is captured against the right contact and property record in real time; viewing requests and valuation asks become tasks and leads without manual re-entry; and AI assists the agent before the stream (prep, talking points, promotion), during it (real-time question triage, comment-to-lead conversion), and after it (highlight clips, follow-up sequences, lead scoring).

The product is not "a video player embedded in the CRM." It's the CRM's engagement pipeline extended to wherever the audience already is — Facebook, Instagram, TikTok, YouTube, LinkedIn, Zoom — with the CRM as the system of record for everything that happens in the chat.

## Target users

- **Individual estate agents** — want to look professional going live without juggling five apps, and want leads captured automatically instead of scrolling old comment threads.
- **Agency / brokerage admins** — want visibility into which agents are running live events, how many leads each produces, and consistent branding across every stream.
- **Marketing teams within larger agencies** — want live events to feed the same lead-scoring and nurture workflows as web forms and portal enquiries, and want repurposable recorded content (clips, highlight reels).
- **Buyers/viewers (indirect users)** — benefit from a smoother way to ask questions and request a viewing without leaving the platform they're already watching on; they are not asked to install or log into anything new.

## Goals

- Make going live from the CRM meaningfully faster and lower-friction than doing it manually per platform.
- Capture every comment/question/reaction from every connected platform into one unified, per-property, per-contact conversation record.
- Convert live engagement (a comment like "is this still available?", a "🙋 book me a viewing") into CRM leads/tasks automatically, not via manual triage.
- Give agents AI assistance at each stage of the lifecycle rather than just a raw video pipe.
- Be honest, per platform, about what "one-click" can and cannot mean given real platform API constraints (see [04-technical-feasibility.md](04-technical-feasibility.md)) — the product must not overpromise a unified experience the underlying APIs don't support.

## Non-goals (for this research phase / likely MVP)

- Not building a competing general-purpose streaming/video platform (no aim to out-produce Zoom or Restream on production quality).
- Not attempting to reverse-engineer or scrape platforms that provide no official API (e.g., unofficial TikTok chat libraries) for the production product — reference to those in research is for awareness only, not a build recommendation.
- Not solving in-stream commerce/payments in v1 — the wedge is lead capture and CRM automation, not transactions (unlike Whatnot/CommentSold, see [03-competitor-analysis.md](03-competitor-analysis.md)).
- Not promising simultaneous true one-click multistreaming to every platform in MVP — phased per platform based on feasibility.

## Why now

- Video listings drive materially more inquiries than static listings, and the majority of agents who use live/video report it changes seller decisions in their favour (see [02-market-research.md](02-market-research.md) for cited figures).
- Every major real-estate CRM competitor is investing in AI-assisted lead workflows, but none currently treat live streaming as a native CRM event — this is an open gap (see [03-competitor-analysis.md](03-competitor-analysis.md)).
- Live-commerce platforms (Whatnot, CommentSold, TalkShopLive) have already proven that "chat during a live stream converts to structured leads/orders" is a viable product pattern outside real estate — Lifesycle Live adapts that pattern to property, appointments, and valuations instead of checkout.
