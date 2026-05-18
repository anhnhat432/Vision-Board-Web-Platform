import { isValidObjectId, type Types } from "mongoose";

import { PlanModel } from "../../models/PlanModel";
import { ConflictError } from "../../utils/conflictError";
import { softDeleteUpdate, withoutTombstones } from "../../utils/tombstone";

export interface PlanEntity {
  id: string;
  userId: string;
  vision: string;
  smartGoalId?: string;
  startDate: Date;
  clientPlanId?: string;
  clientGoalId?: string;
  revision?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanData {
  userId: string;
  vision?: string;
  smartGoalId?: string;
  startDate?: Date;
}

export interface UpdatePlanData {
  vision?: string;
  smartGoalId?: string;
  startDate?: Date;
  baseRevision?: number;
}

function mapPlan(doc: {
  _id: Types.ObjectId;
  userId: string;
  vision: string;
  smartGoalId?: string | null;
  startDate: Date;
  clientPlanId?: string | null;
  clientGoalId?: string | null;
  revision?: number | null;
  createdAt: Date;
  updatedAt: Date;
}): PlanEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    vision: doc.vision,
    smartGoalId: doc.smartGoalId ?? undefined,
    startDate: doc.startDate,
    clientPlanId: doc.clientPlanId ?? undefined,
    clientGoalId: doc.clientGoalId ?? undefined,
    revision: doc.revision ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoPlanRepository {
  async createPlan(data: CreatePlanData): Promise<PlanEntity> {
    const doc = await PlanModel.create({
      userId: data.userId,
      vision: data.vision ?? "",
      smartGoalId: data.smartGoalId,
      startDate: data.startDate ?? new Date(),
    });

    return mapPlan(doc.toObject());
  }

  async getPlanById(id: string): Promise<PlanEntity | null> {
    if (!isValidObjectId(id)) return null;

    const doc = await PlanModel.findOne(withoutTombstones({ _id: id })).lean();
    return doc ? mapPlan(doc) : null;
  }

  async getPlansByUserId(userId: string): Promise<PlanEntity[]> {
    const docs = await PlanModel.find(withoutTombstones({ userId })).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapPlan(doc));
  }

  async getPlansByGoalReference(input: {
    userId: string;
    goalId: string;
    clientGoalId?: string;
    planId?: string;
  }): Promise<PlanEntity[]> {
    const goalReferences: Record<string, unknown>[] = [{ smartGoalId: input.goalId }];
    if (input.clientGoalId) goalReferences.push({ clientGoalId: input.clientGoalId });
    if (input.planId && isValidObjectId(input.planId)) goalReferences.push({ _id: input.planId });

    const docs = await PlanModel.find(
      withoutTombstones({
        userId: input.userId,
        $or: goalReferences,
      }),
    )
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((doc) => mapPlan(doc));
  }

  async updatePlan(id: string, updates: UpdatePlanData): Promise<PlanEntity | null> {
    const existing = await PlanModel.findOne(withoutTombstones({ _id: id })).lean();
    if (!existing) return null;

    if (updates.baseRevision !== undefined && existing.revision != null) {
      if (updates.baseRevision < existing.revision) {
        throw new ConflictError(existing.revision, existing.updatedAt);
      }
    }

    const updateOps: Record<string, unknown> = { ...updates };
    if (updates.baseRevision !== undefined) {
      delete updateOps.baseRevision;
    }

    const doc = await PlanModel.findOneAndUpdate(
      withoutTombstones({ _id: id }),
      { $set: updateOps, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapPlan(doc) : null;
  }

  async deletePlan(id: string, deletedAt = new Date()): Promise<boolean> {
    const result = await PlanModel.findOneAndUpdate(
      withoutTombstones({ _id: id }),
      softDeleteUpdate(deletedAt),
      { new: true },
    ).lean();
    return Boolean(result);
  }
}
