export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  weekId: string;
  title: string;
  status: TaskStatus;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
}
