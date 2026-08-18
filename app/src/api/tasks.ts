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
