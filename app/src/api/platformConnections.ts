import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { PlatformId } from "../types/models";

export interface PlatformConnectionSummary {
  platform: PlatformId;
  externalAccountName: string;
  connectedAt: string;
}

/** Only Facebook has a real OAuth flow wired up so far — see server/src/routes/platformConnections.ts. */
export type ConnectablePlatform = "facebook";

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
 * Opens Facebook's consent screen in an in-app browser and waits for the
 * server's OAuth callback to redirect back to this app's `connect-callback`
 * deep link (see app.json "scheme" + server FACEBOOK_OAUTH_REDIRECT_URI).
 */
export async function connectFacebook(): Promise<ConnectResult> {
  if (USE_MOCKS) return mockDelay({ status: "success" }, 600);

  const { authUrl } = await apiRequest<{ authUrl: string }>("/auth/facebook/start");
  const redirectUrl = Linking.createURL("connect-callback");

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
