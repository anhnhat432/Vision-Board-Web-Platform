import { DailyCheckInModel } from "../../models/DailyCheckInModel";
import { GoalModel } from "../../models/GoalModel";
import { LeadMetricModel } from "../../models/LeadMetricModel";
import { PlanModel } from "../../models/PlanModel";
import { TaskModel } from "../../models/TaskModel";
import { WeekModel } from "../../models/WeekModel";
import { WeekReviewModel } from "../../models/WeekReviewModel";
import {
  MongoSyncMutationLogRepository,
  type CreateSyncMutationLogData,
  type SyncMutationLogEntity,
} from "../../repositories/mongo/MongoSyncMutationLogRepository";
import { ApiError } from "../../utils/apiError";
import { withoutTombstones } from "../../utils/tombstone";
import {
  getDocId,
  mapDailyCheckInDoc,
  mapGoalDoc,
  mapLeadMetricDoc,
  mapPlanDoc,
  mapTaskDoc,
  mapWeekDoc,
  mapWeeklyReviewDoc,
  type MongoDailyCheckInDoc,
  type MongoGoalDoc,
  type MongoLeadMetricDoc,
  type MongoPlanDoc,
  type MongoTaskDoc,
  type MongoWeekDoc,
  type MongoWeeklyReviewDoc,
} from "./mongo-mappers";
import type {
  ImportDailyCheckInData,
  ImportGoalData,
  ImportLeadMetricData,
  ImportPlanData,
  ImportTaskData,
  ImportWeekData,
  ImportWeeklyReviewData,
  ImportedDailyCheckInEntity,
  ImportedGoalEntity,
  ImportedLeadMetricEntity,
  ImportedPlanEntity,
  ImportedTaskEntity,
  ImportedWeekEntity,
  ImportedWeeklyReviewEntity,
  TwelveWeekImportRepository,
  UpsertResult,
} from "./types";

export class MongoTwelveWeekImportRepository implements TwelveWeekImportRepository {
  constructor(private readonly mutationLogRepository = new MongoSyncMutationLogRepository()) {}

  async findImportLog(userId: string, importId: string): Promise<SyncMutationLogEntity | null> {
    return this.mutationLogRepository.findByUserAndMutationId(userId, importId);
  }

  async createImportLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity> {
    return this.mutationLogRepository.createMutationLog(data);
  }

  async upsertGoal(data: ImportGoalData): Promise<UpsertResult<ImportedGoalEntity>> {
    const existing = await GoalModel.findOne(
      withoutTombstones({ userId: data.userId, clientGoalId: data.clientGoalId }),
    ).lean();
    const update = {
      title: data.title,
      category: data.category,
      description: data.description,
      deadline: data.deadline,
      status: data.status,
      clientGoalId: data.clientGoalId,
      focusArea: data.focusArea,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await GoalModel.findOneAndUpdate(
        withoutTombstones({ _id: getDocId(existing as unknown as MongoGoalDoc) }),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported goal could not be updated.");
      return { entity: mapGoalDoc(doc as unknown as MongoGoalDoc), operation: "updated" };
    }

    const doc = await GoalModel.create({
      userId: data.userId,
      ...update,
    });
    return { entity: mapGoalDoc(doc.toObject() as unknown as MongoGoalDoc), operation: "created" };
  }

  async linkGoalToPlan(goalId: string, planId: string, importId: string, syncUpdatedAt: Date): Promise<void> {
    await GoalModel.findOneAndUpdate(withoutTombstones({ _id: goalId }), {
      $set: {
        planId,
        lastMutationId: importId,
        syncUpdatedAt,
      },
    });
  }

  async upsertPlan(data: ImportPlanData): Promise<UpsertResult<ImportedPlanEntity>> {
    const existing = await PlanModel.findOne(
      withoutTombstones({ userId: data.userId, clientPlanId: data.clientPlanId }),
    ).lean();
    const update = {
      userId: data.userId,
      vision: data.vision,
      smartGoalId: data.smartGoalId,
      startDate: data.startDate,
      clientPlanId: data.clientPlanId,
      clientGoalId: data.clientGoalId,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await PlanModel.findOneAndUpdate(
        withoutTombstones({ _id: getDocId(existing as unknown as MongoPlanDoc) }),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported plan could not be updated.");
      return { entity: mapPlanDoc(doc as unknown as MongoPlanDoc), operation: "updated" };
    }

    const doc = await PlanModel.create(update);
    return { entity: mapPlanDoc(doc.toObject() as unknown as MongoPlanDoc), operation: "created" };
  }

  async upsertWeek(data: ImportWeekData): Promise<UpsertResult<ImportedWeekEntity>> {
    const existing = await WeekModel.findOne(
      withoutTombstones({
        planId: data.planId,
        $or: [{ clientWeekId: data.clientWeekId }, { weekNumber: data.weekNumber }],
      }),
    ).lean();
    const update = {
      planId: data.planId,
      weekNumber: data.weekNumber,
      focus: data.focus,
      expectedOutput: data.expectedOutput,
      clientWeekId: data.clientWeekId,
      clientPlanId: data.clientPlanId,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await WeekModel.findOneAndUpdate(
        withoutTombstones({ _id: getDocId(existing as unknown as MongoWeekDoc) }),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported week could not be updated.");
      return { entity: mapWeekDoc(doc as unknown as MongoWeekDoc), operation: "updated" };
    }

    const doc = await WeekModel.create(update);
    return { entity: mapWeekDoc(doc.toObject() as unknown as MongoWeekDoc), operation: "created" };
  }

  async upsertTask(data: ImportTaskData): Promise<UpsertResult<ImportedTaskEntity>> {
    const existing = await TaskModel.findOne(
      withoutTombstones({ weekId: data.weekId, clientTaskId: data.clientTaskId }),
    ).lean();
    const update = {
      weekId: data.weekId,
      title: data.title,
      status: data.status,
      scheduledDate: data.scheduledDate,
      completedAt: data.completedAt,
      clientTaskId: data.clientTaskId,
      clientWeekId: data.clientWeekId,
      clientPlanId: data.clientPlanId,
      weekNumber: data.weekNumber,
      leadIndicatorName: data.leadIndicatorName,
      isCore: data.isCore,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await TaskModel.findOneAndUpdate(
        withoutTombstones({ _id: getDocId(existing as unknown as MongoTaskDoc) }),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported task could not be updated.");
      return { entity: mapTaskDoc(doc as unknown as MongoTaskDoc), operation: "updated" };
    }

    const doc = await TaskModel.create(update);
    return { entity: mapTaskDoc(doc.toObject() as unknown as MongoTaskDoc), operation: "created" };
  }

  async upsertLeadMetric(data: ImportLeadMetricData): Promise<UpsertResult<ImportedLeadMetricEntity>> {
    const existing = await LeadMetricModel.findOne(
      withoutTombstones({
        $or: [
          {
            userId: data.userId,
            clientPlanId: data.clientPlanId,
            clientWeekId: data.clientWeekId,
            clientMetricId: data.clientMetricId,
          },
          {
            weekId: data.weekId,
            clientMetricId: data.clientMetricId,
          },
        ],
      }),
    ).lean();
    const update = {
      userId: data.userId,
      weekId: data.weekId,
      name: data.name,
      weeklyTarget: data.weeklyTarget,
      target: data.target,
      currentValue: data.currentValue,
      frequency: data.frequency,
      clientMetricId: data.clientMetricId,
      clientWeekId: data.clientWeekId,
      clientPlanId: data.clientPlanId,
      leadIndicatorId: data.leadIndicatorId,
      unit: data.unit,
      type: data.type,
      priority: data.priority,
      schedule: data.schedule,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await LeadMetricModel.findOneAndUpdate(
        withoutTombstones({ _id: getDocId(existing as unknown as MongoLeadMetricDoc) }),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported lead metric could not be updated.");
      return { entity: mapLeadMetricDoc(doc as unknown as MongoLeadMetricDoc), operation: "updated" };
    }

    const doc = await LeadMetricModel.create(update);
    return { entity: mapLeadMetricDoc(doc.toObject() as unknown as MongoLeadMetricDoc), operation: "created" };
  }

  async upsertDailyCheckIn(data: ImportDailyCheckInData): Promise<UpsertResult<ImportedDailyCheckInEntity>> {
    const existing = await DailyCheckInModel.findOne(
      withoutTombstones({
        userId: data.userId,
        clientPlanId: data.clientPlanId,
        localDate: data.localDate,
      }),
    ).lean();
    const update = {
      userId: data.userId,
      planId: data.planId,
      weekId: data.weekId,
      clientGoalId: data.clientGoalId,
      clientPlanId: data.clientPlanId,
      clientWeekId: data.clientWeekId,
      clientCheckInId: data.clientCheckInId,
      weekNumber: data.weekNumber,
      localDate: data.localDate,
      didWorkToday: data.didWorkToday,
      whichLeadIndicatorWorkedOn: data.whichLeadIndicatorWorkedOn,
      amountDone: data.amountDone,
      outputCreated: data.outputCreated,
      obstacleOrIssue: data.obstacleOrIssue,
      dailySelfRating: data.dailySelfRating,
      optionalNote: data.optionalNote,
      mood: data.mood,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    if (existing) {
      const doc = await DailyCheckInModel.findOneAndUpdate(
        withoutTombstones({ _id: getDocId(existing as unknown as MongoDailyCheckInDoc) }),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported daily check-in could not be updated.");
      return { entity: mapDailyCheckInDoc(doc as unknown as MongoDailyCheckInDoc), operation: "updated" };
    }

    const doc = await DailyCheckInModel.create(update);
    return { entity: mapDailyCheckInDoc(doc.toObject() as unknown as MongoDailyCheckInDoc), operation: "created" };
  }

  async upsertWeeklyReview(data: ImportWeeklyReviewData): Promise<UpsertResult<ImportedWeeklyReviewEntity>> {
    const existing = await WeekReviewModel.findOne(
      withoutTombstones({
        userId: data.userId,
        clientPlanId: data.clientPlanId,
        weekNumber: data.weekNumber,
      }),
    ).lean();
    const update = {
      userId: data.userId,
      planId: data.planId,
      weekId: data.weekId,
      weekNumber: data.weekNumber,
      executionScore: data.executionScore,
      reflection: data.biggestOutputThisWeek,
      adjustments: data.nextWeekPriority,
      clientPlanId: data.clientPlanId,
      clientWeekId: data.clientWeekId,
      clientReviewId: data.clientReviewId,
      leadCompletionPercent: data.leadCompletionPercent,
      lagProgressValue: data.lagProgressValue,
      biggestOutputThisWeek: data.biggestOutputThisWeek,
      mainObstacle: data.mainObstacle,
      nextWeekPriority: data.nextWeekPriority,
      workloadDecision: data.workloadDecision,
      reviewCompleted: data.reviewCompleted,
      progressScore: data.progressScore,
      disciplineScore: data.disciplineScore,
      focusScore: data.focusScore,
      improvementScore: data.improvementScore,
      outputQualityScore: data.outputQualityScore,
      completedLeadIndicators: data.completedLeadIndicators,
      lastMutationId: data.importId,
      syncUpdatedAt: data.syncUpdatedAt,
    };

    await WeekModel.findOneAndUpdate(
      withoutTombstones({ _id: data.weekId }),
      {
        $set: {
          review: {
            weekNumber: data.weekNumber,
            executionScore: data.executionScore,
            reflection: data.biggestOutputThisWeek,
            adjustments: data.nextWeekPriority,
          },
          lastMutationId: data.importId,
          syncUpdatedAt: data.syncUpdatedAt,
        },
      },
      { runValidators: true },
    );

    if (existing) {
      const doc = await WeekReviewModel.findOneAndUpdate(
        withoutTombstones({ _id: getDocId(existing as unknown as MongoWeeklyReviewDoc) }),
        { $set: update },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new ApiError(500, "Imported weekly review could not be updated.");
      return { entity: mapWeeklyReviewDoc(doc as unknown as MongoWeeklyReviewDoc), operation: "updated" };
    }

    const doc = await WeekReviewModel.create(update);
    return { entity: mapWeeklyReviewDoc(doc.toObject() as unknown as MongoWeeklyReviewDoc), operation: "created" };
  }
}
