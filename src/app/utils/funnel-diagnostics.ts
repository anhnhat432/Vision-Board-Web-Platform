/**
 * Funnel Diagnostics v1 — local-only debug snapshot for core funnel.
 *
 * Aggregates *derived* counts and bucketed levels from the user's
 * existing localStorage state. Designed for an internal dev/debug
 * surface so engineers can verify a real session without inspecting
 * raw text.
 *
 * Privacy contract:
 *  - **Never** echoes goal text, indicator names, task titles, check-in
 *    notes, weekly review free-text fields, email, or any user id.
 *  - Outputs are limited to numbers, booleans, enum ids/levels, and
 *    canned axis labels (which themselves come from `FeasibilityCheck`
 *    constants, not user input).
 *  - Pure read — no network, no side effects, no analytics emission.
 *  - Visibility is gated by an env flag *and* an opt-in prop. Default
 *    state for any production deploy is "hidden" even if flag leaks.
 */

import {
  evaluateSmartGoalQuality,
  parseSmartGoal,
  type QualityLevel,
} from "@/lib/smart-goal";
import {
  evaluateTwelveWeekPlanQuality,
  type PlanQualityLevel,
} from "@/features/plan12week/logic";

import { hasRealLifeBalance } from "./core-flow-guard";
import { APP_STORAGE_KEYS, getUserData } from "./storage";
import {
  getActiveTwelveWeekGoal,
  getTwelveWeekCurrentWeek,
  getTwelveWeekWeekCompletion,
  isTwelveWeekReviewDueToday,
} from "./storage-twelve-week";
import type {
  Goal,
  TwelveWeekSystem,
  UserData,
} from "./storage-types";
import { getUserIntentId, getUserIntentLabel, type UserIntentId } from "./user-intent";

// ---- Visibility flag --------------------------------------------------------

/**
 * Gate the diagnostics panel on an explicit Vite env flag. Production
 * deploys should never set this. Tests can override the runtime value
 * by passing `enabled` as a component prop.
 */
const RAW_DIAGNOSTICS_FLAG = import.meta.env.VITE_SHOW_FUNNEL_DIAGNOSTICS;
const DIAGNOSTICS_ENABLED =
  String(RAW_DIAGNOSTICS_FLAG ?? "").trim().toLowerCase() === "true";

export function shouldShowFunnelDiagnostics(): boolean {
  return DIAGNOSTICS_ENABLED;
}

/**
 * Test-friendly variant of `shouldShowFunnelDiagnostics`. Accepts an
 * `ImportMetaEnv`-shaped object so unit tests can probe the gate logic
 * without hitting `import.meta.env` directly.
 */
export function evaluateDiagnosticsFlag(
  env: { VITE_SHOW_FUNNEL_DIAGNOSTICS?: string } | undefined,
): boolean {
  return String(env?.VITE_SHOW_FUNNEL_DIAGNOSTICS ?? "").trim().toLowerCase() === "true";
}

// ---- Public types -----------------------------------------------------------

export type SmartScoreBucket = "0-19" | "20-39" | "40-59" | "60-79" | "80-100";
export type AdjustedScoreBucket = "0-9" | "10-14" | "15+";
export type FeasibilityResultType = "realistic" | "challenging" | "too_ambitious";
export type PlanLoad = "lighter" | "balanced" | "push";
export type WeeklyCapacity = "low" | "medium" | "high";

export interface FunnelDiagnosticsIntent {
  id: UserIntentId | null;
  label: string;
}

export interface FunnelDiagnosticsSteps {
  onboardingCompleted: boolean;
  hasRealLifeBalance: boolean;
  hasFocusArea: boolean;
  hasPendingSmartGoal: boolean;
  hasPendingFeasibility: boolean;
  has12WeekPlan: boolean;
  hasActiveTwelveWeekSystem: boolean;
}

export interface FunnelDiagnosticsSmart {
  present: boolean;
  qualityLevel: QualityLevel | null;
  overallScoreBucket: SmartScoreBucket | null;
  hasMeasurableTarget: boolean | null;
  hasBaseline: boolean | null;
  weeklyHoursBucket: "0" | "1-3" | "3-5" | "5+" | null;
}

export interface FunnelDiagnosticsFeasibility {
  present: boolean;
  resultType: FeasibilityResultType | null;
  adjustedScoreBucket: AdjustedScoreBucket | null;
  bottleneckAxis: string | null;
  planLoad: PlanLoad | null;
  weeklyCapacity: WeeklyCapacity | null;
}

export interface FunnelDiagnosticsPlan {
  present: boolean;
  qualityLevel: PlanQualityLevel | null;
  overallScoreBucket: SmartScoreBucket | null;
  leadIndicatorCount: number;
  coreIndicatorCount: number;
  optionalIndicatorCount: number;
  milestoneCount: number;
  weekOneTaskCount: number;
  weekOneStartable: boolean | null;
}

export interface FunnelDiagnosticsExecution {
  hasActiveSystem: boolean;
  currentWeek: number | null;
  totalWeeks: number | null;
  completedTaskCount: number;
  totalTaskCount: number;
  weeklyReviewsCompleted: number;
  pendingWeeklyReviews: number;
  dailyCheckInCount: number;
  activeWeekCompletionPercent: number | null;
  reviewDueToday: boolean;
}

export interface FunnelDiagnosticsSnapshot {
  intent: FunnelDiagnosticsIntent;
  steps: FunnelDiagnosticsSteps;
  smart: FunnelDiagnosticsSmart;
  feasibility: FunnelDiagnosticsFeasibility;
  plan: FunnelDiagnosticsPlan;
  execution: FunnelDiagnosticsExecution;
  /** Snapshot timestamp (no user data). */
  generatedAt: string;
}

// ---- Internal helpers -------------------------------------------------------

function readLocalString(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function bucketSmartScore(score: number): SmartScoreBucket {
  if (score < 20) return "0-19";
  if (score < 40) return "20-39";
  if (score < 60) return "40-59";
  if (score < 80) return "60-79";
  return "80-100";
}

function bucketAdjustedScore(score: number): AdjustedScoreBucket {
  if (score < 10) return "0-9";
  if (score < 15) return "10-14";
  return "15+";
}

function bucketWeeklyHours(hours: number | undefined | null): FunnelDiagnosticsSmart["weeklyHoursBucket"] {
  if (hours === undefined || hours === null || !Number.isFinite(hours)) return null;
  if (hours <= 0) return "0";
  if (hours <= 3) return "1-3";
  if (hours <= 5) return "3-5";
  return "5+";
}

function isResultType(value: unknown): value is FeasibilityResultType {
  return value === "realistic" || value === "challenging" || value === "too_ambitious";
}

function readPendingFeasibility(): {
  resultType: FeasibilityResultType | null;
  adjustedScore: number | null;
  bottleneckAxis: string | null;
  planLoad: PlanLoad | null;
  weeklyCapacity: WeeklyCapacity | null;
  present: boolean;
} {
  const raw = readLocalString(APP_STORAGE_KEYS.pendingFeasibilityResult);
  if (!raw) {
    return {
      resultType: null,
      adjustedScore: null,
      bottleneckAxis: null,
      planLoad: null,
      weeklyCapacity: null,
      present: false,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      present: true,
      resultType: isResultType(parsed.resultType) ? parsed.resultType : null,
      adjustedScore:
        typeof parsed.adjustedScore === "number" && Number.isFinite(parsed.adjustedScore)
          ? parsed.adjustedScore
          : null,
      bottleneckAxis:
        parsed.bottleneck && typeof (parsed.bottleneck as Record<string, unknown>).axis === "string"
          ? ((parsed.bottleneck as Record<string, unknown>).axis as string)
          : null,
      planLoad:
        parsed.planLoad === "lighter" || parsed.planLoad === "balanced" || parsed.planLoad === "push"
          ? parsed.planLoad
          : null,
      weeklyCapacity:
        parsed.weeklyCapacity === "low" || parsed.weeklyCapacity === "medium" || parsed.weeklyCapacity === "high"
          ? parsed.weeklyCapacity
          : null,
    };
  } catch {
    return {
      resultType: null,
      adjustedScore: null,
      bottleneckAxis: null,
      planLoad: null,
      weeklyCapacity: null,
      present: false,
    };
  }
}

function readSmartGoalSnapshot(focusArea: string): FunnelDiagnosticsSmart {
  const raw = readLocalString(APP_STORAGE_KEYS.pendingSmartGoal);
  if (!raw) {
    return {
      present: false,
      qualityLevel: null,
      overallScoreBucket: null,
      hasMeasurableTarget: null,
      hasBaseline: null,
      weeklyHoursBucket: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const goal = parseSmartGoal(parsed, focusArea);
    if (!goal) {
      return {
        present: true,
        qualityLevel: null,
        overallScoreBucket: null,
        hasMeasurableTarget: null,
        hasBaseline: null,
        weeklyHoursBucket: null,
      };
    }
    const quality = evaluateSmartGoalQuality(goal);
    const target = goal.measurable?.target_value;
    const baseline = goal.measurable?.baseline_value;
    return {
      present: true,
      qualityLevel: quality.level,
      overallScoreBucket: bucketSmartScore(quality.overallScore),
      hasMeasurableTarget: typeof target === "number" && Number.isFinite(target) && target > 0,
      hasBaseline: typeof baseline === "number" && Number.isFinite(baseline) && baseline > 0,
      weeklyHoursBucket: bucketWeeklyHours(goal.achievable?.weekly_time_commitment_hours),
    };
  } catch {
    return {
      present: true,
      qualityLevel: null,
      overallScoreBucket: null,
      hasMeasurableTarget: null,
      hasBaseline: null,
      weeklyHoursBucket: null,
    };
  }
}

function countMilestones(system: TwelveWeekSystem | undefined): number {
  if (!system) return 0;
  let count = 0;
  if (system.milestones?.week4 && system.milestones.week4.trim().length > 0) count += 1;
  if (system.milestones?.week8 && system.milestones.week8.trim().length > 0) count += 1;
  if (system.milestones?.week12 && system.milestones.week12.trim().length > 0) count += 1;
  return count;
}

function buildPlanSnapshot(activeGoal: Goal | null): FunnelDiagnosticsPlan {
  const system = activeGoal?.twelveWeekSystem;
  if (!system) {
    return {
      present: false,
      qualityLevel: null,
      overallScoreBucket: null,
      leadIndicatorCount: 0,
      coreIndicatorCount: 0,
      optionalIndicatorCount: 0,
      milestoneCount: 0,
      weekOneTaskCount: 0,
      weekOneStartable: null,
    };
  }

  const leadIndicators = system.leadIndicators ?? [];
  const coreCount = leadIndicators.filter((indicator) => (indicator.type ?? "core") === "core").length;
  const optionalCount = leadIndicators.length - coreCount;
  const milestoneCount = countMilestones(system);
  const weekOneTasks = (system.taskInstances ?? []).filter(
    (task) => task.weekNumber === 1 && !task.skipped,
  );
  const firstTaskTitle = weekOneTasks[0]?.title;

  const planQuality = evaluateTwelveWeekPlanQuality(
    {
      vision12Week: system.vision12Week,
      week12Outcome: system.week12Outcome,
      goalType: system.goalType,
      lagMetric: {
        name: system.lagMetric?.name ?? "",
        target: system.lagMetric?.target,
        unit: system.lagMetric?.unit,
      },
      leadIndicators: leadIndicators.map((indicator) => ({
        name: indicator.name,
        target: indicator.target,
        type: indicator.type,
        schedule: indicator.schedule,
      })),
      milestones: {
        week4: system.milestones?.week4 ?? "",
        week8: system.milestones?.week8 ?? "",
        week12: system.milestones?.week12 ?? "",
      },
      reviewDay: system.reviewDay,
      tacticLoadPreference: undefined,
      dailyTimeBudget: undefined,
      personalConstraint: undefined,
    },
    {
      weeklyTaskCount: weekOneTasks.length,
      firstTaskTitle,
    },
  );

  // Week 1 startability: ≥ 1 core indicator + at least 1 task + a non-empty
  // first-task title at least 6 characters long. This intentionally reuses
  // the same heuristic surface as the rubric without echoing the title.
  const weekOneStartable =
    coreCount >= 1 && weekOneTasks.length > 0 && (firstTaskTitle ?? "").trim().length >= 6;

  return {
    present: true,
    qualityLevel: planQuality.level,
    overallScoreBucket: bucketSmartScore(planQuality.overallScore),
    leadIndicatorCount: leadIndicators.length,
    coreIndicatorCount: coreCount,
    optionalIndicatorCount: optionalCount,
    milestoneCount,
    weekOneTaskCount: weekOneTasks.length,
    weekOneStartable,
  };
}

function buildExecutionSnapshot(
  activeGoal: Goal | null,
  referenceDate: Date,
): FunnelDiagnosticsExecution {
  const system = activeGoal?.twelveWeekSystem;
  if (!system) {
    return {
      hasActiveSystem: false,
      currentWeek: null,
      totalWeeks: null,
      completedTaskCount: 0,
      totalTaskCount: 0,
      weeklyReviewsCompleted: 0,
      pendingWeeklyReviews: 0,
      dailyCheckInCount: 0,
      activeWeekCompletionPercent: null,
      reviewDueToday: false,
    };
  }

  const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
  const weekCompletion = getTwelveWeekWeekCompletion(system, currentWeek);
  const reviews = system.weeklyReviews ?? [];
  const reviewsCompleted = reviews.filter((review) => review.reviewCompleted).length;
  // Pending reviews = weeks already started but no completed review.
  const pendingReviews = Math.max(0, currentWeek - 1 - reviewsCompleted);
  const tasks = system.taskInstances ?? [];

  return {
    hasActiveSystem: true,
    currentWeek,
    totalWeeks: system.totalWeeks,
    completedTaskCount: tasks.filter((task) => task.completed).length,
    totalTaskCount: tasks.length,
    weeklyReviewsCompleted: reviewsCompleted,
    pendingWeeklyReviews: pendingReviews,
    dailyCheckInCount: system.dailyCheckIns?.length ?? 0,
    activeWeekCompletionPercent: weekCompletion.percent,
    reviewDueToday: isTwelveWeekReviewDueToday(system, referenceDate),
  };
}

// ---- Public API ------------------------------------------------------------

export interface BuildSnapshotOptions {
  /** Inject a deterministic clock for tests; defaults to `new Date()`. */
  now?: Date;
  /** Inject UserData to keep the function pure for tests. */
  userData?: UserData;
}

export function buildFunnelDiagnosticsSnapshot(
  options: BuildSnapshotOptions = {},
): FunnelDiagnosticsSnapshot {
  const now = options.now ?? new Date();
  const userData = options.userData ?? getUserData();
  const focusArea = readLocalString(APP_STORAGE_KEYS.selectedFocusArea) ?? "";

  const activeGoal = getActiveTwelveWeekGoal(userData.goals ?? []);
  const intentId = getUserIntentId();

  const steps: FunnelDiagnosticsSteps = {
    onboardingCompleted: Boolean(userData.onboardingCompleted),
    hasRealLifeBalance: hasRealLifeBalance(userData),
    hasFocusArea: focusArea.trim().length > 0,
    hasPendingSmartGoal: readLocalString(APP_STORAGE_KEYS.pendingSmartGoal) !== null,
    hasPendingFeasibility: readLocalString(APP_STORAGE_KEYS.pendingFeasibilityResult) !== null,
    has12WeekPlan: Boolean(activeGoal?.twelveWeekSystem),
    hasActiveTwelveWeekSystem: Boolean(
      activeGoal?.twelveWeekSystem && activeGoal.twelveWeekSystem.status === "active",
    ),
  };

  const feasibilityRaw = readPendingFeasibility();
  const feasibility: FunnelDiagnosticsFeasibility = {
    present: feasibilityRaw.present,
    resultType: feasibilityRaw.resultType,
    adjustedScoreBucket:
      feasibilityRaw.adjustedScore !== null ? bucketAdjustedScore(feasibilityRaw.adjustedScore) : null,
    bottleneckAxis: feasibilityRaw.bottleneckAxis,
    planLoad: feasibilityRaw.planLoad,
    weeklyCapacity: feasibilityRaw.weeklyCapacity,
  };

  const smart = readSmartGoalSnapshot(focusArea);
  const plan = buildPlanSnapshot(activeGoal);
  const execution = buildExecutionSnapshot(activeGoal, now);

  return {
    intent: {
      id: intentId,
      label: intentId ? getUserIntentLabel(intentId) : "Chưa chọn",
    },
    steps,
    smart,
    feasibility,
    plan,
    execution,
    generatedAt: now.toISOString(),
  };
}
