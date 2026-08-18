# 09 — CRM Integration Proposal

How `EngagementEvent` objects (defined in [06-system-architecture.md](06-system-architecture.md)) become real Lifesycle CRM records: leads, comments/chats, appointments, valuations, and follow-up tasks.

## Object mapping

| Broadcast-side concept | Maps to CRM object | Notes |
|---|---|---|
| A broadcast itself | New `Broadcast` object, linked to a `Property` and an `Agent` | Analogous to how a portal listing or a web page is already a marketing-source object in most CRMs |
| Raw comment/reaction | `EngagementEvent` (append-only log) | Retained regardless of classification outcome, for audit and AI-training/eval purposes |
| Comment classified "high intent" (question, viewing request, valuation ask) | `Lead` (new contact) or `Activity` logged against an existing `Contact` | De-duplication first: match platform identity → known contact before creating a new Lead |
| Comment classified "viewing request" specifically | `Lead` + `Task` ("schedule viewing") | Optionally auto-suggests an `Appointment` slot from the agent's existing calendar integration |
| Comment classified "valuation ask" | `Lead` tagged `valuation-interest` | Handed to Lifesycle's existing valuation request workflow rather than a new one |
| Low-intent reaction/small talk | Aggregated into broadcast-level analytics only | Explicitly *not* created as individual CRM records — protects lead-quality metrics from dilution |
| Post-broadcast recording | `Asset` (video) linked to the `Broadcast` and `Property` | Feeds AI post-processing (transcript, clips) per [10-ai-features.md](10-ai-features.md) |

## De-duplication logic

1. Match the commenter's platform identity (page-scoped user ID, channel ID, etc.) against any existing `Contact` record that has previously interacted via the same platform.
2. If no match, check for a fuzzy match on any volunteered contact info in the comment text itself (phone/email/name pattern) against existing `Contact` records.
3. If still no match, create a new `Contact` + `Lead`, tagged with the source platform and broadcast ID for attribution.

This mirrors de-duplication logic CRMs already run for web-form and portal-enquiry leads — no new dedup mechanism is being invented, just a new event source feeding the existing one.

## Contact info capture via DM

Platform APIs expose a commenter's *platform identity* (page-scoped user ID, channel ID) but never their phone number or email — see [05-api-research.md](05-api-research.md). Real contact info only ever comes from the viewer volunteering it, so the product actively prompts for it rather than passively waiting for it to appear in a comment:

1. **Trigger**: the AI intent classifier (see [10-ai-features.md](10-ai-features.md)) flags a comment as "viewing request" or "valuation ask."
2. **Automated DM**: the platform's private-reply mechanism sends that same commenter an automated direct message — e.g. Facebook/Instagram `POST /{comment-id}/private_replies` — containing either a short form link or a plain-language prompt to reply with their name/phone/email directly in the DM thread.
3. **Capture**: whichever path the user takes, the resulting contact info is captured — form submission via a webhook to Lifesycle's backend, or free-text DM reply parsed the same way comment text is already parsed for volunteered contact info (see De-duplication logic, step 2).
4. **Attach, don't duplicate**: the captured phone/email is written onto the *same* `Contact`/`Lead` record that was created (or matched) from the original triggering comment — matched via the platform identity (page-scoped user ID / channel ID) carried through from that comment's `EngagementEvent`, never a new, separate record. This is the same identity key the de-duplication logic already uses, so no new matching mechanism is needed — the DM reply is just another `EngagementEvent` on the same thread.
5. **Platforms without a private-reply API** (TikTok, and Instagram/Facebook when the feature isn't available for a given account type): fall back to an automated public comment reply containing the form link instead of a DM — same capture and attach logic once the viewer clicks through, just a lower-privacy trigger step.

This keeps the lawful-basis story clean per [07-risk-analysis.md](07-risk-analysis.md): the contact info entering the CRM was actively and knowingly provided by the viewer in response to a direct prompt, not scraped or inferred.

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
