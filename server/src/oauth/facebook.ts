import { env, isConfigured } from "../env.js";
import { OAuthConnectionResult, OAuthProvider } from "./types.js";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}?${new URLSearchParams(params).toString()}`);
  if (!res.ok) {
    throw new Error(`Facebook Graph API request to ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** The `code` from the OAuth redirect -> a short-lived user access token. */
async function exchangeCodeForUserToken(code: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: env.facebook.appId,
    client_secret: env.facebook.appSecret,
    redirect_uri: env.facebook.oauthRedirectUri,
    code,
  });
  return data.access_token;
}

/** Short-lived user token -> long-lived (~60 day) user token. */
async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.facebook.appId,
    client_secret: env.facebook.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return data.access_token;
}

/**
 * The Pages this user manages, each with its own Page access token. A Page
 * token minted from a long-lived user token does not itself expire (unless
 * the admin revokes it), so this provider reports no `expiresAt` — see
 * docs/05-api-research.md.
 */
async function fetchManagedPages(userAccessToken: string): Promise<FacebookPage[]> {
  const data = await graphGet<{ data: FacebookPage[] }>("/me/accounts", { access_token: userAccessToken });
  return data.data;
}

export class FacebookOAuthProvider implements OAuthProvider {
  configured(): boolean {
    return isConfigured(env.facebook.appId, env.facebook.appSecret);
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.facebook.appId,
      redirect_uri: env.facebook.oauthRedirectUri,
      state,
      response_type: "code",
    });
    if (env.facebook.loginConfigId) {
      // Business Portfolio-owned Pages only surface via /me/accounts through
      // this config_id-based flow — see env.ts facebook.loginConfigId.
      // Replaces `scope`; permissions + the attached Page are defined on the
      // Configuration itself (App Dashboard -> Facebook Login for Business).
      params.set("config_id", env.facebook.loginConfigId);
    } else {
      params.set("scope", "pages_show_list,pages_read_engagement,pages_manage_posts,publish_video,instagram_basic,instagram_manage_comments");;
    }
    return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<OAuthConnectionResult> {
    const shortLivedToken = await exchangeCodeForUserToken(code);
    const userToken = await exchangeForLongLivedUserToken(shortLivedToken);
    const pages = await fetchManagedPages(userToken);

    if (pages.length === 0) {
      throw new Error("no_managed_pages");
    }

    // MVP: auto-connect the first Page this agent manages. An agent managing
    // multiple Pages can only get the first one this way until a page-picker
    // step is added in front of this save.
    const page = pages[0];
    return {
      accessToken: page.access_token,
      expiresAt: null,
      externalAccountId: page.id,
      externalAccountName: page.name,
    };
  }
}
