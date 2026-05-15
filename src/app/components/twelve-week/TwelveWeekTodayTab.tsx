import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, CalendarPlus, Check, CheckCircle2, Crown, Gauge, Inbox, Loader2, Sparkles, X } from "lucide-react";

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
  const deferredToggleTimersRef = useRef<number[]>([]);
  const upcomingStrategicBlock = getUpcomingStrategicBlock(system.weeklyTimeBlocks, new Date());
  const prefersReducedMotion = useReducedMotion();
  const fadeInClassName = prefersReducedMotion ? "min-w-0" : "animate-fade-in-up min-w-0";
  const loadingIconClassName = prefersReducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin";

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
      deferredToggleTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      deferredToggleTimersRef.current = [];
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
    hapticLight();
    setOptimisticTaskCompletionById((current) => ({ ...current, [taskId]: completed }));

    const timerId = window.setTimeout(() => {
      deferredToggleTimersRef.current = deferredToggleTimersRef.current.filter((item) => item !== timerId);
      Promise.resolve(onToggleTask(taskId, completed)).finally(() => {
        setOptimisticTaskCompletionById((current) => {
          if (!(taskId in current)) return current;
          const next = { ...current };
          delete next[taskId];
          return next;
        });
      });
    }, 0);
    deferredToggleTimersRef.current.push(timerId);
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

  return (
    <div className="ops-system-panel flex min-w-0 flex-col gap-[var(--space-inline)] sm:gap-[var(--space-stack)]">
      <div
        data-testid="today-mobile-compact-strip"
        className="order-0 grid grid-cols-3 gap-2 rounded-[var(--r-tile)] border border-border bg-white/92 p-2.5 shadow-sm ring-1 ring-slate-200 sm:hidden"
      >
        <div className="min-w-0 rounded-[var(--r-control)] bg-muted px-2 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Còn</p>
          <p className="mt-0.5 text-lg font-bold text-foreground">{todayRemainingCount}</p>
        </div>
        <div className="min-w-0 rounded-[var(--r-control)] bg-muted px-2 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tuần</p>
          <p className="mt-0.5 text-lg font-bold text-foreground">{weekCompletion.percent}%</p>
        </div>
        <div className={`min-w-0 rounded-[var(--r-control)] px-2 py-2 ${reviewDueToday ? "bg-[color:var(--color-warning-bg)]" : "bg-[color:var(--color-info-bg)]"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${reviewDueToday ? "text-[color:var(--color-warning-fg)]" : "text-[color:var(--color-info-fg)]"}`}>
            {reviewDueToday ? "Review" : "Xong"}
          </p>
          <p className="mt-0.5 truncate text-lg font-bold text-foreground">
            {reviewDueToday ? "Hôm nay" : `${todayCompletedCount}/${checkInTotal}`}
          </p>
        </div>
      </div>

      {upcomingStrategicBlock ? (
        <div
          data-testid="strategic-block-nudge"
          className="order-1 rounded-[var(--r-tile)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] p-4 text-[color:var(--color-success-fg)] shadow-sm sm:rounded-[var(--r-card)] sm:p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-success-fg)]">
                <CalendarClock className="h-3.5 w-3.5" />
                Performance Time Blocking
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 sm:text-base">
                Sắp tới giờ Khung chiến lược. Đóng tab phụ, chọn 1 việc cốt lõi.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-[color:var(--color-success-border)] bg-white text-[color:var(--color-success-fg)]">
              {upcomingStrategicBlock.startTime} · {upcomingStrategicBlock.durationMinutes} phút
            </Badge>
          </div>
        </div>
      ) : null}

      <div
        data-testid="today-next-action-panel"
        data-state={nextActionState.key}
        className="order-1 rounded-[var(--r-tile)] border border-border bg-white/92 p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-[var(--r-card)] sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-info-fg)]" />
              Bước tiếp theo
            </p>
            <p className="mt-2 text-base font-semibold text-foreground sm:text-lg">{nextActionState.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{nextActionState.description}</p>
          </div>
          {nextActionState.onAction && nextActionState.actionLabel ? (
            <Button variant="secondary" className="w-full shrink-0 sm:w-auto" onClick={nextActionState.onAction}>
              {nextActionState.actionLabel}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {missedTasks.length > 0 && (
        <Card data-testid="today-overdue-recovery" className="order-4 border border-slate-200/80 bg-white/92 shadow-sm ring-1 ring-slate-200">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle as="h2" className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-5 w-5 text-[color:var(--color-warning-fg)]" />
                  Quay lại nhịp tuần này
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-muted-foreground">
                  Có {missedTasks.length} việc bị trễ. Không cần làm hết — chọn cách quay lại nhịp gọn nhất.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]">
                {overdueOpenCount} việc trễ
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="stack-stack">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="stack-tight">
                <div className="rounded-[var(--r-control)] border border-border bg-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Tình trạng hiện tại
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {overdueOpenCount} việc đang trễ, {optionalOpenThisWeekCount} việc tùy chọn còn mở, và{" "}
                    {currentWeekTasksCount} việc còn mở trong tuần này.
                  </p>
                </div>
                <div className="rounded-[var(--r-control)] border border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-info-fg)]">
                        Gợi ý quay lại nhịp từ Plus
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.headline
                          : "Plus gợi ý nên dàn lại tuần, giảm tải hay dời lịch — không cần tự đoán."}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.reason
                          : "Plus không thêm việc, mà chỉ rõ cách quay lại nhịp nhẹ nhất ngay khi bạn bắt đầu trễ."}
                      </p>
                      {hasSmartRescue && rescuePlanSummary && (
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          Bước đầu nên làm: {rescuePlanSummary.firstMove}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-[color:var(--tone-shell-primary)] text-white hover:bg-[color:var(--tone-shell-primary)]">
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
              <div className="grid gap-3">
                {rescueModes.map((mode) => (
                  <div
                    key={mode}
                    className="rounded-[var(--r-control)] border border-border bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-foreground">{getReentryModeLabel(mode)}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {getReentryModeDescription(mode, {
                        overdueOpenCount,
                        optionalOpenThisWeekCount,
                        currentWeekOpenCount: currentWeekTasksCount,
                      })}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-[var(--space-inline)] w-full justify-between bg-white"
                      onClick={() => onReentry(mode)}
                      aria-label={`Áp dụng ${getReentryModeLabel(mode)}`}
                    >
                      Áp dụng cách này
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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
          eyebrowClassName="text-white/72"
          title={primaryTask.title}
          description={
            primaryTaskOverdue
              ? `Việc này đang trễ — hôm nay làm phiên bản gọn nhất, đừng bỏ luôn. Làm đều '${primaryTask.leadIndicatorName}' quan trọng hơn làm hết.`
              : isFirstWeek
                ? `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Bắt đầu nhỏ — xong việc này là tuần 1 đã khởi động đúng hướng.`
                : `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Xong việc này là tuần đã đi đúng hướng.`
          }
          titleClassName="break-words text-lg font-semibold text-white sm:text-xl"
          descriptionClassName="text-sm leading-6 text-white/78"
          contentClassName="stack-tight"
          actionClassName="flex flex-wrap gap-2"
          className={`order-2 ${primaryTaskOverdue ? "bg-[color:var(--color-warning-bg)]" : "bg-white"}`}
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
                  className="bg-white"
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
            <Badge variant="outline" className="border-[color:var(--color-warning-border)] bg-white text-[color:var(--color-warning-fg)]">
              Đang trễ
            </Badge>
          )}
          {primaryTaskCommitmentQuote ? (
            <p className="text-sm italic leading-6 text-white/74">{primaryTaskCommitmentQuote}</p>
          ) : null}
          <p className="text-sm font-medium text-white">
            Chỉ cần xong việc này là hôm nay đã đủ. Phần còn lại để sau.
          </p>
          {isFirstWeek && (
            <p
              data-testid="today-first-week-encouragement"
              className="text-sm leading-6 text-white/74"
            >
              Tuần đầu — bắt đầu nhỏ là quan trọng nhất. Không cần làm hết hôm nay, duy trì đến hết tuần.
            </p>
          )}
        </PrimaryActionCard>
      )}

      <SectionBlock title="Hàng việc và check-in hôm nay" headerVisuallyHidden className="order-3">
        <div data-testid="today-main-work-grid" className="grid min-w-0 gap-[var(--space-inline)] sm:gap-[var(--space-stack)] lg:grid-cols-[minmax(0,1.12fr)_380px]">
        <div className={fadeInClassName}>
          <Card
            data-tour-id="system-today-queue"
            className="h-full min-w-0 overflow-hidden rounded-[var(--r-tile)] border border-border bg-white/92 shadow-sm ring-1 ring-slate-200 sm:rounded-[var(--r-card)]"
          >
            <CardHeader className="min-w-0 [&>*+*]:mt-0 px-4 pt-4 pb-2 sm:px-7 sm:pt-7 sm:pb-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle as="h2" className="break-words text-foreground">Hàng việc hôm nay</CardTitle>
                  <CardDescription className="mt-1 break-words text-muted-foreground">
                    Làm việc đầu tiên trước, phần còn lại để sau.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 border-border bg-muted text-muted-foreground">
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
                    illustration={<EmptyTaskIllustration className="w-full text-violet-500" />}
                    icon={<Check className="h-5 w-5" />}
                    title={reviewDueToday ? "Tuần đã sẵn sàng để chốt review" : "Hết việc hôm nay"}
                    description={
                      reviewDueToday
                        ? "Mở tab Tuần để chốt review và khóa ưu tiên cho tuần sau."
                        : "Lưu check-in ngắn ở bên cạnh, hoặc mở tab Tuần để chuẩn bị review."
                    }
                    actions={
                      onOpenWeekTab && !reviewDueToday ? (
                        <Button variant="outline" onClick={onOpenWeekTab} className="bg-white">
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
                    illustration={<EmptyTaskIllustration className="w-full text-violet-500" />}
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
                <MotionStaggerList className="contents">
                  {todayQueue.map((task) => {
                  const taskCompleted = optimisticTaskCompletionById[task.id] ?? task.completed;
                  const isOverdue = !taskCompleted && task.scheduledDate < todayDateKey;
                  const isPrimaryTask = firstPriorityTask?.id === task.id && !taskCompleted;
                  const TaskStateIcon = taskCompleted ? TaskDoneIcon : isPrimaryTask ? TaskInProgressIcon : TaskTodoIcon;
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
                      className={`flex min-w-0 items-start gap-3 rounded-[var(--r-tile)] border p-4 shadow-sm ${
                        isPrimaryTask ? "border-foreground bg-foreground" : "border-border bg-white"
                      }`}
                    >
                      <Checkbox
                        aria-label={`Hoàn thành việc: ${task.title}`}
                        checked={taskCompleted}
                        className={`-m-2 mt-0 h-11 w-11 rounded-[var(--r-pill)] ${
                          isPrimaryTask
                            ? "border-white/30 bg-white/10 text-white data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-foreground"
                            : "border-border bg-white"
                        }`}
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
                                    : taskCompleted
                                      ? "text-[color:var(--color-success-fg)]"
                                      : "text-violet-500"
                                }`}
                              />
                              <p
                                className={`min-w-0 max-w-full break-words font-medium ${
                                  taskCompleted
                                    ? "text-[color:var(--color-success-bg)] line-through"
                                    : isPrimaryTask
                                      ? "text-white"
                                      : "text-foreground"
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
                                  : taskCompleted
                                    ? "text-muted-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {task.leadIndicatorName}
                            </p>
                            {showTaskCommitmentQuote ? (
                              <p
                                className={`mt-1 text-xs italic leading-5 ${
                                  isPrimaryTask && !taskCompleted ? "text-white/60" : "text-muted-foreground"
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
                                ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]"
                                : taskCompleted
                                  ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]"
                                  : isPrimaryTask
                                    ? "border-white/30 bg-white/10 text-white/90"
                                    : "border-border bg-muted text-muted-foreground"
                            }
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                        {isOverdue &&
                          (onRescheduleTaskWithinWeek ||
                            onRescheduleTaskToNextWeek ||
                            (onSkipNonCoreTask && !task.isCore)) && (
                            <div
                              data-testid={`overdue-actions-${task.id}`}
                              className="mt-[var(--space-inline)] flex flex-wrap items-center gap-2"
                            >
                              {onRescheduleTaskWithinWeek && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={
                                    isPrimaryTask
                                      ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                      : "bg-white"
                                  }
                                  onClick={() => onRescheduleTaskWithinWeek(task.id)}
                                  data-action="reschedule-within-week"
                                  aria-label={`Dời ${task.title} sang ngày khác trong tuần`}
                                >
                                  <CalendarClock className="mr-1 h-3.5 w-3.5" />
                                  Dời trong tuần
                                </Button>
                              )}
                              {onRescheduleTaskToNextWeek && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={
                                    isPrimaryTask
                                      ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                      : "bg-white"
                                  }
                                  onClick={() => onRescheduleTaskToNextWeek(task.id)}
                                  data-action="reschedule-next-week"
                                  aria-label={`Dời ${task.title} sang tuần sau`}
                                >
                                  <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                                  Sang tuần sau
                                </Button>
                              )}
                              {onSkipNonCoreTask && !task.isCore && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={
                                    isPrimaryTask ? "text-white/80 hover:bg-white/10" : "text-muted-foreground"
                                  }
                                  onClick={() => onSkipNonCoreTask(task.id)}
                                  data-action="skip-non-core"
                                  aria-label={`Bỏ qua việc tùy chọn ${task.title}`}
                                >
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Bỏ qua
                                </Button>
                              )}
                              {task.isCore && (onRescheduleTaskWithinWeek || onRescheduleTaskToNextWeek) && (
                                <span
                                  data-testid={`overdue-core-note-${task.id}`}
                                  className={`text-xs ${isPrimaryTask ? "text-white/60" : "text-muted-foreground"}`}
                                >
                                  Việc cốt lõi không thể bỏ — chỉ dời lịch.
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </MotionStaggerItem>
                  );
                })}
                </MotionStaggerList>
              )}
              {secondaryTodayTasks.length > 0 && (
                <details className="group min-w-0 rounded-[var(--r-control)] border border-border bg-muted px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
                    <span>Sau việc đầu tiên</span>
                    <span className="rounded-[var(--r-pill)] border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {secondaryTodayTasks.length} việc
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">Xong việc số 1 rồi mới mở danh sách này.</p>
                  <div className="mt-[var(--space-inline)] stack-tight">
                    {secondaryPreviewTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex min-w-0 items-center gap-3 rounded-[var(--r-control)] border border-border bg-white px-3 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--r-control)] bg-foreground text-xs font-semibold text-white">
                          {index + 2}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{task.leadIndicatorName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {remainingSecondaryTasks > 0 && (
                    <p className="mt-[var(--space-inline)] text-sm text-muted-foreground">
                      Còn {remainingSecondaryTasks} việc mở phía sau, chưa cần nghĩ tới ngay.
                    </p>
                  )}
                </details>
              )}
              <div className="rounded-[var(--r-control)] border border-border bg-muted p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Tiến độ tuần {currentWeek}</span>
                  <span className="font-semibold text-muted-foreground">{weekCompletion.percent}%</span>
                </div>
                <Progress value={weekCompletion.percent} className="mt-[var(--space-inline)] h-2.5" />
              </div>
              {primaryTaskCompletedToday && (
                <p
                  data-testid="today-primary-done-nudge"
                  className="rounded-[var(--r-control)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--color-success-fg)]"
                >
                  Việc chính đã xong — lưu check-in để chốt hôm nay.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <div
          className={fadeInClassName}
          style={{ animationDelay: '0.06s' }}
        >
          <Card className="h-full min-w-0 overflow-hidden rounded-[var(--r-tile)] border border-border bg-white/92 shadow-sm ring-1 ring-slate-200 sm:rounded-[var(--r-card)]">
            <CardHeader className="min-w-0 [&>*+*]:mt-0 px-4 pt-4 pb-2 sm:px-7 sm:pt-7 sm:pb-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle as="h2" className="flex items-center gap-2 break-words text-foreground">
                    <Gauge className="h-5 w-5 text-[color:var(--color-info-fg)]" />
                    Check-in 30 giây
                  </CardTitle>
                  <CardDescription className="mt-1 break-words text-muted-foreground">
                    Chọn năng lượng và ghi 1 ý ngắn nếu cần.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]">
                  {todayCompletedCount}/{checkInTotal}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 stack-tight px-4 pt-0 pb-4 sm:stack-stack sm:px-7 sm:pb-7">
              {todayCheckIn && (
                <div
                  data-testid="today-check-in-saved"
                  className="flex items-start gap-3 rounded-[var(--r-control)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] px-4 py-3 text-sm text-[color:var(--color-success-fg)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-success-fg)]" />
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
                  {MOOD_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={dailyMood === option.value}
                      aria-label={`${option.label}: ${option.hint}`}
                      variant="outline"
                      className={
                        dailyMood === option.value
                          ? "h-auto min-h-11 min-w-0 justify-center whitespace-normal border-[color:var(--color-info-border)] bg-[color:var(--tone-shell-primary)] px-2 py-2 text-center text-white hover:bg-[color:var(--tone-shell-primary)] sm:min-h-14 sm:justify-start sm:px-4 sm:py-3 sm:text-left"
                          : "h-auto min-h-11 min-w-0 justify-center whitespace-normal border-border bg-white px-2 py-2 text-center text-muted-foreground hover:bg-muted sm:min-h-14 sm:justify-start sm:px-4 sm:py-3 sm:text-left"
                      }
                      onClick={() => onDailyMoodChange(option.value)}
                    >
                      <span className="min-w-0 text-left">
                        <span className="block text-center text-sm font-semibold sm:text-left">{option.label}</span>
                        <span
                          className={`hidden break-words text-xs leading-5 sm:block ${dailyMood === option.value ? "text-white/72" : "text-muted-foreground"}`}
                        >
                          {option.hint}
                        </span>
                      </span>
                    </Button>
                  ))}
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
                ) : (
                  hasSavedTodayCheckIn ? "Cập nhật check-in hôm nay" : "Lưu check-in hôm nay"
                )}
              </Button>
              {reviewDueToday && onOpenWeekTab && (
                <Button
                  data-testid="today-check-in-open-week"
                  variant="outline"
                  className="w-full bg-white sm:w-auto"
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
                    className="rounded-[var(--r-control)] border border-border bg-muted p-4 text-sm text-muted-foreground"
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
        <div className="above-mobile-nav sm:hidden fixed inset-x-0 z-40 border-t border-slate-200 bg-white/96 backdrop-blur p-3">
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
