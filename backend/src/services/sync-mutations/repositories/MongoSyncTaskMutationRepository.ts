import { isValidObjectId } from "mongoose";

import { TaskModel } from "../../../models/TaskModel";
import { PlanModel } from "../../../models/PlanModel";
import { WeekModel } from "../../../models/WeekModel";
import { withoutTombstones } from "../../../utils/tombstone";
import type {
  SyncTaskMutationRepository,
  TaskCompletedChangedApplyInput,
  AppliedTaskMutationEntity,
} from "./SyncTaskMutationRepository";

// ─── Mongo document interfaces ─────────────────────────────────

interface MongoTaskDoc {
  _id: { toString(): string } | string;
  weekId: { toString(): string } | string;
  clientTaskId?: string | null;
  status: "todo" | "doing" | "done";
  completedAt?: Date | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface MongoWeekDoc {
  _id: { toString(): string } | string;
  planId: { toString(): string } | string;
  weekNumber: number;
  clientWeekId?: string | null;
}

interface MongoPlanDoc {
  _id: { toString(): string } | string;
  userId: string;
  vision?: string | null;
  startDate?: Date | null;
  clientPlanId?: string | null;
  clientGoalId?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────

function getDocId(doc: { _id: { toString(): string } | string }): string {
  return doc._id.toString();
}

function mapTaskDoc(doc: MongoTaskDoc): AppliedTaskMutationEntity {
  return {
    id: getDocId(doc),
    clientTaskId: doc.clientTaskId ?? undefined,
    status: doc.status,
    completedAt: doc.completedAt ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function getObjectIdCandidate(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text && isValidObjectId(text) ? text : undefined;
}

// ─── Repository ─────────────────────────────────────────────────

export class MongoSyncTaskMutationRepository implements SyncTaskMutationRepository {
  async applyTaskCompletedChanged(
    userId: string,
    input: TaskCompletedChangedApplyInput,
  ): Promise<AppliedTaskMutationEntity | null> {
    const existingTask = await this.findOwnedTask(userId, input);
    if (!existingTask) return null;

    const update =
      input.completed
        ? {
            $set: {
              status: "done",
              completedAt: input.completedAt ?? input.syncUpdatedAt,
              lastMutationId: input.mutationId,
              syncUpdatedAt: input.syncUpdatedAt,
            },
            $inc: { revision: 1 },
          }
        : {
            $set: {
              status: "todo",
              lastMutationId: input.mutationId,
              syncUpdatedAt: input.syncUpdatedAt,
            },
            $unset: { completedAt: "" },
            $inc: { revision: 1 },
          };

    const updatedTask = await TaskModel.findOneAndUpdate(withoutTombstones({ _id: existingTask.id }), update, {
      new: true,
      runValidators: true,
    }).lean();

    return updatedTask ? mapTaskDoc(updatedTask as unknown as MongoTaskDoc) : null;
  }

  private async findOwnedTask(
    userId: string,
    input: TaskCompletedChangedApplyInput,
  ): Promise<AppliedTaskMutationEntity | null> {
    if (input.backendTaskId) {
      const task = await TaskModel.findOne(withoutTombstones({ _id: input.backendTaskId })).lean();
      return task ? this.toOwnedTask(userId, task as unknown as MongoTaskDoc, input) : null;
    }

    if (!input.clientTaskId) return null;

    const taskByBackendParent = await this.findOwnedTaskByBackendParent(userId, input);
    if (taskByBackendParent) return taskByBackendParent;

    if (input.clientPlanId && input.clientWeekId) {
      const plan = await PlanModel.findOne(withoutTombstones({ userId, clientPlanId: input.clientPlanId })).lean();
      if (!plan) return null;

      const week = await WeekModel.findOne(
        withoutTombstones({
          planId: getDocId(plan as unknown as MongoPlanDoc),
          clientWeekId: input.clientWeekId,
        }),
      ).lean();
      if (!week) return null;

      const task = await TaskModel.findOne(
        withoutTombstones({
          weekId: getDocId(week as unknown as MongoWeekDoc),
          clientTaskId: input.clientTaskId,
        }),
      ).lean();
      return task ? this.toOwnedTask(userId, task as unknown as MongoTaskDoc, input) : null;
    }

    const candidates = await TaskModel.find(withoutTombstones({ clientTaskId: input.clientTaskId })).limit(10).lean();
    const ownedTasks: AppliedTaskMutationEntity[] = [];
    for (const candidate of candidates) {
      const ownedTask = await this.toOwnedTask(userId, candidate as unknown as MongoTaskDoc, input);
      if (ownedTask) ownedTasks.push(ownedTask);
    }

    return ownedTasks.length === 1 ? ownedTasks[0] : null;
  }

  private async findOwnedTaskByBackendParent(
    userId: string,
    input: TaskCompletedChangedApplyInput,
  ): Promise<AppliedTaskMutationEntity | null> {
    const backendPlanId = getObjectIdCandidate(input.backendPlanId);
    if (!backendPlanId || !input.clientTaskId) return null;

    const plan = await PlanModel.findOne(withoutTombstones({ _id: backendPlanId, userId })).lean();
    if (!plan) return null;

    const weekQuery: Record<string, unknown> = { planId: getDocId(plan as unknown as MongoPlanDoc) };
    const backendWeekId = getObjectIdCandidate(input.backendWeekId);
    if (backendWeekId) weekQuery._id = backendWeekId;
    else if (input.weekNumber) weekQuery.weekNumber = input.weekNumber;
    else return null;

    const week = await WeekModel.findOne(withoutTombstones(weekQuery)).lean();
    if (!week) return null;

    const mappedWeek = week as unknown as MongoWeekDoc;
    if (input.weekNumber && mappedWeek.weekNumber !== input.weekNumber) return null;

    const task = await TaskModel.findOne(
      withoutTombstones({
        weekId: getDocId(mappedWeek),
        clientTaskId: input.clientTaskId,
      }),
    ).lean();

    return task ? mapTaskDoc(task as unknown as MongoTaskDoc) : null;
  }

  private async toOwnedTask(
    userId: string,
    task: MongoTaskDoc,
    input: Pick<TaskCompletedChangedApplyInput, "clientPlanId" | "clientWeekId">,
  ): Promise<AppliedTaskMutationEntity | null> {
    const week = await WeekModel.findOne(withoutTombstones({ _id: task.weekId })).lean();
    if (!week) return null;

    const mappedWeek = week as unknown as MongoWeekDoc;
    if (input.clientWeekId && mappedWeek.clientWeekId !== input.clientWeekId) return null;

    const plan = await PlanModel.findOne(withoutTombstones({ _id: mappedWeek.planId })).lean();
    if (!plan) return null;

    const mappedPlan = plan as unknown as MongoPlanDoc;
    if (mappedPlan.userId !== userId) return null;
    if (input.clientPlanId && mappedPlan.clientPlanId !== input.clientPlanId) return null;

    return mapTaskDoc(task);
  }
}
