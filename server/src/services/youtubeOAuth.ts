import { env, isConfigured } from "../env.js";

/**
 * YouTube (Google) OAuth2 — the Live Streaming API is user-authorised, so
 * every call needs an access token minted from a long-lived refresh token.
 * The refresh token is obtained once via `npm run youtube:auth` and stored
 * in server/.env as YOUTUBE_REFRESH_TOKEN.
 *
 * Same pattern as services/facebookOAuth.ts — hand-rolled against the REST
 * endpoints rather than pulling in the googleapis SDK.
 */

const OAUTH_BASE = "https://oauth2.googleapis.com";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// youtube.force-ssl covers liveBroadcasts/liveStreams write + liveChatMessages read.
export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";

export function youtubeConfigured(): boolean {
  return isConfigured(env.youtube.clientId, env.youtube.clientSecret, env.youtube.refreshToken);
}

/** Consent URL for the one-time `npm run youtube:auth` flow. */
export function buildYoutubeAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.youtube.clientId,
    redirect_uri: env.youtube.oauthRedirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPE,
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on re-auth
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

/** Used by the helper script: authorisation `code` -> { refresh_token, ... }. */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.youtube.clientId,
      client_secret: env.youtube.clientSecret,
      redirect_uri: env.youtube.oauthRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

let cached: { token: string; expiresAt: number } | null = null;

/** A valid access token, refreshed (and cached in-process) as needed. */
export async function getYoutubeAccessToken(): Promise<string> {
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;

  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.youtube.clientId,
      client_secret: env.youtube.clientSecret,
      refresh_token: env.youtube.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Google access-token refresh failed (${res.status}): ${await res.text()}. ` +
        `Re-run \`npm run youtube:auth\` if the refresh token was revoked.`,
    );
  }
  const data = (await res.json()) as TokenResponse;
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.token;
}
