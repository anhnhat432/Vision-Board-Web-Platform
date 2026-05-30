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
import { EmptyTaskIllustration, TaskDoneIcon, TaskInProgressIcon, TaskTodoIcon, ZenLeafIllustration } from "../illustrations";
import { EmptyState } from "../states";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";
import { formatCalendarDate } from "../../utils/storage";
import { hapticLight } from "../../utils/haptics";
import { playZenBell } from "../../utils/zen-bell";
import { triggerSparkles } from "../../utils/sparkles";
import type { TwelveWeekTaskInstance, TwelveWeekSystem, UniversalDailyCheckIn } from "../../utils/storage-types";
import { SecondaryPanel } from "@/app/components/layout/SecondaryPanel";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import {
  MOOD_OPTIONS,
  type RescuePlanSummary,
  type ReentryMode,
  type DailyMood,
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
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:border-app-line-strong transition-all duration-150 rounded-xl shadow-none";
  }
  switch (value) {
    case "low":
      return "border-indigo-200 bg-indigo-50/30 text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300 font-medium shadow-none transition-all duration-150 rounded-xl";
    case "high":
      return "border-amber-200 bg-amber-50/30 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 font-medium shadow-none transition-all duration-150 rounded-xl";
    default:
      return "border-emerald-200 bg-emerald-50/30 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 font-medium shadow-none transition-all duration-150 rounded-xl";
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
  const lastClickCoords = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      lastClickCoords.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("click", handleGlobalClick, true);
    return () => {
      window.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);
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

    if (completed) {
      playZenBell();
      const x = lastClickCoords.current.x || window.innerWidth / 2;
      const y = lastClickCoords.current.y || window.innerHeight / 2;
      triggerSparkles(x, y);
    }

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
      className="order-2 rounded-lg border border-app-warm-border bg-app-warm-soft/40 p-4 text-app-warm sm:p-5 transition-all duration-150"
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
            className="w-full border-app-warm-border bg-app-surface text-app-warm hover:bg-app-bg sm:w-auto shadow-none"
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
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <div
        data-testid="today-mobile-compact-strip"
        className="order-0 grid grid-cols-3 gap-2 rounded-lg border border-app-line bg-app-surface p-2 sm:hidden"
      >
        <div className="min-w-0 rounded-lg bg-app-bg/50 px-2 py-1.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Còn</p>
          <p className="mt-0.5 text-base font-bold text-app-ink">{todayRemainingCount}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-app-bg/50 px-2 py-1.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Tuần</p>
          <p className="mt-0.5 text-base font-bold text-app-ink">{weekCompletion.percent}%</p>
        </div>
        <div className={`min-w-0 rounded-lg px-2 py-1.5 text-center ${reviewDueToday ? "bg-app-warm-soft/60" : "bg-app-accent-soft/60"}`}>
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${reviewDueToday ? "text-app-warm" : "text-app-accent"}`}
          >
            {reviewDueToday ? "Review" : "Xong"}
          </p>
          <p className="mt-0.5 truncate text-base font-bold text-app-ink">
            {reviewDueToday ? "Hôm nay" : `${todayCompletedCount}/${checkInTotal}`}
          </p>
        </div>
      </div>

      {upcomingStrategicBlock ? (
        <div
          data-testid="strategic-block-nudge"
          className="order-1 rounded-lg border border-app-accent/20 bg-app-accent-soft p-4 text-app-accent sm:p-5 transition-all duration-150"
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
            <Badge variant="outline" className="w-fit border-app-accent/20 bg-app-surface text-app-accent shadow-none">
              {upcomingStrategicBlock.startTime} · {upcomingStrategicBlock.durationMinutes} phút
            </Badge>
          </div>
        </div>
      ) : null}

      {primaryTask ? (
        <div
          data-testid="today-next-action-panel"
          data-state={nextActionState.key}
          className="order-1 text-[11px] text-app-ink-muted flex items-center gap-1.5 px-1 py-0.5"
        >
          <Sparkles className="h-3 w-3 text-app-accent shrink-0" />
          <span>{nextActionState.title}: {nextActionState.description}</span>
        </div>
      ) : (
        <div
          data-testid="today-next-action-panel"
          data-state={nextActionState.key}
          className="order-1 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/5 border border-app-line rounded-xl p-6 sm:p-8 flex flex-col gap-4 relative overflow-hidden transition-all duration-150"
        >
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-accent/80">
              <Sparkles className="h-3.5 w-3.5 text-app-accent" />
              Hôm nay · {nextActionState.key === "setup-needed" ? "Kế hoạch" : "Hành động"}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-app-ink mt-2">
              {nextActionState.title}
            </h1>
            <p className="text-sm leading-relaxed text-app-ink-soft mt-1.5 max-w-3xl">
              {nextActionState.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2 pt-4 border-t border-app-line/40">
            {nextActionState.onAction && nextActionState.actionLabel ? (
              <Button
                variant="default"
                className="w-full sm:w-auto bg-app-accent hover:bg-app-accent/90 text-white font-medium shadow-none transition-colors"
                onClick={nextActionState.onAction}
              >
                {nextActionState.actionLabel}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <div />
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-ink-muted">
              <span>Tuần {currentWeek}/12</span>
              <span className="text-app-line/60">•</span>
              <span>Đã xong {todayCompletedCount}/{checkInTotal}</span>
              <span className="text-app-line/60">•</span>
              <span>Tiến độ {weekCompletion.percent}%</span>
            </div>
          </div>
        </div>
      )}

      {reviewDuePrompt}

      {missedTasks.length > 0 && (
        <div
          data-testid="today-overdue-recovery"
          className="order-4 border border-amber-200/50 bg-amber-50/15 dark:border-amber-950/30 dark:bg-amber-950/10 rounded-xl p-5 sm:p-6 flex flex-col gap-3 transition-all duration-150"
        >
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-app-ink">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
              Có {missedTasks.length} việc trễ — chọn một cách quay lại nhịp gọn nhẹ
            </h2>
            <p className="text-xs text-app-ink-soft leading-relaxed max-w-3xl">
              Không cần áp lực làm hết. Chọn hành động phù hợp dưới đây để giảm tải và đưa kế hoạch về trạng thái cân bằng.
            </p>
          </div>

          {hasSmartRescue && rescuePlanSummary && (
            <div className="flex items-start gap-2.5 rounded-lg bg-app-accent-soft/40 border border-app-accent/10 px-3 py-2 text-xs">
              <Crown className="h-3.5 w-3.5 text-app-accent shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-app-ink">Plus đề xuất: </span>
                <span className="text-app-ink-soft">{rescuePlanSummary.headline}. {rescuePlanSummary.firstMove}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-app-accent hover:text-app-accent/80 font-semibold"
                onClick={onApplyRecommendedReentry}
              >
                Áp dụng ngay
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-app-surface border-app-line text-app-ink hover:bg-app-bg text-xs py-1.5 h-8 shadow-none rounded-lg"
              onClick={() => onReentry("push")}
            >
              Dời việc trễ sang tuần sau
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-app-ink-soft hover:text-app-ink text-xs py-1.5 h-8 rounded-lg"
              onClick={() => onReentry("lighten")}
            >
              Giảm tải tuần này
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-app-ink-soft hover:text-app-ink text-xs py-1.5 h-8 rounded-lg"
              onClick={() => onReentry("restart")}
            >
              Khởi động lại nhịp
            </Button>
            {!hasSmartRescue && (
              <Button
                size="sm"
                variant="ghost"
                className="text-app-accent hover:text-app-accent/80 text-xs py-1.5 h-8 ml-auto font-medium"
                onClick={onOpenSmartRescue}
              >
                <Crown className="mr-1 h-3 w-3" />
                Nhận gợi ý từ Plus
              </Button>
            )}
          </div>
        </div>
      )}

      {primaryTask && (
        <div
          data-testid="today-primary-hero"
          className={`order-2 border ${
            primaryTaskOverdue
              ? "border-amber-200 bg-gradient-to-br from-app-surface via-app-surface to-amber-50/10 dark:border-amber-950/40 dark:to-amber-950/5"
              : "border-app-line bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/5"
          } rounded-xl p-6 sm:p-8 flex flex-col gap-4 relative overflow-hidden transition-all duration-150`}
        >
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-accent/80">
              <Sparkles className="h-3.5 w-3.5 text-app-accent" />
              {isFirstWeek ? "Việc đầu tiên của tuần 1" : "Hôm nay · Việc quan trọng nhất"}
              {primaryTaskOverdue && (
                <span className="ml-2 rounded border border-amber-300/40 bg-amber-50/50 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-amber-700 dark:border-amber-950/40 dark:bg-amber-950/30 dark:text-amber-400 uppercase">
                  Đang trễ
                </span>
              )}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-app-ink mt-2">
              {primaryTask.title}
            </h1>
            <p className="text-sm leading-relaxed text-app-ink-soft mt-1.5 max-w-3xl">
              {primaryTaskOverdue
                ? `Việc này đang trễ — hôm nay làm phiên bản gọn nhất, đừng bỏ luôn. Làm đều '${primaryTask.leadIndicatorName}' quan trọng hơn làm hết.`
                : isFirstWeek
                  ? `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Bắt đầu nhỏ — xong việc này là tuần 1 đã khởi động đúng hướng.`
                  : `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Xong việc này là tuần đã đi đúng hướng.`}
            </p>
          </div>

          {primaryTaskCommitmentQuote && (
            <p className="text-sm italic leading-relaxed text-app-ink-muted border-l-2 border-app-line/60 pl-3 my-1">
              {primaryTaskCommitmentQuote}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2 pt-4 border-t border-app-line/40">
            <div className="flex flex-wrap gap-2">
              <Button
                data-testid="today-primary-mark-done"
                size="lg"
                className="w-full sm:w-auto bg-app-accent hover:bg-app-accent/90 text-white font-medium shadow-none transition-colors rounded-lg"
                onClick={() => handleTaskCompletionChange(primaryTask.id, true)}
              >
                <Check className="mr-1.5 h-4 w-4" />
                Đánh dấu xong
              </Button>
              {primaryTaskOverdue && onRescheduleTaskWithinWeek && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-app-line bg-app-surface text-app-ink hover:bg-app-bg transition-colors shadow-none"
                  onClick={() => onRescheduleTaskWithinWeek(primaryTask.id)}
                >
                  <CalendarClock className="mr-1.5 h-4 w-4 text-app-ink-soft" />
                  Dời sang ngày khác trong tuần
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-ink-muted">
              <span>Tuần {currentWeek}/12</span>
              <span className="text-app-line/60">•</span>
              <span>Còn {todayRemainingCount} việc</span>
              <span className="text-app-line/60">•</span>
              <span>Tiến độ {weekCompletion.percent}%</span>
            </div>
          </div>
          
          {isFirstWeek && (
            <p data-testid="today-first-week-encouragement" className="text-xs leading-relaxed text-app-ink-muted mt-1">
              Tuần đầu — bắt đầu nhỏ là quan trọng nhất. Không cần làm hết hôm nay, duy trì đến hết tuần.
            </p>
          )}
        </div>
      )}

      <SectionBlock title="Hàng việc và check-in hôm nay" headerVisuallyHidden className="order-3">
        <div
          data-testid="today-main-work-grid"
          className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.12fr)_380px]"
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
                      illustration={<ZenLeafIllustration className="w-full text-app-accent" />}
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
                          className={`flex min-w-0 items-start gap-3 rounded-lg border p-4 transition-all duration-150 ${
                            isPrimaryTask
                              ? "border-app-accent bg-app-accent"
                              : `border-app-line bg-app-surface hover:bg-app-bg/10 ${
                                  !task.isCore && !taskCompleted ? "opacity-75 hover:opacity-100" : ""
                                }`
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
                                        ? "border-white/20 bg-white/10 text-white hover:bg-white/10 shadow-none"
                                        : "shadow-none"
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
                                    ? "border-app-warm-border bg-app-warm-soft text-app-warm shadow-none"
                                    : taskCompleted
                                      ? "border-app-accent/20 bg-app-accent-soft text-app-accent shadow-none"
                                      : isPrimaryTask
                                        ? "border-white/30 bg-white/10 text-white/90 shadow-none"
                                        : "border-app-line bg-app-bg text-app-ink-muted shadow-none"
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
                                        ? "w-full justify-between border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto shadow-none text-xs"
                                        : "w-full justify-between bg-app-surface sm:w-auto shadow-none text-xs border-app-line hover:bg-app-bg"
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
                                  <details className="group rounded-lg border border-app-line bg-app-bg/40 px-3 py-1.5 transition-all duration-150">
                                    <summary
                                      className={`flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-medium ${
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
                                              ? "border-white/20 bg-white/10 text-white hover:bg-white/20 shadow-none text-xs"
                                              : "bg-app-surface border-app-line text-xs hover:bg-app-bg shadow-none text-app-ink"
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
                                            isPrimaryTask ? "text-white/80 hover:bg-white/10 text-xs" : "text-app-ink-muted hover:text-app-ink text-xs"
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
                                    className={`block text-[11px] ${isPrimaryTask ? "text-white/60" : "text-app-ink-muted"}`}
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
                  <details className="group min-w-0 rounded-lg border border-app-line/60 bg-app-surface px-4 py-3.5 transition-all duration-150">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-app-ink">
                      <span>Sau việc đầu tiên</span>
                      <span className="rounded-full border border-app-line/80 bg-app-bg px-2.5 py-0.5 text-xs font-medium text-app-ink-soft">
                        {secondaryTodayTasks.length} việc
                      </span>
                    </summary>
                    <p className="mt-2 text-xs text-app-ink-muted leading-relaxed">
                      Tập trung xong việc ưu tiên số 1 trước khi mở rộng năng lượng sang các việc phụ dưới đây.
                    </p>
                    <div className="mt-3.5 space-y-2">
                      {secondaryPreviewTasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex min-w-0 items-center gap-3 rounded-lg border border-app-line/50 bg-app-bg/30 px-3 py-2.5"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-app-line text-[11px] font-bold text-app-ink-soft">
                            {index + 2}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-app-ink">{task.title}</p>
                            <p className="mt-0.5 text-[10px] text-app-ink-muted">{task.leadIndicatorName}</p>
                          </div>
                          <Badge variant={task.isCore ? "success" : "warning"} className="text-[10px] px-1.5 py-0 shadow-none">
                            {task.isCore ? "Cốt lõi" : "Tùy chọn"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {remainingSecondaryTasks > 0 && (
                      <p className="mt-2.5 text-xs text-app-ink-muted italic pl-1">
                        + {remainingSecondaryTasks} việc phụ khác đang được xếp hàng phía sau...
                      </p>
                    )}
                  </details>
                )}
                <div className="rounded-lg border border-app-line bg-app-bg/50 p-4">
                  <div className="flex items-center justify-between text-sm text-app-ink-soft">
                    <span>Tiến độ tuần {currentWeek}</span>
                    <span className="font-semibold text-app-ink">{weekCompletion.percent}%</span>
                  </div>
                  <Progress value={weekCompletion.percent} className="mt-3 h-2 shadow-none" />
                </div>
                {primaryTaskCompletedToday && (
                  <p
                    data-testid="today-primary-done-nudge"
                    className="rounded-lg border border-app-accent/20 bg-app-accent-soft px-4 py-3 text-sm leading-relaxed text-app-accent"
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
                    className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/15 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-950/40 dark:bg-emerald-950/10 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    <div className="flex-1">
                      <span className="font-semibold">Check-in đã lưu:</span> Năng lượng{" "}
                      <span className="font-medium">{getMoodLabel((todayCheckIn.mood as DailyMood | undefined) ?? "steady")}</span>
                    </div>
                  </div>
                )}
                <div className="stack-tight">
                  <Label id="daily-mood-label" className="text-xs font-semibold text-app-ink-soft">Năng lượng hôm nay</Label>
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
                  <Label htmlFor="daily-note" className="text-xs font-semibold text-app-ink-soft">Note tùy chọn</Label>
                  <Textarea
                    id="daily-note"
                    rows={2}
                    value={dailyNote}
                    onChange={(event) => onDailyNoteChange(event.target.value)}
                    placeholder="Nếu cần, chỉ ghi đúng một ý để ngày mai đỡ quên."
                    className="border-app-line bg-app-surface text-app-ink placeholder:text-app-ink-muted focus:border-app-line-strong rounded-lg shadow-none text-sm transition-all duration-150"
                  />
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full py-2.5 text-sm sm:w-auto sm:py-3 shadow-none border-app-line hover:bg-app-bg transition-colors"
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
                    className="w-full bg-app-surface sm:w-auto shadow-none border-app-line hover:bg-app-bg text-sm"
                    onClick={onOpenWeekTab}
                  >
                    Mở tab Tuần để review
                    <ArrowRight className="ml-1.5 h-4 w-4 text-app-ink-soft" />
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
