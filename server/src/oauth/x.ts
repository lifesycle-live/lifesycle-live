import { z } from "zod";
import { env, isConfigured } from "../env.js";
import { OAuthProvider, OAuthConnectionResult } from "./types.js";

// https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().optional(), expires_in: z.number().positive() });
async function tokenRequest(params: Record<string, string>) {
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${env.x.clientId}:${env.x.clientSecret}`).toString("base64")}` },
    body: new URLSearchParams(params),
  });
  if (!response.ok) throw new Error(`X token exchange failed (${response.status}). Check app credentials, callback URL and API access.`);
  return tokenSchema.parse(await response.json());
}

export class XOAuthProvider implements OAuthProvider {
  configured() { return isConfigured(env.x.clientId, env.x.clientSecret); }
  buildAuthUrl(state: string, codeChallenge?: string) {
    if (!codeChallenge) throw new Error("X requires PKCE.");
    return `https://x.com/i/oauth2/authorize?${new URLSearchParams({ response_type: "code", client_id: env.x.clientId, redirect_uri: env.x.oauthRedirectUri, state, scope: "tweet.read users.read offline.access", code_challenge: codeChallenge, code_challenge_method: "S256" })}`;
  }
  async handleCallback(code: string, codeVerifier?: string): Promise<OAuthConnectionResult> {
    if (!codeVerifier) throw new Error("Missing X PKCE verifier. Reconnect your account.");
    const token = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: env.x.oauthRedirectUri, code_verifier: codeVerifier });
    const response = await fetch("https://api.x.com/2/users/me", { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`X profile request failed (${response.status}). Check your app's API access.`);
    const { data } = z.object({ data: z.object({ id: z.string().min(1), username: z.string().min(1) }) }).parse(await response.json());
    return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: new Date(Date.now() + token.expires_in * 1000), externalAccountId: data.id, externalAccountName: `@${data.username}` };
  }
  async refresh(refreshToken: string) {
    const token = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
    return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: new Date(Date.now() + token.expires_in * 1000) };
  }
}
