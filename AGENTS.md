# AGENTS.md

Guidance for working in this repository.

## What this is

**Lifesycle Live™** — a CRM-native live-streaming studio for estate agents. An agent goes
live on one or more platforms with near-one-click, and the CRM captures viewer engagement,
turns comments into leads/tasks, and applies AI before/during/after each broadcast.

The repo is an **honest scaffold**, not a finished product. Integration points (platform
adapters, mobile RTMP streamer, non-Groq AI providers) are interface-complete stubs that
**throw a clear "not configured / not implemented" error rather than returning fake data**.
Preserve this property when editing — never make a stub return fabricated data to make a
flow "work".

## Layout

Monorepo with **no root package manager**. `app/` and `server/` are installed and run
independently.

| Path | Stack | Notes |
|------|-------|-------|
| `server/` | Fastify 4 + TypeScript (ESM) + TypeORM 0.3 on Oracle Autonomous DB | Auth, CRM entities, broadcast lifecycle, platform adapters, comment ingestion, AI service |
| `app/` | Expo ~57 / React Native 0.86 / React 19, React Navigation 7, TanStack Query 5, Zustand 5 | Go-live setup, live dashboard, engagement feed, summary, CRM screens |
| `docs/` | 17 markdown research docs (`00-index.md` first, `17-final-presentation.md` = synthesis) | Source of truth for product + per-platform API decisions. Code comments cite specific docs for the reasoning behind each stub. |
| `TASKS.md` | Team task split (Turkish), 3-person: backend / live module / CRM module | |

## Commands

### server/
```bash
npm install
cp .env.example .env      # fill in ORACLE_* (required to boot); everything else fails loudly
npm run seed              # demo agent (agent@lifesycle.example / changeme123) + 3 properties
npm run dev               # tsx watch, http://localhost:4000
npm run build             # tsc -> dist/
npm start                 # node dist/index.js
```
Health: `GET /health` → `{ ok: true, db: true }`

### app/
```bash
npm install
npm start                 # expo start  (also: npm run ios | android | web)
```
Set `EXPO_PUBLIC_LIFESYCLE_API_URL` in `app/.env` to hit a real server (localhost for
web/iOS sim, `10.0.2.2` for Android emulator, LAN IP for a device). Unset → app runs
entirely on mock data.

**There are no tests, linters, or formatters configured** in either package. `tsc` (via
`server` build / editor) is the only static check.

## server/ architecture

- `src/index.ts` — Fastify bootstrap; `await AppDataSource.initialize()` **before** route
  registration, so the server will not boot without a reachable Oracle DB.
- `src/env.ts` — all env parsing; `isConfigured(...)` = every value non-empty. `JWT_SECRET`
  has an insecure dev default.
- `src/data-source.ts` — TypeORM `DataSource`, Oracle thin mode + mTLS wallet.
  `synchronize: true` when `NODE_ENV !== "production"` → schema auto-created on first connect.
- `src/auth.ts` / `src/requireAuth.ts` — JWT access (1h) + refresh (30d) signing; `requireAuth`
  preHandler reads `Bearer` token and sets `request.agentId`. Note: `/auth/login` exists but
  **there is no refresh endpoint yet**.
- `src/entities/` — Agent, Property, Contact, Broadcast, EngagementEvent, Lead, Task,
  ActivityItem, PlatformConnection. UUID PKs via `@BeforeInsert`. Array/record fields
  (`Broadcast.platforms`, `Broadcast.ingest`) are stored **JSON-encoded in text columns** —
  `JSON.parse`/`stringify` at the boundary.
- `src/routes/` — one file per domain, registered in `index.ts`. All routes except `/health`,
  `/auth/login`, and the Facebook OAuth callback require auth. Payloads validated with zod.
  Responses go through `src/serialize.ts` (never return entities directly; tokens are never serialized).
- `src/adapters/` — `PlatformAdapter` interface (`publish` / `end` / `fetchComments` +
  `configured` / `commentFreshness`). `registry.ts` only registers `facebook`, `youtube`,
  `zoom` (the one-click-feasible platforms); `linkedin` / `instagram` / `tiktok` are
  intentionally absent (assisted-only per `docs/04`). Unconfigured adapters throw
  `PlatformNotConfiguredError`; configured-but-unimplemented ones throw a plain "not
  implemented" `Error`.
- `src/services/aiService.ts` — `AiService` interface with a real deterministic
  `RuleBasedAiService` (default, `AI_PROVIDER` unset), a working `GroqAiService`
  (OpenAI-compatible, JSON mode), and `UnconfiguredAiService` (throws) for anthropic/openai.
  Routes depend only on the interface — swapping providers touches nothing else.
- `src/services/ingestionService.ts` — in-process `setInterval` poll (6s) per live broadcast:
  fetch comments from each configured adapter → `aiService.classifyIntent` → save
  `EngagementEvent`. In-memory dedupe + per-platform timestamp cursor + DB uniqueness check.
  `startIngestion` is idempotent; state lives in a module-level `Map` (**lost on restart**).
- `src/services/facebookOAuth.ts` — per-agent Facebook Page OAuth; `state` param carries a
  signed JWT identifying the agent; callback deep-links back into the mobile app.

### Broadcast lifecycle (`routes/broadcasts.ts`)
`POST /broadcasts` → create row (`scheduled`) → `adapter.publish()` per platform → if any
fail, status `failed` + 422; else status `live`, store `ingest`, `startIngestion()`.
`POST /broadcasts/:id/end` → `adapter.end()` per configured platform → status `ended` →
`stopIngestion()`. `GET /broadcasts/:id/summary` → comment/lead counts (highlight clips
deliberately empty — needs the V2 transcript pipeline).

## app/ architecture

- `App.tsx` → `QueryClientProvider` → `RootNavigator`.
- `src/navigation/RootNavigator.tsx` — bottom tabs **Live / Leads / Tasks**; Live and Leads
  each wrap a native-stack navigator. Param lists in `navigation/types.ts`.
- `src/api/` — one client file per domain. `config.ts`: `USE_MOCKS = (API_BASE_URL === "")`.
  **Every function branches on `USE_MOCKS`** and only then imports from `mockData.ts`. Real
  calls go through `client.ts` `apiRequest` (injects bearer token from `expo-secure-store`,
  normalizes errors to `ApiError`). Keep this branch pattern when adding endpoints.
- `src/features/live/` — `GoLiveSetupScreen`, `ConnectAccountsScreen`, `LiveDashboardScreen`,
  `BroadcastSummaryScreen` + `components/` (AiPrepPanel, EngagementFeed, PlatformSelector,
  PriorityQueue).
- `src/features/crm/` — `LeadListScreen`, `ContactDetailScreen`, `TaskListScreen`.
- `src/state/` — `queryClient.ts` (react-query server cache) and `liveSessionStore.ts`
  (Zustand, fast-changing in-flight live-session UI state only — kept separate from the
  query cache on purpose).
- `src/live/rtmpStreamer.ts` — `RtmpStreamer` interface + **mock** implementation. Real
  RTMPS push is **not possible in Expo Go**; needs a dev build (`expo prebuild`) + native
  module + physical-device verification. See the file header and `docs/04`.
- `app/AGENTS.md`: read the versioned Expo 57 docs (https://docs.expo.dev/versions/v57.0.0/)
  before writing Expo code. `app/AGENTS.md` just re-includes `AGENTS.md`.

## Conventions

- Server is **ESM** (`"type": "module"`) — relative imports use explicit `.js` extensions
  even for `.ts` files.
- Stubs fail loudly with actionable messages and doc references. Match that style.
- Don't seed or fabricate leads/tasks/engagement — those only exist after a real broadcast.
- `server/.env` holds real secrets (Facebook App Secret, Groq key) and is git-ignored.
  Never commit it; change `JWT_SECRET` and the seeded password before any shared deploy.
- Windows dev environment; PowerShell is the primary shell.
