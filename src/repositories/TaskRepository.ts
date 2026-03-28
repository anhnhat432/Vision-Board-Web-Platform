import type { Task, TaskStatus } from "@/domain";

import { createEntityId, nowIsoString, taskStore } from "./inMemoryStore";

type AddTaskInput = Omit<Task, "id" | "createdAt" | "updatedAt">;
type UpdateTaskInput = Partial<Omit<Task, "id" | "weekId" | "createdAt" | "updatedAt">>;

export class TaskRepository {
  async addTask(input: AddTaskInput): Promise<Task> {
    const timestamp = nowIsoString();
    const task: Task = {
      id: createEntityId("task"),
      weekId: input.weekId,
      title: input.title,
      status: input.status,
      scheduledDate: input.scheduledDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    taskStore.set(task.id, task);
    return task;
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    return taskStore.get(taskId) ?? null;
  }

  async getTasksByWeekId(weekId: string): Promise<Task[]> {
    return [...taskStore.values()].filter((task) => task.weekId === weekId);
  }

  async updateTask(taskId: string, patch: UpdateTaskInput): Promise<Task | null> {
    const currentTask = taskStore.get(taskId);
    if (!currentTask) return null;

    const updatedTask: Task = {
      ...currentTask,
      ...patch,
      updatedAt: nowIsoString(),
    };

    taskStore.set(taskId, updatedTask);
    return updatedTask;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task | null> {
    return this.updateTask(taskId, { status });
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return taskStore.delete(taskId);
  }
}
