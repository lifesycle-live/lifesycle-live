# 12 — UX/UI Wireframes

ASCII/structural wireframes for the key screens identified in [08-user-journeys.md](08-user-journeys.md). These were originally layout proposals; **this revision (2026-09) reconciles them with the actual built app** (`app/src/features/live/`, `app/src/features/report/`, `app/src/navigation/RootNavigator.tsx`) rather than only the original concept. Sections marked **AS BUILT** describe real, running screens; sections marked **NOT YET BUILT** are still proposals. See `PROGRESS.md` and `CLAUDE.md` (repo root) for current implementation status.

## 0. Navigation shell — AS BUILT, diverged from original proposal

The product originally implied a CRM-style multi-section nav (Live / Leads / Tasks, per an earlier draft of `CLAUDE.md`'s own app-architecture notes). **The app that actually shipped has two bottom tabs, not three:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                                │
│                     (active stack content)                    │
│                                                                │
├─────────────────────────────────────────────────────────────┤
│              ⌂ Live                    ▤ Report               │
└─────────────────────────────────────────────────────────────┘
```

- **Live** tab — a native-stack: Listings (`GoLiveSetupScreen`) → Property detail (`PropertyDetailScreen`) → Live studio (`LiveDashboardScreen`) → Summary (`BroadcastSummaryScreen`), plus `AddPropertyScreen` and `ConnectAccountsScreen` reached from a header button.
- **Report** tab — a native-stack: `ReportScreen` (Leads + Tasks folded into one screen, not two) → `ContactDetail` → `BroadcastSummary`.
- Leads and Tasks were never split into separate screens/tabs in the shipped app — `LeadListScreen`/`TaskListScreen` exist in `app/src/features/crm/` but `ReportScreen` renders both lists inline on one screen instead of routing to them, and the nav only exposes `ReportScreen`. Treat the original "CRM module" 3-screen plan as superseded by this single-screen Report design.
- The tab bar is hidden entirely while the live studio is in landscape/full-screen mode (`useStudioLayout().landscape` — see §2c) so the immersive camera overlay isn't fighting the tab bar for screen space.
- On web at ≥600px width, the whole app renders inside a decorative phone-frame chrome (`MobileShell.tsx`) — a cosmetic "device mockup" wrapper, not a separate layout; it rotates to a landscape phone shape when the live studio goes full-screen. Below 600px width (or on native), the app fills the viewport directly with no frame.
- There is a `LoginScreen` gating all of the above — unauthenticated users never reach the tab navigator (`RootNavigator` renders `LoginScreen` while `useAuthStore().status === "signedOut"`). The original docs didn't cover auth UI at all since the login flow was added after this doc's first pass.

## 1. Listings screen (agent) — AS BUILT, replaces the original "Go Live setup" screen

The original wireframe below folded browsing, AI prep, platform selection, and the go-live action into a single screen. **The shipped app splits this into two screens** — a listings browser (this section) and a property detail / go-live screen (§1b). There is currently no scheduling feature (`[ Schedule for later ]` in the original mock) — broadcasts only ever start immediately; "schedule" was never built past `Broadcast.status = "scheduled"` existing as a transient state before `live`/`failed`.

```
┌─────────────────────────────────────────────────────────────┐
│ Listings                                        [ Accounts ] │
├─────────────────────────────────────────────────────────────┤
│  [ ＋ Add property ]                                          │
│  [ 🔍 Search address or property type            ]           │
│  Your properties                              12 properties  │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ [ photo gallery — swipeable, dot indicator ]           │  │
│  │ PROPERTY                          Prepare live tour →  │  │
│  │ £450,000                                                │  │
│  │ 42 Willow Street                                        │  │
│  │ 3 bedrooms   2 bathrooms   View details →               │  │
│  └───────────────────────────────────────────────────────┘  │
│  (more property cards, scrollable)                            │
└─────────────────────────────────────────────────────────────┘
```

- Header-right "Accounts" pill navigates to `ConnectAccountsScreen` (§0b) from anywhere in the Live stack's root.
- Each card's photo block is a real swipeable gallery (`PhotoGallery`) over `property.images[]`, falling back to a single `imageUrl`/`thumbnailUrl` when no gallery exists.
- Tapping a card goes to Property detail, not directly into a go-live flow.
- "＋ Add property" opens `AddPropertyScreen` (a plain create-listing form — not wireframed here, no AI-specific UI beyond the rest of the app's forms).

## 1b. Property detail / go-live screen (agent) — AS BUILT

This is where the original doc's AI-prep-panel + platform-checklist + go-live-button design actually lives now.

```
┌─────────────────────────────────────────────────────────────┐
│ ← Property details                                            │
├─────────────────────────────────────────────────────────────┤
│  [ photo gallery ]                                            │
│  £450,000                                                     │
│  42 Willow Street                                              │
│  [3 bed] [2 bath] [House]                                     │
│  Renovated kitchen, bright reception room, walk to station…   │
│  ✓ Garden  ✓ Parking  ✓ EPC C                                 │
├─────────────────────────────────────────────────────────────┤
│  AI PREP  (AiPrepPanel — loading / real data, no mock text)   │
├─────────────────────────────────────────────────────────────┤
│  WHERE TO GO LIVE                                              │
│  One-click — we start the stream                              │
│   [f Facebook Live ✓] [▶ YouTube Live +]                       │
│  Other connected accounts · separate broadcast setup          │
│   [z Zoom · Linked·setup needed] [in LinkedIn · Not linked]    │
│   [◎ Instagram · Not linked] [♪ TikTok · Not linked]           │
├─────────────────────────────────────────────────────────────┤
│  2 platforms selected                        [ ● Go Live ]    │
│  42 Willow Street                                              │
└─────────────────────────────────────────────────────────────┘
```

- **One-click platforms are gated by real connection state.** A one-click chip (Facebook/YouTube) only toggles selectable if `connectedPlatforms` includes it; tapping an unconnected one-click chip routes to Connect Accounts instead of toggling — this prevents the guaranteed 422 that used to happen when an unconnected platform was selected (`routes/broadcasts.ts` fails the *entire* broadcast if any selected platform has no adapter/connection).
- **Assisted platforms (Zoom, LinkedIn, Instagram, TikTok) are informational chips, not selectable** — no adapter is registered for them server-side, so they never appear in the "select platforms to go live" set at all. This is a stronger honesty constraint than the original doc's checkbox-based mock implied (originally showed Instagram/TikTok/LinkedIn as checkable rows with descriptive notes; now they can't be checked at all in this flow).
- Selecting platforms defaults to whichever one-click platforms are *already connected* (not a hardcoded Facebook+YouTube default as the original mock implied).
- "Go Live" requires camera permission first (`expo-camera`) before calling `startBroadcast` — if permission is denied, an inline error blocks the action rather than silently proceeding.
- Real error surfaces: failed broadcast starts show the server's actual per-platform error text and detail bullets in a red box, not a generic toast.

## 2. Connect Accounts screen (agent) — NEW, not in the original doc

The original doc treated platform selection as happening inline during go-live setup with no separate account-linking screen. The shipped app has a dedicated screen for this, reached from the Listings header:

```
┌─────────────────────────────────────────────────────────────┐
│ Connect Accounts                                              │
├─────────────────────────────────────────────────────────────┤
│ Your channels                                                 │
│ Link the accounts you manage. Each platform has its own       │
│ broadcast and comment permissions.                            │
├─────────────────────────────────────────────────────────────┤
│  [f] Facebook Live          Connected · Estate-agent          │
│      If Meta shows "Previously shared"...(permissions note)   │
│      [ Reconnect / update permissions ]                       │
│      [ Disconnect ]                                            │
├─────────────────────────────────────────────────────────────┤
│  [▶] YouTube Live           Configured on server               │
│      (server-side .env token — no per-agent OAuth yet)        │
├─────────────────────────────────────────────────────────────┤
│  [z] Zoom                   Connected · Medine                │
│      [ Reconnect / update permissions ]  [ Disconnect ]       │
├─────────────────────────────────────────────────────────────┤
│  [in] LinkedIn Live         Setup required                     │
│      [ Application credentials required ]  (disabled)          │
├─────────────────────────────────────────────────────────────┤
│  [◎] Instagram Live         Setup required                     │
│  [♪] TikTok Live            Connected · estateagent33          │
└─────────────────────────────────────────────────────────────┘
```

- Connected platforms sort to the top.
- Per-platform "note" text (e.g. Facebook's Business Portfolio permissions caveat) is rendered live from server config, not static copy.
- YouTube currently has no per-agent connect/disconnect affordance — it authenticates via a single server-wide `.env` refresh token (`TASKS.md` Day 2 item still open), so it shows as "Configured on server" rather than offering a Connect button. This is a known gap, not a design choice.
- Real connect/disconnect calls a generic `connectPlatform(platform)` / `disconnectPlatform(platform)` that opens an OAuth browser session (`expo-web-browser`) — this is genuinely wired for Facebook, Zoom, Instagram (identity-only), TikTok (identity-only); LinkedIn's OAuth code exists but its developer-console app isn't provisioned yet, so it still shows "Application credentials required."

## 3. Live studio (agent, during broadcast) — AS BUILT, substantially different from the original mock

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
