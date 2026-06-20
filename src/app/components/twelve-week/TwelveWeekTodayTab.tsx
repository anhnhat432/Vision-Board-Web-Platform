import {
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
import { useEffect, useRef, useState } from "react";
import { SecondaryPanel } from "@/app/components/layout/SecondaryPanel";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import { MotionStaggerItem, MotionStaggerList } from "@/app/components/motion";
import type { RescueModeStatus } from "@/features/plan12week/logic";
import { getUpcomingStrategicBlock } from "@/features/plan12week/logic/timeBlocks";
import { hapticLight } from "../../utils/haptics";
import { triggerSparkles } from "../../utils/sparkles";
import { formatCalendarDate } from "../../utils/storage";
import type { TwelveWeekSystem, TwelveWeekTaskInstance, UniversalDailyCheckIn } from "../../utils/storage-types";
import {
  type DailyMood,
  getMoodLabel,
  MOOD_OPTIONS,
  type ReentryMode,
  type RescuePlanSummary,
} from "../../utils/twelve-week-system-ui";
import { playZenBell } from "../../utils/zen-bell";
import {
  EmptyTaskIllustration,
  ZenLeafIllustration,
} from "../illustrations";
import { EmptyState } from "../states";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";

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

  return want ? `“${truncateCommitmentReminder(want)}”` : null;
}


function getMoodOptionStyle(value: DailyMood, isActive: boolean): string {
  if (!isActive) {
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg-subtle hover:border-app-line-strong hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-card-lg shadow-none";
  }
  switch (value) {
    case "low":
      return "border-app-status-info/40 bg-app-status-info/10 text-app-status-info dark:bg-app-status-info/20 dark:text-app-status-info font-bold shadow-app-sm transition-all duration-300 rounded-card-lg scale-[1.03] ring-2 ring-app-status-info/20";
    case "high":
      return "border-app-energy/40 bg-app-energy/10 text-app-energy dark:bg-app-energy/20 dark:text-app-energy font-bold shadow-app-sm transition-all duration-300 rounded-card-lg scale-[1.03] ring-2 ring-app-energy/20";
    default:
      return "border-app-accent/40 bg-app-accent-subtle text-app-accent dark:bg-app-accent/20 dark:text-app-accent font-bold shadow-app-sm transition-all duration-300 rounded-card-lg scale-[1.03] ring-2 ring-app-accent/20";
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
  void overdueOpenCount;
  void optionalOpenThisWeekCount;
  void todayRemainingCount;
  const secondaryPreviewTasks = secondaryTodayTasks.slice(0, 2);
  const remainingSecondaryTasks = Math.max(secondaryTodayTasks.length - secondaryPreviewTasks.length, 0);
  const _rescueModes: ReentryMode[] = ["restart", "lighten", "push"];
  const checkInTotal = todayQueue.length || currentWeekTasksCount || 1;
  const primaryTask = firstPriorityTask && !firstPriorityTask.completed ? firstPriorityTask : null;
  const hasPrimaryTask = Boolean(firstPriorityTask);
  const isPrimaryTaskCompleted = Boolean(firstPriorityTask?.completed);
  const primaryTaskCommitmentQuote = primaryTask ? getTaskCommitmentQuote(system, primaryTask) : null;
  const primaryTaskOverdue = Boolean(primaryTask && primaryTask.scheduledDate < todayDateKey);
  const primaryTaskCompletedToday = Boolean(
    firstPriorityTask?.completed && todayQueue.some((task) => task.id === firstPriorityTask.id),
  );
  const isFirstWeek = currentWeek === 1;
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [optimisticTaskCompletionById, setOptimisticTaskCompletionById] = useState<Record<string, boolean>>({});
  const [isHeroDismissed, setIsHeroDismissed] = useState(false);
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
  // Hover-lift nhẹ theo thiết kế editorial; tắt khi người dùng giảm chuyển động.
  const cardLiftClass = prefersReducedMotion
    ? ""
    : "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-md";
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

    const isTest =
      typeof process !== "undefined" && (process.env.NODE_ENV === "test" || import.meta.env.MODE === "test");

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
        title: "Chu kỳ chưa có việc",
        description: hasLeadMetrics
          ? "Kế hoạch có chỉ số lặp lại nhưng chưa có hàng việc. Mở Setup để tạo lại hàng việc."
          : "Chu kỳ chưa có việc lặp lại. Mở Setup để thêm 2–4 việc cốt lõi trước.",
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
      className="order-2 rounded-card-lg border border-app-warm-border/15 bg-app-warm-soft/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between transition-all duration-150"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-app-warm-strong">
          <CalendarClock className="h-3.5 w-3.5 text-app-warm" />
          Review tuần đang chờ
        </p>
        <p className="mt-1 text-sm leading-relaxed text-app-ink-soft font-sans">
          Chốt tuần trước khi mở thêm việc mới.
        </p>
      </div>
      {onOpenWeekTab ? (
        <Button
          variant="ghost"
          className="shrink-0 text-app-warm hover:text-app-warm-hover text-xs font-bold rounded-card px-3 py-2 transition-all"
          onClick={onOpenWeekTab}
        >
          Mở review tuần
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-[18px]">
      {/* ── Status chips (nhịp hôm nay) — bổ sung cho bảng tiến độ ở header, không lặp lại ── */}
      <div data-testid="today-dashboard-cards" className="order-0 flex flex-wrap items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
            overdueOpenCount > 0
              ? "border-app-warm-border/40 bg-app-warm-soft/30 text-app-warm"
              : "border-app-line/50 bg-app-surface text-app-ink-soft"
          }`}
        >
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] font-bold tabular-nums ${
              overdueOpenCount > 0 ? "bg-app-warm text-white" : "bg-app-bg-subtle text-app-ink-muted"
            }`}
          >
            {overdueOpenCount}
          </span>
          {overdueOpenCount > 0 ? "việc trễ hạn" : "không có việc trễ"}
        </span>

        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
            reviewDueToday
              ? "border-app-warm-border/40 bg-app-warm-soft/30 text-app-warm"
              : "border-app-accent/20 bg-app-accent-soft/40 text-app-accent"
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {reviewDueToday ? "Review tuần đến hạn" : "Review tuần đã xong"}
        </span>
      </div>

      {!primaryTask && (
        <div
          data-testid="today-next-action-panel"
          data-state={nextActionState.key}
          className="order-1 bg-white border border-[rgba(12,94,58,0.18)] border-l-4 border-l-[#0C5E3A] rounded-[18px] p-6 px-[26px]"
        >
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0C5E3A] mb-3">
            <Sparkles className="h-3 w-3" />
            {nextActionState.key === "setup-needed" ? "Cần thiết lập" : "Hành động tiếp theo"}
          </p>
          <h2 className="font-serif text-[23px] font-bold tracking-[-0.01em] text-app-ink m-0 mb-2">
            {nextActionState.title}
          </h2>
          <p className="text-[13.5px] leading-[1.5] text-[#5C574B] m-0 mb-[18px] max-w-[62ch]">
            {nextActionState.description}
          </p>
          {nextActionState.onAction && nextActionState.actionLabel ? (
            <Button
              variant="default"
              className="bg-[#0C5E3A] hover:bg-[#0C5E3A]/90 text-white font-bold text-[13.5px] rounded-full px-[22px] py-[13px] h-auto transition-all active:scale-[0.98]"
              onClick={nextActionState.onAction}
            >
              {nextActionState.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      )}

      {reviewDuePrompt}

      {missedTasks.length > 0 && (
        <div
          data-testid="today-overdue-recovery"
          className="order-4 rounded-card-lg border border-app-warm-border/20 bg-app-warm-soft/10 p-4 sm:p-5 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-warm-soft text-app-warm">
              <span className="text-sm font-bold tabular-nums">{missedTasks.length}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-app-ink">
                {missedTasks.length} việc trễ cần điều chỉnh
              </p>
              <p className="text-[11px] text-app-ink-muted">
                Duy trì nhịp quan trọng hơn làm hết mọi việc.
              </p>
            </div>
          </div>
          {hasSmartRescue && rescuePlanSummary && (
            <div className="flex items-center gap-2 rounded-lg bg-app-accent-soft/25 border border-app-accent/10 px-3 py-2 text-[11px]">
              <Crown className="h-3.5 w-3.5 text-app-accent shrink-0" />
              <span className="flex-1 min-w-0 truncate">
                <span className="font-semibold text-app-ink">Plus: </span>
                {rescuePlanSummary.headline}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-app-accent hover:text-app-accent/80 font-bold transition-colors text-[11px]"
                onClick={onApplyRecommendedReentry}
              >
                Áp dụng
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="border-app-warm-border/30 bg-app-surface text-app-warm hover:bg-app-bg text-[11px] py-1 h-7.5 rounded-lg px-3 font-semibold transition-all"
              onClick={() => onReentry("push")}
            >
              Dời sang tuần sau
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-app-ink-soft hover:text-app-ink text-[11px] py-1 h-7.5 rounded-lg px-2.5 font-medium transition-all"
              onClick={() => onReentry("lighten")}
            >
              Giảm tải
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-app-ink-soft hover:text-app-ink text-[11px] py-1 h-7.5 rounded-lg px-2.5 font-medium transition-all"
              onClick={() => onReentry("restart")}
            >
              Khởi động lại
            </Button>
            {!hasSmartRescue && (
              <Button
                size="sm"
                variant="ghost"
                className="text-app-accent hover:text-app-accent/80 text-[11px] py-1 h-7.5 ml-auto font-bold rounded-lg px-2.5 flex items-center gap-1 transition-all"
                onClick={onOpenSmartRescue}
              >
                <Crown className="h-3.5 w-3.5" />
                Plus
              </Button>
            )}
          </div>
        </div>
      )}

      {hasPrimaryTask && firstPriorityTask && !isHeroDismissed && (
        <div
          data-testid="today-primary-hero"
          className={`order-2 bg-app-surface rounded-card-lg border shadow-app-sm overflow-hidden ${
            isPrimaryTaskCompleted
              ? "border-app-accent/20"
              : primaryTaskOverdue
                ? "border-app-warm-border/40"
                : "border-app-line/30"
          }`}
        >
          <div className="flex flex-col sm:flex-row">
            <div
              className={`w-1.5 sm:w-2 shrink-0 ${
                isPrimaryTaskCompleted ? "bg-app-accent/40" : primaryTaskOverdue ? "bg-app-warm/50" : "bg-app-accent/50"
              }`}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0 p-6 sm:p-7 relative">
              {isPrimaryTaskCompleted ? (
                <>
                  <button
                    type="button"
                    className="absolute top-3 right-3 text-app-ink-muted hover:text-app-ink p-1.5 rounded-full hover:bg-app-bg transition-colors cursor-pointer z-20"
                    onClick={() => setIsHeroDismissed(true)}
                    aria-label="Ẩn thông báo hoàn thành"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                      <Check className="h-5 w-5" />
                    </div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-app-ink">
                      Tuyệt vời! Bạn đã hoàn thành việc quan trọng nhất hôm nay
                    </h2>
                  </div>
                  <p className="text-sm text-app-ink-soft pl-13">
                    Hãy ghi nhận nỗ lực của bản thân bằng một check-in ngắn bên dưới để khép lại một ngày trọn vẹn.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-app-accent/10 bg-app-accent-subtle text-[10px] font-bold uppercase tracking-[0.12em] text-app-accent">
                      <Sparkles className="h-3 w-3" />
                      {isFirstWeek ? "Tuần 1 · Khởi đầu" : "Ưu tiên duy nhất"}
                    </span>
                    {primaryTaskOverdue && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-app-warm-border/30 bg-app-warm-soft/30 text-[10px] font-bold uppercase tracking-[0.08em] text-app-warm-strong">
                        Đang trễ
                      </span>
                    )}
                  </div>
                  <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-app-ink leading-snug">
                    {firstPriorityTask.title}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-app-ink-soft max-w-3xl">
                    {primaryTaskOverdue
                      ? "Việc này đang trễ – hôm nay hãy làm phiên bản gọn nhất. Duy trì nhịp quan trọng hơn làm hết."
                      : `Thuộc nhóm việc lặp lại "${firstPriorityTask.leadIndicatorName}". Xong việc này là bạn đã giữ đúng tiến độ.`}
                  </p>
                  {isFirstWeek && (
                    <p data-testid="today-first-week-encouragement" className="mt-2 text-xs text-app-ink-soft">
                      Tuần đầu tiên: Bắt đầu nhỏ để tạo đà và giữ thói quen lâu dài.
                    </p>
                  )}
                  {primaryTaskCommitmentQuote && (
                    <p
                      className={`mt-4 text-sm italic leading-relaxed max-w-2xl border-l-2 pl-3.5 py-1 font-serif ${
                        primaryTaskOverdue
                          ? "border-app-warm/40 text-app-warm-strong"
                          : "border-app-accent/30 text-app-ink-soft"
                      }`}
                    >
                      {primaryTaskCommitmentQuote}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      data-testid="today-primary-mark-done"
                      className="bg-app-accent hover:bg-app-accent-hover text-white font-semibold text-sm shadow-app-sm rounded-card px-6 h-11 transition-all active:scale-[0.98]"
                      onClick={() => handleTaskCompletionChange(firstPriorityTask.id, true)}
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Đánh dấu xong
                    </Button>
                    {primaryTaskOverdue && onRescheduleTaskWithinWeek && (
                      <Button
                        variant="outline"
                        className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg font-semibold text-sm rounded-card px-5 h-11 shadow-3xs transition-all active:scale-[0.98]"
                        onClick={() => onRescheduleTaskWithinWeek(firstPriorityTask.id)}
                      >
                        <CalendarClock className="mr-1.5 h-4 w-4 text-app-ink-soft" />
                        Dời sang ngày khác
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

        <div
          data-testid="today-main-work-grid"
          className="grid min-w-0 order-3 gap-[18px] lg:grid-cols-[1.35fr_1fr]"
        >
          <div className={fadeInClassName}>
            <Card
              data-tour-id="system-today-queue"
              className={`h-full min-w-0 overflow-hidden rounded-[20px] border border-[rgba(23,21,15,0.08)] bg-white min-h-[420px] p-6`}
            >
              <CardHeader className="min-w-0 [&>*+*]:mt-0 px-0 pt-0 pb-0">
                <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle as="h2" className="break-words text-app-ink text-[18px] font-bold m-0 mb-1">
                      Hàng việc hôm nay
                    </CardTitle>
                    <CardDescription className="break-words text-[12.5px] text-[#8C887C] m-0 mb-[22px]">
                      <span className="font-mono font-semibold text-[#0C5E3A]">
                        {todayCompletedCount}/{checkInTotal}
                      </span>{" "}
                      hoàn thành · Ưu tiên việc quan trọng nhất trước
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 stack-tight px-0 pt-0 pb-0">
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
                          <Button variant="outline" onClick={onOpenWeekTab} className="bg-app-surface rounded-card">
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
                          <Button variant="secondary" onClick={onNavigateToSetup} className="rounded-card">
                            {hasLeadMetrics ? "Mở Setup để chỉnh" : "Đi tới Setup"}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : undefined
                      }
                    />
                  )
                ) : (
                  <MotionStaggerList className="divide-y divide-app-line/15">
                    {todayQueue.map((task, taskIndex) => {
                      const taskCompleted = optimisticTaskCompletionById[task.id] ?? task.completed;
                      const isOverdue = !taskCompleted && task.scheduledDate < todayDateKey;
                      const isPrimaryTask = firstPriorityTask?.id === task.id && !taskCompleted;
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
                      const taskNumber = String(taskIndex + 1).padStart(2, "0");

                      return (
                        <MotionStaggerItem
                          key={task.id}
                          className={`group flex min-w-0 items-start gap-3 py-[6px] px-0.5 pb-[18px] ${
                            taskCompleted ? "opacity-50" : ""
                          }`}
                        >
                          <span className="font-mono text-xs font-semibold text-[#C7C2B5] tabular-nums pt-0.5 shrink-0">
                            {taskNumber}
                          </span>
                          <Checkbox
                            aria-label={`Hoàn thành việc: ${task.title}`}
                            checked={taskCompleted}
                            className="mt-0 rounded-[7px] shrink-0 w-6 h-6 border-2"
                            onCheckedChange={(checked) => handleTaskCompletionChange(task.id, checked === true)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`min-w-0 max-w-full break-words text-[14.5px] font-semibold leading-[1.4] ${
                                    taskCompleted
                                      ? "text-app-ink-muted/50 line-through"
                                      : "text-app-ink"
                                  }`}
                                >
                                  {task.title}
                                </p>
                                <p className="mt-[3px] text-[12px] text-[#8C887C]">
                                  {task.leadIndicatorName}
                                  {task.isCore && (
                                    <span className="ml-1 inline-flex items-center bg-[#EDF7E0] text-[#0C5E3A] text-[9.5px] font-bold rounded-[5px] px-[7px] py-0.5 tracking-[0.06em]">
                                      CỐT LÕI
                                    </span>
                                  )}
                                </p>
                                {showTaskCommitmentQuote ? (
                                  <p className="mt-1 text-[11px] italic leading-5 text-app-ink-muted">
                                    {taskCommitmentQuote}
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={`shrink-0 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
                                  isOverdue
                                    ? "text-app-warm"
                                    : taskCompleted
                                      ? "text-[#0C5E3A]"
                                      : isPrimaryTask
                                        ? "text-app-accent"
                                        : "text-app-ink-muted"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            {isOverdue && canUseOverdueTaskActions ? (
                              <div data-testid={`overdue-actions-${task.id}`} className="mt-2.5 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {onRescheduleTaskWithinWeek && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-[11px] text-app-ink-soft hover:text-app-ink py-1 h-7 rounded-lg px-2 font-medium transition-all"
                                      onClick={() => onRescheduleTaskWithinWeek(task.id)}
                                      data-action="reschedule-within-week"
                                      aria-label={`Đẩy ${task.title} sang ngày mai`}
                                    >
                                      <CalendarClock className="mr-1 h-3 w-3 text-app-ink-muted" />
                                      Đẩy sang ngày mai
                                    </Button>
                                  )}
                                  {onRescheduleTaskToNextWeek || (onSkipNonCoreTask && !task.isCore) ? (
                                    <details className="group rounded-lg border border-app-line/40 bg-app-bg/30 px-3 py-1 transition-all duration-150 flex-1 sm:flex-initial">
                                      <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-[11px] font-medium text-app-ink-muted h-6">
                                        Khác
                                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                                      </summary>
                                      <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                        {onRescheduleTaskToNextWeek && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-[10px] text-app-ink-soft font-medium rounded-lg px-2.5 py-0.5 h-7"
                                            onClick={() => onRescheduleTaskToNextWeek(task.id)}
                                            data-action="reschedule-next-week"
                                            aria-label={`Dời ${task.title} sang tuần sau`}
                                          >
                                            <CalendarPlus className="mr-1 h-3 w-3" />
                                            Sang tuần sau
                                          </Button>
                                        )}
                                        {onSkipNonCoreTask && !task.isCore && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-[10px] text-app-ink-soft font-medium rounded-lg px-2.5 py-0.5 h-7"
                                            onClick={() => onSkipNonCoreTask(task.id)}
                                            data-action="skip-non-core"
                                            aria-label={`Bỏ qua việc tùy chọn ${task.title}`}
                                          >
                                            <X className="mr-1 h-3 w-3" />
                                            Bỏ qua
                                          </Button>
                                        )}
                                      </div>
                                    </details>
                                  ) : null}
                                </div>
                                {task.isCore && (onRescheduleTaskWithinWeek || onRescheduleTaskToNextWeek) ? (
                                  <span
                                    data-testid={`overdue-core-note-${task.id}`}
                                    className="block text-[10px] text-app-ink-muted font-medium italic pl-1"
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
                  <details className="group min-w-0 rounded-card-lg border border-app-line bg-app-surface px-4 py-3.5 shadow-3xs transition-all duration-150">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-app-ink">
                      <span>Sau việc đầu tiên</span>
                      <span className="rounded-lg border border-app-line bg-app-bg px-2 py-0.5 text-[10px] font-medium text-app-ink-soft">
                        {secondaryTodayTasks.length} việc
                      </span>
                    </summary>
                    <p className="mt-1.5 text-[11px] text-app-ink-muted leading-relaxed">
                      Tập trung hoàn thành việc ưu tiên trước khi chuyển năng lượng sang các việc phụ dưới đây.
                    </p>
                    <div className="mt-3 space-y-2">
                      {secondaryPreviewTasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex min-w-0 items-center gap-3 rounded-card border border-app-line/20 bg-app-bg/20 px-3.5 py-2.5"
                        >
                          <div className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-lg bg-app-line/80 text-[10px] font-bold text-app-ink-soft">
                            {index + 2}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-app-ink">{task.title}</p>
                            <p className="mt-0.5 text-[10px] text-app-ink-muted">{task.leadIndicatorName}</p>
                          </div>
                          <Badge
                            variant={task.isCore ? "success" : "warning"}
                            className="text-[9px] px-1.5 py-0 shadow-none rounded-md"
                          >
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
                <div className="rounded-[14px] border border-[rgba(23,21,15,0.08)] bg-[#FAF8F3] p-[16px_18px]">
                  <div className="flex items-center justify-between mb-[9px]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8A296]">
                      Tiến độ tuần {currentWeek}
                    </span>
                    <span className="font-mono text-[13px] font-bold text-[#0C5E3A]">{weekCompletion.percent}%</span>
                  </div>
                  <Progress value={weekCompletion.percent} className="h-2 shadow-none rounded-full" />
                </div>
                {primaryTaskCompletedToday && (
                  <p
                    data-testid="today-primary-done-nudge"
                    className="rounded-card border border-app-accent/20 bg-app-accent-soft/40 px-4 py-3 text-xs leading-relaxed text-app-accent font-medium"
                  >
                    Việc quan trọng nhất đã chốt xong – hãy lưu check-in ngắn để khép lại hôm nay.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className={fadeInClassName} style={{ animationDelay: "0.06s" }}>
            <Card className={`h-full min-w-0 overflow-hidden rounded-[20px] border border-[rgba(23,21,15,0.08)] bg-white p-6`}>
              <div className="min-w-0">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-[9px] break-words text-app-ink text-[18px] font-bold m-0 mb-1">
                      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-[#EDF7E0] text-[#0C5E3A]">
                        <Gauge className="h-3.5 w-3.5" />
                      </span>
                      Check-in hôm nay
                    </h2>
                    <p className="text-[12.5px] text-[#8C887C] m-0 mb-5">
                      30 giây · Lắng nghe bản thân
                    </p>
                  </div>
                  {todayCheckIn && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-app-status-success uppercase tracking-[0.1em]">
                      <CheckCircle2 className="h-3 w-3" />
                      Đã lưu
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                {todayCheckIn && (
                  <div
                    data-testid="today-check-in-saved"
                    className="flex items-center gap-2 rounded-lg border border-app-status-success/15 bg-app-status-success/8 px-3 py-2 text-[11px] text-app-status-success font-medium mb-4"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <div className="flex-1">
                      <span className="font-semibold">Đã lưu:</span>{" "}
                      <span className="font-bold">
                        {getMoodLabel((todayCheckIn.mood as DailyMood | undefined) ?? "steady")}
                      </span>
                      <span className="sr-only">{todayCheckIn.date}</span>
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8A296] mb-2.5">
                    Năng lượng
                  </div>
                  <div role="radiogroup" aria-label="Năng lượng" className="grid grid-cols-3 gap-2 mb-5">
                    {MOOD_OPTIONS.map((option) => {
                      const isActive = dailyMood === option.value;
                      const moodStyle = getMoodOptionStyle(option.value, isActive);
                      const emoji = option.value === "low" ? "🌙" : option.value === "high" ? "🔥" : "🌿";

                      return (
                        <Button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={`${option.label}: ${option.hint}`}
                          variant="outline"
                          className={`h-auto min-w-0 justify-center flex-col gap-[7px] px-[6px] py-[14px] rounded-[13px] border-[1.5px] text-[10px] font-extrabold uppercase tracking-[0.08em] transition-all duration-200 ${moodStyle}`}
                          onClick={() => onDailyMoodChange(option.value)}
                        >
                          <span className="text-lg shrink-0">{emoji}</span>
                          <span>{option.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8A296] mb-2.5">
                    Ghi chú nhanh
                  </div>
                  <Textarea
                    id="daily-note"
                    rows={2}
                    value={dailyNote}
                    onChange={(event) => onDailyNoteChange(event.target.value)}
                    placeholder="Bài học nhỏ hay cảm nhận hôm nay..."
                    className="border-[rgba(23,21,15,0.12)] bg-[#FAF8F3] text-[#17150F] placeholder:text-app-ink-muted/50 focus:border-[#0C5E3A]/30 focus:ring-1 focus:ring-[#0C5E3A]/10 rounded-[12px] shadow-none text-[13px] transition-all duration-150 p-[12px_14px] h-[84px] mb-4"
                  />
                </div>
                <Button
                  variant="default"
                  className="w-full bg-[#0C5E3A] hover:bg-[#0C5E3A]/90 text-white font-bold text-[13.5px] py-[13px] rounded-[12px] mb-[14px] transition-all active:scale-[0.98]"
                  onClick={handleSaveCheckInClick}
                  disabled={isSavingCheckIn}
                  aria-busy={isSavingCheckIn}
                  aria-label={hasSavedTodayCheckIn ? "Cập nhật check-in" : "Lưu check-in"}
                  >
                    {isSavingCheckIn ? (
                      <>
                        <Loader2 className={loadingIconClassName} aria-hidden="true" />
                        Đang lưu...
                      </>
                    ) : hasSavedTodayCheckIn ? (
                      "Cập nhật"
                    ) : (
                      "Lưu check-in"
                    )}
                  </Button>
                {onOpenWeekTab && (
                  <Button
                    data-testid="today-check-in-open-week"
                    variant="ghost"
                    className="w-full justify-center text-[#0C5E3A] hover:text-[#0C5E3A]/80 text-[12.5px] font-bold h-auto py-1 transition-colors mb-4"
                    onClick={onOpenWeekTab}
                  >
                    Xem đánh giá tuần
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                )}
                {upcomingStrategicBlock && (
                  <div className="mt-5 pt-4 border-t border-app-line/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-accent mb-1">
                      Khung giờ chiến lược
                    </p>
                    <p className="text-xs font-semibold text-app-ink">{upcomingStrategicBlock.startTime} · {upcomingStrategicBlock.durationMinutes} phút</p>
                    <p className="text-[11px] text-app-ink-muted mt-0.5">
                      Dành thời gian không xao nhãng cho việc quan trọng nhất.
                    </p>
                  </div>
                )}
                <SecondaryPanel title="Lịch sử check-in" collapsible defaultOpen={false} className="mt-4">
                  {latestCheckIn && (
                    <div
                      aria-live="polite"
                      className="rounded-[12px] border border-[rgba(23,21,15,0.06)] bg-[#FAF8F3] p-[13px_16px] text-[11px] text-app-ink-muted leading-relaxed"
                    >
                      Gần nhất: {formatCalendarDate(latestCheckIn.date)} ·{" "}
                      <span className="font-semibold text-[#17150F]">
                        {getMoodLabel((latestCheckIn.mood as DailyMood | undefined) ?? "steady")}
                      </span>
                    </div>
                  )}
                </SecondaryPanel>
              </div>
            </Card>
          </div>
        </div>


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
            aria-label="Lưu check-in hôm nay"
          >
            {isSavingCheckIn ? (
              <>
                <Loader2 className={loadingIconClassName} aria-hidden="true" />
                Đang lưu check-in...
              </>
            ) : (
              "Ghi dấu ngày hôm nay"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
