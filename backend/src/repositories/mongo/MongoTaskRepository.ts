import type { Types } from "mongoose";

import { TaskModel } from "../../models/TaskModel";
import { ConflictError } from "../../utils/conflictError";
import { softDeleteUpdate, withoutTombstones } from "../../utils/tombstone";

export type TaskStatus = "todo" | "doing" | "done";

export interface TaskEntity {
  id: string;
  weekId: string;
  title: string;
  status: TaskStatus;
  scheduledDate?: Date;
  revision?: number;
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
  baseRevision?: number;
}

function mapTask(doc: {
  _id: Types.ObjectId;
  weekId: Types.ObjectId;
  title: string;
  status: TaskStatus;
  scheduledDate?: Date | null;
  revision?: number | null;
  createdAt: Date;
  updatedAt: Date;
}): TaskEntity {
  return {
    id: doc._id.toString(),
    weekId: doc.weekId.toString(),
    title: doc.title,
    status: doc.status,
    scheduledDate: doc.scheduledDate ?? undefined,
    revision: doc.revision ?? undefined,
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
    const doc = await TaskModel.findOne(withoutTombstones({ _id: id })).lean();
    return doc ? mapTask(doc) : null;
  }

  async getTasksByWeekId(weekId: string): Promise<TaskEntity[]> {
    const docs = await TaskModel.find(withoutTombstones({ weekId })).sort({ createdAt: 1 }).lean();
    return docs.map((doc) => mapTask(doc));
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<TaskEntity | null> {
    const existing = await TaskModel.findOne(withoutTombstones({ _id: id })).lean();
    if (!existing) return null;

    if (updates.baseRevision !== undefined && existing.revision != null) {
      if (updates.baseRevision < existing.revision) {
        throw new ConflictError(existing.revision, existing.updatedAt);
      }
    }

    const updateOps: Record<string, unknown> = {};
    if (updates.title !== undefined) updateOps.title = updates.title;
    if (updates.status !== undefined) updateOps.status = updates.status;
    if (updates.scheduledDate !== undefined) updateOps.scheduledDate = updates.scheduledDate;

    const doc = await TaskModel.findOneAndUpdate(
      withoutTombstones({ _id: id }),
      { $set: updateOps, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapTask(doc) : null;
  }

  async deleteTask(id: string, deletedAt = new Date()): Promise<boolean> {
    const deleted = await TaskModel.findOneAndUpdate(
      withoutTombstones({ _id: id }),
      softDeleteUpdate(deletedAt),
      { new: true },
    ).lean();
    return Boolean(deleted);
  }

  async deleteTasksByWeekIds(weekIds: string[], deletedAt = new Date()): Promise<number> {
    if (weekIds.length === 0) return 0;
    const result = await TaskModel.updateMany(withoutTombstones({ weekId: { $in: weekIds } }), softDeleteUpdate(deletedAt));
    return result.modifiedCount ?? 0;
  }
}
