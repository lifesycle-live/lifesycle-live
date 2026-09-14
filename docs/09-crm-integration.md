# 09 — CRM Integration Proposal

How `EngagementEvent` objects (defined in [06-system-architecture.md](06-system-architecture.md)) become real Lifesycle CRM records: leads, comments/chats, appointments, valuations, and follow-up tasks.

> **2026-09-14 revision note.** This doc was originally written against a hypothetical CRM
> object model before any code existed. The server now has a real, working implementation
> (`server/src/entities/`, `server/src/routes/engagement.ts`, `server/src/routes/leadCapture.ts`)
> and comment→lead/task has been verified end-to-end on a live YouTube broadcast (see
> `PROGRESS.md`, 2026-09-13). This revision grounds every claim below in that actual model,
> marks what's implemented vs. still proposed, and calls out where the original proposal
> diverged from what got built and why.

## Current implementation snapshot

The entities that exist today (`server/src/entities/`) are: `Agent`, `Property`, `Contact`,
`Broadcast`, `EngagementEvent`, `Lead`, `Task`, `ActivityItem`, `PlatformConnection`. There is
**no `Appointment` entity and no separate `Asset`/valuation-workflow entity** — see "Gaps"
below. The end-to-end flow that is actually wired up and verified:

1. `ingestionService.ts` polls each configured platform adapter every ~1s while a broadcast is
   `live`, pulls new comments, and calls `aiService.classifyIntent(text)` for each one.
2. Every comment is saved as an `EngagementEvent` row — `intent`, `intentConfidence`,
   `authorName`, `text`, `platform`, `externalId` (for dedupe), `dismissed` — **regardless of
   classification outcome**. This matches the original "append-only log, retained for audit"
   design below.
3. The app polls `GET /broadcasts/:id/engagement` and renders the feed; nothing is created in
   the CRM automatically yet. The agent taps **"Convert to lead"** or **"Convert to task"** on
   an individual `EngagementEvent` (`server/src/routes/engagement.ts`,
   `POST /engagement/:id/convert-to-lead` / `convert-to-task`) — this is a manual,
   agent-confirmed action for every single event today, not an AI-driven or threshold-driven
   auto-create. See "Admin configuration" below for how this compares to the original proposal.
4. Separately, a public, unauthenticated contact-capture form (`GET /go/:id`,
   `server/src/routes/leadCapture.ts`) is the actual mechanism for getting a viewer's phone/email
   — see "Contact info capture" below, which replaces the DM-based proposal originally written
   here.

## Object mapping

| Broadcast-side concept | Maps to CRM object | Status | Notes |
|---|---|---|---|
| A broadcast itself | `Broadcast`, linked to a `Property` and an `Agent` | **Implemented** | `Broadcast.platforms`/`ingest` are JSON-encoded text columns (see `CLAUDE.md`); `status` is `scheduled` \| `live` \| `ended` \| `failed` |
| Raw comment/reaction | `EngagementEvent` (append-only log) | **Implemented** | Saved for every comment regardless of intent, keyed by `broadcastId` + `platform` + `externalId` for dedupe; carries `intent`/`intentConfidence` from `aiService.classifyIntent` |
| Comment classified high-intent (`question`, `viewing_request`, `valuation_ask`) | New `Contact` + `Lead` (`source: "broadcast"`) via agent tapping "Convert to lead" | **Implemented, manual only** | `engagement.ts` currently creates a **fresh `Contact` from `authorName` every time** — no de-dup match against existing contacts yet (see "De-duplication" below) |
| Comment classified `viewing_request` specifically | `Task` via agent tapping "Convert to task" | **Implemented, but generic** | `convert-to-task` creates a plain `Task` titled `Follow up with {authorName}: "{text}"` — there is no intent-specific branching (no auto Appointment, no viewing-specific template) |
| Comment classified `valuation_ask` | Nothing intent-specific happens beyond the same generic `Lead`/`Task` path | **Gap — see "Valuation and appointment gap" below** | The original proposal's "handed to Lifesycle's existing valuation request workflow" assumes a workflow that doesn't exist in this codebase; there is no separate valuation object or routing |
| Low-intent reaction/small talk (`other`, `spam`) | Stays an `EngagementEvent` only; never surfaced for conversion | **Implemented** | The app's priority queue only surfaces high-intent events; low-intent ones sit in the feed but nothing forces the agent to act on them — the original "protects lead-quality metrics from dilution" intent holds |
| Viewer-submitted contact form (`/go/:id`) | New `Contact` + `Lead` (`source: "form"`) | **Implemented** | This is the actual, working contact-capture path — see below |
| Post-broadcast recording | `Broadcast.recordingUrl` / `Broadcast.transcriptUrl` (nullable text columns) | **Column exists, pipeline does not** | No `Asset` entity; these are just optional URL columns on `Broadcast` with nothing populating them yet — see [10-ai-features.md](10-ai-features.md) "After the broadcast" |

## De-duplication logic

**Status: proposed, not implemented.** The original 3-step plan below is unchanged as a
target design, but `server/src/routes/engagement.ts` today does none of it — the code comment
at the `convert-to-lead` handler is explicit about why:

> "No real per-platform contact identity resolution yet (needs the platform adapters to be
> live) — creates a fresh contact from the author name for now rather than guessing a de-dup
> match."

So right now, converting two different `EngagementEvent`s from the same viewer (even within
the same broadcast) produces two separate `Contact` rows. Proposed steps, unchanged from the
original design:

1. Match the commenter's platform identity (page-scoped user ID, channel ID, etc.) against any
   existing `Contact` record that has previously interacted via the same platform.
2. If no match, check for a fuzzy match on any volunteered contact info in the comment text
   itself (phone/email/name pattern) against existing `Contact` records.
3. If still no match, create a new `Contact` + `Lead`, tagged with the source platform and
   broadcast ID for attribution.

**Concrete path to close this gap**, grounded in what the adapters already return
(`fetchComments` in `server/src/adapters/*.ts` returns `authorName` + `externalId`, i.e. the
platform's comment ID, not a stable per-viewer user ID for every platform): add an
`externalAuthorId` column to `Contact` (nullable, `(platform, externalAuthorId)` unique
index) and populate it wherever the platform adapter's comment payload actually carries a
stable per-user id (YouTube's `authorChannelId` does; Facebook Graph API comment payloads
carry a page-scoped `from.id` when `pages_read_engagement` permission covers it). Where the
adapter doesn't expose one, `convert-to-lead` falls back to the current author-name-only
behavior — this is a strictly additive change, no migration risk to the existing flow. This
mirrors de-duplication logic CRMs already run for web-form and portal-enquiry leads — no new
dedup mechanism is being invented, just a new event source feeding the existing one.

## Contact info capture

> **2026-09-14 correction.** The original proposal below was a DM-based capture flow
> (Facebook/Instagram `private_replies`). That was never built. What actually ships and is
> verified end-to-end is a simpler, platform-agnostic **public form link**, because it works
> identically across every platform (including ones with no private-reply API at all, like
> YouTube and Zoom) rather than needing a bespoke integration per platform. The DM approach is
> retained below as a possible V2 enhancement, not the current design.

**What's implemented today:**

Platform APIs expose a commenter's *platform identity* but never their phone number or email
— see [05-api-research.md](05-api-research.md). Lifesycle Live gets real contact info by
actively prompting for it:

1. The moment a broadcast goes live, `routes/broadcasts.ts` calls each adapter's
   `postCallToAction`, which posts a comment/chat message containing a link —
   `buildLeadCaptureUrl()` in `server/src/routes/leadCapture.ts` builds
   `{PUBLIC_BASE_URL}/go/:broadcastId`. Adapters that declare `ctaRepeatMs`
   (`ingestionService.ts`) get this message re-posted periodically so it doesn't scroll out of
   a fast-moving chat.
2. `GET /go/:id` serves a small, dependency-free HTML+JS page (rendered server-side, no
   framework) showing the property photo/address/price and a name + email/phone + message
   form, gated behind an explicit contact-consent checkbox (`CONTACT_REQUEST_TEXT`).
3. `POST /public/broadcasts/:id/leads` (unauthenticated, since the viewer is never logged in)
   validates the submission with zod, requires at least one of email/phone, and — in one
   transaction — creates a `Contact`, a `Lead` (`source: "form"`, `sourcePlatform: null`), and
   two `ActivityItem` rows: one summarizing the submission and one recording the exact consent
   text/version/timestamp agreed to, for the lawful-basis story in
   [07-risk-analysis.md](07-risk-analysis.md).
4. This `Lead` is **not** linked back to the `EngagementEvent`/comment that prompted the
   viewer to click through — there's no shared identity between an anonymous form submission
   and the platform comment identity it originated from. A viewer who both comments *and* fills
   in the form today gets two disconnected CRM records: an unconverted `EngagementEvent` and a
   separate form-sourced `Lead`. Fixing this needs the same `externalAuthorId` linkage proposed
   under "De-duplication logic" above, plus carrying a correlating token through the CTA link
   (e.g. `/go/:broadcastId?ref=<engagementEventId>` when the CTA is sent in reply to a specific
   high-intent comment rather than as a broadcast-wide pinned message).

**Proposed V2 enhancement — DM capture** (not built, would need each platform's private-reply
API and a webhook receiver Lifesycle doesn't have yet):

1. **Trigger**: the AI intent classifier flags a comment `viewing_request` or `valuation_ask`.
2. **Automated DM**: the platform's private-reply mechanism sends that commenter an automated
   direct message — e.g. Facebook/Instagram `POST /{comment-id}/private_replies` — containing
   either the same form link or a plain-language prompt to reply with their name/phone/email.
3. **Capture**: form submission via the same `/go/:id` webhook, or a free-text DM reply parsed
   the same way comment text is already parsed for volunteered contact info.
4. **Attach, don't duplicate**: requires the `externalAuthorId` linkage above to attach the DM
   reply to the same `Contact`/`Lead` rather than creating a new one.
5. **Platforms without a private-reply API** (TikTok, and Instagram/Facebook when the feature
   isn't available for a given account type) would keep using the public-comment CTA that
   already ships today — so this enhancement is additive, not a replacement.

## Attribution

Every CRM record created from a broadcast retains:
- Source platform (Facebook, YouTube, Instagram, etc.)
- Broadcast ID and property ID
- Timestamp within the broadcast (useful for correlating a lead against the transcript segment that produced it)

This is what makes [16-success-metrics.md](16-success-metrics.md) reporting (leads per broadcast, conversion rate of broadcast-sourced leads) possible without a separate manual tagging step.

## Follow-up automation

Once a `Lead` or `Task` is created from a broadcast, it enters Lifesycle's existing nurture/sequence engine exactly like any other lead source — no new automation engine is proposed. The only new input is that the *initial classification* (question vs. viewing request vs. valuation ask) can pre-select which existing sequence template applies, which today typically requires manual agent judgment on a fresh lead.

## Admin configuration (brokerage-level)

Brokerage admins (per the journey in [08-user-journeys.md](08-user-journeys.md)) need to configure:

- **Auto-create threshold**: whether AI-classified high-intent comments become CRM records automatically, or require one-click agent confirmation first. Recommend defaulting new brokerages to confirmation-required, with auto-create as an opt-in once trust in classification accuracy is established (ties to the "engagement capture quality" metric in [16](16-success-metrics.md)).
- **Lead routing rules**: same routing logic brokerages already apply to other lead sources (round-robin, property-owner-first, etc.) should apply unchanged to broadcast-sourced leads.
- **Required disclosures**: brokerage can mandate a recording-consent step before any broadcast starts (see legal risk in [07-risk-analysis.md](07-risk-analysis.md)) — this is an admin-configured policy, not a hardcoded product behavior, since consent requirements vary by jurisdiction.

## What this deliberately does not change

The CRM's core data model (Contacts, Leads, Tasks, Appointments) is untouched. Lifesycle Live is a new *event source* feeding existing pipes — this is a deliberate design constraint carried over from [06-system-architecture.md](06-system-architecture.md) to keep the integration low-risk to ship into an existing CRM rather than requiring a schema migration.
