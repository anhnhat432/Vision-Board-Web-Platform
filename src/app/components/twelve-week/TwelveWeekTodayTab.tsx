import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Crown, Gauge, ListChecks } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
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
}
export function TwelveWeekTodayTab({
  system,
  currentWeek,
  currentWeekRange,
  currentPlanFocus,
  reviewDueToday,
  reviewStatusLabel,
  currentWeekScoreValue,
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
}: TwelveWeekTodayTabProps) {
  const secondaryPreviewTasks = secondaryTodayTasks.slice(0, 2);
  const remainingSecondaryTasks = Math.max(secondaryTodayTasks.length - secondaryPreviewTasks.length, 0);
  const rescueModes: ReentryMode[] = ["restart", "lighten", "push"];
  const checkInTotal = todayQueue.length || currentWeekTasksCount || 1;

  return (
    <div className="ops-system-panel space-y-5 pt-4">
      {missedTasks.length > 0 && (
        <Card className="border border-amber-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(146,64,14,0.32)]">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-950">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Cứu nhịp tuần này
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-slate-600">
                  Bạn đang có {missedTasks.length} việc bị trễ. Mục tiêu lúc này không phải làm hết, mà là chọn cách
                  quay lại nhịp gọn nhất.
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
                        Gợi ý cứu nhịp của Plus
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.headline
                          : "Plus sẽ gợi ý nên dàn lại tuần, giảm tải hay dời lịch để bạn không phải tự đoán."}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {hasSmartRescue && rescuePlanSummary
                          ? rescuePlanSummary.reason
                          : "Điểm khác của Plus không phải thêm việc, mà là chỉ rõ cách quay lại nhịp nhẹ đầu nhất ngay lúc bạn bắt đầu trễ."}
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
                      Mở Plus để có rescue thông minh
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <Card
          interactive={false}
          className="border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-38px_rgba(15,23,42,0.34)]"
        >
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Làm ngay bây giờ
                </p>
                <h2 className="mt-3 max-w-3xl break-words text-2xl font-bold text-slate-950 sm:text-3xl">
                  {reviewDueToday
                    ? "Chốt review tuần"
                    : firstPriorityTask
                      ? firstPriorityTask.title
                      : "Hôm nay đang khá gọn"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {reviewDueToday
                    ? "Tuần này đã đi đến lúc khóa lại. Chốt review trước sẽ giúp bạn bước sang tuần mới gọn đầu hơn."
                    : firstPriorityTask
                      ? `${firstPriorityTask.leadIndicatorName} • ${
                          firstPriorityTask.isCore
                            ? "Đây là việc cốt lõi nên làm trước."
                            : "Đây là việc tùy chọn nếu bạn còn sức."
                        }`
                      : "Bạn đã đi qua phần việc mở của hôm nay. Có thể tranh thủ nhìn lại tuần hoặc chuẩn bị review."}
                </p>
              </div>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-left sm:w-auto sm:min-w-40 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Điểm tuần</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{currentWeekScoreValue}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {weekCompletion.completed}/{weekCompletion.total} việc đã chốt
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <ListChecks className="h-3.5 w-3.5" />
                  Việc mở hôm nay
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{todayRemainingCount}</p>
                <p className="mt-1 text-sm text-slate-500">{todayCompletedCount} việc đã chốt</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Việc bị trễ
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{overdueOpenCount}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {overdueOpenCount > 0 ? "Có thể giảm tải bằng re-entry." : "Nhịp tuần đang khá gọn."}
                </p>
              </div>
              <div
                className={`rounded-lg border px-4 py-4 ${reviewDueToday ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
              >
                <p
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${reviewDueToday ? "text-amber-700" : "text-slate-500"}`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Review tuần
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}
                </p>
                <p className="mt-1 text-sm text-slate-500">{reviewStatusLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border border-slate-200/80 bg-slate-50/80 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.26)]"
        >
          <CardHeader>
            <CardTitle className="text-slate-950">Tuần này đang ở đâu</CardTitle>
            <CardDescription className="text-slate-700">
              Ba tín hiệu để bạn định hướng nhanh mà không phải đọc cả màn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tuần hiện tại</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                Tuần {currentWeek}/{system.totalWeeks}
              </p>
              {currentWeekRange && (
                <p className="mt-1 text-sm text-slate-500">
                  {formatCalendarDate(currentWeekRange.start)} - {formatCalendarDate(currentWeekRange.end)}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tactic đang giữ nhịp</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{coreTacticCount}</p>
              <p className="mt-1 text-sm text-slate-500">{optionalTacticCount} tactic tùy chọn nếu còn sức</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ưu tiên tuần</p>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-900">{currentPlanFocus}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_380px]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            data-tour-id="system-today-queue"
            className="h-full border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(37,99,235,0.22)]"
          >
            <CardHeader>
              <CardTitle className="text-slate-950">Hàng việc hôm nay</CardTitle>
              <CardDescription className="text-slate-700">
                Bắt đầu từ việc đầu tiên. Nếu xong rồi mới nhìn sang việc tiếp theo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayQueue.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-600">
                  {hasPlanTasks ? (
                    "Không có việc nào đang chờ lúc này. Đây là lúc đẹp để chốt review hoặc làm mới nhịp cho gọn."
                  ) : (
                    <div className="mx-auto max-w-lg space-y-2">
                      <p className="font-semibold text-slate-900">Chưa có việc nào trong chu kỳ này</p>
                      <p className="text-sm leading-6 text-slate-600">
                        {hasLeadMetrics
                          ? "Chu kỳ đã có tactic, nhưng chưa có task nào được tạo cho tuần hiện tại. Hãy kiểm tra lại setup hoặc tạo lại chu kỳ."
                          : "Chu kỳ chưa có tactic/lead metric, nên dashboard chưa thể tạo hàng việc hôm nay."}
                      </p>
                    </div>
                  )}
                </div>
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
                      className={`flex items-start gap-3 rounded-lg border p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.28)] ${
                        isPrimaryTask ? "border-slate-950 bg-slate-950" : "border-slate-200 bg-white"
                      }`}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => onToggleTask(task.id, checked === true)}
                        aria-label={`Đánh dấu việc ${task.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        {isPrimaryTask && (
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                            Việc ưu tiên số 1
                          </p>
                        )}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={`break-words font-medium ${
                                  task.completed
                                    ? "text-slate-400 line-through"
                                    : isPrimaryTask
                                      ? "text-white"
                                      : "text-slate-900"
                                }`}
                              >
                                {task.title}
                              </p>
                              <Badge
                                variant={task.isCore ? "default" : "outline"}
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
                      </div>
                    </div>
                  );
                })
              )}
              {secondaryTodayTasks.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sau việc đầu tiên</p>
                  <p className="mt-2 text-sm text-slate-600">Xong việc số 1 rồi mới nhìn sang các bước này.</p>
                  <div className="mt-3 space-y-2">
                    {secondaryPreviewTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3"
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
                </div>
              )}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Tiến độ tuần {currentWeek}</span>
                  <span className="font-semibold text-slate-700">{weekCompletion.percent}%</span>
                </div>
                <Progress value={weekCompletion.percent} className="mt-3 h-2.5" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card className="h-full border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(124,58,237,0.18)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <Gauge className="h-5 w-5 text-violet-600" />
                Check-in 30 giây
              </CardTitle>
              <CardDescription className="text-slate-700">
                Tick việc trước, rồi chỉ ghi phần thật sự cần nhớ cho ngày mai.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bước 1</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Tick việc đã xong</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bước 2</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Chọn mức năng lượng</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bước 3</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Lưu lại trong 1 chạm</p>
                </div>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Hôm nay bạn đã chốt {todayCompletedCount}/{checkInTotal} việc
                </p>
                <p className="mt-1 text-sm text-slate-600">Check-in càng ngắn thì càng dễ giữ đều mỗi ngày.</p>
              </div>
              <div className="space-y-3">
                <Label id="daily-mood-label">Năng lượng hôm nay</Label>
                <div role="radiogroup" aria-labelledby="daily-mood-label" className="grid gap-2">
                  {MOOD_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={dailyMood === option.value}
                      variant="outline"
                      className={
                        dailyMood === option.value
                          ? "h-auto min-h-16 justify-start whitespace-normal border-violet-300 bg-violet-600 px-4 py-3 text-left text-white hover:bg-violet-600"
                          : "h-auto min-h-16 justify-start whitespace-normal border-slate-200 bg-white px-4 py-3 text-left text-slate-700 hover:bg-slate-50"
                      }
                      onClick={() => onDailyMoodChange(option.value)}
                    >
                      <span className="min-w-0 text-left">
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span
                          className={`block break-words text-xs leading-5 ${dailyMood === option.value ? "text-white/72" : "text-slate-500"}`}
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
                  rows={3}
                  value={dailyNote}
                  onChange={(event) => onDailyNoteChange(event.target.value)}
                  placeholder="Nếu cần, chỉ ghi đúng một ý để ngày mai đỡ quên."
                />
              </div>
              <Button className="w-full sm:w-auto" onClick={onSaveCheckIn}>
                Lưu check-in hôm nay
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
