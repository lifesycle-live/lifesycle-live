# 06 — High-Level System Architecture

This is a proposal, not a build spec — intended to show engineering leadership that the platform constraints in [04](04-technical-feasibility.md)/[05](05-api-research.md) can be absorbed by one coherent design rather than one-off integrations per platform.

## Design principle

Every platform, whether it's a true one-click RTMPS publish (Facebook, YouTube) or an agent-native stream Lifesycle merely attaches to (Instagram, TikTok, LinkedIn), should look the same to the rest of the CRM: a **Broadcast** entity with a stream of **Engagement Events** (comments, reactions, viewing requests) flowing into the CRM's existing lead/task pipeline. The integration-specific complexity is isolated in one layer; nothing above it should need to know whether a given platform was "pushed to" or "listened to."

## Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Lifesycle CRM core (existing)                                  │
│  Contacts · Properties · Leads · Tasks · Appointments · Valuations│
└───────────────▲─────────────────────────────────────────────────┘
                 │ structured events (lead created, task created, ...)
┌───────────────┴─────────────────────────────────────────────────┐
│  Engagement Pipeline                                             │
│  - Comment/reaction ingestion & normalization                    │
│  - Intent classification (AI): question / viewing request /      │
│    valuation ask / spam                                          │
│  - Lead/task creation + de-dup against existing contacts         │
└───────────────▲─────────────────────────────────────────────────┘
                 │ normalized "Engagement Event" objects
┌───────────────┴─────────────────────────────────────────────────┐
│  Broadcast Orchestration Layer                                   │
│  - Broadcast entity (property, agent, start/end, platforms[])    │
│  - Per-platform adapter interface: publish() / listen() /        │
│    end() / fetchRecording()                                      │
└──┬─────────┬─────────┬─────────┬─────────┬─────────┬────────────┘
   │         │         │         │         │         │
┌──▼──┐   ┌──▼───┐  ┌──▼──┐   ┌──▼────┐ ┌──▼──────┐ ┌▼───────┐
│ FB   │   │YouTube│  │Zoom │   │LinkedIn│ │Instagram│ │TikTok  │
│adapter│  │adapter│  │adapter│ │adapter │ │adapter  │ │adapter │
│(publish│  │(publish│ │(relay │ │(RTMP   │ │(listen- │ │(listen-│
│ + RTMPS│  │+ RTMPS)│ │source/│ │via     │ │only,    │ │only,   │
│ +      │  │+ chat  │ │restream│ │partner)│ │post-hoc │ │experi- │
│ webhook)│  │poll)  │  │target)│ │        │ │Graph API)│ │mental) │
└───┬───┘   └───┬───┘  └───┬───┘ └───┬────┘ └───┬─────┘ └───┬────┘
    │           │          │         │          │           │
    └───────────┴──────────┴─────────┴──────────┴───────────┘
              Media Ingest / Restream Relay (RTMPS server,
              e.g. self-hosted or managed like Mux/AWS IVS)
                          + Recording storage
```

### Broadcast Orchestration Layer
Owns the `Broadcast` object (which property, which agent, which platforms, scheduled vs. instant, status). Exposes a uniform adapter interface so every platform integration implements the same four operations, even though what happens underneath differs enormously (compare Facebook's `publish()` — call the Graph API and start pushing RTMPS — against Instagram's `publish()` — which can only mean "show the agent instructions to start natively in-app and register that a broadcast is now associated with this property").

### Per-platform adapters
Each adapter encapsulates exactly the platform-specific behavior documented in [05-api-research.md](05-api-research.md): auth flow, ingest mechanism (RTMPS push vs. relay-through-Zoom vs. no push at all), comment retrieval (webhook-pushed vs. polled vs. unavailable), and recording retrieval. New platforms are added by writing one new adapter, not by touching the orchestration layer or the engagement pipeline.

### Media ingest / restream relay
A central RTMPS ingest point (self-hosted media server, or a managed service such as Mux, AWS IVS, or Cloudflare Stream) that the agent's camera/browser pushes to once; the relay fans that single stream out to every platform whose adapter supports true publish (Facebook, YouTube), and separately records it for the CRM's own on-demand playback and AI post-processing. This avoids the agent's device needing multiple simultaneous upload connections and centralizes recording capture regardless of platform mix.

### Engagement Pipeline
Normalizes every inbound comment/reaction/question — regardless of source platform or whether it arrived via webhook (Facebook) or polling (YouTube) or a post-event batch pull (Instagram) — into one `EngagementEvent` schema, then runs AI intent classification (see [10-ai-features.md](10-ai-features.md), Phase 2) to decide whether an event should become a CRM lead, a task ("book a viewing"), or be ignored (spam/small talk). De-duplicates against existing CRM contacts by matching platform identity to known contact records where possible.

### CRM core
Unchanged in shape — Broadcasts and Engagement Events simply become new sources feeding the CRM's existing Lead, Task, and Appointment objects, the same way a web form or portal enquiry does today. Full mapping detail is Phase 2 ([09-crm-integration.md](09-crm-integration.md)).

## Why this shape

- **Isolates platform volatility**: TikTok's 2026 access revocations, or a future Instagram policy change, is contained to one adapter — it cannot ripple into the CRM data model or the lead pipeline.
- **Makes the "honest one-click" promise from [04](04-technical-feasibility.md) implementable**: adapters can differ wildly in capability without the product surface (or the CRM schema) needing to special-case each platform.
- **Reuses one recording/storage path** regardless of how many platforms a given broadcast touched, simplifying AI post-processing (clip generation, transcript, highlight detection) to operate on one canonical recording rather than N platform-specific ones.

Infrastructure sizing, vendor choice for the media relay, and storage/retention policy are covered in Phase 2 ([11-infrastructure.md](11-infrastructure.md)).
