import { checkAchievementsInData } from "@/app/utils/storage-achievement-ops";
import { getUserData, saveUserData } from "@/app/utils/storage";
import {
  buildDerivedScoreboard,
  getDefaultScoreboard,
  getTwelveWeekWeekCompletion,
} from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem, UniversalWeeklyReview, UserData } from "@/app/utils/storage-types";
import { enqueueStoredMutation } from "./mutationQueue";
import { getPlanLink } from "./planLinkStore";
import { getTwelveWeekClientPlanId, getTwelveWeekClientWeekId } from "./twelveWeekImportPayload";

const MAX_REVIEW_LIST_ITEMS = 5;

export type WeeklyReviewCommitPatch = Pick<UniversalWeeklyReview, "weekNumber"> &
  Partial<Omit<UniversalWeeklyReview, "weekNumber">>;

export interface CommitTwelveWeekWeeklyReviewInput {
  goalId: string;
  review: WeeklyReviewCommitPatch;
  lagMetricCurrentValue?: string;
  now?: number | Date;
}

interface AppliedTwelveWeekWeeklyReviewResult {
  status: "applied";
  review: UniversalWeeklyReview;
  updatedSystem: TwelveWeekSystem;
  mutationEnqueued: boolean;
}

interface NoopTwelveWeekWeeklyReviewResult {
  status: "noop";
  review: UniversalWeeklyReview;
  currentSystem: TwelveWeekSystem;
}

interface NotFoundTwelveWeekWeeklyReviewResult {
  status: "not_found";
  target: "goal" | "system" | "week";
}

interface LocalSaveFailedTwelveWeekWeeklyReviewResult {
  status: "local_save_failed";
}

export type TwelveWeekWeeklyReviewCommitResult =
  | AppliedTwelveWeekWeeklyReviewResult
  | NoopTwelveWeekWeeklyReviewResult
  | NotFoundTwelveWeekWeeklyReviewResult
  | LocalSaveFailedTwelveWeekWeeklyReviewResult;

function resolveNow(value?: number | Date): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
}

function normalizeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeOptionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeReviewList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_REVIEW_LIST_ITEMS);
}

function normalizePercent(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function normalizeOptionalScore(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(Math.max(value, 0), 10);
}

function normalizeOptionalCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value);
}

function normalizeLastReviewAt(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : undefined;
}

function mergeDefinedPatch(
  existing: UniversalWeeklyReview | undefined,
  patch: WeeklyReviewCommitPatch,
): Record<string, unknown> {
  const merged: Record<string, unknown> = existing ? { ...existing } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

function buildCanonicalReview(
  system: TwelveWeekSystem,
  patch: WeeklyReviewCommitPatch,
  existing: UniversalWeeklyReview | undefined,
): UniversalWeeklyReview {
  const merged = mergeDefinedPatch(existing, patch);
  const completion = getTwelveWeekWeekCompletion(system, patch.weekNumber);
  const executionScore = normalizePercent(patch.executionScore, completion.percent);
  const leadCompletionPercent = normalizePercent(patch.leadCompletionPercent, completion.percent);
  const review: UniversalWeeklyReview = {
    ...merged,
    weekNumber: patch.weekNumber,
    executionScore,
    leadCompletionPercent,
    lagProgressValue: normalizeText(merged.lagProgressValue),
    biggestOutputThisWeek: normalizeText(merged.biggestOutputThisWeek),
    mainObstacle: normalizeText(merged.mainObstacle),
    nextWeekPriority: normalizeText(merged.nextWeekPriority),
    workloadDecision:
      merged.workloadDecision === "keep same" ||
      merged.workloadDecision === "reduce slightly" ||
      merged.workloadDecision === "increase slightly"
        ? merged.workloadDecision
        : "",
    reviewCompleted: typeof merged.reviewCompleted === "boolean" ? merged.reviewCompleted : false,
    commitmentsKept: normalizeReviewList(merged.commitmentsKept),
    commitmentsMissed: normalizeReviewList(merged.commitmentsMissed),
    nextWeekCommitments: normalizeReviewList(merged.nextWeekCommitments),
  };

  const optionalTextFields = [
    "insights",
    "keepTactic",
    "reduceTactic",
    "reflection",
    "adjustments",
  ] as const;
  for (const field of optionalTextFields) {
    const value = normalizeOptionalText(merged[field]);
    if (value !== undefined) review[field] = value;
    else delete review[field];
  }

  const optionalScoreFields = [
    "progressScore",
    "disciplineScore",
    "focusScore",
    "improvementScore",
    "outputQualityScore",
  ] as const;
  for (const field of optionalScoreFields) {
    const value = normalizeOptionalScore(merged[field]);
    if (value !== undefined) review[field] = value;
    else delete review[field];
  }

  const completedLeadIndicators = normalizeOptionalCount(merged.completedLeadIndicators);
  if (completedLeadIndicators !== undefined) review.completedLeadIndicators = completedLeadIndicators;
  else delete review.completedLeadIndicators;

  const lastReviewAt = normalizeLastReviewAt(merged.lastReviewAt);
  if (lastReviewAt) review.lastReviewAt = lastReviewAt;
  else delete review.lastReviewAt;

  return review;
}

function reviewsMatch(left: UniversalWeeklyReview | undefined, right: UniversalWeeklyReview): boolean {
  if (!left) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function findTarget(data: UserData, goalId: string, weekNumber: number) {
  const goal = data.goals.find((item) => item.id === goalId);
  if (!goal) return { status: "not_found", target: "goal" } as const;
  if (!goal.twelveWeekSystem) return { status: "not_found", target: "system" } as const;
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > goal.twelveWeekSystem.totalWeeks) {
    return { status: "not_found", target: "week" } as const;
  }
  return { status: "found", goal, system: goal.twelveWeekSystem } as const;
}

function enqueueWeeklyReviewMutation(
  goalId: string,
  review: UniversalWeeklyReview,
  now: Date,
): boolean {
  try {
    const planLink = getPlanLink(goalId);
    const backendPlanId = planLink?.planId ?? null;
    const backendWeekId = planLink?.weekIdByNumber[review.weekNumber] ?? null;
    const result = enqueueStoredMutation(
      {
        kind: "weekly_review_upserted",
        goalId,
        planId: backendPlanId,
        payload: {
          backendPlanId,
          backendWeekId,
          clientPlanId: getTwelveWeekClientPlanId(goalId),
          clientWeekId: getTwelveWeekClientWeekId(goalId, review.weekNumber),
          weekNumber: review.weekNumber,
          executionScore: review.executionScore,
          review,
        },
      },
      { now },
    );
    return result.ok;
  } catch {
    return false;
  }
}

export function commitTwelveWeekWeeklyReview(
  input: CommitTwelveWeekWeeklyReviewInput,
): TwelveWeekWeeklyReviewCommitResult {
  const data = getUserData();
  const found = findTarget(data, input.goalId, input.review.weekNumber);
  if (found.status !== "found") return found;

  const existing = found.system.weeklyReviews.find((review) => review.weekNumber === input.review.weekNumber);
  const candidate = buildCanonicalReview(found.system, input.review, existing);
  const nextLagMetricValue =
    input.lagMetricCurrentValue === undefined
      ? found.system.lagMetric.currentValue
      : input.lagMetricCurrentValue.trim();
  const reviewUnchanged = reviewsMatch(existing, candidate);
  const lagMetricUnchanged = found.system.lagMetric.currentValue === nextLagMetricValue;
  if (reviewUnchanged && lagMetricUnchanged && existing) {
    return { status: "noop", review: existing, currentSystem: found.system };
  }

  const now = resolveNow(input.now);
  const review = {
    ...candidate,
    lastReviewAt: input.review.lastReviewAt ? candidate.lastReviewAt : now.toISOString(),
  };
  const nextSystemWithoutScoreboard: TwelveWeekSystem = {
    ...found.system,
    lagMetric: {
      ...found.system.lagMetric,
      currentValue: nextLagMetricValue,
    },
    weeklyReviews: [
      ...found.system.weeklyReviews.filter((item) => item.weekNumber !== review.weekNumber),
      review,
    ].sort((left, right) => left.weekNumber - right.weekNumber),
  };
  const updatedSystem: TwelveWeekSystem = {
    ...nextSystemWithoutScoreboard,
    scoreboard: buildDerivedScoreboard(
      nextSystemWithoutScoreboard,
      getDefaultScoreboard(nextSystemWithoutScoreboard.totalWeeks),
    ),
  };
  const nextData: UserData = {
    ...data,
    goals: data.goals.map((goal) =>
      goal.id === input.goalId
        ? {
            ...goal,
            twelveWeekSystem: updatedSystem,
          }
        : goal,
    ),
    achievements: [...data.achievements],
  };
  checkAchievementsInData(nextData);

  if (!saveUserData(nextData)) return { status: "local_save_failed" };

  const persistedSystem = getUserData().goals.find((goal) => goal.id === input.goalId)?.twelveWeekSystem;
  const persistedReview = persistedSystem?.weeklyReviews.find((item) => item.weekNumber === review.weekNumber);
  if (!persistedSystem || !persistedReview) return { status: "local_save_failed" };

  return {
    status: "applied",
    review: persistedReview,
    updatedSystem: persistedSystem,
    mutationEnqueued: enqueueWeeklyReviewMutation(input.goalId, persistedReview, now),
  };
}
