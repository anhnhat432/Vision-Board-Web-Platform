import type { Types } from "mongoose";

import { TaskModel } from "../../models/TaskModel";

export type TaskStatus = "todo" | "doing" | "done";

export interface TaskEntity {
  id: string;
  weekId: string;
  title: string;
  status: TaskStatus;
  scheduledDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddTaskData {
  weekId: string;
  title: string;
  status?: TaskStatus;
  scheduledDate?: Date;
}

export interface UpdateTaskData {
  title?: string;
  status?: TaskStatus;
  scheduledDate?: Date;
}

function mapTask(doc: {
  _id: Types.ObjectId;
  weekId: Types.ObjectId;
  title: string;
  status: TaskStatus;
  scheduledDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TaskEntity {
  return {
    id: doc._id.toString(),
    weekId: doc.weekId.toString(),
    title: doc.title,
    status: doc.status,
    scheduledDate: doc.scheduledDate ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoTaskRepository {
  async addTask(data: AddTaskData): Promise<TaskEntity> {
    const doc = await TaskModel.create({
      weekId: data.weekId,
      title: data.title,
      status: data.status ?? "todo",
      scheduledDate: data.scheduledDate,
    });

    return mapTask(doc.toObject());
  }

  async getTaskById(id: string): Promise<TaskEntity | null> {
    const doc = await TaskModel.findById(id).lean();
    return doc ? mapTask(doc) : null;
  }

  async getTasksByWeekId(weekId: string): Promise<TaskEntity[]> {
    const docs = await TaskModel.find({ weekId }).sort({ createdAt: 1 }).lean();
    return docs.map((doc) => mapTask(doc));
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<TaskEntity | null> {
    const doc = await TaskModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapTask(doc) : null;
  }

  async deleteTask(id: string): Promise<boolean> {
    const deleted = await TaskModel.findByIdAndDelete(id).lean();
    return Boolean(deleted);
  }
}
