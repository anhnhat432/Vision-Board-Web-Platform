import { useCallback, useMemo, type Dispatch, type RefObject, type SetStateAction } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

import { trackAnalyticsEvent } from "@/app/utils/analytics";
import { hapticLight, hapticMedium, hapticSuccess } from "@/app/utils/haptics";
import { playAllCompleteSound, playTaskCompleteSound } from "@/app/utils/sound";
import {
  type UniversalDailyCheckIn,
  type UniversalWeeklyReview,
  formatDateInputValue,
  getCalendarDateKey,
  getUserData,
  trackAppEvent,
  updateGoal,
  upsertReflection,
} from "@/app/utils/storage";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import {
  addDaysToDateKey,
  getMoodScore,
  getWorkloadDecisionLabel,
  type DailyMood,
  type RescuePlanSummary,
  type ReentryMode,
} from "@/app/utils/twelve-week-system-ui";
import {
  buildDerivedScoreboard,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
  getTwelveWeekMissedTasks,
  getTwelveWeekTasksForWeek,
  getTwelveWeekWeekCompletion,
  getTwelveWeekWeekRange,
  rescheduleTwelveWeekTaskToNextWeek,
  rescheduleTwelveWeekTaskWithinWeek,
  skipTwelveWeekNonCoreTask,
  type OverdueTaskActionReason,
} from "@/app/utils/storage-twelve-week";
import type { SuggestedNextWeekPlan } from "@/app/utils/twelve-week-premium";
import { enqueueLeadMetricUpsertedMutations } from "@/features/plan12week/persistence/leadMetricMutation";
import { getUniversalWeeklyReviewExecutionScore } from "@/features/plan12week/persistence/reviewExecutionScore";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { enqueuePlanSnapshotUpdatedMutation } from "@/features/plan12week/persistence/planSnapshotMutation";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getTodayQueueForSystem } from "./helpers";
import type { WeeklyCommitmentStatus, WeeklyReviewForm } from "./types";

interface ExecutionSyncActions {
  syncTaskToggle: (taskId: string, completed: boolean) => Promise<boolean>;
  syncDailyCheckIn: (input: { weekNumber: number; date: string; didWorkToday: boolean }) => Promise<boolean>;
  syncWeeklyReview: (input: {
    weekNumber: number;
    executionScore: number;
    reflection?: string;
    adjustments?: string;
  }) => Promise<boolean>;
}

interface UseTwelveWeekExecutionActionsOptions {
  activeGoal: Goal | null;
  system: TwelveWeekSystem | null;
  activeGoalIdRef: RefObject<string | null>;
  dailyMood: DailyMood;
  dailyNote: string;
  weeklyForm: WeeklyReviewForm;
  setWeeklyForm: Dispatch<SetStateAction<WeeklyReviewForm>>;
  hasPremiumReviewInsights: boolean;
  suggestedNextWeekPlan: SuggestedNextWeekPlan;
  rescuePlanSummary: RescuePlanSummary | null;
  executionSyncActions: ExecutionSyncActions;
  commitSystemUpdate: (nextSystem: TwelveWeekSystem) => TwelveWeekSystem;
  updateActiveSystemState: (updater: (system: TwelveWeekSystem) => TwelveWeekSystem) => void;
  refreshBackendProgressOverlay: () => void;
  invalidateOverlay: () => void;
  refreshSnapshotMeta: () => void;
}

function getClientPlanId(goalId: string): string {
  return `${goalId}:12-week-system`;
}

function getClientWeekId(goalId: string, weekNumber: number): string {
  return `${goalId}:week:${weekNumber}`;
}

function enqueueTaskCompletionChangedMutation(goalId: string, task: TwelveWeekTaskInstance): void {
  try {
    const planLink = getPlanLink(goalId);
    enqueueStoredMutation({
      kind: "task_completed_changed",
      goalId,
      planId: planLink?.planId ?? null,
      payload: {
        taskId: task.id,
        clientTaskId: task.id,
        clientPlanId: getClientPlanId(goalId),
        clientWeekId: getClientWeekId(goalId, task.weekNumber),
        weekNumber: task.weekNumber,
        completed: task.completed,
        completedAt: task.completedAt,
        scheduledDate: task.scheduledDate,
        title: task.title,
        leadIndicatorName: task.leadIndicatorName,
        isCore: task.isCore,
      },
    });
  } catch {
    // Queueing is a best-effort sidecar. The local-first task save stays authoritative.
  }
}

function enqueueDailyCheckInUpsertedMutation(goalId: string, weekNumber: number, checkIn: UniversalDailyCheckIn): void {
  try {
    const planLink = getPlanLink(goalId);
    enqueueStoredMutation({
      kind: "daily_check_in_upserted",
      goalId,
      planId: planLink?.planId ?? null,
      payload: {
        date: checkIn.date,
        clientPlanId: getClientPlanId(goalId),
        clientWeekId: getClientWeekId(goalId, weekNumber),
        weekNumber,
        checkIn,
      },
    });
  } catch {
    // Queueing is a best-effort sidecar. The local-first check-in save stays authoritative.
  }
}

function enqueueWeeklyReviewUpsertedMutation(
  goalId: string,
  weekNumber: number,
  review: UniversalWeeklyReview,
  executionScore: number,
): void {
  try {
    const planLink = getPlanLink(goalId);
    enqueueStoredMutation({
      kind: "weekly_review_upserted",
      goalId,
      planId: planLink?.planId ?? null,
      payload: {
        clientPlanId: getClientPlanId(goalId),
        clientWeekId: getClientWeekId(goalId, weekNumber),
        weekNumber,
        executionScore,
        review,
      },
    });
  } catch {
    // Queueing is a best-effort sidecar. The local-first weekly review save stays authoritative.
  }
}

function normalizeCommitmentList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

function parseCommitmentInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function getReviewNextWeekCommitments(review: UniversalWeeklyReview | null | undefined): string[] {
  const commitments = normalizeCommitmentList(review?.nextWeekCommitments);
  if (commitments.length > 0) return commitments;

  const legacyPriority = review?.nextWeekPriority?.trim();
  return legacyPriority ? [legacyPriority] : [];
}

function isCommitmentAnswered(status: WeeklyCommitmentStatus | undefined): boolean {
  return status === "kept" || status === "missed" || status === "not_set";
}

function canRunConfetti(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom")) return false;
  return typeof window.HTMLCanvasElement !== "undefined" && "getContext" in window.HTMLCanvasElement.prototype;
}

function runConfetti(options: NonNullable<Parameters<typeof confetti>[0]>): void {
  if (!canRunConfetti()) return;
  confetti(options);
}

function triggerTaskCompletionConfetti(allTodayTasksCompleted: boolean): void {
  if (allTodayTasksCompleted) {
    runConfetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#7c3aed", "#d946ef", "#f472b6", "#10b981", "#fbbf24"],
      scalar: 0.9,
      gravity: 0.9,
      ticks: 150,
      disableForReducedMotion: true,
    });
    return;
  }

  runConfetti({
    particleCount: 12,
    spread: 40,
    origin: { y: 0.7 },
    colors: ["#7c3aed", "#d946ef", "#f472b6"],
    scalar: 0.7,
    gravity: 1.2,
    ticks: 80,
    disableForReducedMotion: true,
  });
}

function triggerWeeklyReviewConfetti(): void {
  runConfetti({
    particleCount: 60,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#7c3aed", "#d946ef", "#f472b6", "#10b981", "#fbbf24"],
    scalar: 0.9,
    gravity: 0.9,
    ticks: 150,
    disableForReducedMotion: true,
  });
}

export function useTwelveWeekExecutionActions({
  activeGoal,
  system,
  activeGoalIdRef,
  dailyMood,
  dailyNote,
  weeklyForm,
  setWeeklyForm,
  hasPremiumReviewInsights,
  suggestedNextWeekPlan,
  rescuePlanSummary,
  executionSyncActions,
  commitSystemUpdate,
  updateActiveSystemState,
  refreshBackendProgressOverlay,
  invalidateOverlay,
  refreshSnapshotMeta,
}: UseTwelveWeekExecutionActionsOptions) {
  const getLatestActiveSystem = useCallback(() => {
    if (!activeGoal || !system) return system;
    return getUserData().goals.find((goal) => goal.id === activeGoal.id)?.twelveWeekSystem ?? system;
  }, [activeGoal, system]);

  const handleToggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!activeGoal || !system) return;
      const actionGoalId = activeGoal.id;
      const toggledTask = system.taskInstances.find((task) => task.id === taskId);
      const taskCompletedFromIncomplete = Boolean(completed && toggledTask && !toggledTask.completed);
      const nextTaskInstances = system.taskInstances.map((task) =>
        task.id === taskId
          ? { ...task, completed, completedAt: completed ? new Date().toISOString() : undefined }
          : task,
      );
      const nextToggledTask = nextTaskInstances.find((task) => task.id === taskId);

      invalidateOverlay();
      const savedSystem = commitSystemUpdate({
        ...system,
        taskInstances: nextTaskInstances,
      });

      if (nextToggledTask) {
        enqueueTaskCompletionChangedMutation(actionGoalId, nextToggledTask);
        enqueueLeadMetricUpsertedMutations(actionGoalId, savedSystem, "task_progress", {
          weekNumbers: [nextToggledTask.weekNumber],
          indicatorIds: nextToggledTask.tacticId ? [nextToggledTask.tacticId] : undefined,
          indicatorNames: [nextToggledTask.leadIndicatorName],
        });
      }

      if (completed) {
        trackAnalyticsEvent(
          "today_task_completed",
          {
            source: "12_week_system",
            week_number: toggledTask?.weekNumber ?? getTwelveWeekCurrentWeek(system),
            is_core: Boolean(toggledTask?.isCore),
          },
          {
            goalId: actionGoalId,
            legacyEventName: "12_week_task_completed",
            legacyPayload: {
              weekNumber: String(toggledTask?.weekNumber ?? getTwelveWeekCurrentWeek(system)),
              taskId,
            },
          },
        );
      }

      const synced = await executionSyncActions.syncTaskToggle(taskId, completed);
      if (!synced) {
        const latestGoal = getUserData().goals.find((goal) => goal.id === actionGoalId);
        const latestSystem = latestGoal?.twelveWeekSystem;
        const latestTask = latestSystem?.taskInstances.find((task) => task.id === taskId);
        const shouldRollbackTask = Boolean(latestSystem && latestTask && latestTask.completed === completed);
        if (latestSystem && shouldRollbackTask) {
          const rollbackSystem = {
            ...latestSystem,
            taskInstances: latestSystem.taskInstances.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    completed: toggledTask?.completed ?? false,
                    completedAt: toggledTask?.completedAt,
                  }
                : task,
            ),
          };
          const normalizedRollbackSystem = {
            ...rollbackSystem,
            scoreboard: buildDerivedScoreboard(rollbackSystem, getDefaultScoreboard(rollbackSystem.totalWeeks)),
          };

          updateGoal(actionGoalId, {
            twelveWeekSystem: normalizedRollbackSystem,
          });
          if (activeGoalIdRef.current === actionGoalId) {
            updateActiveSystemState(() => normalizedRollbackSystem);
          }
          const rollbackTask = normalizedRollbackSystem.taskInstances.find((task) => task.id === taskId);
          if (rollbackTask) {
            enqueueTaskCompletionChangedMutation(actionGoalId, rollbackTask);
            enqueueLeadMetricUpsertedMutations(actionGoalId, normalizedRollbackSystem, "task_progress", {
              weekNumbers: [rollbackTask.weekNumber],
              indicatorIds: rollbackTask.tacticId ? [rollbackTask.tacticId] : undefined,
              indicatorNames: [rollbackTask.leadIndicatorName],
            });
          }
        }

        toast.error(
          shouldRollbackTask
            ? "Không thể đồng bộ trạng thái việc. Mình đã hoàn tác thay đổi."
            : "Chưa đồng bộ được trạng thái việc. Trạng thái trên thiết bị này vẫn được giữ lại.",
        );
        return;
      }

      if (taskCompletedFromIncomplete) {
        const nextTodayQueue = getTodayQueueForSystem(savedSystem);
        const allTodayTasksCompleted = nextTodayQueue.length > 0 && nextTodayQueue.every((task) => task.completed);
        hapticMedium();
        if (allTodayTasksCompleted) {
          hapticSuccess();
          playAllCompleteSound();
        } else {
          playTaskCompleteSound();
        }
        triggerTaskCompletionConfetti(allTodayTasksCompleted);
      }

      toast.success(completed ? "Việc đã được chốt." : "Việc đã được mở lại.");
      if (activeGoalIdRef.current === actionGoalId) {
        refreshBackendProgressOverlay();
        refreshSnapshotMeta();
      }
    },
    [
      activeGoal,
      system,
      executionSyncActions,
      commitSystemUpdate,
      invalidateOverlay,
      activeGoalIdRef,
      updateActiveSystemState,
      refreshBackendProgressOverlay,
      refreshSnapshotMeta,
    ],
  );

  const handleSaveCheckIn = useCallback(async () => {
    if (!activeGoal || !system) return;
    const actionGoalId = activeGoal.id;
    const actionDate = new Date();
    const todayKey = formatDateInputValue(actionDate);
    const latestSystem = getLatestActiveSystem() ?? system;
    const syncWeekNumber = getTwelveWeekCurrentWeek(latestSystem, actionDate);
    const syncWeekTasks = getTwelveWeekTasksForWeek(latestSystem, syncWeekNumber);
    const actionTodayQueue = getTodayQueueForSystem(latestSystem);
    const completedTodayCount = actionTodayQueue.filter((task) => task.completed).length;
    const completedTitles = actionTodayQueue
      .filter((task) => task.completed)
      .map((task) => task.title)
      .join(", ");
    const sameDayCheckIns = latestSystem.dailyCheckIns.filter((item) => getCalendarDateKey(item.date) === todayKey);
    const updatedCount = sameDayCheckIns.reduce((maxCount, item) => Math.max(maxCount, item.updatedCount ?? 1), 0) + 1;
    const dailyCheckIn: UniversalDailyCheckIn = {
      date: todayKey,
      didWorkToday: completedTodayCount > 0 || dailyNote.trim().length > 0,
      whichLeadIndicatorWorkedOn: completedTitles || actionTodayQueue[0]?.leadIndicatorName || "",
      amountDone: `${completedTodayCount}/${actionTodayQueue.length || syncWeekTasks.length || 1} việc`,
      outputCreated: completedTitles,
      obstacleOrIssue: "",
      dailySelfRating: getMoodScore(dailyMood),
      optionalNote: dailyNote.trim(),
      mood: dailyMood,
      updatedCount,
    };

    const sameDayCheckInHistory = latestSystem.dailyCheckIns
      .filter((item) => getCalendarDateKey(item.date) === todayKey)
      .slice(0, 4);
    const otherDayCheckIns = latestSystem.dailyCheckIns.filter((item) => getCalendarDateKey(item.date) !== todayKey);

    commitSystemUpdate({
      ...latestSystem,
      dailyCheckIns: [dailyCheckIn, ...sameDayCheckInHistory, ...otherDayCheckIns].slice(0, 120),
    });

    enqueueDailyCheckInUpsertedMutation(actionGoalId, syncWeekNumber, dailyCheckIn);

    trackAppEvent("12_week_daily_checkin_submitted", actionGoalId, {
      mood: dailyMood,
      completedTasks: String(completedTodayCount),
    });

    const synced = await executionSyncActions.syncDailyCheckIn({
      weekNumber: syncWeekNumber,
      date: todayKey,
      didWorkToday: dailyCheckIn.didWorkToday,
    });

    if (synced) {
      hapticLight();
      toast.success("Check-in hôm nay đã được lưu.");
      if (activeGoalIdRef.current === actionGoalId) {
        refreshBackendProgressOverlay();
      }
    } else {
      toast.info("Check-in đã lưu trên thiết bị này. Sẽ tự đồng bộ khi tài khoản sẵn sàng.");
    }
    if (activeGoalIdRef.current === actionGoalId) {
      refreshSnapshotMeta();
    }
  }, [
    activeGoal,
    system,
    dailyMood,
    dailyNote,
    executionSyncActions,
    commitSystemUpdate,
    activeGoalIdRef,
    refreshBackendProgressOverlay,
    refreshSnapshotMeta,
    getLatestActiveSystem,
  ]);

  const handleSaveWeeklyReview = useCallback(async () => {
    if (!activeGoal || !system) return;
    const actionGoalId = activeGoal.id;
    const actionGoalTitle = activeGoal.title;
    const hasAnyContent =
      weeklyForm.biggestOutputThisWeek.trim() ||
      weeklyForm.mainObstacle.trim() ||
      weeklyForm.keepTactic.trim() ||
      weeklyForm.reduceTactic.trim() ||
      weeklyForm.nextWeekPriority.trim() ||
      weeklyForm.insights.trim() ||
      weeklyForm.nextWeekCommitments.length > 0 ||
      Object.values(weeklyForm.commitmentStatuses).some(isCommitmentAnswered) ||
      weeklyForm.lagProgressValue.trim();
    if (!hasAnyContent) {
      toast.error("Cần điền ít nhất một mục trước khi chốt review.");
      return;
    }
    const latestSystem = getLatestActiveSystem() ?? system;
    const reviewWeekNumber = getTwelveWeekCurrentWeek(latestSystem);
    const reviewWeekCompletion = getTwelveWeekWeekCompletion(latestSystem, reviewWeekNumber);
    const previousReview = latestSystem.weeklyReviews.find((review) => review.weekNumber === reviewWeekNumber - 1);
    const previousCommitments = getReviewNextWeekCommitments(previousReview);
    const unansweredCommitment = previousCommitments.find(
      (commitment) => !isCommitmentAnswered(weeklyForm.commitmentStatuses[commitment]),
    );
    if (unansweredCommitment) {
      toast.error("Cần phân loại mọi cam kết tuần trước trước khi chốt review.");
      return;
    }

    const normalizedFormCommitments = normalizeCommitmentList(weeklyForm.nextWeekCommitments).slice(0, 5);
    const nextWeekCommitments =
      normalizedFormCommitments.length > 0
        ? normalizedFormCommitments
        : parseCommitmentInput(weeklyForm.nextWeekPriority.trim());
    if (nextWeekCommitments.length === 0) {
      toast.error("Cần đặt ít nhất một cam kết tuần tới trước khi chốt review.");
      return;
    }

    const commitmentsKept = previousCommitments.filter(
      (commitment) => weeklyForm.commitmentStatuses[commitment] === "kept",
    );
    const commitmentsMissed = previousCommitments.filter(
      (commitment) => weeklyForm.commitmentStatuses[commitment] === "missed",
    );
    const insightsValue =
      weeklyForm.insights.trim() || weeklyForm.mainObstacle.trim() || weeklyForm.biggestOutputThisWeek.trim();
    const nextWeekPriorityValue = nextWeekCommitments[0] ?? "";
    const workloadDecisionValue =
      weeklyForm.workloadDecision || (hasPremiumReviewInsights ? suggestedNextWeekPlan.workloadDecision : "keep same");
    const keepTacticTrimmed = weeklyForm.keepTactic.trim();
    const reduceTacticTrimmed = weeklyForm.reduceTactic.trim();
    const nextReview: UniversalWeeklyReview = {
      weekNumber: reviewWeekNumber,
      leadCompletionPercent: reviewWeekCompletion.percent,
      lagProgressValue: weeklyForm.lagProgressValue.trim(),
      biggestOutputThisWeek:
        weeklyForm.biggestOutputThisWeek.trim() || (commitmentsKept.length > 0 ? commitmentsKept.join(", ") : ""),
      mainObstacle:
        weeklyForm.mainObstacle.trim() || (commitmentsMissed.length > 0 ? commitmentsMissed.join(", ") : ""),
      nextWeekPriority: nextWeekPriorityValue,
      workloadDecision: workloadDecisionValue,
      reviewCompleted: true,
      progressScore: Math.max(5, Math.round(reviewWeekCompletion.percent / 20)),
      disciplineScore: Math.max(5, Math.round(reviewWeekCompletion.percent / 20)),
      focusScore: reviewWeekCompletion.percent >= 70 ? 8 : 6,
      improvementScore: insightsValue ? 8 : 6,
      outputQualityScore: commitmentsKept.length > 0 || weeklyForm.biggestOutputThisWeek.trim() ? 8 : 6,
      completedLeadIndicators: reviewWeekCompletion.completed,
      commitmentsKept,
      commitmentsMissed,
      insights: insightsValue,
      nextWeekCommitments,
      executionScore: reviewWeekCompletion.percent,
      reflection: insightsValue,
      adjustments: nextWeekPriorityValue,
      ...(keepTacticTrimmed ? { keepTactic: keepTacticTrimmed } : {}),
      ...(reduceTacticTrimmed ? { reduceTactic: reduceTacticTrimmed } : {}),
    };

    const updatedReviews = [
      ...latestSystem.weeklyReviews.filter((review) => review.weekNumber !== reviewWeekNumber),
      nextReview,
    ].sort((left, right) => left.weekNumber - right.weekNumber);

    commitSystemUpdate({
      ...latestSystem,
      lagMetric: {
        ...latestSystem.lagMetric,
        currentValue: weeklyForm.lagProgressValue.trim(),
      },
      weeklyReviews: updatedReviews,
    });
    const reviewExecutionScore = getUniversalWeeklyReviewExecutionScore(nextReview, reviewWeekCompletion.percent);

    upsertReflection({
      date: formatDateInputValue(new Date()),
      title: `Review tuần - ${actionGoalTitle} - tuần ${reviewWeekNumber}`,
      content: [
        `Score tuần qua: ${reviewWeekCompletion.percent}%`,
        `Cam kết đã giữ: ${commitmentsKept.join(", ") || "--"}`,
        `Cam kết bỏ lỡ: ${commitmentsMissed.join(", ") || "--"}`,
        `Insight tuần sau: ${insightsValue || "--"}`,
        `Cam kết tuần tới: ${nextWeekCommitments.join(", ")}`,
        `Quyết định: ${getWorkloadDecisionLabel(workloadDecisionValue)}`,
        hasPremiumReviewInsights ? `Gợi ý hệ thống: ${suggestedNextWeekPlan.firstMove}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      mood: reviewWeekCompletion.percent >= 70 ? "happy" : reviewWeekCompletion.percent >= 40 ? "neutral" : "sad",
      entryType: "weekly-review",
      linkedGoalId: actionGoalId,
      linkedWeekNumber: reviewWeekNumber,
    });

    enqueueWeeklyReviewUpsertedMutation(actionGoalId, reviewWeekNumber, nextReview, reviewExecutionScore);

    trackAnalyticsEvent(
      "weekly_review_submitted",
      {
        source: "12_week_system",
        week_number: reviewWeekNumber,
        lead_completion_percent: reviewWeekCompletion.percent,
        execution_score: reviewExecutionScore,
        workload_decision: workloadDecisionValue || "keep same",
      },
      {
        goalId: actionGoalId,
        legacyEventName: "12_week_weekly_review_submitted",
        legacyPayload: {
          weekNumber: String(reviewWeekNumber),
          score: String(reviewExecutionScore),
          decision: workloadDecisionValue || "keep same",
          usedSuggestedPlan: String(
            hasPremiumReviewInsights &&
              weeklyForm.nextWeekCommitments.length === 0 &&
              weeklyForm.nextWeekPriority.trim().length === 0,
          ),
        },
      },
    );

    const synced = await executionSyncActions.syncWeeklyReview({
      weekNumber: reviewWeekNumber,
      executionScore: reviewExecutionScore,
      reflection: insightsValue || undefined,
      adjustments: nextWeekPriorityValue || undefined,
    });

    if (!synced) {
      toast.info("Review tuần đã lưu trên thiết bị này. Sẽ tự đồng bộ khi tài khoản sẵn sàng.");
      if (activeGoalIdRef.current === actionGoalId) {
        refreshSnapshotMeta();
      }
      return;
    }

    toast.success("Review tuần đã được chốt.", {
      description:
        hasPremiumReviewInsights &&
        weeklyForm.nextWeekCommitments.length === 0 &&
        weeklyForm.nextWeekPriority.trim().length === 0
          ? "Mình đã dùng luôn gợi ý Plus để khóa ưu tiên tuần sau cho bạn."
          : "Tuần sau giờ đã có ưu tiên đủ rõ để bắt đầu gọn hơn.",
    });
    hapticSuccess();
    triggerWeeklyReviewConfetti();
    if (activeGoalIdRef.current === actionGoalId) {
      refreshBackendProgressOverlay();
      refreshSnapshotMeta();
    }
  }, [
    activeGoal,
    system,
    weeklyForm,
    hasPremiumReviewInsights,
    suggestedNextWeekPlan,
    executionSyncActions,
    commitSystemUpdate,
    activeGoalIdRef,
    refreshBackendProgressOverlay,
    refreshSnapshotMeta,
    getLatestActiveSystem,
  ]);

  const handleReentry = useCallback(
    (mode: ReentryMode) => {
      if (!activeGoal || !system) return;
      const reentryWeekNumber = getTwelveWeekCurrentWeek(system);
      const reentryWeekRange = getTwelveWeekWeekRange(system, reentryWeekNumber);
      const reentryMissedTasks = getTwelveWeekMissedTasks(system);
      const todayKey = formatDateInputValue(new Date());
      const weekEnd = reentryWeekRange.end;
      const nextWeekStart = addDaysToDateKey(weekEnd, 1);
      const targets =
        mode === "restart"
          ? Array.from({ length: 4 }, (_, index) => addDaysToDateKey(todayKey, index))
          : mode === "lighten"
            ? [weekEnd, addDaysToDateKey(weekEnd, -1), addDaysToDateKey(weekEnd, -2)].filter(
                (value) => value >= todayKey,
              )
            : Array.from({ length: 4 }, (_, index) => addDaysToDateKey(nextWeekStart, index));

      let moved = 0;
      const nextTaskInstances = system.taskInstances.map((task) => {
        const isMissed = reentryMissedTasks.some((item) => item.id === task.id);
        const isOptionalThisWeek =
          mode === "lighten" &&
          task.weekNumber === reentryWeekNumber &&
          !task.isCore &&
          !task.completed &&
          task.scheduledDate <= weekEnd;
        if (!isMissed && !isOptionalThisWeek) return task;

        const date = targets[Math.min(moved, Math.max(targets.length - 1, 0))] ?? todayKey;
        moved += 1;
        return {
          ...task,
          scheduledDate: date,
          rescheduledFrom: task.rescheduledFrom ?? task.scheduledDate,
        };
      });

      const nextSystem = commitSystemUpdate({
        ...system,
        tacticLoadPreference: mode === "lighten" ? "lighter" : system.tacticLoadPreference,
        reentryCount: (system.reentryCount ?? 0) + 1,
        taskInstances: nextTaskInstances,
      });
      enqueuePlanSnapshotUpdatedMutation(activeGoal.id, nextSystem, "reentry");

      trackAppEvent("12_week_reentry_used", activeGoal.id, { mode, weekNumber: String(reentryWeekNumber) });
      toast.success(
        mode === "restart"
          ? "Đã sắp lại để bắt đầu lại tuần này."
          : mode === "lighten"
            ? "Đã giảm tải cho phần còn lại của tuần."
            : "Đã đẩy việc trễ sang tuần sau.",
      );
      refreshSnapshotMeta();
    },
    [activeGoal, system, commitSystemUpdate, refreshSnapshotMeta],
  );

  const handleApplyRecommendedReentry = useCallback(() => {
    if (!activeGoal || !system || !rescuePlanSummary) return;
    const reentryWeekNumber = getTwelveWeekCurrentWeek(system);

    trackAppEvent("12_week_reentry_recommended_applied", activeGoal.id, {
      mode: rescuePlanSummary.recommendedMode,
      weekNumber: String(reentryWeekNumber),
    });
    handleReentry(rescuePlanSummary.recommendedMode);
  }, [activeGoal, system, rescuePlanSummary, handleReentry]);

  const handleApplySuggestedPlan = useCallback(() => {
    if (!activeGoal || !system) return;
    const suggestedWeekNumber = getTwelveWeekCurrentWeek(system);
    setWeeklyForm((previousForm) => ({
      ...previousForm,
      nextWeekPriority: suggestedNextWeekPlan.focus,
      nextWeekCommitments:
        previousForm.nextWeekCommitments.length > 0 ? previousForm.nextWeekCommitments : [suggestedNextWeekPlan.focus],
      workloadDecision: suggestedNextWeekPlan.workloadDecision,
    }));
    trackAppEvent("12_week_review_suggestion_applied", activeGoal.id, {
      weekNumber: String(suggestedWeekNumber),
      decision: suggestedNextWeekPlan.workloadDecision,
    });
    toast.success("Đã áp dụng gợi ý cho tuần sau.", {
      description: "Bạn có thể chỉnh lại thêm trước khi chốt review.",
    });
  }, [activeGoal, system, suggestedNextWeekPlan, setWeeklyForm]);

  const REASON_TOAST_COPY = useMemo(
    (): Record<OverdueTaskActionReason, string> => ({
      ok: "",
      task_not_found: "Không tìm thấy việc này — có thể đã được cập nhật ở nơi khác.",
      task_already_completed: "Việc này đã chốt rồi.",
      task_already_skipped: "Việc này đã bỏ qua trước đó.",
      no_room_in_current_week: "Tuần này đã hết ngày để dời. Hãy dời sang tuần sau.",
      no_next_week_available: "Đây là tuần cuối — không còn tuần sau để dời.",
      core_task_cannot_skip: "Việc cốt lõi không thể bỏ. Hãy dời lịch hoặc làm phiên bản nhỏ hơn.",
    }),
    [],
  );

  const applyOverdueTaskActionResult = useCallback(
    (
      actionGoalId: string,
      snapshotResult: { applied: boolean; reason: OverdueTaskActionReason; system: TwelveWeekSystem },
      successMessage: string,
      eventName: string,
    ): boolean => {
      if (!snapshotResult.applied) {
        const message = REASON_TOAST_COPY[snapshotResult.reason];
        if (message) toast.error(message);
        return false;
      }
      const savedSystem = commitSystemUpdate(snapshotResult.system);
      trackAppEvent(eventName, actionGoalId, {
        weekNumber: String(getTwelveWeekCurrentWeek(savedSystem)),
      });
      toast.success(successMessage);
      return true;
    },
    [commitSystemUpdate, REASON_TOAST_COPY],
  );

  const handleRescheduleTaskWithinWeek = useCallback(
    (taskId: string): boolean => {
      if (!activeGoal || !system) return false;
      const result = rescheduleTwelveWeekTaskWithinWeek(system, taskId);
      return applyOverdueTaskActionResult(
        activeGoal.id,
        result,
        "Đã dời sang ngày khác trong tuần này.",
        "12_week_task_rescheduled_within_week",
      );
    },
    [activeGoal, system, applyOverdueTaskActionResult],
  );

  const handleRescheduleTaskToNextWeek = useCallback(
    (taskId: string): boolean => {
      if (!activeGoal || !system) return false;
      const result = rescheduleTwelveWeekTaskToNextWeek(system, taskId);
      return applyOverdueTaskActionResult(
        activeGoal.id,
        result,
        "Đã dời sang tuần sau.",
        "12_week_task_rescheduled_next_week",
      );
    },
    [activeGoal, system, applyOverdueTaskActionResult],
  );

  const handleSkipNonCoreTask = useCallback(
    (taskId: string): boolean => {
      if (!activeGoal || !system) return false;
      const result = skipTwelveWeekNonCoreTask(system, taskId);
      return applyOverdueTaskActionResult(
        activeGoal.id,
        result,
        "Đã bỏ qua việc tùy chọn này.",
        "12_week_task_skipped_non_core",
      );
    },
    [activeGoal, system, applyOverdueTaskActionResult],
  );

  return {
    handleToggleTask,
    handleSaveCheckIn,
    handleSaveWeeklyReview,
    handleReentry,
    handleApplyRecommendedReentry,
    handleApplySuggestedPlan,
    handleRescheduleTaskWithinWeek,
    handleRescheduleTaskToNextWeek,
    handleSkipNonCoreTask,
  };
}
