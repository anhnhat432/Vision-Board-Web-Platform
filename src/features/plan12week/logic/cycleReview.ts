import type { LagMetric, UniversalWeeklyReview } from "@/app/utils/storage-types";

export interface CycleReviewPlanLike {
  totalWeeks?: number;
}

export interface CycleSummary {
  finalLagPercent: number;
  averageLeadScore: number;
  commitmentsKeptRate: number;
  weeksWith85Plus: number;
  biggestWins: string[];
  topAdjustments: string[];
}

type CycleReviewInput = Partial<UniversalWeeklyReview> & {
  leadScore?: number;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return Math.round(value);
}

function parseMetricValue(value: string | number | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLeadScore(review: CycleReviewInput): number {
  return clampPercent(review.leadScore ?? review.executionScore ?? review.leadCompletionPercent ?? 0);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueNonEmptyTexts(values: readonly unknown[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const text = normalizeText(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });

  return result.slice(0, limit);
}

function summarizeRepeatedTexts(values: readonly string[], limit: number): string[] {
  const counts = new Map<string, { label: string; count: number; firstIndex: number }>();

  values.forEach((value, index) => {
    const label = value.trim();
    if (!label) return;
    const key = label.toLowerCase();
    const current = counts.get(key);
    counts.set(key, {
      label: current?.label ?? label,
      count: (current?.count ?? 0) + 1,
      firstIndex: current?.firstIndex ?? index,
    });
  });

  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)
    .slice(0, limit)
    .map((item) => item.label);
}

export function calculateCycleSummary(
  plan: CycleReviewPlanLike | null | undefined,
  lagMetric: LagMetric | null | undefined,
  weeklyReviews: ReadonlyArray<CycleReviewInput>,
): CycleSummary {
  const totalWeeks = Math.max(1, Math.round(plan?.totalWeeks ?? 12));
  const cycleReviews = weeklyReviews
    .filter((review) => (review.weekNumber ?? 0) >= 1 && (review.weekNumber ?? 0) <= totalWeeks)
    .sort((left, right) => (left.weekNumber ?? 0) - (right.weekNumber ?? 0));

  const leadScores = cycleReviews.map(getLeadScore);
  const averageLeadScore =
    leadScores.length === 0 ? 0 : clampPercent(leadScores.reduce((sum, score) => sum + score, 0) / leadScores.length);
  const weeksWith85Plus = leadScores.filter((score) => score >= 85).length;

  const keptCount = cycleReviews.reduce((sum, review) => sum + (review.commitmentsKept?.length ?? 0), 0);
  const missedCommitments = cycleReviews.flatMap((review) => review.commitmentsMissed ?? []);
  const missedCount = missedCommitments.length;
  const commitmentsKeptRate =
    keptCount + missedCount === 0 ? 0 : clampPercent((keptCount / (keptCount + missedCount)) * 100);

  const target = parseMetricValue(lagMetric?.target);
  const currentValue = parseMetricValue(lagMetric?.currentValue);
  const finalLagPercent = target <= 0 ? 0 : clampPercent((currentValue / target) * 100);

  return {
    finalLagPercent,
    averageLeadScore,
    commitmentsKeptRate,
    weeksWith85Plus,
    biggestWins: uniqueNonEmptyTexts(
      cycleReviews.map((review) => review.insights),
      5,
    ),
    topAdjustments: summarizeRepeatedTexts(missedCommitments, 5),
  };
}
