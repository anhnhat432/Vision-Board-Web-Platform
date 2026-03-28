import type { Types } from "mongoose";

import { PlanModel } from "../../models/PlanModel";

export interface PlanEntity {
  id: string;
  userId: string;
  vision: string;
  smartGoalId?: string;
  startDate: Date;
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
}

function mapPlan(doc: {
  _id: Types.ObjectId;
  userId: string;
  vision: string;
  smartGoalId?: string | null;
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}): PlanEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    vision: doc.vision,
    smartGoalId: doc.smartGoalId ?? undefined,
    startDate: doc.startDate,
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
    const doc = await PlanModel.findById(id).lean();
    return doc ? mapPlan(doc) : null;
  }

  async getPlansByUserId(userId: string): Promise<PlanEntity[]> {
    const docs = await PlanModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapPlan(doc));
  }

  async updatePlan(id: string, updates: UpdatePlanData): Promise<PlanEntity | null> {
    const doc = await PlanModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapPlan(doc) : null;
  }
}
