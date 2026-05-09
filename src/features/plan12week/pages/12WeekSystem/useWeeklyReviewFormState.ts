import { useEffect, useRef, useState } from "react";

import type { DailyMood } from "@/app/utils/twelve-week-system-ui";
import type { TwelveWeekSystem, UniversalDailyCheckIn, UniversalWeeklyReview } from "@/app/utils/storage-types";

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
    nextWeekCommitmentsInput: "",
    workloadDecision: "keep same",
  });

  useEffect(() => {
    if (!system || !activeGoalId) return;

    const initKey = `${activeGoalId}::${currentReview?.weekNumber ?? ""}`;
    if (formInitRef.current === initKey) return;
    formInitRef.current = initKey;

    const previousReview = system.weeklyReviews.find((review) => review.weekNumber === system.currentWeek - 1);
    const previousCommitments = getReviewNextWeekCommitments(previousReview);
    const nextWeekCommitments = getReviewNextWeekCommitments(currentReview);
    const legacyNextPriority = currentReview?.nextWeekPriority ?? "";
    const insights = currentReview?.insights ?? currentReview?.reflection ?? currentReview?.biggestOutputThisWeek ?? "";

    setWeeklyForm({
      lagProgressValue: currentReview?.lagProgressValue ?? currentLagMetricValue ?? "",
      biggestOutputThisWeek: currentReview?.biggestOutputThisWeek ?? "",
      mainObstacle: currentReview?.mainObstacle ?? "",
      keepTactic: currentReview?.keepTactic ?? "",
      reduceTactic: currentReview?.reduceTactic ?? "",
      nextWeekPriority: legacyNextPriority,
      commitmentStatuses: buildCommitmentStatuses(previousCommitments, currentReview),
      insights,
      nextWeekCommitmentsInput: nextWeekCommitments.length > 0 ? nextWeekCommitments.join("\n") : legacyNextPriority,
      workloadDecision: currentReview?.workloadDecision ?? "keep same",
    });
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
  };
}
