import { type Dispatch, type RefObject, type SetStateAction, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { trackAnalyticsEvent } from "@/app/utils/analytics";
import { shouldEnable12WeekMutationSync } from "@/app/utils/app-mode";
import { hapticLight, hapticMedium, hapticSuccess } from "@/app/utils/haptics";
import { playAllCompleteSound, playTaskCompleteSound } from "@/app/utils/sound";
import {
  formatDateInputValue,
  getCalendarDateKey,
  getUserData,
  isCalendarDateKeyOnOrAfter,
  isCalendarDateKeyOnOrBefore,
  trackAppEvent,
  type UniversalDailyCheckIn,
  type UniversalWeeklyReview,
  upsertReflection,
} from "@/app/utils/storage";
import {
  getTwelveWeekCurrentWeek,
  getTwelveWeekMissedTasks,
  getTwelveWeekTasksForWeek,
  getTwelveWeekWeekCompletion,
  getTwelveWeekWeekRange,
  type OverdueTaskActionReason,
  rescheduleTwelveWeekTaskToNextWeek,
  rescheduleTwelveWeekTaskWithinWeek,
  skipTwelveWeekNonCoreTask,
} from "@/app/utils/storage-twelve-week";
import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";
import type { SuggestedNextWeekPlan } from "@/app/utils/twelve-week-premium";
import {
  addDaysToDateKey,
  type DailyMood,
  getMoodScore,
  getWorkloadDecisionLabel,
  type ReentryMode,
  type RescuePlanSummary,
} from "@/app/utils/twelve-week-system-ui";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { enqueuePlanSnapshotUpdatedMutation } from "@/features/plan12week/persistence/planSnapshotMutation";
import {
  applyConfirmedNextWeekHandoff,
  type ConfirmedNextWeekHandoffSelection,
} from "@/features/plan12week/logic";
import {
  commitTwelveWeekTaskCompletion,
  rollbackTwelveWeekTaskCompletion,
} from "@/features/plan12week/persistence/taskCompletionMutation";
import { commitTwelveWeekWeeklyReview } from "@/features/plan12week/persistence/weeklyReviewMutation";
import { celebrateMedium, celebrateSmall } from "@/lib/effects/celebrate";
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
  syncLocalSnapshot: (input: {
    system: TwelveWeekSystem;
  }) => Promise<{ status: "idle" | "success" | "partial" | "error"; failedCount: number }>;
}

export type WeeklyReviewSaveResult =
  | {
      status: "saved";
      review: UniversalWeeklyReview;
      system: TwelveWeekSystem;
      syncStatus: "synced" | "pending";
      wasNoop: boolean;
    }
  | {
      status: "failed";
      reason: "unavailable" | "validation" | "local_save_failed";
    };

export type NextWeekHandoffCommandResult =
  | {
      status: "applied";
      system: TwelveWeekSystem;
      syncStatus: "synced" | "pending";
    }
  | {
      status: "noop" | "unavailable";
      system: TwelveWeekSystem;
    }
  | {
      status: "failed";
      reason: "unavailable" | "local_save_failed";
    };

interface UseTwelveWeekExecutionActionsOptions {
  activeGoal: Goal | null;
  system: TwelveWeekSystem | null;
  activeGoalIdRef: RefObject<string | null>;
  dailyMood: DailyMood;
  dailyNote: string;
  weeklyForm: WeeklyReviewForm;
  setWeeklyForm: Dispatch<SetStateAction<WeeklyReviewForm>>;
  suggestedNextWeekPlan: SuggestedNextWeekPlan | null;
  rescuePlanSummary: RescuePlanSummary | null;
  executionSyncActions: ExecutionSyncActions;
  commitSystemUpdate: (nextSystem: TwelveWeekSystem) => TwelveWeekSystem;
  updateActiveSystemState: (updater: (system: TwelveWeekSystem) => TwelveWeekSystem) => void;
  refreshBackendProgressOverlay: () => void;
  invalidateOverlay: () => void;
  refreshSnapshotMeta: () => void;
  onWeekCompleted?: (weekNumber: number, goalId: string) => void;
}

function getClientPlanId(goalId: string): string {
  return `${goalId}:12-week-system`;
}

function getClientWeekId(goalId: string, weekNumber: number): string {
  return `${goalId}:week:${weekNumber}`;
}

function enqueueDailyCheckInUpsertedMutation(goalId: string, weekNumber: number, checkIn: UniversalDailyCheckIn): void {
  try {
    const planLink = getPlanLink(goalId);
    const backendPlanId = planLink?.planId ?? null;
    const backendWeekId = planLink?.weekIdByNumber[weekNumber] ?? null;
    enqueueStoredMutation({
      kind: "daily_check_in_upserted",
      goalId,
      planId: backendPlanId,
      payload: {
        date: checkIn.date,
        backendPlanId,
        backendWeekId,
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

function normalizeCommitmentList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

function parseCommitmentInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
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

function triggerTaskCompletionConfetti(allTodayTasksCompleted: boolean): void {
  if (allTodayTasksCompleted) {
    celebrateMedium();
    return;
  }

  celebrateSmall();
}

function triggerWeeklyReviewConfetti(): void {
  celebrateMedium();
}

export function useTwelveWeekExecutionActions({
  activeGoal,
  system,
  activeGoalIdRef,
  dailyMood,
  dailyNote,
  weeklyForm,
  setWeeklyForm,
  suggestedNextWeekPlan,
  rescuePlanSummary,
  executionSyncActions,
  commitSystemUpdate,
  updateActiveSystemState,
  refreshBackendProgressOverlay,
  invalidateOverlay,
  refreshSnapshotMeta,
  onWeekCompleted,
}: UseTwelveWeekExecutionActionsOptions) {
  const weeklyReviewSavePromiseRef = useRef<Promise<WeeklyReviewSaveResult> | null>(null);
  const nextWeekApplyPromiseRef = useRef<Promise<NextWeekHandoffCommandResult> | null>(null);
  const getLatestActiveSystem = useCallback(() => {
    if (!activeGoal || !system) return system;
    return getUserData().goals.find((goal) => goal.id === activeGoal.id)?.twelveWeekSystem ?? system;
  }, [activeGoal, system]);

  const handleToggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!activeGoal || !system) return false;
      const actionGoalId = activeGoal.id;
      const completionResult = commitTwelveWeekTaskCompletion({
        goalId: actionGoalId,
        taskId,
        completed,
      });
      if (completionResult.status === "local_save_failed") {
        toast.error("Không thể cập nhật, vui lòng thử lại");
        return false;
      }
      if (completionResult.status !== "applied") return false;

      const toggledTask = completionResult.previousTask;
      const savedSystem = completionResult.updatedSystem;
      const taskCompletedFromIncomplete = completed && !toggledTask.completed;
      invalidateOverlay();
      if (activeGoalIdRef.current === actionGoalId) {
        updateActiveSystemState(() => savedSystem);
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

      // Fire feel-good feedback (haptic, sound, confetti, toast) DEFERRED.
      // Staggered timing (20ms for toast success, 100ms for heavy confetti render)
      // This guarantees an instant, ultra-responsive feeling while avoiding rendering race-conditions.
      if (taskCompletedFromIncomplete) {
        const nextTodayQueue = getTodayQueueForSystem(savedSystem);
        const allTodayTasksCompleted = nextTodayQueue.length > 0 && nextTodayQueue.every((task) => task.completed);
        window.setTimeout(() => {
          hapticMedium();
          if (allTodayTasksCompleted) {
            hapticSuccess();
            playAllCompleteSound();
          } else {
            playTaskCompleteSound();
          }
          triggerTaskCompletionConfetti(allTodayTasksCompleted);
        }, 100);
      }
      window.setTimeout(() => {
        toast.success(completed ? "Việc đã được chốt." : "Việc đã được mở lại.");
      }, 20);

      // Under the mutation sync queue architecture, if mutation queue is active, we don't
      // block the user thread or rollback the local state upon REST sync failures.
      if (shouldEnable12WeekMutationSync()) {
        void executionSyncActions.syncTaskToggle(taskId, completed).then((synced) => {
          if (synced && activeGoalIdRef.current === actionGoalId) {
            // Không gọi refreshBackendProgressOverlay() ở đây vì queue đồng bộ ngầm
            // chưa hoàn thành. Gọi API kéo plan chi tiết từ server lúc này là thừa và làm chậm UI.
            // Chỉ cần refreshSnapshotMeta() để cập nhật metadata queue local.
            refreshSnapshotMeta();
          }
        });
        return true;
      } else {
        const synced = await executionSyncActions.syncTaskToggle(taskId, completed);
        if (!synced) {
          const rollbackResult = rollbackTwelveWeekTaskCompletion({
            goalId: actionGoalId,
            taskId,
            previousTask: completionResult.previousTask,
            attemptedTask: completionResult.updatedTask,
          });
          if (rollbackResult.status === "applied") {
            if (activeGoalIdRef.current === actionGoalId) {
              updateActiveSystemState(() => rollbackResult.updatedSystem);
            }
          }

          toast.error("Không thể cập nhật, vui lòng thử lại");
          return false;
        }

        if (activeGoalIdRef.current === actionGoalId) {
          refreshBackendProgressOverlay();
          refreshSnapshotMeta();
        }
        return true;
      }
    },
    [
      activeGoal,
      system,
      executionSyncActions,
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

    // Toast + haptic NGAY sau local commit, không đợi backend. Sync chạy ngầm; nếu fail
    // ta đè toast.info "đã lưu trên thiết bị" để báo user biết status thật.
    hapticLight();
    toast.success("Check-in hôm nay đã được lưu.");

    const synced = await executionSyncActions.syncDailyCheckIn({
      weekNumber: syncWeekNumber,
      date: todayKey,
      didWorkToday: dailyCheckIn.didWorkToday,
    });

    if (synced) {
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

  const handleSaveWeeklyReview = useCallback(
    (requestedWeekNumber?: number): Promise<WeeklyReviewSaveResult> => {
      if (weeklyReviewSavePromiseRef.current) return weeklyReviewSavePromiseRef.current;

      const operation = (async (): Promise<WeeklyReviewSaveResult> => {
        if (!activeGoal || !system) return { status: "failed", reason: "unavailable" };
        const actionGoalId = activeGoal.id;
        const actionGoalTitle = activeGoal.title;
        const latestSystem = getLatestActiveSystem() ?? system;
        const reviewWeekNumber = requestedWeekNumber ?? getTwelveWeekCurrentWeek(latestSystem);
        if (reviewWeekNumber > getTwelveWeekCurrentWeek(latestSystem)) {
          toast.error("Không thể lưu review cho tuần tương lai.");
          return { status: "failed", reason: "validation" };
        }
        const existingReview = latestSystem.weeklyReviews.find((review) => review.weekNumber === reviewWeekNumber);
        const normalizedFormCommitments = normalizeCommitmentList(weeklyForm.nextWeekCommitments).slice(0, 3);
        const nextWeekCommitments =
          normalizedFormCommitments.length > 0
            ? normalizedFormCommitments
            : parseCommitmentInput(weeklyForm.nextWeekPriority.trim()).slice(0, 3);
        const workloadDecisionValue = weeklyForm.workloadDecision || "keep same";
        const hasNextWeekAdjustment =
          nextWeekCommitments.length > 0 ||
          weeklyForm.reduceTactic.trim().length > 0 ||
          workloadDecisionValue === "reduce slightly" ||
          workloadDecisionValue === "increase slightly";
        const hasAnsweredCommitment = Object.values(weeklyForm.commitmentStatuses).some(isCommitmentAnswered);
        const hasAnyHumanContent = Boolean(
          existingReview ||
            weeklyForm.mainObstacle.trim() ||
            weeklyForm.keepTactic.trim() ||
            weeklyForm.reduceTactic.trim() ||
            hasNextWeekAdjustment ||
            hasAnsweredCommitment,
        );
        if (!hasAnyHumanContent) {
          toast.error("Cần ghi lại ít nhất một điều trước khi lưu review.");
          return { status: "failed", reason: "validation" };
        }
        const currentWeekNumber = getTwelveWeekCurrentWeek(latestSystem);
        if (
          reviewWeekNumber === currentWeekNumber &&
          reviewWeekNumber < latestSystem.totalWeeks &&
          !hasNextWeekAdjustment
        ) {
          toast.error("Cần đặt ít nhất một thay đổi cho tuần tới trước khi lưu review.");
          return { status: "failed", reason: "validation" };
        }

        const reviewWeekCompletion = getTwelveWeekWeekCompletion(latestSystem, reviewWeekNumber);
        const previousReview = latestSystem.weeklyReviews.find((review) => review.weekNumber === reviewWeekNumber - 1);
        const previousCommitments = getReviewNextWeekCommitments(previousReview);
        const commitmentsKept = previousCommitments.filter(
          (commitment) => weeklyForm.commitmentStatuses[commitment] === "kept",
        );
        const commitmentsMissed = previousCommitments.filter(
          (commitment) => weeklyForm.commitmentStatuses[commitment] === "missed",
        );
        const nextWeekPriorityValue = nextWeekCommitments[0] ?? "";
        const reviewPatch: Parameters<typeof commitTwelveWeekWeeklyReview>[0]["review"] = {
          weekNumber: reviewWeekNumber,
          leadCompletionPercent: reviewWeekCompletion.percent,
          lagProgressValue: weeklyForm.lagProgressValue.trim(),
          mainObstacle: weeklyForm.mainObstacle.trim(),
          nextWeekPriority: nextWeekPriorityValue,
          workloadDecision: workloadDecisionValue,
          reviewCompleted: true,
          progressScore: Math.max(5, Math.round(reviewWeekCompletion.percent / 20)),
          disciplineScore: Math.max(5, Math.round(reviewWeekCompletion.percent / 20)),
          focusScore: reviewWeekCompletion.percent >= 70 ? 8 : 6,
          improvementScore: weeklyForm.mainObstacle.trim() || weeklyForm.keepTactic.trim() ? 8 : 6,
          outputQualityScore: weeklyForm.keepTactic.trim() ? 8 : 6,
          completedLeadIndicators: reviewWeekCompletion.completed,
          nextWeekCommitments,
          executionScore: reviewWeekCompletion.percent,
          keepTactic: weeklyForm.keepTactic.trim(),
          reduceTactic: weeklyForm.reduceTactic.trim(),
          ...(nextWeekPriorityValue ? { adjustments: nextWeekPriorityValue } : {}),
          ...(hasAnsweredCommitment ? { commitmentsKept, commitmentsMissed } : {}),
        };

        const commitResult = commitTwelveWeekWeeklyReview({
          goalId: actionGoalId,
          review: reviewPatch,
          lagMetricCurrentValue: weeklyForm.lagProgressValue,
        });
        if (commitResult.status === "not_found" || commitResult.status === "local_save_failed") {
          toast.error("Không thể lưu review tuần. Dữ liệu cũ vẫn được giữ nguyên.");
          return { status: "failed", reason: "local_save_failed" };
        }

        const committedReview = commitResult.review;
        const committedSystem =
          commitResult.status === "applied" ? commitResult.updatedSystem : commitResult.currentSystem;
        if (activeGoalIdRef.current === actionGoalId) {
          updateActiveSystemState(() => committedSystem);
        }
        const reviewExecutionScore = committedReview.executionScore ?? reviewWeekCompletion.percent;
        const humanReflection = [
          weeklyForm.keepTactic.trim() ? `Điều nên giữ: ${weeklyForm.keepTactic.trim()}` : "",
          weeklyForm.mainObstacle.trim() ? `Nguyên nhân lệch nhịp: ${weeklyForm.mainObstacle.trim()}` : "",
          weeklyForm.reduceTactic.trim() ? `Điều nên giảm: ${weeklyForm.reduceTactic.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        upsertReflection({
          date: formatDateInputValue(new Date()),
          title: `Review tuần - ${actionGoalTitle} - tuần ${reviewWeekNumber}`,
          content: [
            `Score tuần qua: ${reviewWeekCompletion.percent}%`,
            humanReflection,
            commitmentsKept.length > 0 ? `Cam kết đã giữ: ${commitmentsKept.join(", ")}` : "",
            commitmentsMissed.length > 0 ? `Cam kết bỏ lỡ: ${commitmentsMissed.join(", ")}` : "",
            nextWeekCommitments.length > 0 ? `Thay đổi tuần tới: ${nextWeekCommitments.join(", ")}` : "",
            `Quyết định tải: ${getWorkloadDecisionLabel(workloadDecisionValue)}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
          mood: reviewWeekCompletion.percent >= 70 ? "happy" : reviewWeekCompletion.percent >= 40 ? "neutral" : "sad",
          entryType: "weekly-review",
          linkedGoalId: actionGoalId,
          linkedWeekNumber: reviewWeekNumber,
        });

        trackAnalyticsEvent(
          "weekly_review_submitted",
          {
            source: "12_week_system",
            week_number: reviewWeekNumber,
            lead_completion_percent: reviewWeekCompletion.percent,
            execution_score: reviewExecutionScore,
            workload_decision: workloadDecisionValue,
          },
          {
            goalId: actionGoalId,
            legacyEventName: "12_week_weekly_review_submitted",
            legacyPayload: {
              weekNumber: String(reviewWeekNumber),
              score: String(reviewExecutionScore),
              decision: workloadDecisionValue,
            },
          },
        );

        toast.success(reviewWeekNumber === latestSystem.totalWeeks ? "Review tuần cuối đã được lưu." : "Review đã lưu.", {
          description:
            reviewWeekNumber === latestSystem.totalWeeks
              ? "Bạn có thể tiếp tục sang phần tổng kết chu kỳ."
              : "Kế hoạch tuần sau chưa thay đổi cho đến khi bạn xác nhận.",
        });
        hapticSuccess();
        triggerWeeklyReviewConfetti();
        if (!existingReview?.reviewCompleted) onWeekCompleted?.(reviewWeekNumber, actionGoalId);

        let synced = false;
        try {
          synced = await executionSyncActions.syncWeeklyReview({
            weekNumber: reviewWeekNumber,
            executionScore: reviewExecutionScore,
            reflection: humanReflection || undefined,
            adjustments: nextWeekPriorityValue || undefined,
          });
        } catch {
          synced = false;
        }

        if (!synced) {
          toast.info("Review tuần đã lưu trên thiết bị này. Sẽ tự đồng bộ khi tài khoản sẵn sàng.");
          if (activeGoalIdRef.current === actionGoalId) refreshSnapshotMeta();
          return {
            status: "saved",
            review: committedReview,
            system: committedSystem,
            syncStatus: "pending",
            wasNoop: commitResult.status === "noop",
          };
        }

        if (activeGoalIdRef.current === actionGoalId) {
          refreshBackendProgressOverlay();
          refreshSnapshotMeta();
        }
        return {
          status: "saved",
          review: committedReview,
          system: committedSystem,
          syncStatus: "synced",
          wasNoop: commitResult.status === "noop",
        };
      })();

      weeklyReviewSavePromiseRef.current = operation;
      void operation.finally(() => {
        if (weeklyReviewSavePromiseRef.current === operation) weeklyReviewSavePromiseRef.current = null;
      });
      return operation;
    },
    [
      activeGoal,
      system,
      weeklyForm,
      executionSyncActions,
      updateActiveSystemState,
      activeGoalIdRef,
      refreshBackendProgressOverlay,
      refreshSnapshotMeta,
      getLatestActiveSystem,
      onWeekCompleted,
    ],
  );

  const handleApplyNextWeekHandoff = useCallback(
    (
      reviewedWeekNumber: number,
      selection: Omit<ConfirmedNextWeekHandoffSelection, "now">,
    ): Promise<NextWeekHandoffCommandResult> => {
      if (nextWeekApplyPromiseRef.current) return nextWeekApplyPromiseRef.current;

      const operation = (async (): Promise<NextWeekHandoffCommandResult> => {
        if (!activeGoal || !system) return { status: "failed", reason: "unavailable" };
        const latestSystem = getLatestActiveSystem() ?? system;
        const review = latestSystem.weeklyReviews.find((item) => item.weekNumber === reviewedWeekNumber);
        if (!review?.reviewCompleted) return { status: "failed", reason: "unavailable" };

        const applyResult = applyConfirmedNextWeekHandoff(latestSystem, review, {
          ...selection,
          now: Date.now(),
        });
        if (applyResult.status === "unavailable") {
          return { status: "unavailable", system: latestSystem };
        }
        if (applyResult.status === "noop") {
          toast.info("Kế hoạch tuần sau đã khớp với lựa chọn này.");
          return { status: "noop", system: latestSystem };
        }

        let savedSystem: TwelveWeekSystem;
        try {
          savedSystem = commitSystemUpdate(applyResult.system);
        } catch {
          toast.error("Review đã lưu. Thay đổi kế hoạch tuần sau chưa áp dụng được.");
          return { status: "failed", reason: "local_save_failed" };
        }

        enqueuePlanSnapshotUpdatedMutation(activeGoal.id, savedSystem, "manual_update");
        refreshSnapshotMeta();
        trackAppEvent("12_week_next_week_handoff_applied", activeGoal.id, {
          reviewedWeekNumber: String(reviewedWeekNumber),
          nextWeekNumber: String(applyResult.preview.nextWeekNumber),
          priorityChanged: String(applyResult.appliedPriority),
          workloadChanged: String(applyResult.appliedWorkload),
          optionalTasksChanged: String(applyResult.changedOptionalTaskCount),
        });

        let synced = false;
        try {
          const snapshot = await executionSyncActions.syncLocalSnapshot({ system: savedSystem });
          synced = snapshot.status === "success" && snapshot.failedCount === 0;
        } catch {
          synced = false;
        }

        if (!synced) {
          toast.info("Thay đổi tuần sau đã áp dụng trên thiết bị này. Sẽ tự đồng bộ khi tài khoản sẵn sàng.");
          return { status: "applied", system: savedSystem, syncStatus: "pending" };
        }

        if (activeGoalIdRef.current === activeGoal.id) {
          refreshBackendProgressOverlay();
          refreshSnapshotMeta();
        }
        toast.success("Đã áp dụng thay đổi cho tuần sau.");
        return { status: "applied", system: savedSystem, syncStatus: "synced" };
      })();

      nextWeekApplyPromiseRef.current = operation;
      void operation.finally(() => {
        if (nextWeekApplyPromiseRef.current === operation) nextWeekApplyPromiseRef.current = null;
      });
      return operation;
    },
    [
      activeGoal,
      activeGoalIdRef,
      commitSystemUpdate,
      executionSyncActions,
      getLatestActiveSystem,
      refreshBackendProgressOverlay,
      refreshSnapshotMeta,
      system,
    ],
  );

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
            ? [weekEnd, addDaysToDateKey(weekEnd, -1), addDaysToDateKey(weekEnd, -2)].filter((value) =>
                isCalendarDateKeyOnOrAfter(value, todayKey),
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
          isCalendarDateKeyOnOrBefore(task.scheduledDate, weekEnd);
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
    if (!activeGoal || !system || !suggestedNextWeekPlan) return;
    const suggestedWeekNumber = getTwelveWeekCurrentWeek(system);
    setWeeklyForm((previousForm) => ({
      ...previousForm,
      nextWeekPriority: suggestedNextWeekPlan.focus,
      nextWeekCommitments:
        previousForm.nextWeekCommitments.length > 0 ? previousForm.nextWeekCommitments : [suggestedNextWeekPlan.focus],
      workloadDecision: suggestedNextWeekPlan.workloadDecision,
    }));
    trackAppEvent("12_week_review_suggestion_prefilled", activeGoal.id, {
      weekNumber: String(suggestedWeekNumber),
      decision: suggestedNextWeekPlan.workloadDecision,
    });
    toast.success("Đã đưa gợi ý vào câu trả lời tuần sau.", {
      description: "Kế hoạch chưa thay đổi. Bạn sẽ xem trước và xác nhận sau khi lưu review.",
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
    handleApplyNextWeekHandoff,
    handleReentry,
    handleApplyRecommendedReentry,
    handleApplySuggestedPlan,
    handleRescheduleTaskWithinWeek,
    handleRescheduleTaskToNextWeek,
    handleSkipNonCoreTask,
  };
}
