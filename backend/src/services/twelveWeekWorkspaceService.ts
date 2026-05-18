import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { GoalModel } from "../models/GoalModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { PlanModel } from "../models/PlanModel";
import { TaskModel } from "../models/TaskModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";
import { withoutTombstones } from "../utils/tombstone";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceExportResult {
  generatedAt: string;
  version: 1;
  userId: string;
  workspace: {
    goals: unknown[];
    plans: unknown[];
    weeks: unknown[];
    tasks: unknown[];
    leadMetrics: unknown[];
    dailyCheckIns: unknown[];
    weeklyReviews: unknown[];
  };
  counts: {
    goals: number;
    plans: number;
    weeks: number;
    tasks: number;
    leadMetrics: number;
    dailyCheckIns: number;
    weeklyReviews: number;
  };
}

export interface WorkspaceDeleteResult {
  deletedAt: string;
  policy: "hard_delete";
  counts: {
    goals: number;
    plans: number;
    weeks: number;
    tasks: number;
    leadMetrics: number;
    dailyCheckIns: number;
    weeklyReviews: number;
  };
}

// ---------------------------------------------------------------------------
// Repository interface (for testability)
// ---------------------------------------------------------------------------

export interface TwelveWeekWorkspaceRepository {
  exportWorkspace(userId: string): Promise<WorkspaceExportResult>;
  deleteWorkspace(userId: string): Promise<WorkspaceDeleteResult>;
}

// ---------------------------------------------------------------------------
// Mongo implementation
// ---------------------------------------------------------------------------

function stripInternalFields(doc: Record<string, unknown>): Record<string, unknown> {
  const { __v, ...rest } = doc;
  return rest;
}

class MongoTwelveWeekWorkspaceRepository implements TwelveWeekWorkspaceRepository {
  async exportWorkspace(userId: string): Promise<WorkspaceExportResult> {
    const plans = (await PlanModel.find(withoutTombstones({ userId })).sort({ startDate: 1, _id: 1 }).lean()) as Record<string, unknown>[];
    const planIds = plans.map((p) => p._id);

    const [goals, weeks] = await Promise.all([
      GoalModel.find(withoutTombstones({ userId })).sort({ createdAt: 1, _id: 1 }).lean() as Promise<Record<string, unknown>[]>,
      planIds.length > 0
        ? (WeekModel.find(withoutTombstones({ planId: { $in: planIds } })).sort({ weekNumber: 1, _id: 1 }).lean() as Promise<
            Record<string, unknown>[]
          >)
        : Promise.resolve([]),
    ]);

    const weekIds = weeks.map((w) => w._id);

    const [tasks, leadMetrics, dailyCheckIns, weeklyReviews] = await Promise.all([
      weekIds.length > 0
        ? (TaskModel.find(withoutTombstones({ weekId: { $in: weekIds } })).sort({ scheduledDate: 1, _id: 1 }).lean() as Promise<
            Record<string, unknown>[]
          >)
        : Promise.resolve([]),
      weekIds.length > 0
        ? (LeadMetricModel.find(withoutTombstones({ weekId: { $in: weekIds } })).sort({ name: 1, _id: 1 }).lean() as Promise<
            Record<string, unknown>[]
          >)
        : Promise.resolve([]),
      planIds.length > 0
        ? (DailyCheckInModel.find(withoutTombstones({ userId, planId: { $in: planIds } }))
            .sort({ localDate: 1, _id: 1 })
            .lean() as Promise<Record<string, unknown>[]>)
        : Promise.resolve([]),
      weekIds.length > 0
        ? (WeekReviewModel.find(
            withoutTombstones({
              $or: [
                { userId, planId: { $in: planIds } },
                { userId: { $exists: false }, weekId: { $in: weekIds } },
                { userId: null, weekId: { $in: weekIds } },
              ],
            }),
          )
            .sort({ weekNumber: 1, _id: 1 })
            .lean() as Promise<Record<string, unknown>[]>)
        : Promise.resolve([]),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      version: 1,
      userId,
      workspace: {
        goals: goals.map(stripInternalFields),
        plans: plans.map(stripInternalFields),
        weeks: weeks.map(stripInternalFields),
        tasks: tasks.map(stripInternalFields),
        leadMetrics: leadMetrics.map(stripInternalFields),
        dailyCheckIns: dailyCheckIns.map(stripInternalFields),
        weeklyReviews: weeklyReviews.map(stripInternalFields),
      },
      counts: {
        goals: goals.length,
        plans: plans.length,
        weeks: weeks.length,
        tasks: tasks.length,
        leadMetrics: leadMetrics.length,
        dailyCheckIns: dailyCheckIns.length,
        weeklyReviews: weeklyReviews.length,
      },
    };
  }

  async deleteWorkspace(userId: string): Promise<WorkspaceDeleteResult> {
    // Project convention: models have deletedAt but the existing import/mutation
    // flow does not use soft-delete lifecycle yet. We use hard delete here because:
    //   1. No existing tombstone garbage-collection job exists.
    //   2. The user explicitly requested workspace removal.
    //   3. Billing/subscription/account records are NOT touched.
    //
    // Delete order: leaf entities first, then parents.

    const plans = (await PlanModel.find({ userId }).select("_id").lean()) as Array<{ _id: unknown }>;
    const planIds = plans.map((p) => p._id);

    let weekIds: unknown[] = [];
    if (planIds.length > 0) {
      const weeks = (await WeekModel.find({ planId: { $in: planIds } }).select("_id").lean()) as Array<{
        _id: unknown;
      }>;
      weekIds = weeks.map((w) => w._id);
    }

    // Delete leaf entities
    const [taskResult, leadMetricResult, dailyCheckInResult, weeklyReviewResult] = await Promise.all([
      weekIds.length > 0
        ? TaskModel.deleteMany({ weekId: { $in: weekIds } })
        : Promise.resolve({ deletedCount: 0 }),
      weekIds.length > 0
        ? LeadMetricModel.deleteMany({ weekId: { $in: weekIds } })
        : Promise.resolve({ deletedCount: 0 }),
      planIds.length > 0
        ? DailyCheckInModel.deleteMany({ userId, planId: { $in: planIds } })
        : Promise.resolve({ deletedCount: 0 }),
      weekIds.length > 0
        ? WeekReviewModel.deleteMany({
            $or: [
              { userId, planId: { $in: planIds } },
              { userId: { $exists: false }, weekId: { $in: weekIds } },
              { userId: null, weekId: { $in: weekIds } },
            ],
          })
        : Promise.resolve({ deletedCount: 0 }),
    ]);

    // Delete parent entities
    const [weekResult, planResult, goalResult] = await Promise.all([
      planIds.length > 0
        ? WeekModel.deleteMany({ planId: { $in: planIds } })
        : Promise.resolve({ deletedCount: 0 }),
      PlanModel.deleteMany({ userId }),
      GoalModel.deleteMany({ userId }),
    ]);

    return {
      deletedAt: new Date().toISOString(),
      policy: "hard_delete",
      counts: {
        goals: goalResult.deletedCount ?? 0,
        plans: planResult.deletedCount ?? 0,
        weeks: weekResult.deletedCount ?? 0,
        tasks: taskResult.deletedCount ?? 0,
        leadMetrics: leadMetricResult.deletedCount ?? 0,
        dailyCheckIns: dailyCheckInResult.deletedCount ?? 0,
        weeklyReviews: weeklyReviewResult.deletedCount ?? 0,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TwelveWeekWorkspaceService {
  constructor(private readonly repo: TwelveWeekWorkspaceRepository) {}

  async exportWorkspace(userId: string): Promise<WorkspaceExportResult> {
    return this.repo.exportWorkspace(userId);
  }

  async deleteWorkspace(userId: string): Promise<WorkspaceDeleteResult> {
    return this.repo.deleteWorkspace(userId);
  }
}

export const twelveWeekWorkspaceService = new TwelveWeekWorkspaceService(
  new MongoTwelveWeekWorkspaceRepository(),
);
