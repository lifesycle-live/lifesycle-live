import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { mockEngagementFeed } from "./mockData";
import { EngagementEvent } from "../types/models";

/**
 * Polls the normalized engagement feed for a broadcast. Per
 * docs/05-api-research.md different platforms have very different real
 * latency (webhook vs. poll vs. post-hoc) — the backend is expected to
 * expose that as the `freshness` field on each event, so the app never
 * needs platform-specific logic here.
 */
export async function getEngagementFeed(broadcastId: string): Promise<EngagementEvent[]> {
  if (USE_MOCKS) return mockDelay(mockEngagementFeed.filter((e) => e.broadcastId === broadcastId), 300);
  return apiRequest<EngagementEvent[]>(`/broadcasts/${broadcastId}/engagement`);
}

export async function convertEngagementToLead(eventId: string): Promise<{ leadId: string }> {
  if (USE_MOCKS) return mockDelay({ leadId: `lead-from-${eventId}` });
  return apiRequest<{ leadId: string }>(`/engagement/${eventId}/convert-to-lead`, { method: "POST" });
}

export async function convertEngagementToTask(eventId: string): Promise<{ taskId: string }> {
  if (USE_MOCKS) return mockDelay({ taskId: `task-from-${eventId}` });
  return apiRequest<{ taskId: string }>(`/engagement/${eventId}/convert-to-task`, { method: "POST" });
}

export async function dismissEngagement(eventId: string): Promise<void> {
  if (USE_MOCKS) return mockDelay(undefined);
  await apiRequest<void>(`/engagement/${eventId}/dismiss`, { method: "POST" });
}
