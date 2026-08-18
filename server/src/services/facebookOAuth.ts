import { env, isConfigured } from "../env.js";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

export function facebookOAuthConfigured(): boolean {
  return isConfigured(env.facebook.appId, env.facebook.appSecret);
}

/**
 * The Facebook consent dialog URL an agent is sent to. `state` round-trips
 * through Facebook unmodified — we use it to carry a signed JWT identifying
 * which agent started the flow, since Facebook's redirect back to
 * /auth/facebook/callback carries no auth header of its own.
 */
export function buildFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.facebook.appId,
    redirect_uri: env.facebook.oauthRedirectUri,
    state,
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts,publish_video",
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}?${new URLSearchParams(params).toString()}`);
  if (!res.ok) {
    throw new Error(`Facebook Graph API request to ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Step 1 of the exchange: the `code` from the OAuth redirect -> a short-lived user access token. */
export async function exchangeCodeForUserToken(code: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: env.facebook.appId,
    client_secret: env.facebook.appSecret,
    redirect_uri: env.facebook.oauthRedirectUri,
    code,
  });
  return data.access_token;
}

/** Step 2: short-lived user token -> long-lived (~60 day) user token. */
export async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.facebook.appId,
    client_secret: env.facebook.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return data.access_token;
}

/**
 * Step 3: the Pages this user manages, each with its own Page access token.
 * A Page token minted from a long-lived user token does not itself expire
 * (unless the admin revokes it), so callers don't need to track expiresAt
 * for these — see docs/05-api-research.md.
 */
export async function fetchManagedPages(userAccessToken: string): Promise<FacebookPage[]> {
  const data = await graphGet<{ data: FacebookPage[] }>("/me/accounts", { access_token: userAccessToken });
  return data.data;
}
