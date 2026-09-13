import { env, isConfigured } from "../env.js";
import { OAuthConnectionResult, OAuthProvider } from "./types.js";

const ZOOM_API_BASE = "https://api.zoom.us/v2";

interface ZoomTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

function basicAuthHeader(): string {
  return "Basic " + Buffer.from(`${env.zoom.clientId}:${env.zoom.clientSecret}`).toString("base64");
}

async function tokenRequest(params: Record<string, string>): Promise<ZoomTokenResponse> {
  const res = await fetch(`https://zoom.us/oauth/token?${new URLSearchParams(params).toString()}`, {
    method: "POST",
    headers: { Authorization: basicAuthHeader() },
  });
  if (!res.ok) {
    throw new Error(`Zoom OAuth token request failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as ZoomTokenResponse;
}

async function fetchZoomUser(accessToken: string): Promise<ZoomUser> {
  const res = await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Zoom users/me request failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as ZoomUser;
}

/**
 * Zoom "OAuth (User-managed)" app — the agent authorises their own Zoom
 * account, same shape as Facebook. Distinct from Zoom's Server-to-Server
 * OAuth (account-wide, no per-agent consent), which this app does not use —
 * see docs/18-platform-integration-plan.md.
 */
export class ZoomOAuthProvider implements OAuthProvider {
  configured(): boolean {
    return isConfigured(env.zoom.clientId, env.zoom.clientSecret);
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.zoom.clientId,
      redirect_uri: env.zoom.oauthRedirectUri,
      state,
    });
    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<OAuthConnectionResult> {
    const token = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.zoom.oauthRedirectUri,
    });
    const user = await fetchZoomUser(token.access_token);

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      externalAccountId: user.id,
      externalAccountName: `${user.first_name} ${user.last_name}`.trim() || user.email,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date | null }> {
    const token = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    // Zoom's refresh tokens are single-use and rotate on every refresh call —
    // the response's refresh_token replaces the stored one, or the next
    // refresh attempt fails with an invalidated token.
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
    };
  }
}
