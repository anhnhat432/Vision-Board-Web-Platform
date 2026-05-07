import mongoose from "mongoose";

import { DailyCheckInModel } from "../../../models/DailyCheckInModel";
import { LeadMetricModel } from "../../../models/LeadMetricModel";
import { PlanModel } from "../../../models/PlanModel";
import { WeekModel } from "../../../models/WeekModel";
import { WeekReviewModel } from "../../../models/WeekReviewModel";
import type {
  SyncWorkspaceMutationRepository,
  DailyCheckInUpsertApplyInput,
  WeeklyReviewUpsertApplyInput,
  PlanSnapshotUpdatedApplyInput,
  LeadMetricUpsertApplyInput,
  AppliedWorkspaceMutationEntity,
} from "./SyncWorkspaceMutationRepository";

// ─── Mongo document interfaces ─────────────────────────────────

interface MongoPlanDoc {
  _id: { toString(): string } | string;
  userId: string;
  vision?: string | null;
  startDate?: Date | null;
  clientPlanId?: string | null;
  clientGoalId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface MongoWeekDoc {
  _id: { toString(): string } | string;
  planId: { toString(): string } | string;
  weekNumber: number;
  clientWeekId?: string | null;
}

interface MongoDailyCheckInDoc {
  _id: { toString(): string } | string;
  clientCheckInId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface MongoWeekReviewDoc {
  _id: { toString(): string } | string;
  clientReviewId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface MongoLeadMetricDoc {
  _id: { toString(): string } | string;
  clientMetricId?: string | null;
  revision?: number | null;
  syncUpdatedAt?: Date | null;
}

interface OwnedWeekRef {
  planId: string;
  weekId: string;
  clientPlanId: string;
  clientWeekId?: string;
  weekNumber: number;
}

// ─── Helpers ────────────────────────────────────────────────────

function getDocId(doc: { _id: { toString(): string } | string }): string {
  return doc._id.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDuplicateKeyError(error: unknown): boolean {
  return isRecord(error) && error.code === 11000;
}

function mapDailyCheckInDoc(doc: MongoDailyCheckInDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientCheckInId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function mapWeekReviewDoc(doc: MongoWeekReviewDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientReviewId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function mapPlanDoc(doc: MongoPlanDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientPlanId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

function mapLeadMetricDoc(doc: MongoLeadMetricDoc): AppliedWorkspaceMutationEntity {
  return {
    id: getDocId(doc),
    clientId: doc.clientMetricId ?? undefined,
    revision: doc.revision ?? undefined,
    syncUpdatedAt: doc.syncUpdatedAt ?? undefined,
  };
}

// ─── Repository ─────────────────────────────────────────────────

export class MongoSyncWorkspaceMutationRepository implements SyncWorkspaceMutationRepository {
  async applyPlanSnapshotUpdated(
    userId: string,
    input: PlanSnapshotUpdatedApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const existingPlan = await PlanModel.findOne({ userId, clientPlanId: input.clientPlanId }).lean();
    if (!existingPlan) return null;

    const mappedPlan = existingPlan as unknown as MongoPlanDoc;
    const planId = getDocId(mappedPlan);
    const planSet: Record<string, unknown> = {
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };
    if (input.clientGoalId) planSet.clientGoalId = input.clientGoalId;
    if (input.vision !== undefined) planSet.vision = input.vision;
    if (input.startDate !== undefined) planSet.startDate = input.startDate;

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const updatedPlan = await PlanModel.findByIdAndUpdate(
        planId,
        { $set: planSet, $inc: { revision: 1 } },
        { new: true, runValidators: true, session },
      ).lean();
      if (!updatedPlan) {
        await session.abortTransaction();
        return null;
      }

      for (const week of input.weeks) {
        const weekQuery: Record<string, unknown> = { planId };
        if (week.clientWeekId) weekQuery.clientWeekId = week.clientWeekId;
        else weekQuery.weekNumber = week.weekNumber;

        const weekSet: Record<string, unknown> = {
          clientPlanId: input.clientPlanId,
          lastMutationId: input.mutationId,
          syncUpdatedAt: input.syncUpdatedAt,
        };
        if (week.focus !== undefined) weekSet.focus = week.focus;
        if (week.expectedOutput !== undefined) weekSet.expectedOutput = week.expectedOutput;

        await WeekModel.findOneAndUpdate(
          weekQuery,
          { $set: weekSet, $inc: { revision: 1 } },
          { runValidators: true, session },
        ).lean();
      }

      await session.commitTransaction();
      return mapPlanDoc(updatedPlan as unknown as MongoPlanDoc);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async applyLeadMetricUpserted(
    userId: string,
    input: LeadMetricUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const ownedWeek = await this.findOwnedWeek(userId, input);
    if (!ownedWeek) return null;

    const existing = await LeadMetricModel.findOne({
      $or: [
        {
          userId,
          clientPlanId: ownedWeek.clientPlanId,
          clientWeekId: ownedWeek.clientWeekId,
          clientMetricId: input.clientMetricId,
        },
        {
          weekId: ownedWeek.weekId,
          clientMetricId: input.clientMetricId,
        },
      ],
    }).lean();
    const update = {
      userId,
      weekId: ownedWeek.weekId,
      clientPlanId: ownedWeek.clientPlanId,
      clientWeekId: ownedWeek.clientWeekId,
      clientMetricId: input.clientMetricId,
      leadIndicatorId: input.leadIndicatorId,
      name: input.name,
      weeklyTarget: input.weeklyTarget ?? 0,
      target: input.target,
      currentValue: input.currentValue,
      unit: input.unit,
      frequency: input.frequency,
      type: input.type,
      priority: input.priority,
      schedule: input.schedule,
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };

    if (existing) {
      const doc = await LeadMetricModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoLeadMetricDoc),
        { $set: update, $inc: { revision: 1 } },
        { new: true, runValidators: true },
      ).lean();

      return doc ? mapLeadMetricDoc(doc as unknown as MongoLeadMetricDoc) : null;
    }

    const doc = await LeadMetricModel.create(update);
    return mapLeadMetricDoc(doc.toObject() as unknown as MongoLeadMetricDoc);
  }

  async applyDailyCheckInUpserted(
    userId: string,
    input: DailyCheckInUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const ownedWeek = await this.findOwnedWeek(userId, input);
    if (!ownedWeek) return null;

    const existing = await DailyCheckInModel.findOne({
      userId,
      clientPlanId: ownedWeek.clientPlanId,
      localDate: input.localDate,
    }).lean();
    const update = {
      userId,
      planId: ownedWeek.planId,
      weekId: ownedWeek.weekId,
      clientGoalId: input.clientGoalId,
      clientPlanId: ownedWeek.clientPlanId,
      clientWeekId: ownedWeek.clientWeekId,
      clientCheckInId: input.clientCheckInId ?? `${ownedWeek.clientPlanId}:checkin:${input.localDate}`,
      weekNumber: ownedWeek.weekNumber,
      localDate: input.localDate,
      didWorkToday: input.didWorkToday,
      whichLeadIndicatorWorkedOn: input.whichLeadIndicatorWorkedOn,
      amountDone: input.amountDone,
      outputCreated: input.outputCreated,
      obstacleOrIssue: input.obstacleOrIssue,
      dailySelfRating: input.dailySelfRating,
      optionalNote: input.optionalNote,
      mood: input.mood,
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };

    if (existing) {
      const doc = await DailyCheckInModel.findByIdAndUpdate(
        getDocId(existing as unknown as MongoDailyCheckInDoc),
        { $set: update, $inc: { revision: 1 } },
        { new: true, runValidators: true },
      ).lean();

      return doc ? mapDailyCheckInDoc(doc as unknown as MongoDailyCheckInDoc) : null;
    }

    const doc = await DailyCheckInModel.create(update);
    return mapDailyCheckInDoc(doc.toObject() as unknown as MongoDailyCheckInDoc);
  }

  async applyWeeklyReviewUpserted(
    userId: string,
    input: WeeklyReviewUpsertApplyInput,
  ): Promise<AppliedWorkspaceMutationEntity | null> {
    const ownedWeek = await this.findOwnedWeek(userId, input);
    if (!ownedWeek) return null;

    const existing = await WeekReviewModel.findOne({
      userId,
      clientPlanId: ownedWeek.clientPlanId,
      weekNumber: ownedWeek.weekNumber,
    }).lean();

    const update = {
      userId,
      planId: ownedWeek.planId,
      weekId: ownedWeek.weekId,
      weekNumber: ownedWeek.weekNumber,
      executionScore: input.executionScore,
      reflection: input.biggestOutputThisWeek,
      adjustments: input.nextWeekPriority,
      clientPlanId: ownedWeek.clientPlanId,
      clientWeekId: ownedWeek.clientWeekId,
      clientReviewId: input.clientReviewId ?? `${ownedWeek.clientPlanId}:review:${ownedWeek.weekNumber}`,
      leadCompletionPercent: input.leadCompletionPercent,
      lagProgressValue: input.lagProgressValue,
      biggestOutputThisWeek: input.biggestOutputThisWeek,
      mainObstacle: input.mainObstacle,
      nextWeekPriority: input.nextWeekPriority,
      workloadDecision: input.workloadDecision,
      reviewCompleted: input.reviewCompleted,
      progressScore: input.progressScore,
      disciplineScore: input.disciplineScore,
      focusScore: input.focusScore,
      improvementScore: input.improvementScore,
      outputQualityScore: input.outputQualityScore,
      completedLeadIndicators: input.completedLeadIndicators,
      lastMutationId: input.mutationId,
      syncUpdatedAt: input.syncUpdatedAt,
    };

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const updatedWeek = await WeekModel.findByIdAndUpdate(
        ownedWeek.weekId,
        {
          $set: {
            review: {
              weekNumber: ownedWeek.weekNumber,
              executionScore: input.executionScore,
              reflection: input.biggestOutputThisWeek,
              adjustments: input.nextWeekPriority,
            },
            lastMutationId: input.mutationId,
            syncUpdatedAt: input.syncUpdatedAt,
          },
          $inc: { revision: 1 },
        },
        { new: true, runValidators: true, session },
      ).lean();
      if (!updatedWeek) {
        await session.abortTransaction();
        return null;
      }

      let reviewDoc: MongoWeekReviewDoc | null = null;

      if (existing) {
        reviewDoc = await WeekReviewModel.findByIdAndUpdate(
          getDocId(existing as unknown as MongoWeekReviewDoc),
          { $set: update, $inc: { revision: 1 } },
          { new: true, runValidators: true, session },
        ).lean() as unknown as MongoWeekReviewDoc | null;
      } else {
        const created = await WeekReviewModel.create([update], { session });
        reviewDoc = (Array.isArray(created) ? created[0] : created).toObject() as unknown as MongoWeekReviewDoc;
      }

      await session.commitTransaction();

      return reviewDoc ? mapWeekReviewDoc(reviewDoc) : null;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async findOwnedWeek(
    userId: string,
    input: { clientPlanId: string; clientWeekId?: string; weekNumber: number },
  ): Promise<OwnedWeekRef | null> {
    const plan = await PlanModel.findOne({ userId, clientPlanId: input.clientPlanId }).lean();
    if (!plan) return null;

    const mappedPlan = plan as unknown as MongoPlanDoc;
    const weekQuery: Record<string, unknown> = {
      planId: getDocId(mappedPlan),
    };
    if (input.clientWeekId) weekQuery.clientWeekId = input.clientWeekId;
    else weekQuery.weekNumber = input.weekNumber;

    const week = await WeekModel.findOne(weekQuery).lean();
    if (!week) return null;

    const mappedWeek = week as unknown as MongoWeekDoc;
    if (mappedWeek.weekNumber !== input.weekNumber) return null;
    if (input.clientWeekId && mappedWeek.clientWeekId !== input.clientWeekId) return null;

    return {
      planId: getDocId(mappedPlan),
      weekId: getDocId(mappedWeek),
      clientPlanId: input.clientPlanId,
      clientWeekId: mappedWeek.clientWeekId ?? input.clientWeekId,
      weekNumber: mappedWeek.weekNumber,
    };
  }
}