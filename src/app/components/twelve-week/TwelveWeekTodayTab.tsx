import { motion } from "motion/react";
import { useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, CalendarPlus, Check, Crown, Gauge, Inbox, Loader2, Sparkles, X } from "lucide-react";

import type { RescueModeStatus } from "@/features/plan12week/logic";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { EmptyState } from "../states";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";
import { formatCalendarDate } from "../../utils/storage";
import type { TwelveWeekTaskInstance, TwelveWeekSystem, UniversalDailyCheckIn } from "../../utils/storage-types";
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
  onToggleTask: (taskId: string, completed: boolean) => void;
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
export function TwelveWeekTodayTab({
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
  const primaryTaskOverdue = Boolean(primaryTask && primaryTask.scheduledDate < todayDateKey);
  const primaryTaskCompletedToday = Boolean(
    firstPriorityTask?.completed && todayQueue.some((task) => task.id === firstPriorityTask.id),
  );
  const isFirstWeek = currentWeek === 1;
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);

  const handleSaveCheckInClick = async () => {
    if (isSavingCheckIn) return;
    setIsSavingCheckIn(true);
    try {
      await Promise.resolve(onSaveCheckIn());
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  return (
    <div className="ops-system-panel flex min-w-0 flex-col gap-5">
      {rescueStatus && rescueStatus.severity !== "none" && (
        <TwelveWeekRescueNudge
          status={rescueStatus}
          variant="today"
          onPickTinyTask={onPickTinyTask}
          onQuickCheckIn={onSaveCheckIn}
          onOpenWeekTab={onOpenWeekTab}
          onReviewPlan={onReviewPlan ?? onNavigateToSetup}
        />
      )}
      {missedTasks.length > 0 && (
        <Card className="order-2 border border-amber-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(146,64,14,0.32)]">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-950">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Quay lại nhịp tuần này
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-slate-600">
                  Có {missedTasks.length} việc bị trễ. Không cần làm hết — chọn cách quay lại nhịp gọn nhất.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                {overdueOpenCount} việc trễ
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Tình trạng hiện tại
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {overdueOpenCount} việc đang trễ, {optionalOpenThisWeekCount} việc tùy chọn còn mở, và{" "}
                    {currentWeekTasksCount} việc còn mở trong tuần này.
                  </p>
                </div>
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 shadow-[0_18px_40px_-34px_rgba(109,40,217,0.18)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                        Gợi ý quay lại nhịp từ Plus
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.headline
                          : "Plus gợi ý nên dàn lại tuần, giảm tải hay dời lịch — không cần tự đoán."}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.reason
                          : "Plus không thêm việc, mà chỉ rõ cách quay lại nhịp nhẹ nhất ngay khi bạn bắt đầu trễ."}
                      </p>
                      {hasSmartRescue && rescuePlanSummary && (
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          Bước đầu nên làm: {rescuePlanSummary.firstMove}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-violet-600 text-white hover:bg-violet-600">
                      <Crown className="mr-1 h-3.5 w-3.5" />
                      Plus
                    </Badge>
                  </div>
                  {hasSmartRescue && rescuePlanSummary ? (
                    <Button className="mt-4 w-full sm:w-auto" onClick={onApplyRecommendedReentry}>
                      {getReentryModeLabel(rescuePlanSummary.recommendedMode)}
                    </Button>
                  ) : (
                    <Button className="mt-4 w-full sm:w-auto" onClick={onOpenSmartRescue}>
                      Mở Plus để có gợi ý phù hợp
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-3">
                {rescueModes.map((mode) => (
                  <div
                    key={mode}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.16)]"
                  >
                    <p className="text-sm font-semibold text-slate-950">{getReentryModeLabel(mode)}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {getReentryModeDescription(mode, {
                        overdueOpenCount,
                        optionalOpenThisWeekCount,
                        currentWeekOpenCount: currentWeekTasksCount,
                      })}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 w-full justify-between bg-white"
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
        <div
          data-testid="today-primary-hero"
          className={`order-1 rounded-[24px] border-2 p-4 shadow-[0_22px_50px_-34px_rgba(124,58,237,0.28)] sm:p-5 ${
            primaryTaskOverdue
              ? "border-amber-200 bg-amber-50/72"
              : "border-emerald-200 bg-white/96"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                {isFirstWeek ? "Việc đầu tiên của tuần 1" : "Việc quan trọng nhất hôm nay"}
              </p>
              <p className="mt-2 break-words text-lg font-semibold text-slate-950 sm:text-xl">
                {primaryTask.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {primaryTaskOverdue
                  ? `Việc này đang trễ — hôm nay làm phiên bản gọn nhất, đừng bỏ luôn. Làm đều '${primaryTask.leadIndicatorName}' quan trọng hơn làm hết.`
                  : isFirstWeek
                    ? `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Bắt đầu nhỏ — xong việc này là tuần 1 đã khởi động đúng hướng.`
                    : `Thuộc nhóm việc lặp lại '${primaryTask.leadIndicatorName}'. Xong việc này là tuần đã đi đúng hướng.`}
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-700">
                Chỉ cần xong việc này là hôm nay đã đủ. Phần còn lại để sau.
              </p>
              {isFirstWeek && (
                <p
                  data-testid="today-first-week-encouragement"
                  className="mt-2 text-sm leading-6 text-violet-800"
                >
                  Tuần đầu — bắt đầu nhỏ là quan trọng nhất. Không cần làm hết hôm nay, duy trì đến hết tuần.
                </p>
              )}
            </div>
            {primaryTaskOverdue && (
              <Badge variant="outline" className="border-amber-200 bg-white text-amber-800">
                Đang trễ
              </Badge>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              data-testid="today-primary-mark-done"
              size="lg"
              className="w-full gradient-brand text-white shadow-[0_18px_38px_-24px_rgba(109,40,217,0.52)] hover:shadow-[0_22px_44px_-24px_rgba(109,40,217,0.58)] hover:scale-[1.02]"
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
          </div>
        </div>
      )}

      <div className="order-1 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.12fr)_380px]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
          <Card
            data-tour-id="system-today-queue"
            className="h-full min-w-0 overflow-hidden border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(37,99,235,0.22)]"
          >
            <CardHeader className="min-w-0 space-y-0 pb-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="break-words text-slate-950">Hàng việc hôm nay</CardTitle>
                  <CardDescription className="mt-1 break-words text-slate-700">
                    Làm việc đầu tiên trước, phần còn lại để sau.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 border-slate-200 bg-slate-50 text-slate-700">
                  {todayCompletedCount}/{checkInTotal} xong
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3 pt-0">
              {todayQueue.length === 0 ? (
                hasPlanTasks ? (
                  <EmptyState
                    variant="dashed"
                    testId="today-empty-state"
                    icon={<Check className="h-5 w-5" />}
                    title={reviewDueToday ? "Tuần đã sẵn sàng để chốt review" : "Hết việc hôm nay"}
                    description={
                      reviewDueToday
                        ? "Mở tab Tuần để chốt review và khóa ưu tiên cho tuần sau."
                        : "Lưu check-in ngắn ở bên cạnh, hoặc mở tab Tuần để chuẩn bị review."
                    }
                    actions={
                      onOpenWeekTab ? (
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
                    icon={<Inbox className="h-5 w-5" />}
                    title="Chưa có việc nào trong chu kỳ này"
                    description={
                      hasLeadMetrics
                        ? "Chu kỳ đã có việc lặp lại, nhưng chưa có việc nào cho tuần này. Vào Setup để tạo lại chu kỳ."
                        : "Chu kỳ chưa có việc lặp lại. Vào Setup để thêm 2-4 việc lặp lại trước."
                    }
                    actions={
                      onNavigateToSetup ? (
                        <Button onClick={onNavigateToSetup}>
                          {hasLeadMetrics ? "Mở Setup để chỉnh" : "Đi tới Setup"}
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      ) : undefined
                    }
                  />
                )
              ) : (
                todayQueue.map((task) => {
                  const isOverdue = !task.completed && task.scheduledDate < todayDateKey;
                  const isPrimaryTask = firstPriorityTask?.id === task.id && !task.completed;
                  const statusLabel = task.completed
                    ? "Đã chốt"
                    : isOverdue
                      ? "Đang trễ"
                      : task.scheduledDate === todayDateKey
                        ? "Hôm nay"
                        : formatCalendarDate(task.scheduledDate);

                  return (
                    <div
                      key={task.id}
                      className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.28)] sm:p-4 ${
                        isPrimaryTask ? "border-slate-950 bg-slate-950" : "border-slate-200 bg-white"
                      }`}
                    >
                      <span
                        className="-m-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center p-2"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={(checked) => onToggleTask(task.id, checked === true)}
                          aria-label={`Đánh dấu việc ${task.title}`}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        {isPrimaryTask && (
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                            Việc ưu tiên số 1
                          </p>
                        )}
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={`min-w-0 max-w-full break-words font-medium ${
                                  task.completed
                                    ? "text-emerald-400 line-through"
                                    : isPrimaryTask
                                      ? "text-white"
                                      : "text-slate-900"
                                }`}
                              >
                                {task.title}
                              </p>
                              <Badge
                                variant={task.isCore ? "success" : "warning"}
                                className={
                                  isPrimaryTask && !task.completed
                                    ? "border-white/20 bg-white/10 text-white hover:bg-white/10"
                                    : ""
                                }
                              >
                                {task.isCore ? "Cốt lõi" : "Tùy chọn"}
                              </Badge>
                            </div>
                            <p
                              className={`mt-1 text-sm ${isPrimaryTask && !task.completed ? "text-slate-300" : "text-slate-500"}`}
                            >
                              {task.leadIndicatorName}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              isOverdue
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : task.completed
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : isPrimaryTask
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-slate-200 bg-slate-50 text-slate-700"
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
                              className="mt-3 flex flex-wrap items-center gap-2"
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
                                    isPrimaryTask ? "text-slate-200 hover:bg-white/10" : "text-slate-600"
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
                                  className={`text-xs ${isPrimaryTask ? "text-slate-300" : "text-slate-500"}`}
                                >
                                  Việc cốt lõi không thể bỏ — chỉ dời lịch.
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
              {secondaryTodayTasks.length > 0 && (
                <details className="group min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <span>Sau việc đầu tiên</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                      {secondaryTodayTasks.length} việc
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600">Xong việc số 1 rồi mới mở danh sách này.</p>
                  <div className="mt-3 space-y-2">
                    {secondaryPreviewTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                          {index + 2}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{task.leadIndicatorName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {remainingSecondaryTasks > 0 && (
                    <p className="mt-3 text-sm text-slate-500">
                      Còn {remainingSecondaryTasks} việc mở phía sau, chưa cần nghĩ tới ngay.
                    </p>
                  )}
                </details>
              )}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Tiến độ tuần {currentWeek}</span>
                  <span className="font-semibold text-slate-700">{weekCompletion.percent}%</span>
                </div>
                <Progress value={weekCompletion.percent} className="mt-3 h-2.5" />
              </div>
              {primaryTaskCompletedToday && (
                <p
                  data-testid="today-primary-done-nudge"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
                >
                  Việc chính đã xong — lưu check-in để chốt hôm nay.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="min-w-0"
        >
          <Card className="h-full min-w-0 overflow-hidden border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(124,58,237,0.18)]">
            <CardHeader className="min-w-0 space-y-0 pb-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 break-words text-slate-950">
                    <Gauge className="h-5 w-5 text-violet-600" />
                    Check-in 30 giây
                  </CardTitle>
                  <CardDescription className="mt-1 break-words text-slate-700">
                    Chọn năng lượng và ghi 1 ý ngắn nếu cần.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 border-violet-200 bg-violet-50 text-violet-700">
                  {todayCompletedCount}/{checkInTotal}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-4 pt-0">
              <div className="space-y-3">
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
                          ? "h-auto min-h-11 min-w-0 justify-center whitespace-normal border-violet-300 bg-violet-600 px-2 py-2 text-center text-white hover:bg-violet-600 sm:min-h-14 sm:justify-start sm:px-4 sm:py-3 sm:text-left"
                          : "h-auto min-h-11 min-w-0 justify-center whitespace-normal border-slate-200 bg-white px-2 py-2 text-center text-slate-700 hover:bg-slate-50 sm:min-h-14 sm:justify-start sm:px-4 sm:py-3 sm:text-left"
                      }
                      onClick={() => onDailyMoodChange(option.value)}
                    >
                      <span className="min-w-0 text-left">
                        <span className="block text-center text-sm font-semibold sm:text-left">{option.label}</span>
                        <span
                          className={`hidden break-words text-xs leading-5 sm:block ${dailyMood === option.value ? "text-white/72" : "text-slate-500"}`}
                        >
                          {option.hint}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
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
                className="w-full gradient-brand text-white shadow-[0_18px_38px_-24px_rgba(109,40,217,0.52)] hover:shadow-[0_22px_44px_-24px_rgba(109,40,217,0.58)] hover:scale-[1.02] sm:w-auto"
                onClick={handleSaveCheckInClick}
                disabled={isSavingCheckIn}
                aria-busy={isSavingCheckIn}
              >
                {isSavingCheckIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Đang lưu check-in...
                  </>
                ) : (
                  "Lưu check-in hôm nay"
                )}
              </Button>
              {latestCheckIn && (
                <div
                  aria-live="polite"
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
                >
                  Check-in gần nhất: {formatCalendarDate(latestCheckIn.date)} • năng lượng{" "}
                  {getMoodLabel((latestCheckIn.mood as DailyMood | undefined) ?? "steady")}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
