import { env, isConfigured } from "../env.js";
import { OAuthConnectionResult, OAuthProvider } from "./types.js";

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  open_id: string;
  error?: string;
  error_description?: string;
}

interface TikTokUserInfoResponse {
  data: { user: { display_name: string } };
  error?: { code: string; message: string };
}

/**
 * TikTok Login Kit — identity connect only. TikTok's LIVE API (start a
 * stream, read live chat) is partner-gated and not available here, so this
 * provider exists purely so an agent can link their TikTok identity for the
 * "assisted" workflow (post-broadcast follow-up) — no PlatformAdapter is
 * registered for tiktok. See docs/18-platform-integration-plan.md.
 */
export class TikTokOAuthProvider implements OAuthProvider {
  configured(): boolean {
    return isConfigured(env.tiktok.clientKey, env.tiktok.clientSecret);
  }

  buildAuthUrl(state: string): string {
    // csrf_state disambiguates our OAuth `state` (agent identity) from
    // TikTok's own CSRF token requirement; TikTok round-trips it unmodified.
    const params = new URLSearchParams({
      client_key: env.tiktok.clientKey,
      response_type: "code",
      scope: "user.info.basic",
      redirect_uri: env.tiktok.oauthRedirectUri,
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<OAuthConnectionResult> {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({
        client_key: env.tiktok.clientKey,
        client_secret: env.tiktok.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: env.tiktok.oauthRedirectUri,
      }).toString(),
    });
    if (!tokenRes.ok) {
      throw new Error(`TikTok token request failed (${tokenRes.status}): ${await tokenRes.text()}`);
    }
    const token = (await tokenRes.json()) as TikTokTokenResponse;
    if (token.error) {
      throw new Error(`TikTok token request failed: ${token.error_description ?? token.error}`);
    }

    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) {
      throw new Error(`TikTok user/info request failed (${userRes.status}): ${await userRes.text()}`);
    }
    const user = (await userRes.json()) as TikTokUserInfoResponse;
    if (user.error && user.error.code !== "ok") {
      throw new Error(`TikTok user/info request failed: ${user.error.message}`);
    }

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      externalAccountId: token.open_id,
      externalAccountName: user.data.user.display_name,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date | null }> {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({
        client_key: env.tiktok.clientKey,
        client_secret: env.tiktok.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) {
      throw new Error(`TikTok token refresh failed (${res.status}): ${await res.text()}`);
    }
    const token = (await res.json()) as TikTokTokenResponse;
    if (token.error) {
      throw new Error(`TikTok token refresh failed: ${token.error_description ?? token.error}`);
    }
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
    };
  }
}
