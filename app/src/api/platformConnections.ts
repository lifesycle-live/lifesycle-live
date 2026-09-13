import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { PlatformId } from "../types/models";
import { Platform } from "react-native";

export interface PlatformConnectionSummary {
  platform: PlatformId;
  externalAccountName: string;
  connectedAt: string;
}

/**
 * Platforms with a real "connect your account" OAuth flow registered on the
 * server (`server/src/oauth/registry.ts`). Keep in sync with that list —
 * youtube joins once its per-agent OAuth lands (see TASKS.md Day 2).
 * instagram/tiktok connect identity only — there's no Live API, so
 * GoLiveSetupScreen's platform picker should still treat them as
 * assisted-only even once connected.
 */
export const CONNECTABLE_PLATFORMS: PlatformId[] = ["facebook", "zoom", "instagram", "linkedin", "tiktok", "x"];

export interface PlatformAvailability { platform: PlatformId; configured: boolean; note: string }
export async function getPlatformAvailability(): Promise<PlatformAvailability[]> {
  if (USE_MOCKS) return mockDelay([...CONNECTABLE_PLATFORMS, "youtube" as PlatformId].map(platform => ({ platform, configured: false, note: "Demo mode. Open the app connected to the server to link real accounts." })));
  return apiRequest<PlatformAvailability[]>("/platform-connections/availability");
}

export async function getPlatformConnections(): Promise<PlatformConnectionSummary[]> {
  if (USE_MOCKS) return mockDelay([]);
  return apiRequest<PlatformConnectionSummary[]>("/platform-connections");
}

export async function disconnectPlatform(platform: PlatformId): Promise<void> {
  if (USE_MOCKS) return mockDelay(undefined);
  await apiRequest<void>(`/platform-connections/${platform}`, { method: "DELETE" });
}

export type ConnectResult = { status: "success" } | { status: "error"; message: string } | { status: "cancelled" };

/**
 * Opens a platform's consent screen in an in-app browser and waits for the
 * server's generic OAuth callback (`/auth/:platform/start` + `/callback`,
 * see server/src/routes/oauth.ts) to redirect back to this app's
 * `connect-callback` deep link (see app.json "scheme"). Works for any
 * platform in `CONNECTABLE_PLATFORMS` — the flow itself is platform-agnostic.
 */
export async function connectPlatform(platform: PlatformId): Promise<ConnectResult> {
  if (USE_MOCKS) return { status: "error", message: "Demo mode cannot connect real accounts. Use the server-connected app." };

  if (Platform.OS === "web") {
    // Open synchronously from the user's click so browsers do not block the popup.
    const popup = window.open("about:blank", "_blank", "width=600,height=760");
    if (!popup) return { status: "error", message: "Allow pop-ups for this site to connect your account." };
    popup.opener = null;
    try {
      const { authUrl, sessionId } = await apiRequest<{ authUrl: string; sessionId: string }>(`/auth/${platform}/start?client=web`);
      popup.location.href = authUrl;
      const deadline = Date.now() + 600000;
      while (Date.now() < deadline) {
        const result = await apiRequest<{ status: "pending" | "processing" | "success" | "error"; message?: string }>(`/auth/${platform}/status/${sessionId}`);
        if (result.status === "success") return { status: "success" };
        if (result.status === "error") return { status: "error", message: result.message ?? "Connection failed." };
        if (popup.closed) return { status: "cancelled" };
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      return { status: "error", message: "Connection timed out. Please try again." };
    } finally { popup.close(); }
  }

  const { authUrl } = await apiRequest<{ authUrl: string }>(`/auth/${platform}/start`);
  const redirectUrl = Linking.createURL("connect-callback", { scheme: "lifesyclelive" });

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

  if (result.type !== "success") {
    return { status: "cancelled" };
  }

  const { queryParams } = Linking.parse(result.url);
  if (queryParams?.status === "success") {
    return { status: "success" };
  }
  return { status: "error", message: String(queryParams?.message ?? "unknown_error") };
}
