import { isValidObjectId, type Types } from "mongoose";

import { PlanModel } from "../../models/PlanModel";
import { ConflictError } from "../../utils/conflictError";

export interface PlanEntity {
  id: string;
  userId: string;
  vision: string;
  smartGoalId?: string;
  startDate: Date;
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

    const doc = await PlanModel.findById(id).lean();
    return doc ? mapPlan(doc) : null;
  }

  async getPlansByUserId(userId: string): Promise<PlanEntity[]> {
    const docs = await PlanModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapPlan(doc));
  }

  async updatePlan(id: string, updates: UpdatePlanData): Promise<PlanEntity | null> {
    const existing = await PlanModel.findById(id).lean();
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

    const doc = await PlanModel.findByIdAndUpdate(
      id,
      { $set: updateOps, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapPlan(doc) : null;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await PlanModel.findByIdAndDelete(id).lean();
    return Boolean(result);
  }
}
