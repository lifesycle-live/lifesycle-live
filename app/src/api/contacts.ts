import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { mockActivity, mockContacts } from "./mockData";
import { ActivityItem, Contact } from "../types/models";

export async function getContact(id: string): Promise<Contact | undefined> {
  if (USE_MOCKS) return mockDelay(mockContacts.find((c) => c.id === id));
  return apiRequest<Contact>(`/contacts/${id}`);
}

export async function getContactActivity(id: string): Promise<ActivityItem[]> {
  if (USE_MOCKS) return mockDelay(mockActivity[id] ?? []);
  return apiRequest<ActivityItem[]>(`/contacts/${id}/activity`);
}
