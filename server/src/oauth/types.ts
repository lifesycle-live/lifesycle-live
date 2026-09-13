import { PlatformId } from "../adapters/types.js";

/**
 * One connected account, ready to persist as a PlatformConnection row.
 * `refreshToken`/`expiresAt` are omitted for platforms whose token doesn't
 * expire (e.g. a Facebook Page token minted from a long-lived user token).
 */
export interface OAuthConnectionResult {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  externalAccountId: string;
  externalAccountName: string;
}

/**
 * A per-agent "connect your account" OAuth flow for one platform. Each
 * provider hides its own consent-URL shape and token-exchange calls behind
 * this interface so `routes/oauth.ts` can stay generic — see
 * docs/18-platform-integration-plan.md.
 */
export interface OAuthProvider {
  /** True once the server-side app credentials for this provider are set. */
  configured(): boolean;

  /** Consent-screen URL the agent's browser is sent to. `state` must round-trip unmodified. */
  buildAuthUrl(state: string, codeChallenge?: string): string;

  /** Exchange the callback's `code` for a connection to persist. */
  handleCallback(code: string, codeVerifier?: string): Promise<OAuthConnectionResult>;

  /**
   * Mint a fresh access token from a stored refresh token. Omit for
   * providers whose access token doesn't expire (Facebook Page tokens) —
   * `oauth/refresh.ts` falls back to the stored `accessToken` in that case.
   * Return `refreshToken` when the provider rotates it on every use (Zoom
   * does — the old one is single-use and becomes invalid) so the caller
   * persists the new one instead of retrying with a dead token next time.
   */
  refresh?(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date | null }>;
}

export type OAuthPlatformId = PlatformId;
