import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { mockLeads } from "./mockData";
import { Lead } from "../types/models";

export async function getLeads(): Promise<Lead[]> {
  if (USE_MOCKS) return mockDelay(mockLeads);
  return apiRequest<Lead[]>("/leads");
}

export async function getLead(id: string): Promise<Lead | undefined> {
  if (USE_MOCKS) return mockDelay(mockLeads.find((l) => l.id === id));
  return apiRequest<Lead>(`/leads/${id}`);
}
