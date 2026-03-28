import type { Types } from "mongoose";

import { WeekModel } from "../../models/WeekModel";

export interface WeekReviewData {
  weekNumber: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
}

export interface WeekEntity {
  id: string;
  planId: string;
  weekNumber: number;
  focus: string;
  expectedOutput: string;
  review?: WeekReviewData;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWeekData {
  planId: string;
  weekNumber: number;
  focus?: string;
  expectedOutput?: string;
}

export interface UpdateWeekData {
  focus?: string;
  expectedOutput?: string;
}

function mapWeek(doc: {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  weekNumber: number;
  focus: string;
  expectedOutput: string;
  review?:
    | {
        weekNumber: number;
        executionScore: number;
        reflection?: string | null;
        adjustments?: string | null;
      }
    | null;
  createdAt: Date;
  updatedAt: Date;
}): WeekEntity {
  return {
    id: doc._id.toString(),
    planId: doc.planId.toString(),
    weekNumber: doc.weekNumber,
    focus: doc.focus,
    expectedOutput: doc.expectedOutput,
    review: doc.review
      ? {
          weekNumber: doc.review.weekNumber,
          executionScore: doc.review.executionScore,
          reflection: doc.review.reflection ?? undefined,
          adjustments: doc.review.adjustments ?? undefined,
        }
      : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoWeekRepository {
  async createWeek(data: CreateWeekData): Promise<WeekEntity> {
    const doc = await WeekModel.create({
      planId: data.planId,
      weekNumber: data.weekNumber,
      focus: data.focus ?? "",
      expectedOutput: data.expectedOutput ?? "",
    });

    return mapWeek(doc.toObject());
  }

  async getWeekById(id: string): Promise<WeekEntity | null> {
    const doc = await WeekModel.findById(id).lean();
    return doc ? mapWeek(doc) : null;
  }

  async getWeeksByPlanId(planId: string): Promise<WeekEntity[]> {
    const docs = await WeekModel.find({ planId }).sort({ weekNumber: 1 }).lean();
    return docs.map((doc) => mapWeek(doc));
  }

  async updateWeek(id: string, updates: UpdateWeekData): Promise<WeekEntity | null> {
    const doc = await WeekModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapWeek(doc) : null;
  }

  async submitWeeklyReview(id: string, review: WeekReviewData): Promise<WeekEntity | null> {
    const doc = await WeekModel.findByIdAndUpdate(
      id,
      { $set: { review } },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapWeek(doc) : null;
  }
}
