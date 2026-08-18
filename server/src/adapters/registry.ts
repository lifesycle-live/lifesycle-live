import { FacebookAdapter } from "./facebook.js";
import { YoutubeAdapter } from "./youtube.js";
import { ZoomAdapter } from "./zoom.js";
import { PlatformAdapter, PlatformId } from "./types.js";

const adapters: Partial<Record<PlatformId, PlatformAdapter>> = {
  facebook: new FacebookAdapter(),
  youtube: new YoutubeAdapter(),
  zoom: new ZoomAdapter(),
};

export function getAdapter(platform: PlatformId): PlatformAdapter | undefined {
  return adapters[platform];
}
