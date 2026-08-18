# 05 — API Research

Per-platform detail on authentication, ingest, chat/comments, webhooks, moderation, recording, and limits. This is the evidence base behind the verdicts in [04-technical-feasibility.md](04-technical-feasibility.md).

## Facebook (Meta Graph API / Live Video API)

- **Auth**: Standard Meta app + OAuth; requires the **"Live Video Publishing"** permission, granted via Meta App Review, plus page/user-level permissions (`pages_manage_metadata`, `pages_read_engagement` for webhook/comment access) [[Live Video API]](https://developers.facebook.com/docs/live-video-api/).
- **Ingest**: RTMPS only (not plain RTMP). Single combined endpoint `https://live-api-s.facebook.com:443/rtmp/<stream-key>`, standard port 443 outbound, Facebook IP ranges can be whitelisted for lower latency [[RTMPS on Port 443]](https://wrasse.plymouth.ac.uk/ac-news/facebooks-rtmps-live-api-on-port-443-a-secure-streaming-solution-oxxyhl).
- **Publishing flow**: create/schedule a live video via `POST /{page-id}/live_videos` or `/{user-id}/live_videos`, receive the stream key, start pushing RTMPS, then transition the video status to end the broadcast [[Page Live Videos ref]](https://developers.facebook.com/docs/graph-api/reference/page/live_videos/) [[User Live Videos ref]](https://developers.facebook.com/docs/graph-api/reference/user/live_videos/).
- **Chat/comments**: readable and writable via `GET/POST /{video-id}/comments`; real-time updates available via **Page Webhooks** (push notifications on new/edited/deleted comments), avoiding polling [[Webhooks comment sync]](https://reintech.io/blog/real-time-comment-sync-facebook-webhooks) [[Real-time comment listener example]](https://medium.com/emojot-engineering/building-a-real-time-facebook-page-comment-listener-using-webhooks-node-js-graph-api-17dad90e992e).
- **Moderation**: standard comment moderation endpoints (hide/delete/reply) available at the comment-object level; no dedicated "live moderation" endpoint beyond normal comment CRUD.
- **Recording/VOD**: live videos persist as standard Page/User video objects after the broadcast ends and are retrievable through the normal Video API.
- **Verdict feed into 04**: full one-click capability — publish, capture engagement via webhook, and retrieve the recording afterward, all through documented, generally-available endpoints.

## YouTube (YouTube Live Streaming API v3)

- **Auth**: Google OAuth 2.0, channel owner consents once; app operates under a Google Cloud project with its own quota allocation.
- **Ingest**: RTMPS. Flow is `liveStreams.insert` to provision the ingest URL/stream key, then `liveBroadcasts.insert` to create the broadcast object and `liveBroadcasts.bind` to attach the stream to the broadcast [[LiveBroadcasts docs]](https://developers.google.com/youtube/v3/live/docs/liveBroadcasts) [[LiveStreams docs]](https://developers.google.com/youtube/v3/live/docs/liveStreams) [[RTMPS ingestion guide]](https://developers.google.com/youtube/v3/live/guides/rtmps-ingestion).
- **Chat/comments**: YouTube Live Chat API (`liveChatMessages.list`/`.insert`) supports polling live chat messages during the broadcast; standard YouTube Data API covers post-broadcast comments.
- **Moderation**: `liveChatBans`/`liveChatModerators` resources support banning/muting participants and assigning moderators programmatically.
- **Recording/VOD**: broadcasts are automatically archived as a standard YouTube video (assuming DVR/archiving is enabled on the broadcast), retrievable via the normal Data API.
- **Quota**: YouTube Data API quota is a real constraint (default project quota is limited, and live-broadcast-heavy write operations are comparatively expensive against quota) — needs a quota-increase request from Google before scaling past a pilot cohort of agents; exact current unit costs should be pulled from the live Google Cloud Console at implementation time rather than assumed here.
- **Verdict feed into 04**: full one-click capability, contingent on securing adequate API quota ahead of scale.

## Zoom

- **Ingest role**: Zoom is used as a **source**, not a broadcast destination. The built-in **Live Streaming app** lets a host push a meeting/webinar to up to three simultaneous RTMP targets (Facebook, YouTube, Twitch, or custom RTMP) [[Zoom multistream]](https://onestream.live/blog/multistream-your-zoom-meetings-webinars-for-wider-outreach/).
- **SDK path**: **Zoom Video SDK** supports RTMP live-streaming output from a Video SDK session, useful for scaling an interactive session (e.g., agent + a small group on a private valuation call) beyond the 1,000-participant real-time cap by relaying the output onward [[Video SDK live streaming]](https://developers.zoom.us/docs/video-sdk/web/live-stream/).
- **Auth**: Zoom Server-to-Server OAuth or a Marketplace app for programmatic meeting/webinar creation and live-stream configuration.
- **Chat**: Zoom's in-meeting chat and Q&A (webinar) APIs/webhooks are separate from any RTMP-relayed destination's own chat — Lifesycle would need to capture Zoom's native chat directly via Zoom webhooks *in addition to* whatever chat exists on any restream destination.
- **Verdict feed into 04**: feasible as a private/webinar-style ingest and relay hub; not a "social platform" destination in its own right.

## LinkedIn

- **Access model**: not a self-serve public API for live streaming. LinkedIn either requires broadcasting through one of a defined list of **preferred third-party broadcast partners** (StreamYard, Switcher Studio, Restream, Wirecast, Vimeo, SocialLive) or a manual review to unlock **custom RTMP ingest** for "advanced broadcasters" [[Preferred partners chart]](https://business.linkedin.com/content/dam/me/business/en-us/marketing-solutions/products/pdfs/linkedin-live-3rd-party-broadcast-partners-chart.pdf) [[Get access via preferred partners]](https://www.linkedin.com/help/linkedin/answer/a520811).
- **Scheduling constraint**: from **June 22, 2026**, LinkedIn requires all live events to be scheduled in advance (spontaneous live has been removed platform-wide), though scheduling "just minutes" ahead remains possible [[Advance scheduling requirement]](https://www.netinfluencer.com/linkedin-to-require-advance-scheduling-for-all-live-streams-starting-june/).
- **Path to build**: apply to LinkedIn as a broadcast-tool partner (business development / partnership approval process, not pure engineering), or integrate through one of the existing approved partners as an intermediate step while awaiting direct approval.
- **Verdict feed into 04**: feasible only via approved-partner RTMP relay, and only ever as a scheduled (not instant) broadcast — sets an expectation ceiling independent of Lifesycle engineering effort.

## Instagram

- **Access model**: Instagram provides no public API for a third-party app to programmatically start a live broadcast. The only sanctioned RTMP path is **Instagram Live Producer**, a first-party Instagram tool for Business/Creator accounts, not an API surface a partner app calls on the user's behalf [[Instagram Live Producer]](https://about.instagram.com/blog/tips-and-tricks/instagram-live-producer).
- **Graph API (non-live)**: as of 2026, the Instagram Graph API supports Business/Creator accounts only (personal accounts excluded entirely — must convert), covers publishing, media retrieval, comments, and insights, but explicitly **not** arbitrary live-broadcast control [[Instagram Graph API 2026 guide]](https://www.netrows.com/blog/instagram-graph-api-guide-2026).
- **Limits**: roughly 200 API calls/hour and a hard cap of 25 published posts per 24 hours per account (Reels/Stories share the same bucket) [[Instagram API Pricing 2026]](https://www.getphyllo.com/post/instagram-api-pricing-explained-iv).
- **Verdict feed into 04**: no one-click path exists. Best available integration is agent-native start (agent goes live inside Instagram) with Lifesycle assisting pre/post-event, and pulling comments/insights after the fact through the standard Graph API within its rate limits.

## TikTok

- **Access model**: **no official public API for live streaming or live chat exists**. Everything currently used by third parties (`tiktok-live-connector`, `TikTokLive` Python package, `tik.tools`) reverse-engineers TikTok's internal WebCast protocol without TikTok's sanction [[TikTokLive GitHub]](https://github.com/isaackogan/TikTokLive) [[TikTok LIVE API guide]](https://www.eulerstream.com/what-is-tiktok-live).
- **Stability risk**: in January 2026, TikTok simultaneously revoked third-party PC streaming access for Streamlabs, StreamElements, and Restream.io; TikTok acknowledged the disruption without explaining or reversing it at time of writing [[Streamlabs access revoked]](https://support.streamlabs.com/hc/en-us/articles/35259691237147-Streamlabs-x-TikTok-Streaming-Access-Revoked-Suspended).
- **TikTok Business API**: exists but is scoped to **ads and shop analytics only** — not live-broadcast or live-chat data.
- **Verdict feed into 04**: no dependable integration path. Any TikTok chat-capture feature must be built as an optional, clearly-labelled experimental add-on that can be disabled without notice, never a core dependency.

## Cross-platform API research summary

| Capability | Facebook | YouTube | Zoom | LinkedIn | Instagram | TikTok |
|---|---|---|---|---|---|---|
| Official live-publish API | ✅ | ✅ | ✅ (as relay source) | ⚠️ partner-only | ❌ | ❌ |
| RTMP(S) ingest | ✅ | ✅ | ✅ (output) | ⚠️ eligibility review | ⚠️ first-party only | ❌ |
| Chat/comment API | ✅ | ✅ | ✅ (native chat) | — (undocumented in research) | ⚠️ post-hoc only | ❌ unofficial only |
| Webhooks for real-time events | ✅ | — (poll-based) | ✅ | — | — | ❌ |
| Moderation API | ✅ (comment CRUD) | ✅ (ban/mute) | ✅ (host controls) | — | ⚠️ standard comment tools only | ❌ |
| Recording/VOD retrieval | ✅ | ✅ | ✅ | — | ⚠️ manual only | ❌ |
