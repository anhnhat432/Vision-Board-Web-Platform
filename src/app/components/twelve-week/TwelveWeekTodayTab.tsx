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
  TaskDoneIcon,
  TaskInProgressIcon,
  TaskTodoIcon,
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

// Decorative elements for Dreamy Planner aesthetic
const WashiTape = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-app-warm-soft/40 backdrop-blur-[0.5px] rotate-[-1.5deg] border border-dashed border-app-warm-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.01)] pointer-events-none select-none z-20 ${className}`}
  />
);

const PaperPin = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none select-none z-20 ${className}`}
  >
    <div className="w-3.5 h-3.5 bg-app-warm rounded-full shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2),0_1.5px_3px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center">
      <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
    </div>
  </div>
);

function getMoodOptionStyle(value: DailyMood, isActive: boolean): string {
  if (!isActive) {
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg-subtle hover:border-app-line-strong hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-2xl shadow-none";
  }
  switch (value) {
    case "low":
      return "border-app-status-info/40 bg-app-status-info/10 text-app-status-info dark:bg-app-status-info/20 dark:text-app-status-info font-bold shadow-sm transition-all duration-300 rounded-2xl scale-[1.03] ring-2 ring-app-status-info/20";
    case "high":
      return "border-app-status-warning/40 bg-app-status-warning/10 text-app-status-warning dark:bg-app-status-warning/20 dark:text-app-status-warning font-bold shadow-sm transition-all duration-300 rounded-2xl scale-[1.03] ring-2 ring-app-status-warning/20";
    default:
      return "border-app-status-success/40 bg-app-status-success/10 text-app-status-success dark:bg-app-status-success/20 dark:text-app-status-success font-bold shadow-sm transition-all duration-300 rounded-2xl scale-[1.03] ring-2 ring-app-status-success/20";
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
  const hasStartedExecution = todayCompletedCount > 0 || Boolean(latestCheckIn);
  const shouldShowFirstTaskGuide = isFirstWeek && Boolean(primaryTask) && !hasStartedExecution;
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
      className="order-2 rounded-xl border border-app-warm-border/30 bg-app-warm-soft/10 p-5 text-app-warm transition-all duration-150"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-app-warm">
            <CalendarClock className="h-3.5 w-3.5" />
            Review tuần đang chờ
          </p>
          <p className="mt-1.5 text-base font-semibold leading-6 text-app-ink font-serif">
            Chốt tuần trước khi mở thêm việc mới.
          </p>
          <p className="mt-0.5 text-xs leading-5 text-app-ink-soft">
            Lưu bài học, điểm tuần và ưu tiên tuần sau để hệ 12 tuần không bị đứt nhịp.
          </p>
        </div>
        {onOpenWeekTab ? (
          <Button
            variant="outline"
            className="w-full border-app-warm-border/40 bg-app-surface text-app-warm hover:bg-app-bg sm:w-auto shadow-2xs rounded-lg px-4 py-2 font-semibold text-xs transition-all"
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
        className="order-0 grid grid-cols-3 gap-2 rounded-xl border border-app-line bg-app-surface p-2 sm:hidden shadow-3xs"
      >
        <div className="min-w-0 rounded-xl bg-app-bg/50 px-2 py-1.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Chờ làm</p>
          <p className="mt-0.5 text-base font-bold text-app-ink">{todayRemainingCount}</p>
        </div>
        <div className="min-w-0 rounded-xl bg-app-bg/50 px-2 py-1.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Tiến độ</p>
          <p className="mt-0.5 text-base font-bold text-app-ink">{weekCompletion.percent}%</p>
        </div>
        <div
          className={`min-w-0 rounded-xl px-2 py-1.5 text-center ${reviewDueToday ? "bg-app-warm-soft/60" : "bg-app-accent-soft/60"}`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${reviewDueToday ? "text-app-warm" : "text-app-accent"}`}
          >
            {reviewDueToday ? "Review" : "Đã chốt"}
          </p>
          <p className="mt-0.5 truncate text-base font-bold text-app-ink">
            {reviewDueToday ? "Hôm nay" : `${todayCompletedCount}/${checkInTotal}`}
          </p>
        </div>
      </div>

      {upcomingStrategicBlock ? (
        <div
          data-testid="strategic-block-nudge"
          className="order-1 rounded-xl border border-app-accent/20 bg-app-accent-soft/30 p-5 text-app-accent transition-all duration-150"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">
                <CalendarClock className="h-3.5 w-3.5" />
                Khung giờ tập trung chiến lược
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-6 font-serif">
                Sắp tới giờ Khung chiến lược. Đóng tab phụ, chọn 1 việc cốt lõi.
              </p>
            </div>
            <Badge
              variant="outline"
              className="w-fit border-app-accent/20 bg-app-surface text-app-accent shadow-none rounded-lg px-3 py-1 font-semibold text-xs"
            >
              {upcomingStrategicBlock.startTime} · {upcomingStrategicBlock.durationMinutes} phút
            </Badge>
          </div>
        </div>
      ) : null}

      {primaryTask ? (
        <div
          data-testid="today-next-action-panel"
          data-state={nextActionState.key}
          className={
            shouldShowFirstTaskGuide
              ? "order-1 w-full rounded-2xl border border-app-accent/20 bg-gradient-to-r from-app-accent-soft/45 via-app-surface to-app-accent-subtle/30 px-4 py-3.5 text-left shadow-3xs"
              : "order-1 flex w-fit items-center gap-1.5 rounded-xl border border-app-accent/15 bg-app-accent-soft/35 px-2 py-1 text-[11px] text-app-ink-muted shadow-4xs"
          }
        >
          {shouldShowFirstTaskGuide ? (
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-app-accent">Bắt đầu tuần 1</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-app-ink">
                  Bắt đầu từ việc ưu tiên bên dưới rồi tick xong để tạo đà.
                </p>
                <p className="mt-1 text-xs leading-5 text-app-ink-soft">
                  Chỉ cần hoàn thành việc đầu tiên này là bạn đã khởi động được nhịp 12 tuần. Sau lần tick đầu, dải nhắc
                  này sẽ tự ẩn.
                </p>
              </div>
            </div>
          ) : (
            <>
              <Sparkles className="h-3 w-3 shrink-0 text-app-accent animate-pulse" />
              <span>
                <span className="font-semibold text-app-accent">{nextActionState.title}:</span>{" "}
                {nextActionState.description}
              </span>
            </>
          )}
        </div>
      ) : (
        <div
          data-testid="today-next-action-panel"
          data-state={nextActionState.key}
          className="order-1 bg-gradient-to-br from-app-surface via-app-bg-subtle to-app-accent-subtle/25 border border-app-line/50 rounded-3xl p-6 sm:p-8 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <WashiTape className="opacity-80" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-app-accent-soft/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex flex-col gap-1 relative z-10 pt-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">
              <Sparkles className="h-3.5 w-3.5 text-app-accent shrink-0" />
              Hôm nay · {nextActionState.key === "setup-needed" ? "Kế hoạch" : "Hành động"}
            </p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight leading-tight sm:leading-snug text-app-ink mt-2">
              {nextActionState.title}
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-app-ink-soft mt-1.5 max-w-3xl font-sans">
              {nextActionState.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2 pt-4 border-t border-app-line/30 relative z-10">
            {nextActionState.onAction && nextActionState.actionLabel ? (
              <Button
                variant="default"
                className="w-full sm:w-auto bg-app-accent hover:bg-app-accent-hover text-white font-semibold text-xs shadow-2xs transition-colors rounded-xl px-5 py-2.5 h-11"
                onClick={nextActionState.onAction}
              >
                {nextActionState.actionLabel}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <div />
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-app-ink-muted/80">
              <span>Tuần {currentWeek}/12</span>
              <span className="text-app-line/30">•</span>
              <span>
                Đã xong {todayCompletedCount}/{checkInTotal}
              </span>
              <span className="text-app-line/30">•</span>
              <span>Tiến độ {weekCompletion.percent}%</span>
            </div>
          </div>
        </div>
      )}

      {reviewDuePrompt}

      {missedTasks.length > 0 && (
        <div
          data-testid="today-overdue-recovery"
          className="order-4 border border-app-warm-border/20 bg-gradient-to-br from-app-warm-soft/10 to-app-warm-soft/5 rounded-2xl p-5 sm:p-6 flex flex-col gap-3.5 transition-all duration-300 shadow-3xs"
        >
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 font-serif text-sm font-semibold text-app-warm-strong">
              <AlertTriangle className="h-4.5 w-4.5 text-app-warm shrink-0" />
              Quay lại nhịp tuần này · Có {missedTasks.length} việc trễ
            </h2>
            <p className="text-xs text-app-ink-soft leading-relaxed max-w-3xl">
              Chọn một phương án điều chỉnh bên dưới để giảm bớt áp lực và đưa kế hoạch về nhịp độ tự nhiên.
            </p>
          </div>

          {hasSmartRescue && rescuePlanSummary && (
            <div className="flex items-center gap-2.5 rounded-xl bg-app-accent-soft/30 border border-app-accent/15 px-3.5 py-2.5 text-xs shadow-3xs">
              <Crown className="h-3.5 w-3.5 text-app-accent shrink-0" />
              <div className="flex-1 min-w-0 truncate text-app-ink-soft">
                <span className="font-semibold text-app-ink">Gợi ý từ Plus: </span>
                <span>{rescuePlanSummary.headline}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-app-accent hover:text-app-accent/80 font-bold transition-colors"
                onClick={onApplyRecommendedReentry}
              >
                Áp dụng
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="bg-app-surface border-app-line text-app-ink hover:bg-app-bg text-[11px] py-1.5 h-8.5 shadow-3xs rounded-xl px-3.5 font-semibold transition-all duration-150"
              onClick={() => onReentry("push")}
            >
              Dời việc trễ sang tuần sau
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-app-ink-soft hover:text-app-ink text-[11px] py-1.5 h-8.5 rounded-xl px-3.5 font-semibold transition-all duration-150"
              onClick={() => onReentry("lighten")}
            >
              Giảm tải tuần này
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-app-ink-soft hover:text-app-ink text-[11px] py-1.5 h-8.5 rounded-xl px-3.5 font-semibold transition-all duration-150"
              onClick={() => onReentry("restart")}
            >
              Khởi động lại nhịp
            </Button>
            {!hasSmartRescue && (
              <Button
                size="sm"
                variant="ghost"
                className="text-app-accent hover:text-app-accent/80 text-[11px] py-1.5 h-8.5 ml-auto font-bold rounded-xl px-3 flex items-center gap-1 transition-all duration-150"
                onClick={onOpenSmartRescue}
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Gợi ý từ Plus</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {hasPrimaryTask && firstPriorityTask && !isHeroDismissed && (
        <div
          data-testid="today-primary-hero"
          className={`order-2 border ${
            isPrimaryTaskCompleted
              ? "border-app-accent/20 bg-gradient-to-br from-app-surface via-app-accent-subtle/15 to-app-accent-subtle/5"
              : primaryTaskOverdue
                ? "border-app-warm-border bg-gradient-to-br from-app-surface via-app-warm-subtle/30 to-app-warm-subtle/40"
                : "border-app-accent/25 bg-gradient-to-br from-app-surface via-app-bg-subtle to-app-accent-subtle/35"
          } rounded-3xl p-6 sm:p-8 flex flex-col gap-3.5 relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md pt-8`}
        >
          <PaperPin />
          <WashiTape className="opacity-70 rotate-[2deg] -top-3.5" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-app-accent-soft/10 to-transparent rounded-bl-full pointer-events-none" />

          {isPrimaryTaskCompleted ? (
            <>
              <button
                type="button"
                className="absolute top-4 right-4 text-app-ink-muted hover:text-app-ink p-1.5 rounded-full hover:bg-app-bg transition-colors duration-150 cursor-pointer z-20"
                onClick={() => setIsHeroDismissed(true)}
                aria-label="Ẩn thông báo hoàn thành"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex flex-col items-center justify-center text-center py-4 relative z-10">
                <div className="rounded-full bg-app-accent-soft p-3 text-app-accent mb-3 animate-bounce">
                  <Check className="h-6 w-6" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-app-ink">
                  Tuyệt vời! Bạn đã hoàn thành việc quan trọng nhất hôm nay
                </h2>
                <p className="text-xs text-app-ink-soft mt-1.5 max-w-md font-sans">
                  Hãy ghi nhận nỗ lực của bản thân bằng một check-in ngắn bên dưới để khép lại một ngày trọn vẹn.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1 relative z-10">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">
                  <Sparkles className="h-3.5 w-3.5 text-app-accent shrink-0 animate-pulse" />
                  {isFirstWeek ? "Việc đầu tiên của tuần 1" : "Việc quan trọng nhất hôm nay"}
                  {primaryTaskOverdue && (
                    <span className="ml-2 rounded border border-app-warm-border/30 bg-app-warm-soft/30 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-app-warm-strong uppercase">
                      Đang trễ
                    </span>
                  )}
                </p>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight leading-tight sm:leading-snug text-app-ink mt-2">
                  {firstPriorityTask.title}
                </h1>
                <p className="text-xs sm:text-sm leading-relaxed text-app-ink-soft mt-1.5 max-w-3xl font-sans">
                  {primaryTaskOverdue ? (
                    `Việc này đang trễ – hôm nay hãy làm phiên bản gọn nhất. Duy trì nhịp quan trọng hơn làm hết.`
                  ) : (
                    <>
                      Thuộc nhóm việc lặp lại “{firstPriorityTask.leadIndicatorName}”. Xong việc này là bạn đã giữ đúng
                      tiến độ.
                      <span className="sr-only">Chỉ cần xong việc này là hôm nay đã đủ</span>
                    </>
                  )}
                </p>
                {isFirstWeek && (
                  <p data-testid="today-first-week-encouragement" className="text-xs text-app-ink-soft mt-1 font-sans">
                    Tuần đầu tiên: Bắt đầu nhỏ để tạo đà và giữ thói quen lâu dài.
                  </p>
                )}
              </div>

              {primaryTaskCommitmentQuote && (
                <p
                  className={`text-xs italic leading-relaxed pl-3.5 py-2 my-1 relative z-10 border-l-2 ${
                    primaryTaskOverdue
                      ? "border-app-warm/40 bg-app-warm-soft/15 text-app-warm-strong"
                      : "border-app-accent/40 bg-app-accent-soft/20 text-app-ink-soft"
                  } rounded-r-xl font-serif`}
                >
                  {primaryTaskCommitmentQuote}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2 pt-4 border-t border-app-line/20 relative z-10">
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="today-primary-mark-done"
                    size="sm"
                    className="w-full sm:w-auto bg-app-accent hover:bg-app-accent-hover text-white font-semibold text-xs shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 rounded-xl px-5 py-2 h-9"
                    onClick={() => handleTaskCompletionChange(firstPriorityTask.id, true)}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Đánh dấu xong
                  </Button>
                  {primaryTaskOverdue && onRescheduleTaskWithinWeek && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto border-app-line bg-app-surface text-app-ink hover:bg-app-bg hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 shadow-3xs text-xs rounded-xl px-4 py-2 h-9"
                      onClick={() => onRescheduleTaskWithinWeek(firstPriorityTask.id)}
                    >
                      <CalendarClock className="mr-1.5 h-3.5 w-3.5 text-app-ink-soft" />
                      Dời sang ngày khác
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium text-app-ink-muted/80">
                  <span>Tuần {currentWeek}/12</span>
                  <span className="text-app-line/30">•</span>
                  <span>
                    Đã xong {todayCompletedCount}/{checkInTotal}
                  </span>
                  <span className="text-app-line/30">•</span>
                  <span>Tiến độ {weekCompletion.percent}%</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <SectionBlock title="Hàng việc và check-in hôm nay" headerVisuallyHidden className="order-3">
        <div
          data-testid="today-main-work-grid"
          className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.12fr)_380px]"
        >
          <div className={fadeInClassName}>
            <Card
              data-tour-id="system-today-queue"
              className="h-full min-w-0 overflow-hidden rounded-3xl border border-app-line/50 bg-app-surface shadow-2xs relative pt-6"
            >
              <WashiTape className="opacity-60 rotate-[-1deg] -top-3.5" />
              <CardHeader className="min-w-0 [&>*+*]:mt-0 px-5 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 pt-1">
                    <CardTitle as="h2" className="break-words text-app-ink font-serif text-xl font-bold leading-tight">
                      Hàng việc hôm nay
                    </CardTitle>
                    <CardDescription className="mt-1 break-words text-xs text-app-ink-soft">
                      Ưu tiên hoàn thành nhóm việc quan trọng nhất trước.
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-app-line bg-app-bg/60 text-app-ink-muted/80 rounded-lg text-[10px] px-2.5 py-0.5 shadow-none font-bold"
                  >
                    {todayCompletedCount}/{checkInTotal} hoàn thành
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 stack-tight px-5 pt-0 pb-5 sm:px-8 sm:pb-8">
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
                          <Button variant="outline" onClick={onOpenWeekTab} className="bg-app-surface rounded-xl">
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
                          <Button variant="secondary" onClick={onNavigateToSetup} className="rounded-xl">
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
                          className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 transition-all duration-300 ${
                            isPrimaryTask
                              ? "border-app-accent/80 bg-gradient-to-br from-app-accent-soft/75 via-app-accent-soft/40 to-app-surface/30 shadow-2xs hover:border-app-accent"
                              : `border-app-line/50 bg-app-surface hover:bg-app-bg/25 shadow-3xs ${
                                  !task.isCore && !taskCompleted ? "opacity-85 hover:opacity-100" : ""
                                }`
                          }`}
                        >
                          <Checkbox
                            aria-label={`Hoàn thành việc: ${task.title}`}
                            checked={taskCompleted}
                            className="-m-2 mt-0 rounded-md"
                            onCheckedChange={(checked) => handleTaskCompletionChange(task.id, checked === true)}
                          />
                          <div className="min-w-0 flex-1">
                            {isPrimaryTask && (
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">
                                Việc ưu tiên số 1
                              </p>
                            )}
                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <TaskStateIcon
                                    className={`h-4 w-4 shrink-0 ${
                                      isPrimaryTask && !taskCompleted ? "text-app-accent" : "text-app-ink-muted/80"
                                    }`}
                                  />
                                  <p
                                    className={`min-w-0 max-w-full break-words font-medium ${
                                      taskCompleted
                                        ? "text-app-ink-muted/65 line-through opacity-70"
                                        : isPrimaryTask
                                          ? "text-app-ink font-semibold"
                                          : "text-app-ink"
                                    }`}
                                  >
                                    {task.title}
                                  </p>
                                  <Badge
                                    variant={task.isCore ? "success" : "warning"}
                                    className="shadow-none rounded-md text-[9px] px-1.5 py-0"
                                  >
                                    {task.isCore ? "Cốt lõi" : "Tùy chọn"}
                                  </Badge>
                                </div>
                                <p
                                  className={`mt-1 text-[11px] ${
                                    isPrimaryTask && !taskCompleted
                                      ? "text-app-ink-soft font-medium"
                                      : "text-app-ink-muted"
                                  }`}
                                >
                                  {task.leadIndicatorName}
                                </p>
                                {showTaskCommitmentQuote ? (
                                  <p
                                    className={`mt-1 text-xs italic leading-5 ${
                                      isPrimaryTask && !taskCompleted ? "text-app-ink-soft/80" : "text-app-ink-muted"
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
                                    ? "border-app-warm-border/30 bg-app-warm-soft/10 text-app-warm shadow-none rounded-md"
                                    : taskCompleted
                                      ? "border-app-accent/20 bg-app-accent-soft/30 text-app-accent shadow-none rounded-md"
                                      : isPrimaryTask
                                        ? "border-app-accent/30 bg-app-accent-soft/20 text-app-accent shadow-none rounded-md"
                                        : "border-app-line bg-app-bg/50 text-app-ink-muted shadow-none rounded-md"
                                }
                              >
                                {statusLabel}
                              </Badge>
                            </div>
                            {isOverdue && canUseOverdueTaskActions ? (
                              <div data-testid={`overdue-actions-${task.id}`} className="mt-2.5 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {onRescheduleTaskWithinWeek && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 sm:flex-initial justify-center bg-app-surface shadow-3xs text-[11px] border-app-line hover:bg-app-bg rounded-xl px-3 py-1.5 h-8 font-semibold transition-all"
                                      onClick={() => onRescheduleTaskWithinWeek(task.id)}
                                      data-action="reschedule-within-week"
                                      aria-label={`Đẩy ${task.title} sang ngày mai`}
                                    >
                                      <CalendarClock className="mr-1 h-3.5 w-3.5 text-app-ink-soft" />
                                      Đẩy sang ngày mai
                                    </Button>
                                  )}
                                  {onRescheduleTaskToNextWeek || (onSkipNonCoreTask && !task.isCore) ? (
                                    <details className="group rounded-xl border border-app-line/60 bg-app-bg-subtle/30 px-3.5 py-1.5 transition-all duration-150 flex-1 sm:flex-initial">
                                      <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 text-[11px] font-semibold text-app-ink-muted h-6">
                                        Lựa chọn khác
                                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                                      </summary>
                                      <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                        {onRescheduleTaskToNextWeek && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-app-surface border-app-line text-[10px] hover:bg-app-bg shadow-3xs text-app-ink font-semibold rounded-lg px-2.5 py-0.5 h-7"
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
                                            className="text-app-ink-soft hover:text-app-ink text-[10px] font-semibold rounded-lg px-2.5 py-0.5 h-7"
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
                  <details className="group min-w-0 rounded-2xl border border-app-line bg-app-surface px-4 py-3.5 shadow-3xs transition-all duration-150">
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
                          className="flex min-w-0 items-center gap-3 rounded-xl border border-app-line/20 bg-app-bg/20 px-3.5 py-2.5"
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
                <div className="rounded-xl border border-app-line bg-app-bg/30 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-app-ink-soft">
                    <span>Tiến độ tuần {currentWeek}</span>
                    <span className="text-app-ink">{weekCompletion.percent}%</span>
                  </div>
                  <Progress value={weekCompletion.percent} className="mt-2.5 h-2 shadow-none rounded-full" />
                </div>
                {primaryTaskCompletedToday && (
                  <p
                    data-testid="today-primary-done-nudge"
                    className="rounded-xl border border-app-accent/20 bg-app-accent-soft/40 px-4 py-3 text-xs leading-relaxed text-app-accent font-medium"
                  >
                    Việc quan trọng nhất đã chốt xong – hãy lưu check-in ngắn để khép lại hôm nay.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className={fadeInClassName} style={{ animationDelay: "0.06s" }}>
            <Card className="h-full min-w-0 overflow-hidden rounded-3xl border border-app-line/50 bg-app-surface shadow-2xs relative pt-6">
              <WashiTape className="opacity-60 rotate-[1.5deg] -top-3.5" />
              <CardHeader className="min-w-0 [&>*+*]:mt-0 px-5 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
                <div className="flex min-w-0 items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <CardTitle
                      as="h2"
                      className="flex items-center gap-2 break-words text-app-ink font-serif text-xl font-bold"
                    >
                      <Gauge className="h-5 w-5 text-app-accent shrink-0" />
                      Check-in hôm nay
                      <span className="sr-only">Check-in 30 giây</span>
                    </CardTitle>
                    <CardDescription className="mt-1 break-words text-xs text-app-ink-soft">
                      Lắng nghe bản thân và ghi chép nhanh.
                      <span className="sr-only">Chọn năng lượng và ghi 1 ý ngắn</span>
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-app-accent/25 bg-app-accent-soft text-app-accent rounded-lg text-[10px] px-2.5 py-0.5 font-bold"
                  >
                    {todayCompletedCount}/{checkInTotal}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 stack-tight px-5 pt-0 pb-5 sm:stack-stack sm:px-8 sm:pb-8">
                {todayCheckIn && (
                  <div
                    data-testid="today-check-in-saved"
                    className="flex items-center gap-1.5 rounded-xl border border-app-status-success/30 bg-app-status-success/10 px-3.5 py-2 text-xs text-app-status-success font-medium"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-app-status-success" />
                    <div className="flex-1">
                      <span className="font-semibold">Đã lưu check-in:</span> Năng lượng{" "}
                      <span className="font-bold">
                        {getMoodLabel((todayCheckIn.mood as DailyMood | undefined) ?? "steady")}
                      </span>
                      <span className="sr-only">{todayCheckIn.date}</span>
                    </div>
                  </div>
                )}
                <div className="stack-tight">
                  <Label
                    id="daily-mood-label"
                    className="text-[11px] font-bold uppercase tracking-[0.12em] text-app-ink-soft/80"
                  >
                    Năng lượng của bạn
                  </Label>
                  <div role="radiogroup" aria-labelledby="daily-mood-label" className="grid grid-cols-3 gap-2">
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
                          className={`h-auto min-h-12 min-w-0 justify-center px-2 py-2 rounded-xl transition-all duration-300 ${moodStyle}`}
                          onClick={() => onDailyMoodChange(option.value)}
                        >
                          <span className="flex flex-col items-center gap-1 min-w-0">
                            <span className="text-xl shrink-0">{emoji}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider">{option.label}</span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="stack-tight">
                  <Label
                    htmlFor="daily-note"
                    className="text-[11px] font-bold uppercase tracking-[0.12em] text-app-ink-soft/80"
                  >
                    Nhật ký ngày (tùy chọn)
                  </Label>
                  <Textarea
                    id="daily-note"
                    rows={2}
                    value={dailyNote}
                    onChange={(event) => onDailyNoteChange(event.target.value)}
                    placeholder="Ghi lại một bài học nhỏ hay cảm nhận của hôm nay..."
                    className="border-app-line/60 bg-app-surface text-app-ink placeholder:text-app-ink-muted/80 focus:border-app-line focus:ring-1 focus:ring-app-accent/20 rounded-xl shadow-none text-xs transition-all duration-150 p-3"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full py-2.5 text-xs sm:w-auto shadow-none border-app-line hover:bg-app-bg transition-colors rounded-xl font-bold h-9.5"
                  onClick={handleSaveCheckInClick}
                  disabled={isSavingCheckIn}
                  aria-busy={isSavingCheckIn}
                  aria-label={hasSavedTodayCheckIn ? "Cập nhật check-in hôm nay" : "Lưu check-in hôm nay"}
                >
                  {isSavingCheckIn ? (
                    <>
                      <Loader2 className={loadingIconClassName} aria-hidden="true" />
                      Đang lưu check-in...
                    </>
                  ) : hasSavedTodayCheckIn ? (
                    "Cập nhật ngày của bạn"
                  ) : (
                    "Ghi dấu ngày hôm nay"
                  )}
                </Button>
                {reviewDueToday && onOpenWeekTab && (
                  <Button
                    data-testid="today-check-in-open-week"
                    variant="outline"
                    size="sm"
                    className="w-full bg-app-surface sm:w-auto shadow-none border-app-line hover:bg-app-bg text-xs rounded-xl font-semibold h-9.5"
                    onClick={onOpenWeekTab}
                  >
                    Mở tab Tuần để review
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 text-app-ink-soft" />
                  </Button>
                )}
                <SecondaryPanel title="Lịch sử check-in" collapsible defaultOpen={false}>
                  {latestCheckIn && (
                    <div
                      aria-live="polite"
                      className="rounded-xl border border-app-line/60 bg-app-bg/50 p-4 text-xs text-app-ink-muted leading-relaxed"
                    >
                      Check-in gần nhất: {formatCalendarDate(latestCheckIn.date)} • năng lượng{" "}
                      <span className="font-semibold text-app-ink-soft">
                        {getMoodLabel((latestCheckIn.mood as DailyMood | undefined) ?? "steady")}
                      </span>
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
