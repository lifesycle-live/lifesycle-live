import { env, isConfigured } from "../env.js";
import { OAuthConnectionResult, OAuthProvider } from "./types.js";

interface LinkedInTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
}

interface LinkedInUserInfoResponse {
  sub: string;
  name: string;
}

/**
 * LinkedIn "Sign In with LinkedIn using OpenID Connect" — identity connect
 * only. LinkedIn Live is feasible only via an approved third-party broadcast
 * partner or a manual RTMP-relay eligibility review, not a direct API this
 * app can drive — see docs/04-technical-feasibility.md. This provider exists
 * purely so an agent can link their LinkedIn identity for the "assisted"
 * workflow; no PlatformAdapter is registered for linkedin.
 */
export class LinkedInOAuthProvider implements OAuthProvider {
  configured(): boolean {
    return isConfigured(env.linkedin.clientId, env.linkedin.clientSecret);
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.linkedin.clientId,
      redirect_uri: env.linkedin.oauthRedirectUri,
      state,
      scope: "openid profile",
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<OAuthConnectionResult> {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.linkedin.oauthRedirectUri,
        client_id: env.linkedin.clientId,
        client_secret: env.linkedin.clientSecret,
      }).toString(),
    });
    if (!tokenRes.ok) {
      throw new Error(`LinkedIn token request failed (${tokenRes.status}): ${await tokenRes.text()}`);
    }
    const token = (await tokenRes.json()) as LinkedInTokenResponse;

    const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) {
      throw new Error(`LinkedIn userinfo request failed (${userRes.status}): ${await userRes.text()}`);
    }
    const user = (await userRes.json()) as LinkedInUserInfoResponse;

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      externalAccountId: user.sub,
      externalAccountName: user.name,
    };
  }
}
