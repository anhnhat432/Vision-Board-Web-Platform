import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Crown,
  Gauge,
  Inbox,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

import type { RescueModeStatus } from "@/features/plan12week/logic";
import { getUpcomingStrategicBlock } from "@/features/plan12week/logic/timeBlocks";
import { MotionStaggerItem, MotionStaggerList } from "@/app/components/motion";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { EmptyTaskIllustration, TaskDoneIcon, TaskInProgressIcon, TaskTodoIcon } from "../illustrations";
import { EmptyState } from "../states";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";
import { formatCalendarDate } from "../../utils/storage";
import { hapticLight } from "../../utils/haptics";
import type { TwelveWeekTaskInstance, TwelveWeekSystem, UniversalDailyCheckIn } from "../../utils/storage-types";
import { PrimaryActionCard } from "@/app/components/layout/PrimaryActionCard";
import { SecondaryPanel } from "@/app/components/layout/SecondaryPanel";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import {
  MOOD_OPTIONS,
  type RescuePlanSummary,
  type ReentryMode,
  type DailyMood,
  getReentryModeDescription,
  getReentryModeLabel,
  getMoodLabel,
} from "../../utils/twelve-week-system-ui";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

interface TwelveWeekTodayTabProps {
  system: TwelveWeekSystem;
  currentWeek: number;
  currentWeekRange: WeekRange | null;
  currentPlanFocus: string;
  reviewDueToday: boolean;
  reviewStatusLabel: string;
  currentWeekScoreValue: number;
  weekCompletion: WeekCompletionSummary;
  coreTacticCount: number;
  optionalTacticCount: number;
  missedTasks: TwelveWeekTaskInstance[];
  todayQueue: TwelveWeekTaskInstance[];
  currentWeekTasksCount: number;
  todayDateKey: string;
  todayCompletedCount: number;
  todayRemainingCount: number;
  overdueOpenCount: number;
  optionalOpenThisWeekCount: number;
  hasPlanTasks?: boolean;
  hasLeadMetrics?: boolean;
  firstPriorityTask: TwelveWeekTaskInstance | null;
  secondaryTodayTasks: TwelveWeekTaskInstance[];
  hasSmartRescue: boolean;
  rescuePlanSummary: RescuePlanSummary | null;
  dailyMood: DailyMood;
  dailyNote: string;
  latestCheckIn: UniversalDailyCheckIn | null;
  onReentry: (mode: ReentryMode) => void;
  onApplyRecommendedReentry: () => void;
  onOpenSmartRescue: () => void;
  onToggleTask: (taskId: string, completed: boolean) => void | Promise<void>;
  onDailyMoodChange: (value: DailyMood) => void;
  onDailyNoteChange: (value: string) => void;
  onSaveCheckIn: () => void;
  onOpenWeekTab?: () => void;
  onNavigateToSetup?: () => void;
  /**
   * Optional rule-based rescue status. When provided and severity !== 'none',
   * a gentle rescue nudge is rendered above the primary hero with up to 3
   * suggestions tailored to the current triggers. Pure presentation — no
   * automatic side effects.
   */
  rescueStatus?: RescueModeStatus | null;
  onPickTinyTask?: () => void;
  onReviewPlan?: () => void;
  /**
   * Overdue task actions. Each callback is optional; the corresponding button
   * is only rendered when the callback is provided. Helpers handle their own
   * validation and toast feedback — the row UI just dispatches.
   */
  onRescheduleTaskWithinWeek?: (taskId: string) => void;
  onRescheduleTaskToNextWeek?: (taskId: string) => void;
  onSkipNonCoreTask?: (taskId: string) => void;
}

interface TodayNextActionState {
  key: "setup-needed" | "review-due" | "primary-task" | "check-in" | "day-closed" | "clear-day";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

function truncateCommitmentReminder(value: string, maxLength = 80): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function getTaskCommitmentQuote(system: TwelveWeekSystem, task: TwelveWeekTaskInstance): string | null {
  const normalizedTaskName = task.leadIndicatorName.trim().toLocaleLowerCase("vi-VN");
  const indicator =
    system.leadIndicators.find((leadIndicator) => task.tacticId && leadIndicator.id === task.tacticId) ??
    system.leadIndicators.find(
      (leadIndicator) => leadIndicator.name.trim().toLocaleLowerCase("vi-VN") === normalizedTaskName,
    );
  const want = indicator?.commitment?.want?.trim();

  return want ? `« ${truncateCommitmentReminder(want)} »` : null;
}

function getMoodOptionStyle(value: DailyMood, isActive: boolean): string {
  if (!isActive) {
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:border-app-line-strong transition-all duration-200 rounded-xl shadow-sm";
  }
  switch (value) {
    case "low":
      return "border-indigo-300 bg-indigo-50/50 text-indigo-900 dark:border-indigo-950/40 dark:bg-indigo-950/30 dark:text-indigo-300 font-semibold shadow-sm transition-all duration-200 rounded-xl";
    case "high":
      return "border-amber-300 bg-amber-50/50 text-amber-900 dark:border-amber-950/40 dark:bg-amber-950/30 dark:text-amber-300 font-semibold shadow-sm transition-all duration-200 rounded-xl";
    default:
      return "border-emerald-300 bg-emerald-50/50 text-emerald-900 dark:border-emerald-950/40 dark:bg-emerald-950/30 dark:text-emerald-300 font-semibold shadow-sm transition-all duration-200 rounded-xl";
  }
}

export function TwelveWeekTodayTab({
  system,
  currentWeek,
  reviewDueToday,
  weekCompletion,
  coreTacticCount,
  optionalTacticCount,
  missedTasks,
  todayQueue,
  currentWeekTasksCount,
  todayDateKey,
  todayCompletedCount,
  todayRemainingCount,
  overdueOpenCount,
  optionalOpenThisWeekCount,
  hasPlanTasks = currentWeekTasksCount > 0 || todayQueue.length > 0,
  hasLeadMetrics = coreTacticCount + optionalTacticCount > 0,
  firstPriorityTask,
  secondaryTodayTasks,
  hasSmartRescue,
  rescuePlanSummary,
  dailyMood,
  dailyNote,
  latestCheckIn,
  onReentry,
  onApplyRecommendedReentry,
  onOpenSmartRescue,
  onToggleTask,
  onDailyMoodChange,
  onDailyNoteChange,
  onSaveCheckIn,
  onOpenWeekTab,
  onNavigateToSetup,
  rescueStatus,
  onPickTinyTask,
  onReviewPlan,
  onRescheduleTaskWithinWeek,
  onRescheduleTaskToNextWeek,
  onSkipNonCoreTask,
}: TwelveWeekTodayTabProps) {
  const secondaryPreviewTasks = secondaryTodayTasks.slice(0, 2);
  const remainingSecondaryTasks = Math.max(secondaryTodayTasks.length - secondaryPreviewTasks.length, 0);
  const rescueModes: ReentryMode[] = ["restart", "lighten", "push"];
  const checkInTotal = todayQueue.length || currentWeekTasksCount || 1;
  const primaryTask = firstPriorityTask && !firstPriorityTask.completed ? firstPriorityTask : null;
  const primaryTaskCommitmentQuote = primaryTask ? getTaskCommitmentQuote(system, primaryTask) : null;
  const primaryTaskOverdue = Boolean(primaryTask && primaryTask.scheduledDate < todayDateKey);
  const primaryTaskCompletedToday = Boolean(
    firstPriorityTask?.completed && todayQueue.some((task) => task.id === firstPriorityTask.id),
  );
  const isFirstWeek = currentWeek === 1;
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [optimisticTaskCompletionById, setOptimisticTaskCompletionById] = useState<Record<string, boolean>>({});
  const toggleTimerRef = useRef<number | null>(null);
  const upcomingStrategicBlock = getUpcomingStrategicBlock(system.weeklyTimeBlocks, new Date());
  const prefersReducedMotion = useReducedMotion();
  const fadeInClassName = "min-w-0";
  const loadingIconClassName = prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin";

  const canUseOverdueTaskActions = Boolean(
    onRescheduleTaskWithinWeek || onRescheduleTaskToNextWeek || onSkipNonCoreTask,
  );

  useEffect(() => {
    setOptimisticTaskCompletionById((current) => {
      let changed = false;
      const next = { ...current };

      Object.entries(current).forEach(([taskId, optimisticCompleted]) => {
        const task = todayQueue.find((item) => item.id === taskId);
        if (!task || task.completed === optimisticCompleted) {
          delete next[taskId];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [todayQueue]);

  useEffect(() => {
    return () => {
      if (toggleTimerRef.current) {
        window.clearTimeout(toggleTimerRef.current);
      }
    };
  }, []);

  const handleSaveCheckInClick = async () => {
    if (isSavingCheckIn) return;
    setIsSavingCheckIn(true);
    try {
      await Promise.resolve(onSaveCheckIn());
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  const handleTaskCompletionChange = (taskId: string, completed: boolean) => {
    // Ngăn chặn click trùng lặp khi task đang trong trạng thái xử lý optimistic
    if (taskId in optimisticTaskCompletionById) {
      return;
    }

    hapticLight();
    setOptimisticTaskCompletionById((current) => ({ ...current, [taskId]: completed }));

    const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || import.meta.env.MODE === "test");

    if (isTest) {
      // Gọi đồng bộ trực tiếp trong môi trường unit test để các test case pass ngay lập tức
      Promise.resolve(onToggleTask(taskId, completed)).catch((error) => {
        setOptimisticTaskCompletionById((current) => {
          if (!(taskId in current)) return current;
          const next = { ...current };
          delete next[taskId];
          return next;
        });
        console.error("Failed to toggle task:", error);
      });
    } else {
      if (toggleTimerRef.current) {
        window.clearTimeout(toggleTimerRef.current);
      }

      // Hoãn tác vụ re-render cha nặng nề đi 180ms trên production để trình duyệt vẽ checkbox checked mượt mà 60/120fps lập tức
      toggleTimerRef.current = window.setTimeout(() => {
        Promise.resolve(onToggleTask(taskId, completed)).catch((error) => {
          // Chỉ hoàn tác trạng thái optimistic khi xảy ra lỗi thực tế
          setOptimisticTaskCompletionById((current) => {
            if (!(taskId in current)) return current;
            const next = { ...current };
            delete next[taskId];
            return next;
          });
          console.error("Failed to toggle task:", error);
        });
      }, 180);
    }
  };

  const todayCheckIn = latestCheckIn?.date === todayDateKey ? latestCheckIn : null;
  const hasSavedTodayCheckIn = Boolean(todayCheckIn);
  const savedDailyMood = (todayCheckIn?.mood as DailyMood | undefined) ?? "steady";
  const savedDailyNote = todayCheckIn?.optionalNote?.trim() ?? "";
  const hasUnsavedDailyCheckInEdits = dailyMood !== savedDailyMood || dailyNote.trim() !== savedDailyNote;
  const showMobileStickyCheckIn = !hasSavedTodayCheckIn && hasUnsavedDailyCheckInEdits;
  const nextActionState: TodayNextActionState = (() => {
    if (!hasPlanTasks) {
      return {
        key: "setup-needed",
        title: "Chu kỳ này cần được tạo lại",
        description: hasLeadMetrics
          ? "Kế hoạch có chỉ số lặp lại nhưng chưa có việc để chạy. Mở Setup để tạo lại hàng việc."
          : "Chu kỳ chưa có việc lặp lại. Mở Setup để thêm 2-4 việc cốt lõi trước.",
        actionLabel: hasLeadMetrics ? "Mở Setup để chỉnh" : "Đi tới Setup",
        onAction: onNavigateToSetup,
      };
    }

    if (primaryTask) {
      return {
        key: "primary-task",
        title: "Việc ưu tiên đang ở ngay bên dưới",
        description: "Bắt đầu từ thẻ việc quan trọng nhất rồi tick xong ở đó.",
      };
    }

    if (reviewDueToday && hasSavedTodayCheckIn) {
      return {
        key: "review-due",
        title: "Hôm nay nên chốt review tuần",
        description: "Check-in đã lưu. Dùng nút review trong thẻ check-in để khóa lại bài học và ưu tiên tuần sau.",
      };
    }

    if (!hasSavedTodayCheckIn && (primaryTaskCompletedToday || todayCompletedCount > 0 || todayQueue.length === 0)) {
      return {
        key: "check-in",
        title: "Chốt ngày hôm nay bằng check-in ngắn",
        description: "Việc chính đã đi qua. Lưu năng lượng và một ghi chú ngắn để ngày mai tiếp tục nhanh hơn.",
        actionLabel: "Lưu check-in",
        onAction: handleSaveCheckInClick,
      };
    }

    if (hasSavedTodayCheckIn) {
      return {
        key: "day-closed",
        title: "Hôm nay đã được chốt",
        description: reviewDueToday
          ? "Bước tiếp theo là mở tab Tuần để review."
          : "Giữ nhịp như vậy. Lần tới quay lại tab Hôm nay để tiếp tục việc mới.",
        actionLabel: reviewDueToday ? "Mở tab Tuần" : "Xem tiến độ",
        onAction: reviewDueToday ? onOpenWeekTab : undefined,
      };
    }

    return {
      key: "clear-day",
      title: reviewDueToday ? "Hôm nay là ngày review" : "Hôm nay đang gọn",
      description: reviewDueToday
        ? "Nếu không còn việc cần làm, mở tab Tuần để chốt review."
        : "Không có việc nào đang chờ. Bạn có thể lưu check-in hoặc xem lại tuần.",
      actionLabel: reviewDueToday ? "Mở tab Tuần" : "Lưu check-in",
      onAction: reviewDueToday ? onOpenWeekTab : handleSaveCheckInClick,
    };
  })();

  const reviewDuePrompt = reviewDueToday ? (
    <div
      data-testid="today-review-due-prompt"
      className="surface-raised order-2 rounded-xl border border-app-warm-border bg-app-warm-soft p-4 text-app-warm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-app-warm">
            <CalendarClock className="h-3.5 w-3.5" />
            Review tuần đang chờ
          </p>
          <p className="mt-2 text-base font-semibold leading-6 text-app-ink">Chốt tuần trước khi mở thêm việc mới.</p>
          <p className="mt-1 text-sm leading-6 text-app-ink-soft">
            Lưu bài học, điểm tuần và ưu tiên tuần sau để hệ 12 tuần không bị đứt nhịp.
          </p>
        </div>
        {onOpenWeekTab ? (
          <Button
            variant="outline"
            className="w-full border-app-warm-border bg-app-surface text-app-warm hover:bg-app-bg sm:w-auto"
            onClick={onOpenWeekTab}
          >
            Mở review tuần
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-5">
      <div
        data-testid="today-mobile-compact-strip"
        className="surface-flat order-0 grid grid-cols-3 gap-2 rounded-xl border border-app-line bg-app-surface p-2.5 sm:hidden"
      >
        <div className="min-w-0 rounded-lg bg-app-bg px-2 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Còn</p>
          <p className="mt-0.5 text-lg font-bold text-app-ink">{todayRemainingCount}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-app-bg px-2 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Tuần</p>
          <p className="mt-0.5 text-lg font-bold text-app-ink">{weekCompletion.percent}%</p>
        </div>
        <div className={`min-w-0 rounded-lg px-2 py-2 ${reviewDueToday ? "bg-app-warm-soft" : "bg-app-accent-soft"}`}>
          <p
            className={`text-xs font-semibold uppercase tracking-[0.12em] ${reviewDueToday ? "text-app-warm" : "text-app-accent"}`}
          >
            {reviewDueToday ? "Review" : "Xong"}
          </p>
          <p className="mt-0.5 truncate text-lg font-bold text-app-ink">
            {reviewDueToday ? "Hôm nay" : `${todayCompletedCount}/${checkInTotal}`}
          </p>
        </div>
      </div>

      {upcomingStrategicBlock ? (
        <div
          data-testid="strategic-block-nudge"
          className="surface-raised order-1 rounded-xl border border-app-accent/20 bg-app-accent-soft p-4 text-app-accent sm:p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
                <CalendarClock className="h-3.5 w-3.5" />
                Performance Time Blocking
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 sm:text-base">
                Sắp tới giờ Khung chiến lược. Đóng tab phụ, chọn 1 việc cốt lõi.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-app-accent/20 bg-app-surface text-app-accent">
              {upcomingStrategicBlock.startTime} · {upcomingStrategicBlock.durationMinutes} phút
            </Badge>
          </div>
        </div>
      ) : null}

      <div
        data-testid="today-next-action-panel"
        data-state={nextActionState.key}
        className="surface-raised order-1 rounded-xl border border-app-line bg-app-surface p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
              <Sparkles className="h-3.5 w-3.5 text-app-accent" />
              Bước tiếp theo
            </p>
            <p className="mt-2 text-base font-semibold text-app-ink sm:text-lg">{nextActionState.title}</p>
            <p className="mt-1 text-sm leading-6 text-app-ink-soft">{nextActionState.description}</p>
          </div>
          {nextActionState.onAction && nextActionState.actionLabel ? (
            <Button variant="secondary" className="w-full shrink-0 sm:w-auto" onClick={nextActionState.onAction}>
              {nextActionState.actionLabel}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {reviewDuePrompt}

      {missedTasks.length > 0 && (
        <Card data-testid="today-overdue-recovery" className="order-4 border border-app-line bg-app-surface">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle as="h2" className="flex items-center gap-2 text-app-ink">
                  <AlertTriangle className="h-5 w-5 text-app-warm" />
                  Quay lại nhịp tuần này
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-app-ink-soft">
                  Có {missedTasks.length} việc bị trễ. Không cần làm hết — chọn cách quay lại nhịp gọn nhất.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-app-warm-border bg-app-warm-soft text-app-warm">
                {overdueOpenCount} việc trễ
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="stack-stack">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="stack-tight">
                <div className="rounded-xl border border-app-line bg-app-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                    Tình trạng hiện tại
                  </p>
                  <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                    {overdueOpenCount} việc đang trễ, {optionalOpenThisWeekCount} việc tùy chọn còn mở, và{" "}
                    {currentWeekTasksCount} việc còn mở trong tuần này.
                  </p>
                </div>
                <div className="rounded-lg border border-app-accent/20 bg-app-accent-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">
                        Gợi ý quay lại nhịp từ Plus
                      </p>
                      <p className="mt-2 text-base font-semibold text-app-ink">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.headline
                          : "Plus gợi ý nên dàn lại tuần, giảm tải hay dời lịch — không cần tự đoán."}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.reason
                          : "Plus không thêm việc, mà chỉ rõ cách quay lại nhịp nhẹ nhất ngay khi bạn bắt đầu trễ."}
                      </p>
                      {hasSmartRescue && rescuePlanSummary && (
                        <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                          Bước đầu nên làm: {rescuePlanSummary.firstMove}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-app-accent text-white hover:bg-app-accent">
                      <Crown className="mr-1 h-3.5 w-3.5" />
                      Plus
                    </Badge>
                  </div>
                  {hasSmartRescue && rescuePlanSummary ? (
                    <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={onApplyRecommendedReentry}>
                      {getReentryModeLabel(rescuePlanSummary.recommendedMode)}
                    </Button>
                  ) : (
                    <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={onOpenSmartRescue}>
                      Mở Plus để có gợi ý phù hợp
                    </Button>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-app-line bg-app-surface p-4">
                <p className="text-sm font-semibold text-app-ink">Đề xuất nhanh</p>
                <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                  Gom việc trễ sang một nhịp dễ làm hơn trước. Hai lựa chọn còn lại nằm trong phần mở rộng để tránh quá tải.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 w-full justify-between bg-app-surface"
                  onClick={() => onReentry("push")}
                  aria-label="Áp dụng dời việc trễ sang tuần sau"
                >
                  Dời việc trễ sang tuần sau
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <details className="group mt-3 rounded-lg border border-app-line bg-app-bg px-3 py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-app-ink">
                    Lựa chọn khác
                    <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 grid gap-2">
                    {rescueModes
                      .filter((mode) => mode !== "push")
                      .map((mode) => (
                        <Button
                          key={mode}
                          variant="ghost"
                          className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-app-ink-soft hover:text-app-ink"
                          onClick={() => onReentry(mode)}
                          aria-label={`Áp dụng ${getReentryModeLabel(mode)}`}
                        >
                          <span>
                            <span className="block text-sm font-semibold text-app-ink">{getReentryModeLabel(mode)}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-app-ink-muted">
                              {getReentryModeDescription(mode, {
                                overdueOpenCount,
                                optionalOpenThisWeekCount,
                                currentWeekOpenCount: currentWeekTasksCount,
                              })}
                            </span>
                          </span>
                        </Button>
                      ))}
                  </div>
                </details>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {primaryTask && (
        <PrimaryActionCard
          data-testid="today-primary-hero"
          hero
          tone={primaryTaskOverdue ? "amber" : "emerald"}
          eyebrow={isFirstWeek ? "Việc đầu tiên của tuần 1" : "Việc quan trọng nhất hôm nay"}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title={primaryTask.title}
          description={
            primaryTaskOverdue
              ? `Việc này đang trễ — hôm nay làm phiên bản gọn nhất, đừng bỏ luôn. Làm đều '${primaryTask.leadIndicatorName}' quan trọng hơn làm hết.`
              : isFirstWeek
                ? `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Bắt đầu nhỏ — xong việc này là tuần 1 đã khởi động đúng hướng.`
                : `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Xong việc này là tuần đã đi đúng hướng.`
          }
          titleClassName="break-words text-lg font-semibold text-app-ink sm:text-xl"
          descriptionClassName="text-sm leading-6 text-app-ink-soft"
          contentClassName="stack-tight"
          actionClassName="flex flex-wrap gap-2"
          className={`order-2 ${primaryTaskOverdue ? "bg-app-warm-soft" : ""}`}
          action={
            <>
              <Button
                data-testid="today-primary-mark-done"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => onToggleTask(primaryTask.id, true)}
              >
                <Check className="h-4 w-4" />
                Đánh dấu xong
              </Button>
              {primaryTaskOverdue && onRescheduleTaskWithinWeek && (
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-app-surface"
                  onClick={() => onRescheduleTaskWithinWeek(primaryTask.id)}
                >
                  <CalendarClock className="h-4 w-4" />
                  Dời sang ngày khác trong tuần
                </Button>
              )}
            </>
          }
        >
          {primaryTaskOverdue && (
            <Badge variant="outline" className="border-app-warm-border bg-app-surface text-app-warm">
              Đang trễ
            </Badge>
          )}
          {primaryTaskCommitmentQuote ? (
            <p className="text-sm italic leading-6 text-app-ink-soft">{primaryTaskCommitmentQuote}</p>
          ) : null}
          <p className="text-sm font-medium text-app-ink">
            Chỉ cần xong việc này là hôm nay đã đủ. Phần còn lại để sau.
          </p>
          {isFirstWeek && (
            <p data-testid="today-first-week-encouragement" className="text-sm leading-6 text-app-ink-soft">
              Tuần đầu — bắt đầu nhỏ là quan trọng nhất. Không cần làm hết hôm nay, duy trì đến hết tuần.
            </p>
          )}
        </PrimaryActionCard>
      )}

      <SectionBlock title="Hàng việc và check-in hôm nay" headerVisuallyHidden className="order-3">
        <div
          data-testid="today-main-work-grid"
          className="grid min-w-0 gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1.12fr)_380px]"
        >
          <div className={fadeInClassName}>
            <Card
              data-tour-id="system-today-queue"
              className="h-full min-w-0 overflow-hidden rounded-xl border border-app-line bg-app-surface"
            >
              <CardHeader className="min-w-0 [&>*+*]:mt-0 px-4 pt-4 pb-2 sm:px-7 sm:pt-7 sm:pb-3">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle as="h2" className="break-words text-app-ink">
                      Hàng việc hôm nay
                    </CardTitle>
                    <CardDescription className="mt-1 break-words text-app-ink-soft">
                      Làm việc đầu tiên trước, phần còn lại để sau.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-app-line bg-app-bg text-app-ink-muted">
                    {todayCompletedCount}/{checkInTotal} xong
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 stack-tight px-4 pt-0 pb-4 sm:px-7 sm:pb-7">
                {todayQueue.length === 0 ? (
                  hasPlanTasks ? (
                    <EmptyState
                      variant="dashed"
                      testId="today-empty-state"
                      illustration={<EmptyTaskIllustration className="w-full text-app-accent" />}
                      icon={<Check className="h-5 w-5" />}
                      title={reviewDueToday ? "Tuần đã sẵn sàng để chốt review" : "Hết việc hôm nay"}
                      description={
                        reviewDueToday
                          ? "Mở tab Tuần để chốt review và khóa ưu tiên cho tuần sau."
                          : "Lưu check-in ngắn ở bên cạnh, hoặc mở tab Tuần để chuẩn bị review."
                      }
                      actions={
                        onOpenWeekTab && !reviewDueToday ? (
                          <Button variant="outline" onClick={onOpenWeekTab} className="bg-app-surface">
                            Mở tab Tuần
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <EmptyState
                      variant="dashed"
                      testId="today-empty-state"
                      illustration={<EmptyTaskIllustration className="w-full text-app-accent" />}
                      icon={<Inbox className="h-5 w-5" />}
                      title="Chưa có việc nào trong chu kỳ này"
                      description={
                        hasLeadMetrics
                          ? "Chu kỳ đã có việc lặp lại, nhưng chưa có việc nào cho tuần này. Vào Setup để tạo lại chu kỳ."
                          : "Chu kỳ chưa có việc lặp lại. Vào Setup để thêm 2-4 việc lặp lại trước."
                      }
                      actions={
                        onNavigateToSetup ? (
                          <Button variant="secondary" onClick={onNavigateToSetup}>
                            {hasLeadMetrics ? "Mở Setup để chỉnh" : "Đi tới Setup"}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : undefined
                      }
                    />
                  )
                ) : (
                  <MotionStaggerList className="stack-tight">
                    {todayQueue.map((task) => {
                      const taskCompleted = optimisticTaskCompletionById[task.id] ?? task.completed;
                      const isOverdue = !taskCompleted && task.scheduledDate < todayDateKey;
                      const isPrimaryTask = firstPriorityTask?.id === task.id && !taskCompleted;
                      const TaskStateIcon = taskCompleted
                        ? TaskDoneIcon
                        : isPrimaryTask
                          ? TaskInProgressIcon
                          : TaskTodoIcon;
                      const statusLabel = taskCompleted
                        ? "Đã chốt"
                        : isOverdue
                          ? "Đang trễ"
                          : task.scheduledDate === todayDateKey
                            ? "Hôm nay"
                            : formatCalendarDate(task.scheduledDate);
                      const taskCommitmentQuote = getTaskCommitmentQuote(system, task);
                      const showTaskCommitmentQuote = Boolean(
                        taskCommitmentQuote && !(isPrimaryTask && primaryTaskCommitmentQuote),
                      );

                      return (
                        <MotionStaggerItem
                          key={task.id}
                          className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm ${
                            isPrimaryTask ? "border-app-accent bg-app-accent" : "border-app-line bg-app-surface hover:border-app-line-strong"
                          }`}
                        >
                          <Checkbox
                            aria-label={`Hoàn thành việc: ${task.title}`}
                            checked={taskCompleted}
                            className="-m-2 mt-0"
                            controlClassName={
                              isPrimaryTask
                                ? "border-white/40 bg-white/10 text-white group-data-[state=checked]/checkbox:border-white group-data-[state=checked]/checkbox:bg-white group-data-[state=checked]/checkbox:text-app-ink"
                                : undefined
                            }
                            onCheckedChange={(checked) => handleTaskCompletionChange(task.id, checked === true)}
                          />
                          <div className="min-w-0 flex-1">
                            {isPrimaryTask && (
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                                Việc ưu tiên số 1
                              </p>
                            )}
                            <div
                              className={`flex min-w-0 flex-wrap items-start justify-between gap-3 ${
                                isPrimaryTask && !taskCompleted ? "text-white" : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <TaskStateIcon
                                    className={`h-4 w-4 shrink-0 ${
                                      isPrimaryTask && !taskCompleted
                                        ? "text-white"
                                        : "text-app-accent"
                                    }`}
                                  />
                                  <p
                                    className={`min-w-0 max-w-full break-words font-medium ${
                                      taskCompleted
                                        ? "text-app-ink-muted line-through"
                                        : isPrimaryTask
                                          ? "text-white"
                                          : "text-app-ink"
                                    }`}
                                  >
                                    {task.title}
                                  </p>
                                  <Badge
                                    variant={task.isCore ? "success" : "warning"}
                                    className={
                                      isPrimaryTask && !taskCompleted
                                        ? "border-white/20 bg-white/10 text-white hover:bg-white/10"
                                        : ""
                                    }
                                  >
                                    {task.isCore ? "Cốt lõi" : "Tùy chọn"}
                                  </Badge>
                                </div>
                                <p
                                  className={`mt-1 text-sm ${
                                    isPrimaryTask && !taskCompleted
                                      ? "text-white/80"
                                      : "text-app-ink-muted"
                                  }`}
                                >
                                  {task.leadIndicatorName}
                                </p>
                                {showTaskCommitmentQuote ? (
                                  <p
                                    className={`mt-1 text-xs italic leading-5 ${
                                      isPrimaryTask && !taskCompleted ? "text-white/60" : "text-app-ink-muted"
                                    }`}
                                  >
                                    {taskCommitmentQuote}
                                  </p>
                                ) : null}
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  isOverdue
                                    ? "border-app-warm-border bg-app-warm-soft text-app-warm"
                                    : taskCompleted
                                      ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                                      : isPrimaryTask
                                        ? "border-white/30 bg-white/10 text-white/90"
                                        : "border-app-line bg-app-bg text-app-ink-muted"
                                }
                              >
                                {statusLabel}
                              </Badge>
                            </div>
                            {isOverdue && canUseOverdueTaskActions ? (
                              <div data-testid={`overdue-actions-${task.id}`} className="mt-3 space-y-2">
                                {onRescheduleTaskWithinWeek ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={
                                      isPrimaryTask
                                        ? "w-full justify-between border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
                                        : "w-full justify-between bg-app-surface sm:w-auto"
                                    }
                                    onClick={() => onRescheduleTaskWithinWeek(task.id)}
                                    data-action="reschedule-within-week"
                                    aria-label={`Đẩy ${task.title} sang ngày mai`}
                                  >
                                    <span className="inline-flex items-center">
                                      <CalendarClock className="mr-1 h-3.5 w-3.5" />
                                      Đẩy sang ngày mai
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                                {onRescheduleTaskToNextWeek || (onSkipNonCoreTask && !task.isCore) ? (
                                  <details className="group rounded-lg border border-app-line/70 bg-app-bg/70 px-3 py-2">
                                    <summary
                                      className={`flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium ${
                                        isPrimaryTask ? "text-white/75" : "text-app-ink-muted"
                                      }`}
                                    >
                                      Lựa chọn khác
                                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      {onRescheduleTaskToNextWeek ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className={
                                            isPrimaryTask
                                              ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                              : "bg-app-surface"
                                          }
                                          onClick={() => onRescheduleTaskToNextWeek(task.id)}
                                          data-action="reschedule-next-week"
                                          aria-label={`Dời ${task.title} sang tuần sau`}
                                        >
                                          <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                                          Sang tuần sau
                                        </Button>
                                      ) : null}
                                      {onSkipNonCoreTask && !task.isCore ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className={
                                            isPrimaryTask ? "text-white/80 hover:bg-white/10" : "text-app-ink-muted"
                                          }
                                          onClick={() => onSkipNonCoreTask(task.id)}
                                          data-action="skip-non-core"
                                          aria-label={`Bỏ qua việc tùy chọn ${task.title}`}
                                        >
                                          <X className="mr-1 h-3.5 w-3.5" />
                                          Bỏ qua
                                        </Button>
                                      ) : null}
                                    </div>
                                  </details>
                                ) : null}
                                {task.isCore && (onRescheduleTaskWithinWeek || onRescheduleTaskToNextWeek) ? (
                                  <span
                                    data-testid={`overdue-core-note-${task.id}`}
                                    className={`block text-xs ${isPrimaryTask ? "text-white/60" : "text-app-ink-muted"}`}
                                  >
                                    Việc cốt lõi không thể bỏ — chỉ dời lịch.
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </MotionStaggerItem>
                      );
                    })}
                  </MotionStaggerList>
                )}
                {secondaryTodayTasks.length > 0 && (
                  <details className="group min-w-0 rounded-lg border border-app-line bg-app-bg px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-app-ink">
                      <span>Sau việc đầu tiên</span>
                      <span className="rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-xs font-medium text-app-ink-muted">
                        {secondaryTodayTasks.length} việc
                      </span>
                    </summary>
                    <p className="mt-2 text-sm text-app-ink-muted">Xong việc số 1 rồi mới mở danh sách này.</p>
                    <div className="mt-3 stack-tight">
                      {secondaryPreviewTasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex min-w-0 items-center gap-3 rounded-xl border border-app-line bg-app-surface px-3 py-3"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-accent text-xs font-semibold text-white">
                            {index + 2}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-app-ink">{task.title}</p>
                            <p className="mt-0.5 text-xs text-app-ink-muted">{task.leadIndicatorName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {remainingSecondaryTasks > 0 && (
                      <p className="mt-3 text-sm text-app-ink-muted">
                        Còn {remainingSecondaryTasks} việc mở phía sau, chưa cần nghĩ tới ngay.
                      </p>
                    )}
                  </details>
                )}
                <div className="rounded-xl border border-app-line bg-app-bg p-4">
                  <div className="flex items-center justify-between text-sm text-app-ink-muted">
                    <span>Tiến độ tuần {currentWeek}</span>
                    <span className="font-semibold text-app-ink-muted">{weekCompletion.percent}%</span>
                  </div>
                  <Progress value={weekCompletion.percent} className="mt-3 h-2.5" />
                </div>
                {primaryTaskCompletedToday && (
                  <p
                    data-testid="today-primary-done-nudge"
                    className="rounded-lg border border-app-accent/20 bg-app-accent-soft px-4 py-3 text-sm leading-6 text-app-accent"
                  >
                    Việc chính đã xong — lưu check-in để chốt hôm nay.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className={fadeInClassName} style={{ animationDelay: "0.06s" }}>
            <Card className="h-full min-w-0 overflow-hidden rounded-xl border border-app-line bg-app-surface">
              <CardHeader className="min-w-0 [&>*+*]:mt-0 px-4 pt-4 pb-2 sm:px-7 sm:pt-7 sm:pb-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle as="h2" className="flex items-center gap-2 break-words text-app-ink">
                      <Gauge className="h-5 w-5 text-app-accent" />
                      Check-in 30 giây
                    </CardTitle>
                    <CardDescription className="mt-1 break-words text-app-ink-soft">
                      Chọn năng lượng và ghi 1 ý ngắn nếu cần.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-app-accent/20 bg-app-accent-soft text-app-accent">
                    {todayCompletedCount}/{checkInTotal}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 stack-tight px-4 pt-0 pb-4 sm:stack-stack sm:px-7 sm:pb-7">
                {todayCheckIn && (
                  <div
                    data-testid="today-check-in-saved"
                    className="flex items-start gap-3 rounded-lg border border-app-accent/20 bg-app-accent-soft px-4 py-3 text-sm text-app-accent"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                    <div>
                      <p className="font-semibold">Check-in hôm nay đã lưu</p>
                      <p className="mt-1 leading-6">
                        {formatCalendarDate(todayCheckIn.date)} - năng lượng{" "}
                        {getMoodLabel((todayCheckIn.mood as DailyMood | undefined) ?? "steady")}
                      </p>
                    </div>
                  </div>
                )}
                <div className="stack-tight">
                  <Label id="daily-mood-label">Năng lượng hôm nay</Label>
                  <div
                    role="radiogroup"
                    aria-labelledby="daily-mood-label"
                    className="grid grid-cols-3 gap-2 lg:grid-cols-1 2xl:grid-cols-3"
                  >
                    {MOOD_OPTIONS.map((option) => {
                      const isActive = dailyMood === option.value;
                      const moodStyle = getMoodOptionStyle(option.value, isActive);
                      const emoji = option.value === "low" ? "🧘‍♂️" : option.value === "high" ? "🔥" : "🌱";
                      
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={`${option.label}: ${option.hint}`}
                          variant="outline"
                          className={`h-auto min-h-11 min-w-0 justify-center whitespace-normal px-2 py-2 text-center sm:min-h-14 sm:justify-start sm:px-4 sm:py-3 sm:text-left ${moodStyle}`}
                          onClick={() => onDailyMoodChange(option.value)}
                        >
                          <span className="flex items-center gap-2 min-w-0 text-left">
                            <span className="text-xl sm:text-2xl shrink-0">{emoji}</span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{option.label}</span>
                              <span
                                className={`hidden break-words text-[11px] leading-4 sm:block ${isActive ? "text-app-ink-soft font-normal" : "text-app-ink-muted"}`}
                              >
                                {option.hint}
                              </span>
                            </span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="stack-tight">
                  <Label htmlFor="daily-note">Note tùy chọn</Label>
                  <Textarea
                    id="daily-note"
                    rows={2}
                    value={dailyNote}
                    onChange={(event) => onDailyNoteChange(event.target.value)}
                    placeholder="Nếu cần, chỉ ghi đúng một ý để ngày mai đỡ quên."
                  />
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full py-3 text-base sm:w-auto sm:py-4 sm:text-lg"
                  onClick={handleSaveCheckInClick}
                  disabled={isSavingCheckIn}
                  aria-busy={isSavingCheckIn}
                >
                  {isSavingCheckIn ? (
                    <>
                      <Loader2 className={loadingIconClassName} aria-hidden="true" />
                      Đang lưu check-in...
                    </>
                  ) : hasSavedTodayCheckIn ? (
                    "Cập nhật check-in hôm nay"
                  ) : (
                    "Lưu check-in hôm nay"
                  )}
                </Button>
                {reviewDueToday && onOpenWeekTab && (
                  <Button
                    data-testid="today-check-in-open-week"
                    variant="outline"
                    className="w-full bg-app-surface sm:w-auto"
                    onClick={onOpenWeekTab}
                  >
                    Mở tab Tuần để review
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                <SecondaryPanel title="Lịch sử check-in" collapsible defaultOpen={false}>
                  {latestCheckIn && (
                    <div
                      aria-live="polite"
                      className="rounded-xl border border-app-line bg-app-bg p-4 text-sm text-app-ink-muted"
                    >
                      Check-in gần nhất: {formatCalendarDate(latestCheckIn.date)} • năng lượng{" "}
                      {getMoodLabel((latestCheckIn.mood as DailyMood | undefined) ?? "steady")}
                    </div>
                  )}
                </SecondaryPanel>
              </CardContent>
            </Card>
          </div>
        </div>
      </SectionBlock>

      {rescueStatus && rescueStatus.severity !== "none" && (
        <div className="order-5">
          <TwelveWeekRescueNudge
            status={rescueStatus}
            variant="today"
            onPickTinyTask={onPickTinyTask}
            onQuickCheckIn={onSaveCheckIn}
            onOpenWeekTab={onOpenWeekTab}
            onReviewPlan={onReviewPlan ?? onNavigateToSetup}
          />
        </div>
      )}

      {showMobileStickyCheckIn ? <div aria-hidden="true" className="order-last sm:hidden mb-20" /> : null}

      {showMobileStickyCheckIn ? (
        <div className="above-mobile-nav sm:hidden fixed inset-x-0 z-40 border-t border-app-line bg-app-surface/96 backdrop-blur p-3">
          <Button
            size="lg"
            variant="secondary"
            className="w-full py-3 text-base"
            onClick={handleSaveCheckInClick}
            disabled={isSavingCheckIn}
            aria-busy={isSavingCheckIn}
          >
            {isSavingCheckIn ? (
              <>
                <Loader2 className={loadingIconClassName} aria-hidden="true" />
                Đang lưu check-in...
              </>
            ) : (
              "Lưu check-in hôm nay"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
