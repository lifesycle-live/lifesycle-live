# Lifesycle Live™

A CRM-native live‑streaming studio for estate agents. An agent goes live on one or more
platforms with (close to) one click, and the CRM automatically captures viewer engagement,
turns comments into leads and follow‑up tasks, and applies AI before, during, and after
every broadcast.

This repository holds both the research that shaped the product and a working scaffold of
the system:

| Path | What it is |
|------|------------|
| [`docs/`](docs/00-index.md) | The full research & product‑proposal set (market, feasibility, API research, architecture, risk, roadmap, costs, KPIs, leadership pitch). Start with [`docs/17-final-presentation.md`](docs/17-final-presentation.md). |
| [`server/`](server/) | Backend API — Fastify + TypeScript + TypeORM on Supabase (Postgres). Auth, CRM objects, broadcast lifecycle, platform adapters, comment ingestion, AI service. |
| [`app/`](app/) | Mobile app — Expo / React Native (SDK 57). Go‑live setup, live dashboard, engagement feed, broadcast summary, and the CRM screens (leads, contacts, tasks). |
| [`TASKS.md`](TASKS.md) | Team task split (backend / live module / CRM module). |

> **Headline finding from the research:** true simultaneous one‑click live is only fully
> feasible on **Facebook, YouTube, and Zoom‑sourced RTMP**. Instagram, TikTok, and LinkedIn
> are supported as *assisted* flows — the agent starts the stream in the platform's own tool
> and Lifesycle attaches for chat capture, analytics, and lead automation. See
> [`docs/04-technical-feasibility.md`](docs/04-technical-feasibility.md).

## Current status

The codebase is an honest scaffold, not a finished product:

- Platform adapters (`facebook`, `youtube`, `zoom`) and the mobile RTMP streamer are
  **interface‑complete stubs**. They throw a clear "not configured / not implemented" error
  rather than returning fake data, so wiring in the real APIs is a localized change.
- The AI service ships a real rule‑based classifier and a working **Groq** implementation;
  Anthropic/OpenAI are stubbed behind the same interface.
- The mobile app runs against **mock data** until you point it at a running server.

## Repo layout

This is a monorepo with no root package manager — `app/` and `server/` are installed and
run independently.

```
server/
  src/
    index.ts            Fastify bootstrap, route registration, /health
    data-source.ts      TypeORM DataSource (Supabase Postgres)
    env.ts              Env parsing + isConfigured() helper
    auth.ts             JWT access/refresh token signing
    requireAuth.ts      Bearer-token preHandler
    entities/           Agent, Property, Contact, Broadcast, EngagementEvent,
                        Lead, Task, ActivityItem, PlatformConnection
    routes/             auth, properties, broadcasts, contacts, leads, tasks,
                        engagement, platformConnections
    adapters/           Per-platform publish/end/fetchComments (registry.ts)
    services/           aiService (rule-based | Groq), ingestionService
                        (comment polling), facebookOAuth
    seed.ts             Demo agent + property listings
app/
  App.tsx               QueryClientProvider + RootNavigator
  src/
    navigation/         Bottom tabs: Live / Leads / Tasks
    features/live/       Go-live setup, dashboard, summary, connect accounts
    features/crm/        Lead list, contact detail, task list
    api/                 Per-domain API clients; config.ts flips mock <-> real
    live/rtmpStreamer.ts Streamer interface + mock implementation
    state/               Zustand live-session store, react-query client
```

## Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine) — the server needs its Postgres connection string
- Expo tooling for the app (`npx expo`), plus the Expo Go app or a device/simulator

## Backend — `server/`

### 1. Install & configure

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env`. Only `DATABASE_URL` is required to boot — every other integration
fails loudly with a "not configured" error instead of returning fake data.

| Variable | Required | Notes |
|----------|----------|-------|
| `JWT_SECRET` | Recommended | Long random string; defaults to an insecure dev value. |
| `DATABASE_URL` | ✅ | Supabase → Project Settings → Database → Connection string → URI. Use the **Connection pooling** URI (port 6543); replace `[YOUR-PASSWORD]` with the DB password. |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | — | Enables the per‑agent Facebook connect flow. |
| `FACEBOOK_OAUTH_REDIRECT_URI` | — | Must match a Valid OAuth Redirect URI on the FB app. |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | — | Dev‑only fallback for a single hardcoded page. |
| `APP_DEEP_LINK_SCHEME` | — | Must match `app.json` `scheme` (`lifesyclelive`). |
| `YOUTUBE_OAUTH_CLIENT_ID` / `_SECRET` | — | From Google Cloud Console. |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | — | From Zoom Marketplace. |
| `AI_PROVIDER` | — | Unset → rule‑based classifier. `groq` is implemented; `anthropic`/`openai` are stubs. |
| `GROQ_API_KEY` / `GROQ_MODEL` | — | Required when `AI_PROVIDER=groq`. |

`synchronize` is on outside production, so TypeORM creates the schema on first connect.

### 2. Seed a login

```bash
npm run seed
```

Creates a demo agent (`agent@lifesycle.example` / `changeme123`, override with
`SEED_AGENT_EMAIL` / `SEED_AGENT_PASSWORD`) and three property listings. It deliberately
does **not** seed fake leads/tasks/engagement — those only exist once a real broadcast
generates them.

### 3. Run

```bash
npm run dev     # tsx watch, http://localhost:4000
npm run build   # tsc -> dist/
npm start       # node dist/index.js
```

Health check: `GET http://localhost:4000/health` → `{ "ok": true, "db": true }`

### API overview

All routes except `/health`, `/auth/login`, and the Facebook OAuth callback require an
`Authorization: Bearer <accessToken>` header.

| Method & path | Purpose |
|---------------|---------|
| `POST /auth/login` | Email/password → access + refresh tokens (1h / 30d). |
| `GET /properties` | Agent's property listings. |
| `GET /properties/:id/ai-prep` | AI talking points + promo copy for a listing. |
| `POST /broadcasts` | Start a broadcast for `{ propertyId, platforms[] }`; provisions ingest per platform, begins comment ingestion. |
| `POST /broadcasts/:id/end` | Stop the broadcast and its ingestion. |
| `GET /broadcasts/:id/summary` | Post‑broadcast stats (comments, leads created). |
| `GET /broadcasts/:id/engagement` | Live feed of classified viewer comments. |
| `POST /engagement/:id/convert-to-lead` | Create a contact + lead from a comment. |
| `POST /engagement/:id/convert-to-task` | Create a follow‑up task from a comment. |
| `POST /engagement/:id/dismiss` | Hide a comment from the feed. |
| `GET /leads`, `GET /leads/:id` | Leads with their contact. |
| `GET /contacts/:id`, `GET /contacts/:id/activity` | Contact record + activity timeline. |
| `GET /tasks`, `PATCH /tasks/:id` | Task list; toggle `{ done }`. |
| `GET /platform-connections`, `DELETE /platform-connections/:platform` | Per‑agent connected accounts (tokens never returned). |
| `GET /auth/facebook/start` → `GET /auth/facebook/callback` | Per‑agent Facebook Page OAuth; callback deep‑links back into the app. |

## Mobile app — `app/`

```bash
cd app
npm install
cp .env.example .env   # optional
npm start              # expo start  (also: npm run ios | android | web)
```

Set `EXPO_PUBLIC_LIFESYCLE_API_URL` in `.env` to hit a real server:

- Web / iOS simulator: `http://localhost:4000`
- Android emulator: `http://10.0.2.2:4000`
- Physical device: `http://<your-machine-LAN-IP>:4000`

Leave it unset and the app runs entirely on mock data (`src/api/mockData.ts`) via the
`USE_MOCKS` flag in `src/api/config.ts`, so it is demoable before the backend is wired up.

> RTMP(S) publishing is **not available in Expo Go** — `src/live/rtmpStreamer.ts` is a mock.
> Real streaming needs a development build (`expo prebuild`) with a native RTMP module and
> must be verified on a physical device. See the file header and
> [`docs/04-technical-feasibility.md`](docs/04-technical-feasibility.md).

## Security

`server/.env` holds real secrets and is git‑ignored (`.env`, `.env.*.local`). Do not commit
it or share the Facebook App Secret / AI API keys outside the team. Change `JWT_SECRET` and
the seeded agent password before any shared deployment.

## Documentation

The [`docs/`](docs/00-index.md) set is the source of truth for product decisions and
per‑platform API constraints. Code comments throughout the scaffold point back to specific
docs (e.g. `docs/05-api-research.md`, `docs/06-system-architecture.md`,
`docs/13-feature-prioritization.md`) for the reasoning behind each stub.
