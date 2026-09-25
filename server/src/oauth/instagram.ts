import { env, isConfigured } from "../env.js";
import { OAuthConnectionResult, OAuthProvider } from "./types.js";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}?${new URLSearchParams(params).toString()}`);
  if (!res.ok) {
    throw new Error(`Facebook Graph API request to ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function exchangeCodeForUserToken(code: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: env.facebook.appId,
    client_secret: env.facebook.appSecret,
    redirect_uri: env.instagram.oauthRedirectUri,
    code,
  });
  return data.access_token;
}

async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.facebook.appId,
    client_secret: env.facebook.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return data.access_token;
}

async function fetchPagesWithInstagram(userAccessToken: string): Promise<FacebookPage[]> {
  const data = await graphGet<{ data: FacebookPage[] }>("/me/accounts", {
    access_token: userAccessToken,
    fields: "id,name,access_token,instagram_business_account",
  });
  return data.data;
}

/** One Page by id — the fallback for Pages /me/accounts refuses to list. */
async function fetchPageById(pageId: string, userAccessToken: string): Promise<FacebookPage | undefined> {
  const page = await graphGet<Partial<FacebookPage>>(`/${pageId}`, {
    access_token: userAccessToken,
    fields: "id,name,access_token,instagram_business_account",
  });
  // A Page the token can see but not act for comes back without access_token;
  // treat that as "not connectable" rather than saving a useless row.
  return page.id && page.name && page.access_token ? (page as FacebookPage) : undefined;
}

interface InstagramAccountInfo {
  id: string;
  username: string;
}

async function fetchInstagramAccountInfo(igAccountId: string, pageAccessToken: string): Promise<InstagramAccountInfo> {
  return graphGet<InstagramAccountInfo>(`/${igAccountId}`, { fields: "id,username", access_token: pageAccessToken });
}

/**
 * Instagram account connection via Facebook Login. This implementation only
 * links the agent's professional account; publishing and live-comment webhooks
 * are not integrated here. This Facebook Login flow requires a linked Page
 * and uses the same Meta application credentials — no separate credentials, no
 * PlatformAdapter registered for instagram. See
 * docs/18-platform-integration-plan.md and docs/04.
 */
export class InstagramOAuthProvider implements OAuthProvider {
  configured(): boolean {
    return isConfigured(env.facebook.appId, env.facebook.appSecret, env.instagram.loginConfigId);
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.facebook.appId,
      redirect_uri: env.instagram.oauthRedirectUri,
      state,
      response_type: "code",
      // Business Portfolio-owned Pages only surface via /me/accounts through
      // this config_id-based "Facebook Login for Business" flow — see
      // env.ts instagram.loginConfigId comment. Replaces `scope`; the
      // permissions are defined on the Configuration itself.
      config_id: env.instagram.loginConfigId,
    });
    return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<OAuthConnectionResult> {
    const shortLivedToken = await exchangeCodeForUserToken(code);
    const userToken = await exchangeForLongLivedUserToken(shortLivedToken);
    const pages = await fetchPagesWithInstagram(userToken);

    // /me/accounts does not enumerate Business Portfolio-owned Pages even when
    // pages_show_list is granted and the same token can read the Page node
    // directly — confirmed by testing (2026-09-23): every permission reported
    // "granted", /me/accounts still [], GET /{page-id} returned the Page, its
    // access_token and its instagram_business_account. FACEBOOK_PAGE_ID names
    // that Page so the connect flow stops depending on the listing.
    const pageWithInstagram =
      pages.find((page) => page.instagram_business_account) ??
      (env.facebook.pageId ? await fetchPageById(env.facebook.pageId, userToken) : undefined);
    if (!pageWithInstagram?.instagram_business_account) {
      throw new Error(
        "no_linked_instagram_business_account — connect a Facebook Page with a linked Instagram Business " +
          "account first (Meta Business Suite -> Settings -> Linked Accounts). If the Page belongs to a " +
          "Business Portfolio it will not appear in /me/accounts; set FACEBOOK_PAGE_ID to its id instead.",
      );
    }

    const igAccount = await fetchInstagramAccountInfo(
      pageWithInstagram.instagram_business_account.id,
      pageWithInstagram.access_token,
    );

    return {
      // Store the Page token (not a user token) so it doesn't expire, same
      // rationale as the Facebook provider.
      accessToken: pageWithInstagram.access_token,
      expiresAt: null,
      externalAccountId: igAccount.id,
      externalAccountName: `@${igAccount.username}`,
    };
  }
}
