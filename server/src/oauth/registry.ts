import { PlatformId } from "../adapters/types.js";
import { FacebookOAuthProvider } from "./facebook.js";
import { InstagramOAuthProvider } from "./instagram.js";
import { LinkedInOAuthProvider } from "./linkedin.js";
import { TikTokOAuthProvider } from "./tiktok.js";
import { ZoomOAuthProvider } from "./zoom.js";
import { OAuthProvider } from "./types.js";
import { XOAuthProvider } from "./x.js";

/**
 * One entry per platform that has a "connect your account" OAuth flow.
 * `youtube` joins this once its per-agent OAuth lands (Day 2 — see
 * TASKS.md); until then its adapter keeps using the .env-based refresh
 * token in `adapters/registry.ts`. instagram/linkedin/tiktok have a
 * provider here for identity-only connect but no `PlatformAdapter` (no
 * Live API — see docs/04).
 */
const providers: Partial<Record<PlatformId, OAuthProvider>> = {
  facebook: new FacebookOAuthProvider(),
  zoom: new ZoomOAuthProvider(),
  instagram: new InstagramOAuthProvider(),
  linkedin: new LinkedInOAuthProvider(),
  tiktok: new TikTokOAuthProvider(),
  x: new XOAuthProvider(),
};

export function getOAuthProvider(platform: string): OAuthProvider | undefined {
  return providers[platform as PlatformId];
}

export function listOAuthPlatforms(): string[] {
  return Object.keys(providers);
}
