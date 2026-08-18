# 12 — UX/UI Wireframes

ASCII/structural wireframes for the key screens identified in [08-user-journeys.md](08-user-journeys.md). These are layout proposals to validate direction, not final visual design — recommend a follow-up Figma pass once this direction is signed off.

## 1. "Go Live" setup screen (agent)

```
┌─────────────────────────────────────────────────────────────┐
│ ← 42 Willow Street               Lifesycle Live setup        │
├─────────────────────────────────────────────────────────────┤
│  AI PREP                                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Talking points (edit before going live)                │  │
│  │ • Renovated kitchen, 2023                               │  │
│  │ • Walking distance to Green Park station                │  │
│  │ • Offers over £450,000                                  │  │
│  │ [Regenerate]                          [Edit]            │  │
│  └───────────────────────────────────────────────────────┘  │
│  Suggested time: Today 6:30pm (based on your past engagement)│
├─────────────────────────────────────────────────────────────┤
│  SELECT PLATFORMS                                            │
│  ✅ Facebook Live        one-click · starts instantly        │
│  ✅ YouTube Live         one-click · starts instantly        │
│  ⬜ Zoom (private/webinar) one-click · starts instantly       │
│  ⬜ Instagram Live       you start this in Instagram —        │
│                          we'll capture comments after         │
│  ⬜ TikTok Live          you start this in TikTok — chat       │
│                          capture is experimental (beta)       │
│  ⬜ LinkedIn Live        must be scheduled in advance          │
├─────────────────────────────────────────────────────────────┤
│                [ Schedule for later ]  [ ▶ Go Live Now ]     │
└─────────────────────────────────────────────────────────────┘
```

Key design decision carried from [04-technical-feasibility.md](04-technical-feasibility.md): the platform checklist explicitly labels each platform's actual mechanism instead of presenting a uniform "select platforms" list — this is a deliberate honesty constraint, not a placeholder.

## 2. Live dashboard (agent, during broadcast)

```
┌─────────────────────────────────────────────────────────────┐
│ ● LIVE  00:14:32          42 Willow Street       [ End live ]│
├───────────────────────────────┬─────────────────────────────┤
│                                 │ ENGAGEMENT FEED             │
│                                 │ 🔴 live  Facebook            │
│         [ video preview ]      │ ┌───────────────────────┐   │
│                                 │ │ Sarah T: Is this still │   │
│                                 │ │ available?             │   │
│                                 │ │        [Convert→Lead]  │   │
│                                 │ └───────────────────────┘   │
│                                 │ ⏱ delayed ~15s  YouTube      │
│                                 │ ┌───────────────────────┐   │
│                                 │ │ Mike R: What's the     │   │
│                                 │ │ EPC rating?             │   │
│                                 │ │        [Convert→Task]  │   │
│                                 │ └───────────────────────┘   │
│                                 │ 🕓 pending  Instagram         │
│                                 │  comments available after    │
│                                 │  this stream ends            │
├───────────────────────────────┴─────────────────────────────┤
│ PRIORITY QUEUE (AI-flagged high intent)                      │
│ • Sarah T — viewing request — [Book viewing] [Dismiss]        │
└─────────────────────────────────────────────────────────────┘
```

Feed-freshness labels (🔴 live / ⏱ delayed / 🕓 pending) directly reflect the per-platform latency differences documented in [05-api-research.md](05-api-research.md) — webhook-driven (Facebook) vs. poll-driven (YouTube) vs. post-hoc-only (Instagram).

## 3. Post-broadcast summary (agent)

```
┌─────────────────────────────────────────────────────────────┐
│ Broadcast summary — 42 Willow Street — Aug 14, 6:30pm         │
├─────────────────────────────────────────────────────────────┤
│  👁 214 peak viewers   💬 38 comments   ✅ 6 leads captured    │
│                                                                 │
│  Highlight clips (auto-generated)                              │
│  [▶ 0:18 "renovated kitchen"] [▶ 0:24 "walking to station"]   │
│                                                                 │
│  New leads                                                     │
│  • Sarah T — viewing request — added to "Hot leads" sequence   │
│  • Mike R — general question — logged as activity              │
│                                                                 │
│  [ View full transcript ]           [ Download recording ]     │
└─────────────────────────────────────────────────────────────┘
```

## 4. Brokerage admin dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Lifesycle Live — Brokerage overview            This month ▾   │
├─────────────────────────────────────────────────────────────┤
│  Broadcasts: 47     Leads generated: 132     Active agents:9/12│
├─────────────────────────────────────────────────────────────┤
│  Agent          Broadcasts   Leads    Flagged comments        │
│  J. Alvarez      12           41        1                      │
│  R. Kim           9           28        0                      │
│  T. Osei          6           17        3 → [review]           │
├─────────────────────────────────────────────────────────────┤
│  Policy settings                                                │
│  Lead auto-create:  ○ Automatic   ● Requires agent confirmation │
│  Recording consent disclosure:  ● Required before every broadcast│
└─────────────────────────────────────────────────────────────┘
```

Policy toggles map directly to the admin-configuration options defined in [09-crm-integration.md](09-crm-integration.md).

## 5. Viewer-side experience

No dedicated Lifesycle UI — by design (per [08-user-journeys.md](08-user-journeys.md) §6), the viewer's entire experience is the native comment box on whichever platform they're watching on. The only Lifesycle-controlled surface reaching the viewer is the agent's reply text and any link the agent shares (e.g., a booking link), both authored from the agent's live dashboard.
