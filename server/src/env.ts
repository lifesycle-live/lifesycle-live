import "dotenv/config";

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  jwtSecret: requireEnv("JWT_SECRET", "dev-only-insecure-secret-change-me"),
  database: {
    // Supabase Postgres connection string — dashboard -> Project Settings ->
    // Database -> Connection string -> URI (use the "Connection pooling" URI,
    // port 6543, for a stateless API).
    url: process.env.DATABASE_URL ?? "",
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID ?? "",
    appSecret: process.env.FACEBOOK_APP_SECRET ?? "",
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "",
    // Must exactly match a "Valid OAuth Redirect URI" configured on the
    // Facebook app (App Dashboard -> Facebook Login for Business -> Settings).
    oauthRedirectUri: process.env.FACEBOOK_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/facebook/callback",
    // Business Portfolio-owned Pages (Business Settings -> Accounts -> Pages)
    // do NOT show up via the classic scope-based /dialog/oauth + /me/accounts
    // — confirmed by testing (2026-09-13): consent completed, zero pages
    // returned, even with auth_type=rerequest. Same root cause already
    // documented for Instagram (see instagram.loginConfigId below). Fix:
    // App Dashboard -> Facebook Login for Business -> Configurations ->
    // create one with pages_show_list/pages_read_engagement/
    // pages_manage_posts/publish_video permissions AND the Page attached
    // under its Assets tab, then paste its id here. Empty -> FacebookAdapter
    // falls back to the plain scope-based dialog (works fine for
    // personal/non-Portfolio Pages).
    loginConfigId: process.env.FACEBOOK_LOGIN_CONFIG_ID ?? "",
  },
  instagram: {
    // Rides on the Facebook app above (same client id/secret) but needs its
    // OWN redirect URI, distinct from facebook's — the generic
    // /auth/:platform/callback route resolves which OAuthProvider to use
    // from the path, so a shared redirect URI would misroute the callback
    // and connect the wrong platform (or overwrite the other's row). Must
    // also be added to the Facebook app's "Valid OAuth Redirect URIs".
    oauthRedirectUri: process.env.INSTAGRAM_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/instagram/callback",
    // Facebook's classic scope-based /dialog/oauth does NOT return Pages
    // that belong to a Business Portfolio via /me/accounts, even with
    // pages_show_list + instagram_basic granted — confirmed by testing
    // (permissions showed "granted", /me/accounts still []). Business-owned
    // assets require the newer "Facebook Login for Business" Configuration
    // flow instead: App Dashboard -> Facebook Login for Business ->
    // Configurations -> create one with the needed permissions + the Page
    // attached, then pass its id here as config_id (replaces `scope` in the
    // authorize URL).
    loginConfigId: process.env.INSTAGRAM_LOGIN_CONFIG_ID ?? "",
  },
  // Deep-link scheme the mobile app registers (app.json "scheme") — the
  // OAuth callback redirects here so the app can pick the flow back up.
  appScheme: process.env.APP_DEEP_LINK_SCHEME ?? "lifesyclelive",
  // Public URL this server is reachable at (e.g. the ngrok tunnel used for
  // OAuth redirects). Used to build the /go/:broadcastId lead-capture link
  // that adapters post into comments/chat as the call-to-action — see
  // adapters/types.ts `postCallToAction`. Empty means that link can't be
  // built yet, so the CTA post is skipped rather than posting a broken URL.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, ""),
  youtube: {
    clientId: process.env.YOUTUBE_OAUTH_CLIENT_ID ?? "",
    clientSecret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET ?? "",
    // Obtained once via `npm run youtube:auth` — authorises the channel that
    // broadcasts are created on. A Google refresh token does not expire
    // unless revoked / unused for 6 months (or the app is in "testing").
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? "",
    // Must be listed as an "Authorized redirect URI" on the OAuth client
    // (Google Cloud Console -> Credentials). The helper script listens here.
    oauthRedirectUri: process.env.YOUTUBE_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/youtube/callback",
    // unlisted keeps test broadcasts out of search/subscriber feeds.
    privacyStatus: process.env.YOUTUBE_PRIVACY_STATUS ?? "unlisted",
    // "normal" | "low" | "ultraLow" — ultraLow trims YouTube's own glass-to-glass
    // buffering the most, at the cost of some resolution/backup-stream options.
    latencyPreference: process.env.YOUTUBE_LATENCY_PREFERENCE ?? "ultraLow",
  },
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID ?? "",
    clientSecret: process.env.ZOOM_CLIENT_SECRET ?? "",
    // Must be listed on the Zoom app's "OAuth (User-managed)" allow-list.
    oauthRedirectUri: process.env.ZOOM_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/zoom/callback",
  },
  x: {
    clientId: process.env.X_CLIENT_ID ?? "",
    clientSecret: process.env.X_CLIENT_SECRET ?? "",
    oauthRedirectUri: process.env.X_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/x/callback",
  },
  linkedin: {
    // "Sign In with LinkedIn using OpenID Connect" — identity connect only,
    // no Live publish capability. See docs/04-technical-feasibility.md.
    clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    oauthRedirectUri: process.env.LINKEDIN_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/linkedin/callback",
  },
  tiktok: {
    // Login Kit only — identity connect, no Live publish capability (Live
    // API is partner-gated). See docs/18-platform-integration-plan.md.
    clientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    oauthRedirectUri: process.env.TIKTOK_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/tiktok/callback",
    // One-time "URL properties" ownership proof TikTok's console asks for
    // when registering a Web/Desktop redirect URL — the exact
    // "tiktok-developers-site-verification=..." line it gives you, served
    // back verbatim both at that same URL (with trailing slash) and at the
    // conventional domain-root file TikTok's verifier actually seems to
    // fetch (see routes/oauth.ts). Only needed during that one-time setup
    // step.
    domainVerification: process.env.TIKTOK_DOMAIN_VERIFICATION ?? "",
    domainVerificationFilename: process.env.TIKTOK_DOMAIN_VERIFICATION_FILENAME ?? "",
  },
  ai: {
    provider: process.env.AI_PROVIDER ?? "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    groqApiKey: process.env.GROQ_API_KEY ?? "",
    groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },
};

export function isConfigured(...values: string[]): boolean {
  return values.every((v) => v.length > 0);
}
