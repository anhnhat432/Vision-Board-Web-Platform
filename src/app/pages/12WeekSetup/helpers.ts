import type { TacticType } from "../../utils/storage";
import { GOAL_TYPES, LOAD_PREFERENCE_OPTIONS, REVIEW_DAYS } from "./constants";
import type { LeadIndicatorDraft, PendingFeasibilityResult, PlanLoadRecommendation, TwelveWeekSetupDraft } from "./types";

export function getLoadPreferenceLabel(value: TwelveWeekSetupDraft["tacticLoadPreference"]): string {
  return LOAD_PREFERENCE_OPTIONS.find((option) => option.value === value)?.label ?? "Cân bằng";
}

export function getGoalTypeLabel(value: string): string {
  return GOAL_TYPES.find((option) => option.value === value)?.label ?? value;
}

export function getReviewDayLabel(value: string): string {
  return REVIEW_DAYS.find((option) => option.value === value)?.label ?? value;
}

export function getPlanLoadLabel(value: PlanLoadRecommendation | undefined): string {
  if (value === "lighter") return "Nhẹ hơn";
  if (value === "push") return "Đẩy nhẹ";
  return "Cân bằng";
}

export function getFeasibilityDraftDefaults(feasibility: PendingFeasibilityResult): Pick<
  TwelveWeekSetupDraft,
  "dailyTimeBudget" | "personalConstraint" | "tacticLoadPreference"
> {
  const dailyTimeBudget =
    feasibility.weeklyCapacity === "low" ? "30min" : feasibility.weeklyCapacity === "high" ? "1.5h" : "1h";

  const bottleneckAxis = feasibility.bottleneck?.axis;
  const personalConstraint: TwelveWeekSetupDraft["personalConstraint"] =
    bottleneckAxis === "time"
      ? "time"
      : bottleneckAxis === "energy" || bottleneckAxis === "routine"
        ? "consistency"
        : bottleneckAxis === "resources" || bottleneckAxis === "clarity" || bottleneckAxis === "wheel"
          ? "complexity"
          : bottleneckAxis === "obstacle"
            ? "motivation"
            : "";

  return {
    dailyTimeBudget,
    personalConstraint,
    tacticLoadPreference: feasibility.planLoad ?? "balanced",
  };
}

export function isPendingFeasibilityResult(value: unknown): value is PendingFeasibilityResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;

  return (
    (result.resultType === "realistic" ||
      result.resultType === "challenging" ||
      result.resultType === "too_ambitious") &&
    typeof result.resultTitle === "string" &&
    typeof result.resultSummary === "string" &&
    typeof result.recommendation === "string" &&
    typeof result.readinessScore === "number" &&
    typeof result.adjustedScore === "number" &&
    typeof result.wheelScore === "number"
  );
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function createIndicatorId(): string {
  return `indicator_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createIndicatorDraft(type: TacticType = "core"): LeadIndicatorDraft {
  return {
    id: createIndicatorId(),
    name: "",
    target: type === "core" ? "2" : "1",
    unit: "lần/tuần",
    type,
    cadence: "spread",
  };
}

export function buildScheduleOffsets(target: string, cadence: LeadIndicatorDraft["cadence"]): number[] {
  const parsedTarget = Number.parseInt(target, 10);
  const frequency = Number.isFinite(parsedTarget) && parsedTarget > 0 ? Math.min(parsedTarget, 7) : 1;

  if (cadence === "frontload") {
    return Array.from({ length: frequency }, (_, index) => Math.min(index, 6));
  }

  if (cadence === "backload") {
    return Array.from({ length: frequency }, (_, index) => Math.max(0, 7 - frequency + index));
  }

  switch (frequency) {
    case 1:
      return [1];
    case 2:
      return [1, 4];
    case 3:
      return [1, 3, 5];
    case 4:
      return [0, 2, 4, 6];
    case 5:
      return [0, 1, 2, 4, 6];
    case 6:
      return [0, 1, 2, 3, 4, 6];
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
}

export function getCycleWeekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const delta = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - delta);
  return start;
}

export function buildWeeklyPlans(
  week12Outcome: string,
  week4Milestone: string,
  week8Milestone: string,
  focusOverrides?: string[],
) {
  return Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const phaseName = weekNumber <= 4 ? "Foundation" : weekNumber <= 8 ? "Build / Acceleration" : "Finish / Execution";

    return {
      weekNumber,
      phaseName,
      focus:
        focusOverrides?.[index] ??
        (weekNumber <= 4
          ? "Giữ nhịp việc chính thật đều."
          : weekNumber <= 8
            ? "Tăng tốc điều đang hiệu quả và tạo đầu ra thật."
            : "Về đích gọn, ưu tiên ít nhưng rõ."),
      milestone:
        weekNumber === 4 ? week4Milestone : weekNumber === 8 ? week8Milestone : weekNumber === 12 ? week12Outcome : "",
      completed: false,
    };
  });
}

export function buildScoreboard() {
  return Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: 0,
    mainMetricProgress: "",
    outputDone: "",
    reviewDone: false,
    weeklyScore: 0,
  }));
}

export function getPreviewTasks(indicators: LeadIndicatorDraft[]): string[] {
  return indicators
    .filter((indicator) => indicator.name.trim())
    .flatMap((indicator) => {
      const parsedTarget = Number.parseInt(indicator.target, 10);
      const count = Number.isFinite(parsedTarget) && parsedTarget > 0 ? Math.min(parsedTarget, 3) : 1;

      return Array.from({ length: count }, (_, index) =>
        count === 1 ? indicator.name.trim() : `${indicator.name.trim()} ${index + 1}`,
      );
    })
    .slice(0, 6);
}
