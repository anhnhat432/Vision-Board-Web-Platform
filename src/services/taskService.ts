import { delete as deleteRequest, patch, post } from "@/lib/api/apiClient";
import type { Task, TaskStatus } from "@/types/plan";

export interface AddTaskPayload {
  title: string;
  status?: TaskStatus;
  scheduledDate?: string;
}

export interface UpdateTaskPayload {
  status: TaskStatus;
}

export function addTask(weekId: string, payload: AddTaskPayload): Promise<Task> {
  return post<Task, AddTaskPayload>(`/weeks/${weekId}/tasks`, payload);
}

export function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<Task> {
  return patch<Task, UpdateTaskPayload>(`/tasks/${taskId}`, payload);
}

export function toggleTask(taskId: string, completed: boolean): Promise<Task> {
  return updateTask(taskId, { status: completed ? "done" : "todo" });
}

export function removeTask(taskId: string): Promise<{ deleted: boolean }> {
  return deleteRequest<{ deleted: boolean }>(`/tasks/${taskId}`);
}

export function deleteTask(taskId: string): Promise<{ deleted: boolean }> {
  return removeTask(taskId);
}
