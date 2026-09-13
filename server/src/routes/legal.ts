import { FastifyInstance } from "fastify";

/**
 * Terms of Service / Privacy Policy pages, served for two audiences:
 * platform developer consoles that require these URLs to register an OAuth
 * app (Facebook App Review, TikTok, LinkedIn, ...), and — honestly — the
 * app's actual current stage. Accurate as of 2026-09-13: Lifesycle Live is
 * used by a small internal team of estate agents connecting their OWN
 * Facebook/YouTube/Zoom/Instagram/LinkedIn/TikTok accounts, not a public
 * consumer product. Update the "who this is for" framing before any wider
 * launch, but the data-handling description below should stay true to
 * what the code actually does (see server/src/adapters/, routes/oauth.ts,
 * routes/leadCapture.ts) — don't let this page overclaim or underclaim.
 */
export async function legalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/legal/terms", async (_request, reply) => {
    return reply.type("text/html").send(page("Terms of Service", TERMS));
  });

  app.get("/legal/privacy", async (_request, reply) => {
    return reply.type("text/html").send(page("Privacy Policy", PRIVACY));
  });
}

const CONTACT_EMAIL = "medinekaynak2906@gmail.com";
const LAST_UPDATED = "2026-09-13";

const TERMS = `
<p><em>Last updated: ${LAST_UPDATED}</em></p>

<p>Lifesycle Live is a CRM-native live-streaming tool built for estate agents. An agent
connects their own social media / video-conferencing accounts, starts a live property
tour, and the app captures viewer comments as leads.</p>

<h2>Who this is for</h2>
<p>Lifesycle Live is currently used by a small internal team of estate agents, each
authenticating with their own account credentials. Registration requires a team invitation code; it is not open to unrestricted public sign-up.</p>

<h2>What connecting an account does</h2>
<p>When an agent connects a Facebook, YouTube, Zoom, Instagram, LinkedIn, or TikTok
account, that platform's OAuth consent screen is shown, and the agent explicitly grants
Lifesycle Live permission to act on their behalf for the specific actions listed on that
screen (e.g. starting a live video, reading comments on it). The agent can revoke this
at any time from the platform's own account settings, or by disconnecting inside
Lifesycle Live.</p>

<h2>Acceptable use</h2>
<p>Agents may only connect accounts they own or are authorized to manage (e.g. a Facebook
Page they administer). Using Lifesycle Live to access another person's account without
authorization, or to scrape/harvest personal contact information beyond what a viewer
voluntarily submits through the app's own contact form, is prohibited.</p>

<h2>No warranty</h2>
<p>Lifesycle Live is an active development project. Features may change or be
unavailable, and platform integrations depend on third-party APIs staying stable.</p>

<h2>Contact</h2>
<p>Questions about these terms: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`;

const PRIVACY = `
<p><em>Last updated: ${LAST_UPDATED}</em></p>

<h2>Who we are</h2>
<p>Lifesycle Live is a CRM-native live-streaming tool for estate agents. This policy
covers the app's backend (the "server") and mobile app.</p>

<h2>Data we access from connected platforms, and why</h2>
<p>An agent connects their own Facebook, YouTube, Zoom, Instagram, LinkedIn, or TikTok
account through that platform's standard OAuth consent screen. Specifically:</p>
<ul>
  <li><strong>Facebook</strong> (permissions: <code>pages_show_list</code>,
  <code>pages_read_engagement</code>, <code>pages_manage_posts</code>,
  <code>publish_video</code>) — used only to (a) identify which Facebook Page the agent
  manages, (b) start and end a Live Video on that Page when the agent taps "Go Live" /
  "End" in the app, and (c) read comments posted on that Live Video while it's running,
  so they can be shown to the agent and classified (buying interest, question, etc.) by
  an AI model. We do not post, read, or modify anything on the Page outside of a
  broadcast the agent started.</li>
  <li><strong>YouTube</strong> — used to create/manage a live broadcast on the agent's own
  channel and read its live chat messages, for the same purpose as above.</li>
  <li><strong>Zoom</strong> — used to identify the agent's Zoom account for meeting/webinar
  creation tied to a broadcast.</li>
  <li><strong>Instagram / LinkedIn / TikTok</strong> — identity-only connections (these
  platforms don't expose a live-broadcast or live-comment API to third-party apps); used
  to show the agent as "connected" for their own reference. No content is posted or read.</li>
</ul>

<h2>Data a platform's API never gives us, and that we never try to obtain</h2>
<p>No platform's comment/chat API exposes a commenter's email, phone number, or any
other private contact detail — this is true across Facebook, YouTube, Zoom, Instagram,
LinkedIn, and TikTok. We do not scrape, reverse-image-search, or purchase third-party
data to work around that. The only way a viewer's contact details reach us is if they
voluntarily submit them through our own on-page lead-capture form (linked in the
broadcast's comments/chat/description), which they can choose not to use.</p>

<h2>Where data is stored</h2>
<p>When you submit a property contact form, we record your request to be contacted,
the wording shown, its version and submission time alongside the property and broadcast.
This request does not subscribe you to future marketing. Contact details are self-reported;
we do not claim that a form submission verifies ownership of a social media account.</p>
<p>Access/refresh tokens, comment text, and lead submissions are stored in our own
database (Supabase Postgres), used only to run the app's own features, and are never
sold or shared with any third party. An agent can disconnect a platform at any time,
which removes the stored token for that connection.</p>

<h2>Data retention and deletion</h2>
<p>Comment and engagement data tied to a broadcast is retained so the agent can review
their own broadcast history and leads. To request deletion of your data (as a connected
agent, or as someone who submitted the lead-capture form), email
<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>Contact</h2>
<p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`;

function page(title: string, body: string): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>Lifesycle Live — ${title}</title></head>` +
    `<body style="font-family: system-ui, sans-serif; max-width: 680px; margin: 40px auto; padding: 0 16px; line-height: 1.6; color: #1e293b;">` +
    `<h1>${title}</h1>${body}</body></html>`
  );
}
