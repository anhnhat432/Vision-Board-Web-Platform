import type { Types } from "mongoose";

import { WeekModel } from "../../models/WeekModel";
import { ConflictError } from "../../utils/conflictError";

export interface WeekReviewData {
  weekNumber: number;
  executionScore: number;
  reflection?: string;
  adjustments?: string;
  baseRevision?: number;
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
  baseRevision?: number;
}

function getRequiredText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
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
      focus: getRequiredText(data.focus, `Week ${data.weekNumber} focus`),
      expectedOutput: getRequiredText(data.expectedOutput, `Week ${data.weekNumber} expected output`),
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
    const existing = await WeekModel.findById(id).lean();
    if (!existing) return null;

    if (updates.baseRevision !== undefined && existing.revision != null) {
      if (updates.baseRevision < existing.revision) {
        throw new ConflictError(existing.revision, existing.updatedAt);
      }
    }

    const normalizedUpdates: Record<string, unknown> = {};
    if (updates.focus !== undefined) {
      normalizedUpdates.focus = getRequiredText(updates.focus, existing.focus || `Week ${existing.weekNumber} focus`);
    }
    if (updates.expectedOutput !== undefined) {
      normalizedUpdates.expectedOutput = getRequiredText(
        updates.expectedOutput,
        existing.expectedOutput || `Week ${existing.weekNumber} expected output`,
      );
    }
    if (updates.baseRevision !== undefined) {
      delete (normalizedUpdates as Record<string, unknown>).baseRevision;
    }

    const doc = await WeekModel.findByIdAndUpdate(
      id,
      { $set: normalizedUpdates, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapWeek(doc) : null;
  }

  async submitWeeklyReview(id: string, review: WeekReviewData): Promise<WeekEntity | null> {
    const existing = await WeekModel.findById(id).lean();
    if (!existing) return null;

    if (review.baseRevision !== undefined && existing.revision != null) {
      if (review.baseRevision < existing.revision) {
        throw new ConflictError(existing.revision, existing.updatedAt);
      }
    }

    const doc = await WeekModel.findByIdAndUpdate(
      id,
      { $set: { review: { weekNumber: review.weekNumber, executionScore: review.executionScore, reflection: review.reflection, adjustments: review.adjustments } }, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapWeek(doc) : null;
  }

  async deleteWeeksByPlanId(planId: string): Promise<number> {
    const result = await WeekModel.deleteMany({ planId });
    return result.deletedCount ?? 0;
  }
}
