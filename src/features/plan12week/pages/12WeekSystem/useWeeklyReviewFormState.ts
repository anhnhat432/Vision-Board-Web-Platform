import { useCallback, useEffect, useRef, useState } from "react";
import type { TwelveWeekSystem, UniversalDailyCheckIn, UniversalWeeklyReview } from "@/app/utils/storage-types";
import type { DailyMood } from "@/app/utils/twelve-week-system-ui";

import type { WeeklyCommitmentStatus, WeeklyReviewForm } from "./types";

interface UseWeeklyReviewFormStateOptions {
  activeGoalId: string | null;
  system: TwelveWeekSystem | null;
  currentReview: UniversalWeeklyReview | null | undefined;
  currentLagMetricValue: string;
  latestCheckIn: UniversalDailyCheckIn | null;
}

function getReviewNextWeekCommitments(review: UniversalWeeklyReview | null | undefined): string[] {
  const normalizedCommitments = Array.isArray(review?.nextWeekCommitments)
    ? review.nextWeekCommitments.map((item) => item.trim()).filter(Boolean)
    : [];
  if (normalizedCommitments.length > 0) return normalizedCommitments;

  const legacyPriority = review?.nextWeekPriority?.trim();
  return legacyPriority ? [legacyPriority] : [];
}

function buildCommitmentStatuses(
  previousCommitments: string[],
  currentReview: UniversalWeeklyReview | null | undefined,
): Record<string, WeeklyCommitmentStatus> {
  const kept = new Set(currentReview?.commitmentsKept ?? []);
  const missed = new Set(currentReview?.commitmentsMissed ?? []);

  return previousCommitments.reduce<Record<string, WeeklyCommitmentStatus>>((statuses, commitment) => {
    if (kept.has(commitment)) {
      statuses[commitment] = "kept";
    } else if (missed.has(commitment)) {
      statuses[commitment] = "missed";
    } else {
      statuses[commitment] = currentReview?.reviewCompleted ? "not_set" : "unanswered";
    }
    return statuses;
  }, {});
}

export function buildWeeklyReviewForm(
  system: TwelveWeekSystem,
  reviewWeekNumber: number,
  currentLagMetricValue: string,
): WeeklyReviewForm {
  const review = system.weeklyReviews.find((item) => item.weekNumber === reviewWeekNumber);
  const previousReview = system.weeklyReviews.find((item) => item.weekNumber === reviewWeekNumber - 1);
  const previousCommitments = getReviewNextWeekCommitments(previousReview);
  const nextWeekCommitments = getReviewNextWeekCommitments(review);
  const legacyNextPriority = review?.nextWeekPriority ?? "";
  const insights = review?.insights ?? review?.reflection ?? review?.biggestOutputThisWeek ?? "";

  return {
    lagProgressValue: review?.lagProgressValue ?? currentLagMetricValue ?? "",
    biggestOutputThisWeek: review?.biggestOutputThisWeek ?? "",
    mainObstacle: review?.mainObstacle ?? "",
    keepTactic: review?.keepTactic ?? "",
    reduceTactic: review?.reduceTactic ?? "",
    nextWeekPriority: legacyNextPriority,
    commitmentStatuses: buildCommitmentStatuses(previousCommitments, review),
    insights,
    nextWeekCommitments:
      nextWeekCommitments.length > 0 ? nextWeekCommitments : legacyNextPriority ? [legacyNextPriority] : [],
    workloadDecision: review?.workloadDecision ?? "keep same",
  };
}

export function useWeeklyReviewFormState({
  activeGoalId,
  system,
  currentReview,
  currentLagMetricValue,
  latestCheckIn,
}: UseWeeklyReviewFormStateOptions) {
  const formInitRef = useRef<string | null>(null);
  const [dailyMood, setDailyMood] = useState<DailyMood>("steady");
  const [dailyNote, setDailyNote] = useState("");
  const [weeklyForm, setWeeklyForm] = useState<WeeklyReviewForm>({
    lagProgressValue: "",
    biggestOutputThisWeek: "",
    mainObstacle: "",
    keepTactic: "",
    reduceTactic: "",
    nextWeekPriority: "",
    commitmentStatuses: {},
    insights: "",
    nextWeekCommitments: [],
    workloadDecision: "keep same",
  });

  const loadWeeklyReviewForm = useCallback(
    (reviewWeekNumber: number) => {
      if (!system || !activeGoalId) return false;
      formInitRef.current = `${activeGoalId}::${reviewWeekNumber}`;
      setWeeklyForm(buildWeeklyReviewForm(system, reviewWeekNumber, currentLagMetricValue));
      return true;
    },
    [activeGoalId, currentLagMetricValue, system],
  );

  const resetWeeklyReviewForm = useCallback(() => {
    if (!system || !activeGoalId) return false;
    formInitRef.current = null;
    return loadWeeklyReviewForm(system.currentWeek);
  }, [activeGoalId, loadWeeklyReviewForm, system]);

  useEffect(() => {
    if (!system || !activeGoalId) return;

    const reviewWeekNumber = currentReview?.weekNumber ?? system.currentWeek;
    const initKey = `${activeGoalId}::${reviewWeekNumber}`;
    if (formInitRef.current === initKey) return;
    formInitRef.current = initKey;
    setWeeklyForm(buildWeeklyReviewForm(system, reviewWeekNumber, currentLagMetricValue));
    setDailyMood((latestCheckIn?.mood as DailyMood | undefined) ?? "steady");
    setDailyNote(latestCheckIn?.optionalNote ?? "");
  }, [system, currentReview, currentLagMetricValue, latestCheckIn, activeGoalId]);

  return {
    dailyMood,
    dailyNote,
    weeklyForm,
    setDailyMood,
    setDailyNote,
    setWeeklyForm,
    loadWeeklyReviewForm,
    resetWeeklyReviewForm,
  };
}
