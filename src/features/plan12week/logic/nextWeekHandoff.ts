import type { TwelveWeekSystem, UniversalWeeklyReview } from "@/app/utils/storage-types";

export type NextWeekHandoffUnavailableReason = "final_week" | "historical_review" | "future_review";

export interface AvailableNextWeekHandoffPreview {
  status: "available";
  reviewedWeekNumber: number;
  nextWeekNumber: number;
  currentPriority: string;
  proposedPriority: string;
  priorityWillChange: boolean;
  workloadDecision: UniversalWeeklyReview["workloadDecision"];
  currentLoadPreference: TwelveWeekSystem["tacticLoadPreference"];
  proposedLoadPreference: TwelveWeekSystem["tacticLoadPreference"];
  affectedOptionalTaskCount: number;
  workloadWillChange: boolean;
}

export interface UnavailableNextWeekHandoffPreview {
  status: "unavailable";
  reviewedWeekNumber: number;
  nextWeekNumber: number | null;
  reason: NextWeekHandoffUnavailableReason;
}

export type NextWeekHandoffPreview = AvailableNextWeekHandoffPreview | UnavailableNextWeekHandoffPreview;

export interface ConfirmedNextWeekHandoffSelection {
  applyPriority: boolean;
  applyWorkload: boolean;
  now?: number;
}

export interface AppliedNextWeekHandoffResult {
  status: "applied";
  system: TwelveWeekSystem;
  preview: AvailableNextWeekHandoffPreview;
  appliedPriority: boolean;
  appliedWorkload: boolean;
  changedOptionalTaskCount: number;
}

export interface NoopNextWeekHandoffResult {
  status: "noop";
  system: TwelveWeekSystem;
  preview: AvailableNextWeekHandoffPreview;
}

export interface UnavailableNextWeekHandoffResult {
  status: "unavailable";
  system: TwelveWeekSystem;
  preview: UnavailableNextWeekHandoffPreview;
}

export type NextWeekHandoffApplyResult =
  | AppliedNextWeekHandoffResult
  | NoopNextWeekHandoffResult
  | UnavailableNextWeekHandoffResult;

function normalizeCommitments(review: UniversalWeeklyReview): string[] {
  if (!Array.isArray(review.nextWeekCommitments)) return [];
  return review.nextWeekCommitments.map((item) => item.trim()).filter(Boolean).slice(0, 3);
}

function getProposedPriority(review: UniversalWeeklyReview): string {
  return review.nextWeekPriority.trim() || normalizeCommitments(review)[0] || "";
}

function getProposedLoadPreference(
  system: TwelveWeekSystem,
  decision: UniversalWeeklyReview["workloadDecision"],
): TwelveWeekSystem["tacticLoadPreference"] {
  if (decision === "reduce slightly") return "lighter";
  if (decision === "increase slightly") return "push";
  return system.tacticLoadPreference;
}

function isOptionalTaskAffected(
  task: TwelveWeekSystem["taskInstances"][number],
  nextWeekNumber: number,
  decision: UniversalWeeklyReview["workloadDecision"],
): boolean {
  if (task.weekNumber !== nextWeekNumber || task.isCore || task.completed) return false;
  if (decision === "reduce slightly") return task.skipped !== true;
  if (decision === "increase slightly") return task.skipped === true;
  return false;
}

export function buildNextWeekHandoffPreview(
  system: TwelveWeekSystem,
  review: UniversalWeeklyReview,
): NextWeekHandoffPreview {
  const reviewedWeekNumber = review.weekNumber;

  if (reviewedWeekNumber >= system.totalWeeks) {
    return {
      status: "unavailable",
      reviewedWeekNumber,
      nextWeekNumber: null,
      reason: "final_week",
    };
  }

  if (reviewedWeekNumber < system.currentWeek) {
    return {
      status: "unavailable",
      reviewedWeekNumber,
      nextWeekNumber: reviewedWeekNumber + 1,
      reason: "historical_review",
    };
  }

  if (reviewedWeekNumber > system.currentWeek) {
    return {
      status: "unavailable",
      reviewedWeekNumber,
      nextWeekNumber: reviewedWeekNumber + 1,
      reason: "future_review",
    };
  }

  const nextWeekNumber = reviewedWeekNumber + 1;
  const nextWeekPlan = system.weeklyPlans.find((week) => week.weekNumber === nextWeekNumber);
  const currentPriority = nextWeekPlan?.focus?.trim() ?? "";
  const proposedPriority = getProposedPriority(review);
  const workloadDecision = review.workloadDecision;
  const proposedLoadPreference = getProposedLoadPreference(system, workloadDecision);
  const affectedOptionalTaskCount = system.taskInstances.filter((task) =>
    isOptionalTaskAffected(task, nextWeekNumber, workloadDecision),
  ).length;

  return {
    status: "available",
    reviewedWeekNumber,
    nextWeekNumber,
    currentPriority,
    proposedPriority,
    priorityWillChange: Boolean(nextWeekPlan) && proposedPriority.length > 0 && proposedPriority !== currentPriority,
    workloadDecision,
    currentLoadPreference: system.tacticLoadPreference,
    proposedLoadPreference,
    affectedOptionalTaskCount,
    workloadWillChange:
      proposedLoadPreference !== system.tacticLoadPreference || affectedOptionalTaskCount > 0,
  };
}

export function applyConfirmedNextWeekHandoff(
  system: TwelveWeekSystem,
  review: UniversalWeeklyReview,
  selection: ConfirmedNextWeekHandoffSelection,
): NextWeekHandoffApplyResult {
  const preview = buildNextWeekHandoffPreview(system, review);
  if (preview.status === "unavailable") {
    return { status: "unavailable", system, preview };
  }

  const shouldApplyPriority = selection.applyPriority && preview.priorityWillChange;
  const shouldApplyWorkload =
    selection.applyWorkload && preview.workloadWillChange &&
    (preview.workloadDecision === "reduce slightly" || preview.workloadDecision === "increase slightly");

  let priorityChanged = false;
  const weeklyPlans = shouldApplyPriority
    ? system.weeklyPlans.map((week) => {
        if (week.weekNumber !== preview.nextWeekNumber) return week;
        priorityChanged = true;
        return { ...week, focus: preview.proposedPriority };
      })
    : system.weeklyPlans;

  let changedOptionalTaskCount = 0;
  const now = selection.now ?? Date.now();
  const taskInstances = shouldApplyWorkload
    ? system.taskInstances.map((task) => {
        if (!isOptionalTaskAffected(task, preview.nextWeekNumber, preview.workloadDecision)) return task;
        changedOptionalTaskCount += 1;
        return {
          ...task,
          skipped: preview.workloadDecision === "reduce slightly",
          lastModifiedAt: now,
        };
      })
    : system.taskInstances;

  const loadPreferenceChanged =
    shouldApplyWorkload && system.tacticLoadPreference !== preview.proposedLoadPreference;
  if (!priorityChanged && !loadPreferenceChanged && changedOptionalTaskCount === 0) {
    return { status: "noop", system, preview };
  }

  return {
    status: "applied",
    system: {
      ...system,
      weeklyPlans,
      taskInstances,
      tacticLoadPreference: loadPreferenceChanged ? preview.proposedLoadPreference : system.tacticLoadPreference,
    },
    preview,
    appliedPriority: priorityChanged,
    appliedWorkload: loadPreferenceChanged || changedOptionalTaskCount > 0,
    changedOptionalTaskCount,
  };
}
