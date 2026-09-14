import { apiRequest, mockDelay } from "./client";
import { USE_MOCKS } from "./config";
import { mockTasks } from "./mockData";
import { Task } from "../types/models";

export async function getTasks(): Promise<Task[]> {
  if (USE_MOCKS) return mockDelay(mockTasks);
  return apiRequest<Task[]>("/tasks");
}

export async function setTaskDone(id: string, done: boolean): Promise<Task> {
  if (USE_MOCKS) {
    const task = mockTasks.find((t) => t.id === id);
    if (task) task.done = done;
    return mockDelay(task as Task);
  }
  return apiRequest<Task>(`/tasks/${id}`, { method: "PATCH", body: { done } });
}

export interface AiStatus { provider: string; configured: boolean; taskDrafting: boolean; model?: string }
export async function getAiStatus(): Promise<AiStatus> {
  if (USE_MOCKS) return mockDelay({ provider: 'demo', configured: false, taskDrafting: false });
  return apiRequest<AiStatus>('/ai/status');
}
export async function draftTask(context: string): Promise<{ title: string; description: string }> {
  if (USE_MOCKS) throw new Error('Connect a real server with Groq to draft tasks.');
  return apiRequest('/tasks/draft', { method: 'POST', body: { context } });
}
export async function createTask(input: { title: string; description?: string; broadcastId?: string }): Promise<Task> {
  if (USE_MOCKS) throw new Error('Connect a real server to save tasks.');
  return apiRequest<Task>('/tasks', { method: 'POST', body: input });
}
