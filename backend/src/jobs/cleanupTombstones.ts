import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { GoalModel } from "../models/GoalModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { PlanModel } from "../models/PlanModel";
import { TaskModel } from "../models/TaskModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";

const TOMBSTONE_RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

export interface TombstoneCleanupCounts {
  goals: number;
  plans: number;
  weeks: number;
  tasks: number;
  leadMetrics: number;
  dailyCheckIns: number;
  weeklyReviews: number;
}

function getCutoffDate(now = new Date()): Date {
  return new Date(now.getTime() - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function cleanupExpiredTombstones(now = new Date()): Promise<TombstoneCleanupCounts> {
  const deletedAt = { $lt: getCutoffDate(now) };
  const [taskResult, leadMetricResult, dailyCheckInResult, weeklyReviewResult, weekResult, planResult, goalResult] =
    await Promise.all([
      TaskModel.deleteMany({ deletedAt }),
      LeadMetricModel.deleteMany({ deletedAt }),
      DailyCheckInModel.deleteMany({ deletedAt }),
      WeekReviewModel.deleteMany({ deletedAt }),
      WeekModel.deleteMany({ deletedAt }),
      PlanModel.deleteMany({ deletedAt }),
      GoalModel.deleteMany({ deletedAt }),
    ]);

  return {
    goals: goalResult.deletedCount ?? 0,
    plans: planResult.deletedCount ?? 0,
    weeks: weekResult.deletedCount ?? 0,
    tasks: taskResult.deletedCount ?? 0,
    leadMetrics: leadMetricResult.deletedCount ?? 0,
    dailyCheckIns: dailyCheckInResult.deletedCount ?? 0,
    weeklyReviews: weeklyReviewResult.deletedCount ?? 0,
  };
}

export function startTombstoneCleanupJob(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    cleanupExpiredTombstones()
      .then((counts) => {
        const deletedCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
        if (deletedCount > 0) {
          console.info("[tombstone-cleanup] Deleted expired 12-week tombstones.", { deletedCount, counts });
        }
      })
      .catch((error) => {
        console.error("[tombstone-cleanup] Failed to delete expired tombstones.", error);
      });
  }, CLEANUP_INTERVAL_MS);

  cleanupTimer.unref?.();
}

export function stopTombstoneCleanupJob(): void {
  if (!cleanupTimer) return;
  clearInterval(cleanupTimer);
  cleanupTimer = null;
}
