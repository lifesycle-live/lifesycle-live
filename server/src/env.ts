function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  jwtSecret: requireEnv("JWT_SECRET", "dev-only-insecure-secret-change-me"),
  oracle: {
    // Autonomous DB connect string, e.g. copied from tnsnames.ora inside the
    // wallet zip, or the DSN shown on the "Database Connection" page in OCI.
    connectString: process.env.ORACLE_CONNECT_STRING ?? "",
    user: process.env.ORACLE_USER ?? "",
    password: process.env.ORACLE_PASSWORD ?? "",
    // Directory the wallet zip was extracted to (contains cwallet.sso, tnsnames.ora, ...).
    walletLocation: process.env.ORACLE_WALLET_LOCATION ?? "",
    walletPassword: process.env.ORACLE_WALLET_PASSWORD ?? "",
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID ?? "",
    appSecret: process.env.FACEBOOK_APP_SECRET ?? "",
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "",
    // Must exactly match a "Valid OAuth Redirect URI" configured on the
    // Facebook app (App Dashboard -> Facebook Login for Business -> Settings).
    oauthRedirectUri: process.env.FACEBOOK_OAUTH_REDIRECT_URI ?? "http://localhost:4000/auth/facebook/callback",
  },
  // Deep-link scheme the mobile app registers (app.json "scheme") — the
  // OAuth callback redirects here so the app can pick the flow back up.
  appScheme: process.env.APP_DEEP_LINK_SCHEME ?? "lifesyclelive",
  youtube: {
    clientId: process.env.YOUTUBE_OAUTH_CLIENT_ID ?? "",
    clientSecret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET ?? "",
  },
  zoom: {
    accountId: process.env.ZOOM_ACCOUNT_ID ?? "",
    clientId: process.env.ZOOM_CLIENT_ID ?? "",
    clientSecret: process.env.ZOOM_CLIENT_SECRET ?? "",
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
