import { useEffect, useRef, useState } from "react";

import type { DailyMood } from "@/app/utils/twelve-week-system-ui";
import type { TwelveWeekSystem, UniversalDailyCheckIn, UniversalWeeklyReview } from "@/app/utils/storage-types";

import type { WeeklyReviewForm } from "./types";

interface UseWeeklyReviewFormStateOptions {
  activeGoalId: string | null;
  system: TwelveWeekSystem | null;
  currentReview: UniversalWeeklyReview | null | undefined;
  currentLagMetricValue: string;
  latestCheckIn: UniversalDailyCheckIn | null;
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
    nextWeekPriority: "",
    workloadDecision: "keep same",
  });

  useEffect(() => {
    if (!system || !activeGoalId) return;

    const initKey = `${activeGoalId}::${currentReview?.weekNumber ?? ""}`;
    if (formInitRef.current === initKey) return;
    formInitRef.current = initKey;

    setWeeklyForm({
      lagProgressValue: currentReview?.lagProgressValue ?? currentLagMetricValue ?? "",
      biggestOutputThisWeek: currentReview?.biggestOutputThisWeek ?? "",
      mainObstacle: currentReview?.mainObstacle ?? "",
      nextWeekPriority: currentReview?.nextWeekPriority ?? "",
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
