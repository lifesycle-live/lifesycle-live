# 18 — Platform integration plan (per-agent account connect)

How each streaming platform gets wired so that **an estate agent connects their
own account in the app** and broadcasts publish with that agent's credentials —
not a single shared key in `.env`.

Builds on: `04-technical-feasibility.md` (one-click vs assisted), `05-api-research.md`
(per-platform API detail), `06-system-architecture.md` (adapter pattern). The
Facebook flow in `server/src/routes/platformConnections.ts` +
`server/src/services/facebookOAuth.ts` is the reference implementation.

---

## 1. What is actually possible per platform

| Platform | Start a live via API? | Read live comments via API? | Verdict |
|---|---|---|---|
| **Facebook Live** | ✅ `POST /{page-id}/live_videos` | ✅ `/{live-video-id}/comments` (poll or webhook) | **one-click** |
| **YouTube Live** | ✅ `liveBroadcasts`/`liveStreams` insert+bind | ✅ `liveChatMessages.list` (poll only) | **one-click** (implemented) |
| **Zoom** | ⚠️ create meeting + enable RTMP "custom live streaming" | ❌ in-meeting chat only after the fact | **one-click if agent has Pro+ plan** |
| **Instagram Live** | ❌ no API exists | ❌ no API for Live comments | **assisted only** |
| **TikTok Live** | ❌ LIVE API is partner-gated/closed | ❌ same | **assisted only** |

"Assisted" = the agent starts the Live in that platform's own app; Lifesycle
just records that it's happening and does pre/post AI. We do **not** pretend we
can capture live engagement we can't.

---

## 2. Developer accounts to open (you, once)

Do these now; per-agent connect can't be tested without them.

1. **Meta / Facebook** — developers.facebook.com → Create App (Business) →
   add "Facebook Login for Business". Redirect URI
   `http://localhost:4000/auth/facebook/callback`. Request permissions
   `pages_show_list, pages_read_engagement, pages_manage_posts, publish_video`.
   Submit for App Review before non-testers can use it.
   - The **same** Meta app covers Instagram (add `instagram_basic` + the
     Instagram product, link an IG Business account to the Page).

2. **Google / YouTube** — console.cloud.google.com → new project → enable
   *YouTube Data API v3* → Credentials → OAuth client ID (Web application).
   Redirect `http://localhost:4000/auth/youtube/callback`. Consent screen
   scope `https://www.googleapis.com/auth/youtube.force-ssl`. Add agents as
   test users, or verify the app for open sign-up.

3. **Zoom** — marketplace.zoom.us → Develop → Build App → **OAuth (User-managed)**.
   Redirect `http://localhost:4000/auth/zoom/callback`. Scopes
   `meeting:write, meeting:read, user:read`. Note: RTMP custom live streaming
   is a **paid** Zoom feature the agent must have enabled on their own account.

4. **TikTok** — developers.tiktok.com → register app → add **Login Kit**
   (scope `user.info.basic`). Separately apply for the **Live** product if you
   want real go-live later (expect rejection without a strong use case + a
   1,000+ follower account). Redirect `http://localhost:4000/auth/tiktok/callback`.

Fill the resulting IDs/secrets into `server/.env` (see `.env.example`).
For production, swap every `http://localhost:4000` redirect for the deployed
API's HTTPS URL and re-add it to each console's allow-list.

---

## 3. Server architecture (what to build)

### 3.1 Generalise the OAuth connect flow
Today `platformConnections.ts` hardcodes `/auth/facebook/start` + `/callback`.
Replace with a provider registry and generic routes:

```
server/src/oauth/
  types.ts        OAuthProvider { platform, configured, buildAuthUrl(state),
                    exchange(code) -> ConnectionData }
  facebook.ts     (move the existing logic here)
  youtube.ts      Google OAuth: code -> refresh_token + channel id/title
  zoom.ts         Zoom OAuth: code -> access+refresh token + user id/name
  tiktok.ts       Login Kit: code -> open_id + display name (identity only)
  registry.ts     Map<PlatformId, OAuthProvider>
```

- `GET /auth/:platform/start`  (requireAuth) → `{ authUrl }`, `state` = signed
  JWT `{ agentId, platform }`, 10-min TTL (unchanged pattern).
- `GET /auth/:platform/callback` (no auth) → verify `state`, `provider.exchange(code)`,
  upsert `PlatformConnection`, redirect to
  `<APP_DEEP_LINK_SCHEME>://connect-callback?platform=…&status=…`.

### 3.2 PlatformConnection needs a refresh token column
Add `refreshToken varchar(2000) nullable` (Google/Zoom rotate short-lived
access tokens; Facebook Page tokens don't expire, TikTok identity has no
stream use). Never serialised to the client.

### 3.3 Adapters must use the agent's connection, not `env`
Current `PlatformAdapter.publish(broadcastId)` has no agent context. Change to:

```ts
interface PublishContext { agentId: string; connection: PlatformConnection | null; }
publish(broadcastId: string, ctx: PublishContext): Promise<IngestInfo>
end(broadcastId, ctx, ingest?)
fetchComments(broadcastId, ctx, ingest, since)
```

- `routes/broadcasts.ts` `POST /broadcasts`: load the agent's connections,
  pass the matching one per platform. If a selected platform has no connection
  → fail that platform with `"connect your <platform> account first"`.
- `ingestionService.ts`: store `agentId` in `PollState`, reload the connection
  each poll (tokens may refresh), pass it into `fetchComments`.
- `YoutubeAdapter`: swap `getYoutubeAccessToken()` (env refresh token) for
  `getAccessTokenForConnection(connection)` — same refresh call, per-agent
  token. Keep the env token only as the dev fallback when `connection` is null.

### 3.4 Token refresh helper
`server/src/oauth/refresh.ts` — given a `PlatformConnection`, return a valid
access token, refreshing + persisting `accessToken`/`expiresAt` when stale.
Google and Zoom both use the standard `grant_type=refresh_token` call.

---

## 4. App side (Connect accounts screen)

`app/src/features/live/ConnectAccountsScreen.tsx` — one row per platform:

- status from `GET /platform-connections` (`connected as <name>` / `not connected`).
- **Connect** → `GET /auth/:platform/start` → open `authUrl` with
  `expo-web-browser` `openAuthSessionAsync` → deep link
  `lifesyclelive://connect-callback` returns → refetch status.
- **Disconnect** → `DELETE /platform-connections/:platform`.
- Instagram / TikTok rows show an "assisted — you start the Live in the app"
  badge and only offer identity connect.
- `PlatformSelector` on the go-live screen: disable (with a "Connect first"
  hint) any platform the agent hasn't connected.

Deep link is already handled for Facebook; make the handler platform-agnostic.

---

## 5. Suggested wiring order

1. **YouTube per-agent** — provider already 90% done; just move the token
   source from env to `PlatformConnection`. Fastest path to a real end-to-end
   "agent connects, agent goes live".
2. **Facebook** — logic exists; fold into the generic registry + implement
   `FacebookAdapter.publish/fetchComments` against the Graph API.
3. **Zoom** — OAuth provider + meeting-create with RTMP; gate on the agent's
   plan, surface a clear error if custom live streaming is off.
4. **Instagram / TikTok** — identity connect only; wire the "assisted" badge
   and post-broadcast follow-up. Revisit TikTok Live if the API application
   is approved.

Each step is independent and shippable on its own.
