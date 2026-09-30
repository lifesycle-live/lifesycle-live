import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { createMockBroadcast, mockBroadcastSummary, mockProperties } from "./mockData";
import { Broadcast, BroadcastSummary, PlatformId, Property, MANUAL_PLATFORMS } from "../types/models";

export async function getProperties(): Promise<Property[]> {
  if (USE_MOCKS) return mockDelay(mockProperties);
  return apiRequest<Property[]>("/properties");
}

export type NewProperty = Pick<Property, "address" | "price" | "propertyType" | "bedrooms" | "bathrooms" | "summary" | "features" | "images">;
export async function createProperty(input: NewProperty): Promise<Property> {
  if (USE_MOCKS) {
    const property = { ...input, id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    mockProperties.unshift(property);
    return mockDelay(property);
  }
  return apiRequest<Property>("/properties", { method: "POST", body: input });
}

export async function getProperty(id: string): Promise<Property> {
  if (USE_MOCKS) {
    const found = mockProperties.find((p) => p.id === id);
    if (!found) throw new Error("Property not found");
    return mockDelay(found);
  }
  return apiRequest<Property>(`/properties/${id}`);
}

export async function getBroadcast(id: string): Promise<Broadcast> {
  if (USE_MOCKS) throw new Error("Demo broadcast is only available during this session.");
  return apiRequest<Broadcast>(`/broadcasts/${id}`);
}
export async function getStreamStatus(id: string): Promise<{ ended: boolean; platforms: { platform: PlatformId; status: string }[] }> {
  if (USE_MOCKS) return { ended: false, platforms: [] };
  return apiRequest(`/broadcasts/${id}/stream-status`);
}

/**
 * Starts a broadcast on every one-click platform selected. Per
 * docs/06-system-architecture.md the backend owns RTMPS provisioning; the
 * app just calls this and renders whatever ingest info comes back.
 */
export async function startBroadcast(propertyId: string, platforms: PlatformId[]): Promise<Broadcast> {
  if (USE_MOCKS) return mockDelay(createMockBroadcast(propertyId, platforms), 800);
  return apiRequest<Broadcast>("/broadcasts", {
    method: "POST",
    // The server skips provisioning for these and waits for the agent to paste
    // the platform's own RTMP address in the live dashboard.
    body: { propertyId, platforms, manualPlatforms: platforms.filter((p) => MANUAL_PLATFORMS.includes(p)) },
  });
}

export async function endBroadcast(broadcastId: string): Promise<Broadcast> {
  if (USE_MOCKS) {
    return mockDelay({
      ...createMockBroadcast("prop-1", ["facebook", "youtube"]),
      id: broadcastId,
      status: "ended",
      endedAt: new Date().toISOString(),
    });
  }
  return apiRequest<Broadcast>(`/broadcasts/${broadcastId}/end`, { method: "POST" });
}

export async function getBroadcastSummary(broadcastId: string): Promise<BroadcastSummary> {
  if (USE_MOCKS) return mockDelay({ ...mockBroadcastSummary, broadcastId });
  return apiRequest<BroadcastSummary>(`/broadcasts/${broadcastId}/summary`);
}

export interface AiPrepSuggestions {
  talkingPoints: string[];
  promoCopy: string;
  suggestedStartTime?: string;
}

/** Per docs/10-ai-features.md "Before the broadcast" — talking points + promo copy. */
export async function getAiPrep(propertyId: string): Promise<AiPrepSuggestions> {
  if (USE_MOCKS) {
    return mockDelay({
      talkingPoints: [
        "Renovated kitchen, 2023",
        "Walking distance to Green Park station",
        "Offers over £450,000",
      ],
      promoCopy: "Live now: a stunning renovated home, walking distance to the station. Tune in!",
      suggestedStartTime: "Today 6:30pm",
    });
  }
  return apiRequest<AiPrepSuggestions>(`/properties/${propertyId}/ai-prep`);
}
