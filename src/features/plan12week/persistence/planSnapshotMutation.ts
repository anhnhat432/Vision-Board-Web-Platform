import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import {
  enqueueStoredMutation,
  type PlanSnapshotMutationReason,
  type PlanSnapshotUpdatedMutationPayload,
} from "./mutationQueue";
import { getPlanLink } from "./planLinkStore";
import { getTwelveWeekClientPlanId } from "./twelveWeekImportPayload";

function toIso(value?: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (value) return new Date(value).toISOString();
  return new Date().toISOString();
}

export function buildPlanSnapshotUpdatedPayload(
  goalId: string,
  system: TwelveWeekSystem,
  reason: PlanSnapshotMutationReason,
  options: { now?: string | Date } = {},
): PlanSnapshotUpdatedMutationPayload {
  const changedAt = toIso(options.now);
  return {
    reason,
    clientGoalId: goalId,
    clientPlanId: getTwelveWeekClientPlanId(goalId),
    changedAt,
    clientUpdatedAt: changedAt,
    system: {
      goalType: system.goalType,
      vision12Week: system.vision12Week,
      lagMetric: system.lagMetric,
      leadIndicators: system.leadIndicators.map((indicator) => ({ ...indicator })),
      milestones: { ...system.milestones },
      successEvidence: system.successEvidence,
      reviewDay: system.reviewDay,
      week12Outcome: system.week12Outcome,
      startDate: system.startDate,
      endDate: system.endDate,
      timezone: system.timezone,
      weekStartsOn: system.weekStartsOn,
      status: system.status,
      tacticLoadPreference: system.tacticLoadPreference,
      preferredDays: system.preferredDays ? [...system.preferredDays] : undefined,
      personalConstraint: system.personalConstraint,
      reentryCount: system.reentryCount,
      currentWeek: system.currentWeek,
      totalWeeks: system.totalWeeks,
      weeklyPlans: system.weeklyPlans.map((week) => ({ ...week })),
    },
  };
}

export function enqueuePlanSnapshotUpdatedMutation(
  goalId: string,
  system: TwelveWeekSystem,
  reason: PlanSnapshotMutationReason,
): void {
  try {
    const planLink = getPlanLink(goalId);
    enqueueStoredMutation({
      kind: "plan_snapshot_updated",
      goalId,
      planId: planLink?.planId ?? null,
      payload: buildPlanSnapshotUpdatedPayload(goalId, system, reason),
    });
  } catch {
    // Queueing is a best-effort sidecar. The local-first plan save stays authoritative.
  }
}
