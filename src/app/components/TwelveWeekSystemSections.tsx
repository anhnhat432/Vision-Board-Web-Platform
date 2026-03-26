import { motion } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Crown,
  Flag,
  RotateCcw,
  Settings2,
  Target,
} from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { formatCalendarDate, getReviewDayLabel } from "../utils/storage";
import type {
  AppPreferences,
  BillingProviderMode,
  EntitlementKey,
  FunnelStepSummary,
  InAppReminder,
  LeadIndicator,
  PricingPlanCode,
  SyncOutboxItem,
  TwelveWeekTaskInstance,
  TwelveWeekSystem,
  UniversalDailyCheckIn,
} from "../utils/storage-types";
import type { BrowserNotificationStatus, OutboxSyncSnapshot } from "../utils/production";
import type { BillingActionSnapshot, BillingProviderStatus } from "../utils/billing-contract";
import {
  getBillingActionStatusLabel,
  getBillingProviderModeLabel,
  getBillingReadinessLabel,
} from "../utils/billing-contract";
import {
  getEntitlementLabel,
  getPlanDefinition,
  getPlanLabel,
  type SuggestedNextWeekPlan,
  type WeeklyReviewPremiumInsight,
} from "../utils/twelve-week-premium";
import {
  MOOD_OPTIONS,
  LOAD_OPTIONS,
  type RescuePlanSummary,
  REVIEW_DAYS,
  type ReentryMode,
  STATUS_OPTIONS,
  WORKLOAD_OPTIONS,
  type DailyMood,
  getReentryModeDescription,
  getReentryModeLabel,
  formatDateTimeLabel,
  getBrowserNotificationStatusLabel,
  getMoodLabel,
  getOutboxSummaryText,
  getOutboxTypeLabel,
  getReminderActionLabel,
  getSyncStatusLabel,
  getWorkloadDecisionLabel,
} from "../utils/twelve-week-system-ui";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

interface MilestoneItem {
  label: string;
  value: string;
}

interface TwelveWeekProgressTabProps {
  system: TwelveWeekSystem;
  currentWeek: number;
  currentWeekRange: WeekRange | null;
  currentWeekScoreValue: number;
  averageScore: number;
  reviewDoneCount: number;
  weekCompletion: WeekCompletionSummary;
  milestoneItems: MilestoneItem[];
}

interface TwelveWeekSettingsTabProps {
  system: TwelveWeekSystem;
  currentPlanCode: PricingPlanCode;
  entitlementKeys: EntitlementKey[];
  billingProviderStatus: BillingProviderStatus;
  lastEntitlementSyncSnapshot: BillingActionSnapshot | null;
  lastRestoreAccessSnapshot: BillingActionSnapshot | null;
  appPreferences: AppPreferences;
  funnelSteps: FunnelStepSummary[];
  monetizationSteps: FunnelStepSummary[];
  browserNotificationStatus: BrowserNotificationStatus;
  lastSyncSnapshot: OutboxSyncSnapshot | null;
  pendingOutboxCount: number;
  archivedOutboxCount: number;
  eventCount: number;
  activeReminders: InAppReminder[];
  recentOutboxItems: SyncOutboxItem[];
  isSyncingEntitlements: boolean;
  isRestoringPlanAccess: boolean;
  onReviewDayChange: (value: string) => void;
  onReminderTimeChange: (value: string) => void;
  onLoadPreferenceChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTacticPriorityChange: (tacticId: string | undefined, value: string) => void;
  onTacticTypeChange: (tacticId: string | undefined, value: string) => void;
  onPreferenceToggle: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
  onArchivePendingOutbox: () => void;
  onRestoreArchivedOutbox: () => void;
  onOpenReminder: (reminder: InAppReminder) => void;
  onExportLocalData: () => void;
  onBrowserNotificationToggle: (value: boolean) => void;
  onRunOutboxSync: () => void;
  onOutboxItemToggle: (item: SyncOutboxItem) => void;
  onClearEventLog: () => void;
  onClearArchivedOutbox: () => void;
  onOpenClearLocalDialog: () => void;
  onOpenResetDialog: () => void;
  onOpenUpgradePlan: (planCode: Exclude<PricingPlanCode, "FREE">) => void;
  onSyncEntitlements: () => void;
  onRestorePlanAccess: () => void;
  onOpenBillingPortal: () => void;
  onNavigateGoals: () => void;
  onNavigateJournal: () => void;
  onNavigateSetup: () => void;
}

interface TwelveWeekWeeklyReviewForm {
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  nextWeekPriority: string;
  workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
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

interface TwelveWeekWeekTabProps {
  system: TwelveWeekSystem;
  currentWeekRange: WeekRange | null;
  currentPlanFocus: string;
  currentPlanMilestone: string;
  reviewDueToday: boolean;
  reviewStatusLabel: string;
  currentScoreValue: number;
  weekCompletion: WeekCompletionSummary;
  currentLagMetricValue: string;
  coreIndicators: LeadIndicator[];
  optionalIndicators: LeadIndicator[];
  currentPlanCode: PricingPlanCode;
  hasPremiumInsights: boolean;
  premiumInsight: WeeklyReviewPremiumInsight;
  suggestedNextWeekPlan: SuggestedNextWeekPlan;
  weeklyForm: TwelveWeekWeeklyReviewForm;
  onWeeklyFormChange: (field: keyof TwelveWeekWeeklyReviewForm, value: string) => void;
  onApplySuggestedPlan: () => void;
  onOpenPremiumInsights: () => void;
  onSaveWeeklyReview: () => void;
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

  return (
    <div className="space-y-6 pt-4">
      {missedTasks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              Cứu nhịp tuần này
            </CardTitle>
            <CardDescription>
              Bạn đang có {missedTasks.length} việc bị trễ. Mục tiêu lúc này không phải làm hết, mà là chọn cách quay lại nhịp gọn nhất.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-3">
                <div className="rounded-[22px] border border-amber-200 bg-white/86 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Tình trạng hiện tại</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {overdueOpenCount} việc đang trễ, {optionalOpenThisWeekCount} việc tùy chọn còn mở, và {currentWeekTasksCount} việc còn mở trong tuần này.
                  </p>
                </div>
                <div className="rounded-[22px] border border-violet-200 bg-[linear-gradient(180deg,_rgba(245,243,255,0.96)_0%,_rgba(237,233,254,0.88)_100%)] p-4 shadow-[0_18px_40px_-34px_rgba(109,40,217,0.18)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
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
                    <Button className="mt-4" onClick={onApplyRecommendedReentry}>
                      {getReentryModeLabel(rescuePlanSummary.recommendedMode)}
                    </Button>
                  ) : (
                    <Button className="mt-4" onClick={onOpenSmartRescue}>
                      Mở Plus để có rescue thông minh
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-3">
                {rescueModes.map((mode) => (
                  <div key={mode} className="rounded-[22px] border border-white/75 bg-white/86 p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.16)]">
                    <p className="text-sm font-semibold text-slate-950">{getReentryModeLabel(mode)}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {getReentryModeDescription(mode, {
                        overdueOpenCount,
                        optionalOpenThisWeekCount,
                        currentWeekOpenCount: currentWeekTasksCount,
                      })}
                    </p>
                    <Button variant="outline" className="mt-3 w-full bg-white" onClick={() => onReentry(mode)}>
                      Áp dụng cách này
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
          className={
            firstPriorityTask
              ? "border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.96)_45%,_rgba(37,99,235,0.84)_100%)] text-white shadow-[0_34px_80px_-36px_rgba(15,23,42,0.78)]"
              : "border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.95)_58%,_rgba(71,85,105,0.88)_100%)] text-white shadow-[0_34px_80px_-36px_rgba(15,23,42,0.72)]"
          }
        >
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">Làm ngay bây giờ</p>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  {reviewDueToday
                    ? "Chốt review tuần"
                    : firstPriorityTask
                      ? firstPriorityTask.title
                      : "Hôm nay đang khá gọn"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/74">
                  {reviewDueToday
                    ? "Tuần này đã đi đến lúc khóa lại. Chốt review trước sẽ giúp bạn bước sang tuần mới gọn đầu hơn."
                    : firstPriorityTask
                      ? `${firstPriorityTask.leadIndicatorName} • ${
                          firstPriorityTask.isCore ? "Đây là việc cốt lõi nên làm trước." : "Đây là việc tùy chọn nếu bạn còn sức."
                        }`
                      : "Bạn đã đi qua phần việc mở của hôm nay. Có thể tranh thủ nhìn lại tuần hoặc chuẩn bị review."}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-right shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)]">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Điểm tuần</p>
                <p className="mt-2 text-3xl font-bold text-white">{currentWeekScoreValue}</p>
                <p className="mt-1 text-sm text-white/68">
                  {weekCompletion.completed}/{weekCompletion.total} việc đã chốt
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Việc mở hôm nay</p>
                <p className="mt-2 text-2xl font-bold text-white">{todayRemainingCount}</p>
                <p className="mt-1 text-sm text-white/68">{todayCompletedCount} việc đã chốt</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Việc bị trễ</p>
                <p className="mt-2 text-2xl font-bold text-white">{overdueOpenCount}</p>
                <p className="mt-1 text-sm text-white/68">
                  {overdueOpenCount > 0 ? "Có thể giảm tải bằng re-entry." : "Nhịp tuần đang khá gọn."}
                </p>
              </div>
              <div
                className={`rounded-[22px] border px-4 py-4 ${
                  reviewDueToday ? "border-amber-200 bg-amber-50 text-slate-950" : "border-white/10 bg-white/8 text-white"
                }`}
              >
                <p className={`text-xs uppercase tracking-[0.16em] ${reviewDueToday ? "text-amber-700" : "text-white/56"}`}>
                  Review tuần
                </p>
                <p className="mt-2 text-2xl font-bold">{reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}</p>
                <p className={`mt-1 text-sm ${reviewDueToday ? "text-slate-600" : "text-white/68"}`}>{reviewStatusLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(226,232,240,0.86)_0%,_rgba(203,213,225,0.7)_100%)] shadow-[0_30px_70px_-38px_rgba(15,23,42,0.3)]"
        >
          <CardHeader>
            <CardTitle className="text-slate-950">Tuần này đang ở đâu</CardTitle>
            <CardDescription className="text-slate-700">Ba tín hiệu để bạn định hướng nhanh mà không phải đọc cả màn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[22px] border border-white/45 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tuần hiện tại</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">Tuần {currentWeek}/{system.totalWeeks}</p>
              {currentWeekRange && (
                <p className="mt-1 text-sm text-slate-500">
                  {formatCalendarDate(currentWeekRange.start)} - {formatCalendarDate(currentWeekRange.end)}
                </p>
              )}
            </div>
            <div className="rounded-[22px] border border-white/45 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tactic đang giữ nhịp</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{coreTacticCount}</p>
              <p className="mt-1 text-sm text-slate-500">{optionalTacticCount} tactic tùy chọn nếu còn sức</p>
            </div>
            <div className="rounded-[22px] border border-white/45 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ưu tiên tuần</p>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-900">{currentPlanFocus}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_380px]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full border-0 bg-[linear-gradient(180deg,_rgba(237,246,255,0.9)_0%,_rgba(224,236,250,0.84)_100%)] shadow-[0_30px_70px_-40px_rgba(37,99,235,0.24)]">
            <CardHeader>
              <CardTitle className="text-slate-950">Hàng việc hôm nay</CardTitle>
              <CardDescription className="text-slate-700">
                Bắt đầu từ việc đầu tiên. Nếu xong rồi mới nhìn sang việc tiếp theo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayQueue.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/68 px-6 py-10 text-center text-slate-600">
                  Không có việc nào đang chờ lúc này. Đây là lúc đẹp để chốt review hoặc làm mới nhịp cho gọn.
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
                      className={`flex items-start gap-3 rounded-[24px] border p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.28)] ${
                        isPrimaryTask
                          ? "border-sky-300 bg-[linear-gradient(135deg,_rgba(8,47,73,0.95)_0%,_rgba(3,105,161,0.9)_100%)]"
                          : "border-white/70 bg-white/86"
                      }`}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => onToggleTask(task.id, checked === true)}
                        aria-label={`Đánh dấu việc ${task.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        {isPrimaryTask && (
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
                            Việc ưu tiên số 1
                          </p>
                        )}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={`font-medium ${
                                  task.completed ? "text-slate-400 line-through" : isPrimaryTask ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {task.title}
                              </p>
                              <Badge
                                variant={task.isCore ? "default" : "outline"}
                                className={isPrimaryTask && !task.completed ? "border-white/20 bg-white/10 text-white hover:bg-white/10" : ""}
                              >
                                {task.isCore ? "Cốt lõi" : "Tùy chọn"}
                              </Badge>
                            </div>
                            <p className={`mt-1 text-sm ${isPrimaryTask && !task.completed ? "text-sky-100/90" : "text-slate-500"}`}>
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
                <div className="rounded-[24px] border border-white/70 bg-white/72 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sau việc đầu tiên</p>
                  <p className="mt-2 text-sm text-slate-600">Xong việc số 1 rồi mới nhìn sang các bước này.</p>
                  <div className="mt-3 space-y-2">
                    {secondaryPreviewTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white/92 px-3 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
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
                    <p className="mt-3 text-sm text-slate-500">Còn {remainingSecondaryTasks} việc mở phía sau, chưa cần nghĩ tới ngay.</p>
                  )}
                </div>
              )}
              <div className="rounded-[24px] border border-white/70 bg-white/72 p-4">
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
          <Card className="h-full border-0 bg-[linear-gradient(180deg,_rgba(245,239,255,0.92)_0%,_rgba(233,226,255,0.82)_100%)] shadow-[0_30px_70px_-40px_rgba(124,58,237,0.24)]">
            <CardHeader>
              <CardTitle className="text-slate-950">Check-in 30 giây</CardTitle>
              <CardDescription className="text-slate-700">Tick việc trước, rồi chỉ ghi phần thật sự cần nhớ cho ngày mai.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[20px] border border-white/70 bg-white/72 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bước 1</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Tick việc đã xong</p>
                </div>
                <div className="rounded-[20px] border border-white/70 bg-white/72 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bước 2</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Chọn mức năng lượng</p>
                </div>
                <div className="rounded-[20px] border border-white/70 bg-white/72 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bước 3</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Lưu lại trong 1 chạm</p>
                </div>
              </div>
              <div className="rounded-[22px] border border-white/70 bg-white/72 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Hôm nay bạn đã chốt {todayCompletedCount}/{todayQueue.length || currentWeekTasksCount || 1} việc
                </p>
                <p className="mt-1 text-sm text-slate-600">Check-in càng ngắn thì càng dễ giữ đều mỗi ngày.</p>
              </div>
              <div className="space-y-3">
                <Label id="daily-mood-label">Năng lượng hôm nay</Label>
                <div
                  role="radiogroup"
                  aria-labelledby="daily-mood-label"
                  className="grid gap-2 md:grid-cols-3"
                >
                  {MOOD_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={dailyMood === option.value}
                      aria-pressed={dailyMood === option.value}
                      variant="outline"
                      className={
                        dailyMood === option.value
                          ? "h-auto min-h-16 justify-start border-violet-300 bg-[linear-gradient(135deg,_rgba(76,29,149,0.95)_0%,_rgba(109,40,217,0.88)_100%)] px-4 py-3 text-white"
                          : "h-auto min-h-16 justify-start border-white/70 bg-white/78 px-4 py-3 text-slate-700"
                      }
                      onClick={() => onDailyMoodChange(option.value)}
                    >
                      <span className="text-left">
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className={`block text-xs ${dailyMood === option.value ? "text-white/72" : "text-slate-500"}`}>{option.hint}</span>
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
                <div aria-live="polite" className="rounded-[22px] border border-white/70 bg-white/72 p-4 text-sm text-slate-600">
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

export function TwelveWeekWeekTab({
  system,
  currentWeekRange,
  currentPlanFocus,
  currentPlanMilestone,
  reviewDueToday,
  reviewStatusLabel,
  currentScoreValue,
  weekCompletion,
  currentLagMetricValue,
  coreIndicators,
  optionalIndicators,
  currentPlanCode,
  hasPremiumInsights,
  premiumInsight,
  suggestedNextWeekPlan,
  weeklyForm,
  onWeeklyFormChange,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
  onSaveWeeklyReview,
}: TwelveWeekWeekTabProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card interactive={false} className="border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.94)_100%)] text-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.7)]">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Một câu để nhớ</p>
            <p className="mt-3 text-lg font-semibold leading-8 text-white">{currentPlanFocus}</p>
          </CardContent>
        </Card>
        <Card interactive={false} className="border-0 bg-[linear-gradient(180deg,_rgba(219,234,254,0.92)_0%,_rgba(191,219,254,0.76)_100%)] shadow-[0_24px_60px_-36px_rgba(37,99,235,0.24)]">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tiến độ tuần</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{weekCompletion.percent}%</p>
            <p className="mt-1 text-sm text-slate-600">{weekCompletion.completed}/{weekCompletion.total} việc đã chốt</p>
          </CardContent>
        </Card>
        <Card
          interactive={false}
          className={
            reviewDueToday
              ? "border-0 bg-[linear-gradient(180deg,_rgba(254,243,199,0.96)_0%,_rgba(253,230,138,0.82)_100%)] shadow-[0_24px_60px_-36px_rgba(217,119,6,0.24)]"
              : "border-0 bg-[linear-gradient(180deg,_rgba(240,253,244,0.94)_0%,_rgba(209,250,229,0.8)_100%)] shadow-[0_24px_60px_-36px_rgba(5,150,105,0.2)]"
          }
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Review tuần</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}</p>
            <p className="mt-1 text-sm text-slate-600">{reviewStatusLabel}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="h-full border-0 bg-[linear-gradient(180deg,_rgba(238,242,255,0.94)_0%,_rgba(224,231,255,0.82)_100%)] shadow-[0_30px_70px_-40px_rgba(99,102,241,0.22)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Tuần này chỉ cần giữ 2 lớp việc</CardTitle>
            <CardDescription className="text-slate-700">
              {currentWeekRange ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}` : "Chu kỳ hiện tại"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ưu tiên tuần</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{currentPlanFocus}</p>
              {currentPlanMilestone && (
                <p className="mt-3 text-sm text-slate-600">Cột mốc đang nhắm tới: {currentPlanMilestone}</p>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Cốt lõi trước</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{coreIndicators.length} tactic giữ nhịp chính</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{coreIndicators.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {coreIndicators.map((indicator) => (
                    <div key={indicator.id || indicator.name} className="rounded-2xl border border-white/80 bg-white/92 px-4 py-3">
                      <p className="font-medium text-slate-900">{indicator.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-amber-700">Tùy chọn nếu còn sức</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {optionalIndicators.length > 0 ? `${optionalIndicators.length} tactic bổ sung` : "Không có tactic tùy chọn"}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-200 bg-white text-amber-800">
                    {optionalIndicators.length}
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {optionalIndicators.length === 0 ? (
                    <div className="rounded-2xl border border-white/80 bg-white/92 px-4 py-4 text-sm text-slate-500">
                      Tuần này bạn chỉ cần giữ các tactic cốt lõi là đủ.
                    </div>
                  ) : (
                    optionalIndicators.map((indicator) => (
                      <div key={indicator.id || indicator.name} className="rounded-2xl border border-white/80 bg-white/92 px-4 py-3">
                        <p className="font-medium text-slate-900">{indicator.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full border-0 bg-[linear-gradient(180deg,_rgba(250,245,255,0.94)_0%,_rgba(243,232,255,0.84)_100%)] shadow-[0_30px_70px_-40px_rgba(168,85,247,0.2)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Review tuần</CardTitle>
            <CardDescription className="text-slate-700">Chỉ 3 câu phản tư và 1 quyết định cho tuần sau.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-[24px] border p-4 ${reviewDueToday ? "border-amber-200 bg-amber-50/80" : "border-slate-200 bg-slate-50/88"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    {reviewDueToday ? "Hôm nay là ngày chốt review tuần." : `Review chính thức vào ${getReviewDayLabel(system.reviewDay)}.`}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {reviewDueToday
                      ? "Chốt ngay hôm nay để tuần sau bắt đầu nhẹ đầu hơn."
                      : "Bạn vẫn có thể ghi trước phần phản tư để đến ngày review chỉ cần chốt lại."}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={reviewDueToday ? "border-amber-200 bg-white text-amber-800" : "border-slate-300 bg-white text-slate-700"}
                >
                  {reviewDueToday ? "Nên chốt hôm nay" : "Chưa đến hạn"}
                </Badge>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/68 p-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Điểm tự động</span>
                <span className="font-semibold text-slate-700">{currentScoreValue}</span>
              </div>
              <Progress value={currentScoreValue} className="mt-3 h-2.5" />
              <p className="mt-3 text-sm text-slate-500">Chỉ số chính: {currentLagMetricValue || "Chưa cập nhật"}</p>
            </div>
            <div
              className={`rounded-[24px] border p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] ${
                hasPremiumInsights
                  ? "border-sky-200 bg-[linear-gradient(180deg,_rgba(239,246,255,0.96)_0%,_rgba(219,234,254,0.9)_100%)]"
                  : "border-violet-200 bg-[linear-gradient(180deg,_rgba(245,243,255,0.96)_0%,_rgba(237,233,254,0.88)_100%)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Insight review premium
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{premiumInsight.headline}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{premiumInsight.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      hasPremiumInsights
                        ? "border-sky-200 bg-white/90 text-sky-800"
                        : "border-violet-200 bg-white/90 text-violet-800"
                    }
                  >
                    {premiumInsight.badgeLabel}
                  </Badge>
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {getPlanLabel(currentPlanCode)}
                  </Badge>
                </div>
              </div>

              {hasPremiumInsights ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[20px] border border-white/70 bg-white/82 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gợi ý chỉnh tải</p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.recommendedAdjustment}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/70 bg-white/82 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Coach note</p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.coachNote}</p>
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-sky-200 bg-white/88 p-4 shadow-[0_18px_40px_-34px_rgba(2,132,199,0.18)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Kế hoạch gợi ý cho tuần sau</p>
                        <p className="mt-2 text-base font-semibold leading-7 text-slate-950">
                          {suggestedNextWeekPlan.focus}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {suggestedNextWeekPlan.rationale}
                        </p>
                      </div>
                      <Badge className="bg-sky-700 text-white hover:bg-sky-700">
                        {getWorkloadDecisionLabel(suggestedNextWeekPlan.workloadDecision)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] border border-white/70 bg-slate-50/90 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Giữ chắc</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {suggestedNextWeekPlan.protectTactics.map((item) => (
                            <Badge key={item} variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[18px] border border-white/70 bg-slate-50/90 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          {suggestedNextWeekPlan.secondaryTrackLabel}
                        </p>
                        <div className="mt-2 space-y-2">
                          {suggestedNextWeekPlan.secondaryTrackItems.map((item) => (
                            <p key={item} className="text-sm leading-6 text-slate-700">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      Bước đầu tuần nên làm: {suggestedNextWeekPlan.firstMove}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button onClick={onApplySuggestedPlan}>Dùng gợi ý này cho tuần sau</Button>
                      <p className="text-sm text-slate-500">Bạn vẫn có thể sửa lại trước khi chốt review.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[20px] border border-violet-200/70 bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Mở Plus để review sâu hơn và ra luôn một plan tuần sau đủ gọn để làm.
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Plus không chỉ cho bạn insight để đọc. Nó chốt luôn ưu tiên tuần sau, mức tải nên giữ và phần nào nên buông bớt.
                      </p>
                    </div>
                    <Badge className="bg-violet-600 text-white hover:bg-violet-600">
                      <Crown className="mr-1 h-3.5 w-3.5" />
                      Premium
                    </Badge>
                  </div>
                  <Button className="mt-4" onClick={onOpenPremiumInsights}>
                    Mở review premium của Plus
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-best">1. Điều gì chạy tốt nhất trong tuần này?</Label>
              <Textarea
                id="weekly-best"
                rows={3}
                value={weeklyForm.biggestOutputThisWeek}
                onChange={(event) => onWeeklyFormChange("biggestOutputThisWeek", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-obstacle">2. Điều gì cản trở nhịp của bạn?</Label>
              <Textarea
                id="weekly-obstacle"
                rows={3}
                value={weeklyForm.mainObstacle}
                onChange={(event) => onWeeklyFormChange("mainObstacle", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-priority">3. Một ưu tiên duy nhất cho tuần sau là gì?</Label>
              <Textarea
                id="weekly-priority"
                rows={3}
                value={weeklyForm.nextWeekPriority}
                placeholder={hasPremiumInsights ? suggestedNextWeekPlan.focus : "Ví dụ: chỉ giữ một ưu tiên thật rõ cho tuần sau."}
                onChange={(event) => onWeeklyFormChange("nextWeekPriority", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-decision">Quyết định cho tuần sau</Label>
              <Select value={weeklyForm.workloadDecision} onValueChange={(value) => onWeeklyFormChange("workloadDecision", value)}>
                <SelectTrigger id="weekly-decision" aria-label="Chọn quyết định cho tuần sau">
                  <SelectValue placeholder="Chọn mức tải cho tuần sau" />
                </SelectTrigger>
                <SelectContent>
                  {WORKLOAD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onSaveWeeklyReview}>Chốt review tuần này</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TwelveWeekProgressTab({
  system,
  currentWeek,
  currentWeekRange,
  currentWeekScoreValue,
  averageScore,
  reviewDoneCount,
  weekCompletion,
  milestoneItems,
}: TwelveWeekProgressTabProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.94)_100%)] text-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.7)]"
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Tuần đang chạy</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-white">Tuần {currentWeek}</p>
                <p className="mt-1 text-sm text-white/68">
                  {currentWeekRange
                    ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                    : "Đang cập nhật phạm vi tuần"}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(219,234,254,0.94)_0%,_rgba(191,219,254,0.78)_100%)] shadow-[0_24px_60px_-36px_rgba(37,99,235,0.26)]"
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Điểm hiện tại</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-slate-950">{currentWeekScoreValue}</p>
                <p className="mt-1 text-sm text-slate-600">Trung bình toàn chu kỳ: {averageScore}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-sky-700">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(236,253,245,0.95)_0%,_rgba(209,250,229,0.82)_100%)] shadow-[0_24px_60px_-36px_rgba(5,150,105,0.22)]"
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Review đã khóa</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-slate-950">
                  {reviewDoneCount}/{system.totalWeeks}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {weekCompletion.completed}/{weekCompletion.total} việc tuần này đã xong
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-emerald-700">
                <Flag className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.95)_100%)] text-white shadow-[0_34px_80px_-42px_rgba(15,23,42,0.72)]"
        >
          <CardHeader>
            <CardTitle className="text-white">Bảng điểm 12 tuần</CardTitle>
            <CardDescription className="text-white/68">
              Mỗi tuần được chấm từ hành vi thật: mức hoàn thành việc cốt lõi, check-in, hoàn thành đúng lịch
              và việc đã chốt review hay chưa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-sky-300/22 bg-[linear-gradient(135deg,_rgba(14,116,144,0.28)_0%,_rgba(30,41,59,0.14)_100%)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Tuần {currentWeek} đang là trọng tâm</p>
                  <p className="mt-1 text-sm text-white/68">
                    Ưu tiên giữ nhịp việc cốt lõi và chốt review vào {getReviewDayLabel(system.reviewDay)}.
                  </p>
                </div>
                <Badge className="border-white/12 bg-white/10 text-white hover:bg-white/10">
                  {currentWeekScoreValue} điểm
                </Badge>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {system.scoreboard.map((week) => (
                <div
                  key={week.weekNumber}
                  className={`rounded-[24px] border p-5 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.35)] ${
                    week.weekNumber === currentWeek
                      ? "border-sky-300/22 bg-[linear-gradient(135deg,_rgba(8,47,73,0.95)_0%,_rgba(3,105,161,0.88)_100%)]"
                      : week.reviewDone
                        ? "border-emerald-300/20 bg-[linear-gradient(180deg,_rgba(6,78,59,0.3)_0%,_rgba(255,255,255,0.05)_100%)]"
                        : "border-white/10 bg-white/6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                          week.weekNumber === currentWeek ? "text-sky-100" : "text-white/55"
                        }`}
                      >
                        Tuần {week.weekNumber}
                      </p>
                      <p
                        className={`mt-2 text-3xl font-bold ${
                          week.weekNumber === currentWeek ? "text-white" : "text-slate-100"
                        }`}
                      >
                        {week.weeklyScore}
                      </p>
                    </div>
                    <Badge
                      variant={week.reviewDone ? "default" : "outline"}
                      className={
                        week.weekNumber === currentWeek
                          ? "border-white/15 bg-white/10 text-white hover:bg-white/10"
                          : week.reviewDone
                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                            : "border-white/12 bg-transparent text-white/80"
                      }
                    >
                      {week.weekNumber === currentWeek ? "Đang chạy" : week.reviewDone ? "Đã review" : "Chưa review"}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div
                        className={`flex items-center justify-between text-sm ${
                          week.weekNumber === currentWeek ? "text-sky-100/88" : "text-white/68"
                        }`}
                      >
                        <span>Hoàn thành cốt lõi</span>
                        <span
                          className={`font-semibold ${
                            week.weekNumber === currentWeek ? "text-white" : "text-slate-100"
                          }`}
                        >
                          {week.leadCompletionPercent}%
                        </span>
                      </div>
                      <Progress
                        value={week.leadCompletionPercent}
                        className={`mt-2 h-2.5 ${week.weekNumber === currentWeek ? "bg-white/18" : "bg-white/10"}`}
                      />
                    </div>
                    <div
                      className={`rounded-2xl border px-4 py-3 ${
                        week.weekNumber === currentWeek ? "border-white/12 bg-black/16" : "border-white/10 bg-white/8"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          week.weekNumber === currentWeek ? "text-sky-100/76" : "text-white/55"
                        }`}
                      >
                        Chỉ số chính
                      </p>
                      <p
                        className={`mt-1 text-sm font-medium ${
                          week.weekNumber === currentWeek ? "text-white" : "text-slate-100"
                        }`}
                      >
                        {week.mainMetricProgress || "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(226,232,240,0.94)_0%,_rgba(203,213,225,0.84)_100%)] shadow-[0_28px_70px_-38px_rgba(15,23,42,0.28)]"
        >
          <CardHeader>
            <CardTitle className="text-slate-950">Cột mốc và đích đến</CardTitle>
            <CardDescription className="text-slate-700">
              Phần này giúp bạn nhìn lại những mốc quan trọng của chu kỳ thay vì chỉ nhìn điểm số.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/45 bg-white/62 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <div className="space-y-5">
                {milestoneItems.map((item, index) => {
                  const isLastItem = index === milestoneItems.length - 1;

                  return (
                    <div key={item.label} className={`relative pl-12 ${isLastItem ? "" : "pb-5"}`}>
                      {!isLastItem && <div className="absolute left-[17px] top-9 h-full w-px bg-slate-300/70" />}
                      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TwelveWeekSettingsTab({
  system,
  currentPlanCode,
  entitlementKeys,
  billingProviderStatus,
  lastEntitlementSyncSnapshot,
  lastRestoreAccessSnapshot,
  appPreferences,
  funnelSteps,
  monetizationSteps,
  browserNotificationStatus,
  lastSyncSnapshot,
  pendingOutboxCount,
  archivedOutboxCount,
  eventCount,
  activeReminders,
  recentOutboxItems,
  isSyncingEntitlements,
  isRestoringPlanAccess,
  onReviewDayChange,
  onReminderTimeChange,
  onLoadPreferenceChange,
  onStatusChange,
  onTacticPriorityChange,
  onTacticTypeChange,
  onPreferenceToggle,
  onArchivePendingOutbox,
  onRestoreArchivedOutbox,
  onOpenReminder,
  onExportLocalData,
  onBrowserNotificationToggle,
  onRunOutboxSync,
  onOutboxItemToggle,
  onClearEventLog,
  onClearArchivedOutbox,
  onOpenClearLocalDialog,
  onOpenResetDialog,
  onOpenUpgradePlan,
  onSyncEntitlements,
  onRestorePlanAccess,
  onOpenBillingPortal,
  onNavigateGoals,
  onNavigateJournal,
  onNavigateSetup,
}: TwelveWeekSettingsTabProps) {
  const currentPlanDefinition = getPlanDefinition(currentPlanCode);
  const entitlementOrder: EntitlementKey[] = [
    "premium_templates",
    "premium_review_insights",
    "priority_reminders",
    "advanced_analytics",
  ];
  const unlockedEntitlementCount = entitlementOrder.filter((key) => entitlementKeys.includes(key)).length;

  const getBillingSnapshotTone = (mode: BillingProviderMode, status: BillingActionSnapshot["status"]) => {
    if (status === "success") {
      return mode === "api_contract"
        ? "border-sky-200 bg-sky-50/92 text-sky-900"
        : "border-emerald-200 bg-emerald-50/92 text-emerald-900";
    }

    if (status === "local_only") {
      return "border-amber-200 bg-amber-50/92 text-amber-900";
    }

    if (status === "offline") {
      return "border-orange-200 bg-orange-50/92 text-orange-900";
    }

    return "border-rose-200 bg-rose-50/92 text-rose-900";
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(238,242,255,0.95)_0%,_rgba(224,231,255,0.84)_100%)] shadow-[0_30px_70px_-40px_rgba(99,102,241,0.22)]"
        >
          <CardHeader>
            <CardTitle className="text-slate-950">Cài đặt chu kỳ</CardTitle>
            <CardDescription className="text-slate-700">
              Chỉnh nhịp review, mức tải và thứ tự tactic để hệ thống này hợp với cách bạn làm thật ngoài đời.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[26px] border border-slate-900/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(49,46,129,0.9)_100%)] p-5 text-white shadow-[0_28px_60px_-38px_rgba(15,23,42,0.55)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">
                    Một lần chỉnh cho cả chu kỳ
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    Giữ nhịp tuần, thứ tự tactic và trạng thái chu kỳ trong cùng một nơi.
                  </p>
                </div>
                <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
                  {STATUS_OPTIONS.find((option) => option.value === system.status)?.label ?? system.status}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ngày review</p>
                  <p className="mt-1 text-sm text-slate-600">Ngày bạn muốn khóa tuần và tự đánh giá lại nhịp.</p>
                </div>
                <Select value={system.reviewDay} onValueChange={onReviewDayChange}>
                  <SelectTrigger id="review-day" aria-label="Chọn ngày review">
                    <SelectValue placeholder="Chọn ngày review" />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Giờ nhắc</p>
                  <p className="mt-1 text-sm text-slate-600">Khung giờ local để nhắc check-in và review.</p>
                </div>
                <Input
                  id="reminder-time"
                  value={system.dailyReminderTime || "19:00"}
                  onChange={(event) => onReminderTimeChange(event.target.value)}
                  type="time"
                  aria-label="Chọn giờ nhắc local"
                />
              </div>

              <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nhịp tuần</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Cho hệ thống biết tuần này bạn muốn cân bằng, nhẹ hay đẩy mạnh.
                  </p>
                </div>
                <Select value={system.tacticLoadPreference || "balanced"} onValueChange={onLoadPreferenceChange}>
                  <SelectTrigger id="week-load" aria-label="Chọn nhịp tuần">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trạng thái</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Giúp Dashboard và màn Hôm nay biết chu kỳ này đang chạy hay đã kết thúc.
                  </p>
                </div>
                <Select value={system.status} onValueChange={onStatusChange}>
                  <SelectTrigger id="cycle-status" aria-label="Chọn trạng thái chu kỳ">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/55 bg-white/62 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ưu tiên tactic</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Tactic cốt lõi được ưu tiên trong điểm tuần. Tactic tùy chọn là phần thêm khi bạn còn sức.
                  </p>
                </div>
                <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                  {system.leadIndicators.length} tactic
                </Badge>
              </div>
              <div className="mt-4 space-y-4">
                {system.leadIndicators.map((indicator, index) => (
                  <div
                    key={indicator.id || indicator.name}
                    className={`grid gap-4 rounded-[24px] border p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.26)] md:grid-cols-[minmax(0,1fr)_150px_140px] ${
                      indicator.type === "optional"
                        ? "border-amber-200/70 bg-amber-50/82"
                        : "border-emerald-200/70 bg-white/88"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{indicator.name}</p>
                        <Badge
                          variant="outline"
                          className={
                            indicator.type === "optional"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }
                        >
                          {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tactic-priority-${index}`}>Ưu tiên</Label>
                      <Select
                        value={String(indicator.priority ?? index + 1)}
                        onValueChange={(value) => onTacticPriorityChange(indicator.id, value)}
                      >
                        <SelectTrigger
                          id={`tactic-priority-${index}`}
                          aria-label={`Chọn độ ưu tiên cho tactic ${indicator.name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: system.leadIndicators.length }, (_, optionIndex) => optionIndex + 1).map(
                            (priority) => (
                              <SelectItem key={priority} value={String(priority)}>
                                {priority}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tactic-type-${index}`}>Loại</Label>
                      <Select
                        value={indicator.type === "optional" ? "optional" : "core"}
                        onValueChange={(value) => onTacticTypeChange(indicator.id, value)}
                      >
                        <SelectTrigger
                          id={`tactic-type-${index}`}
                          aria-label={`Chọn loại tactic ${indicator.name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="core">Cốt lõi</SelectItem>
                          <SelectItem value="optional">Tùy chọn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-slate-900/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(30,41,59,0.92)_100%)] p-5 text-white shadow-[0_22px_45px_-32px_rgba(15,23,42,0.5)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Bắt đầu</p>
                <p className="mt-2 text-xl font-bold text-white">{formatCalendarDate(system.startDate)}</p>
              </div>
              <div className="rounded-[24px] border border-sky-200 bg-sky-50/92 p-5 shadow-[0_22px_45px_-32px_rgba(37,99,235,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Kết thúc</p>
                <p className="mt-2 text-xl font-bold text-slate-950">{formatCalendarDate(system.endDate)}</p>
              </div>
              <div className="rounded-[24px] border border-amber-200 bg-amber-50/92 p-5 shadow-[0_22px_45px_-32px_rgba(217,119,6,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Re-entry đã dùng</p>
                <p className="mt-2 text-xl font-bold text-slate-950">{system.reentryCount ?? 0} lần</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="self-start border-0 bg-[linear-gradient(180deg,_rgba(226,232,240,0.95)_0%,_rgba(203,213,225,0.84)_100%)] shadow-[0_30px_70px_-40px_rgba(15,23,42,0.26)]"
        >
          <CardHeader>
            <CardTitle className="text-slate-950">Thiết bị, dữ liệu và đồng bộ</CardTitle>
            <CardDescription className="text-slate-700">
              Gom các phần liên quan đến thiết bị này vào một cột để đỡ phải kéo qua nhiều khối dài.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[26px] border border-violet-200/70 bg-[linear-gradient(135deg,_rgba(49,46,129,0.96)_0%,_rgba(76,29,149,0.92)_100%)] p-5 text-white shadow-[0_28px_60px_-38px_rgba(76,29,149,0.55)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Gói và quyền 12 tuần</p>
                  <p className="mt-2 text-2xl font-bold">{getPlanLabel(currentPlanCode)}</p>
                  <p className="mt-2 text-sm leading-7 text-white/74">{currentPlanDefinition.description}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
                  <Crown className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {entitlementOrder.map((key) => {
                  const isUnlocked = entitlementKeys.includes(key);

                  return (
                    <Badge
                      key={key}
                      variant="outline"
                      className={
                        isUnlocked
                          ? "border-emerald-200/70 bg-emerald-50 text-emerald-900"
                          : "border-white/15 bg-white/8 text-white/70"
                      }
                    >
                      {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
                    </Badge>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/56">Trạng thái nhanh</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {unlockedEntitlementCount}/{entitlementOrder.length} quyền premium đang mở trên thiết bị này
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    Nhìn nhanh xem bạn đang có đủ lớp hỗ trợ để bắt đầu nhanh, giữ nhịp đều và review rõ hơn hay chưa.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/12 bg-white/8 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/56">Billing contract</p>
                    <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
                      {getBillingProviderModeLabel(billingProviderStatus.mode)}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-white/72">
                    <p>Provider: {billingProviderStatus.providerLabel}</p>
                    <p>Checkout: {getBillingReadinessLabel(billingProviderStatus.checkoutReady, "Local fallback")}</p>
                    <p>Restore: {getBillingReadinessLabel(billingProviderStatus.restoreReady, "Local fallback")}</p>
                    <p>Sync quyền: {getBillingReadinessLabel(billingProviderStatus.entitlementSyncReady, "Local fallback")}</p>
                    <p>Cổng quản lý: {getBillingReadinessLabel(billingProviderStatus.manageBillingReady, "Chưa cấu hình")}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div
                  className={`rounded-[22px] border px-4 py-4 ${getBillingSnapshotTone(
                    lastEntitlementSyncSnapshot?.providerMode ?? "local_test",
                    lastEntitlementSyncSnapshot?.status ?? "local_only",
                  )}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Đồng bộ quyền</p>
                    <Badge variant="outline" className="border-current/20 bg-white/70 text-current">
                      {getBillingActionStatusLabel(lastEntitlementSyncSnapshot?.status ?? "local_only")}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold">
                    {lastEntitlementSyncSnapshot
                      ? `${lastEntitlementSyncSnapshot.planCode} • ${lastEntitlementSyncSnapshot.entitlementCount} quyền`
                      : "Chưa có lần đồng bộ nào"}
                  </p>
                  <p className="mt-1 text-sm opacity-80">
                    {lastEntitlementSyncSnapshot?.message ?? "Khi chạy sync, app sẽ lấy lại trạng thái quyền mới nhất từ provider hoặc local fallback."}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] opacity-60">
                    {lastEntitlementSyncSnapshot ? formatDateTimeLabel(lastEntitlementSyncSnapshot.at) : "Chưa chạy"}
                  </p>
                </div>

                <div
                  className={`rounded-[22px] border px-4 py-4 ${getBillingSnapshotTone(
                    lastRestoreAccessSnapshot?.providerMode ?? "local_test",
                    lastRestoreAccessSnapshot?.status ?? "local_only",
                  )}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Khôi phục giao dịch</p>
                    <Badge variant="outline" className="border-current/20 bg-white/70 text-current">
                      {getBillingActionStatusLabel(lastRestoreAccessSnapshot?.status ?? "local_only")}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold">
                    {lastRestoreAccessSnapshot
                      ? `${lastRestoreAccessSnapshot.planCode} • ${lastRestoreAccessSnapshot.entitlementCount} quyền`
                      : "Chưa có lần khôi phục nào"}
                  </p>
                  <p className="mt-1 text-sm opacity-80">
                    {lastRestoreAccessSnapshot?.message ?? "Dùng khi bạn đã từng mở quyền trước đó và muốn lấy lại trên thiết bị hiện tại."}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] opacity-60">
                    {lastRestoreAccessSnapshot ? formatDateTimeLabel(lastRestoreAccessSnapshot.at) : "Chưa chạy"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {currentPlanCode === "FREE" ? (
                  <>
                    <Button className="bg-white text-slate-900 hover:bg-white/92" onClick={() => onOpenUpgradePlan("PLUS")}>
                      Mở Plus để giữ nhịp tốt hơn
                    </Button>
                    <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/16" onClick={onRestorePlanAccess}>
                      Khôi phục quyền
                    </Button>
                  </>
                ) : (
                  <div className="rounded-[18px] border border-white/12 bg-white/8 px-4 py-3 text-sm text-white/72">
                    Plus đang mở toàn bộ lớp giúp bạn bắt đầu nhanh hơn, giữ nhịp đều hơn và review rõ hơn.
                  </div>
                )}
              </div>

              <div className="mt-2 grid gap-2">
                {billingProviderStatus.manageBillingReady && (
                  <Button
                    variant="outline"
                    className="border-white/15 bg-white/10 text-white hover:bg-white/16"
                    onClick={onOpenBillingPortal}
                  >
                    Quản lý thanh toán
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/10 text-white hover:bg-white/16"
                  onClick={onSyncEntitlements}
                  disabled={isSyncingEntitlements}
                >
                  {isSyncingEntitlements ? "Đang đồng bộ..." : "Đồng bộ quyền"}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/10 text-white hover:bg-white/16"
                  onClick={onRestorePlanAccess}
                  disabled={isRestoringPlanAccess}
                >
                  {isRestoringPlanAccess ? "Đang khôi phục..." : "Khôi phục giao dịch"}
                </Button>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-900/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-[0_28px_60px_-38px_rgba(15,23,42,0.7)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Bảng điều khiển local</p>
                  <p className="mt-2 text-lg font-semibold">Các tiện ích dưới đây chỉ tác động trên thiết bị hiện tại.</p>
                </div>
                <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
                  Thiết bị này
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Nhắc việc</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {appPreferences.enableInAppReminders ? "Bật" : "Tắt"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Trình duyệt</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {appPreferences.enableBrowserNotifications ? "Bật" : "Tắt"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Phân tích</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {appPreferences.allowLocalAnalytics ? "Bật" : "Tắt"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Outbox</p>
                  <p className="mt-2 text-sm font-semibold text-white">{pendingOutboxCount} chờ</p>
                </div>
              </div>
            </div>

            <details className="group rounded-[24px] border border-white/55 bg-white/72 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Nhắc việc và quyền trên thiết bị</p>
                  <p className="mt-1 pr-6 text-sm text-slate-600">
                    Bật tắt nhắc việc, thông báo và dữ liệu chỉ lưu trên thiết bị này.
                  </p>
                </div>
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">Nhắc việc trong app</p>
                      <Badge
                        variant="outline"
                        className={
                          appPreferences.enableInAppReminders
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 bg-white text-slate-600"
                        }
                      >
                        {appPreferences.enableInAppReminders ? "Đang bật" : "Đang tắt"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Hiện nhắc việc local cho việc, review và check-in.</p>
                  </div>
                  <Switch
                    checked={appPreferences.enableInAppReminders}
                    onCheckedChange={(value) => onPreferenceToggle("enableInAppReminders", value)}
                    aria-label="Bật tắt nhắc việc trong app"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">Nhắc ngoài trình duyệt</p>
                      <Badge
                        variant="outline"
                        className={
                          appPreferences.enableBrowserNotifications
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 bg-white text-slate-600"
                        }
                      >
                        {appPreferences.enableBrowserNotifications ? "Đang bật" : "Đang tắt"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {getBrowserNotificationStatusLabel(browserNotificationStatus)}. Hữu ích khi bạn rời khỏi tab nhưng vẫn muốn được nhắc việc.
                    </p>
                  </div>
                  <Switch
                    checked={appPreferences.enableBrowserNotifications}
                    onCheckedChange={onBrowserNotificationToggle}
                    aria-label="Bật tắt browser notification"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">Phân tích trên thiết bị</p>
                      <Badge
                        variant="outline"
                        className={
                          appPreferences.allowLocalAnalytics
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 bg-white text-slate-600"
                        }
                      >
                        {appPreferences.allowLocalAnalytics ? "Đang bật" : "Đang tắt"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Lưu hành trình 12 tuần trên thiết bị này để xem lịch sử thao tác.</p>
                  </div>
                  <Switch
                    checked={appPreferences.allowLocalAnalytics}
                    onCheckedChange={(value) => onPreferenceToggle("allowLocalAnalytics", value)}
                    aria-label="Bật tắt local analytics"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">Hàng chờ trên thiết bị</p>
                      <Badge
                        variant="outline"
                        className={
                          appPreferences.keepLocalOutbox
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 bg-white text-slate-600"
                        }
                      >
                        {appPreferences.keepLocalOutbox ? "Đang bật" : "Đang tắt"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Giữ các mục chờ đồng bộ để thao tác hằng ngày vẫn nhẹ và nhanh.</p>
                  </div>
                  <Switch
                    checked={appPreferences.keepLocalOutbox}
                    onCheckedChange={(value) => onPreferenceToggle("keepLocalOutbox", value)}
                    aria-label="Bật tắt local outbox"
                  />
                </div>
              </div>
            </details>

            <details className="group rounded-[24px] border border-white/55 bg-white/72 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Hành trình 12 tuần</p>
                  <p className="mt-1 pr-6 text-sm text-slate-600">Theo dõi 5 mốc quan trọng của flow thực thi ngay trên thiết bị này.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {funnelSteps.reduce((sum, step) => sum + step.count, 0)} sự kiện
                  </Badge>
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </div>
              </summary>
              <ul className="mt-4 space-y-3" aria-label="Hành trình 12 tuần">
                {funnelSteps.map((step) => (
                  <li key={step.id} className="rounded-[18px] border border-white/70 bg-white/82 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                      </div>
                      <Badge variant={step.count > 0 ? "default" : "outline"}>{step.count}</Badge>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                      Lần gần nhất: {formatDateTimeLabel(step.lastSeenAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </details>

            <details className="group rounded-[24px] border border-white/55 bg-white/72 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Funnel nâng cấp</p>
                  <p className="mt-1 pr-6 text-sm text-slate-600">Theo dõi mạch paywall từ lúc nhìn thấy cho tới khi mở gói và dùng giá trị premium.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {monetizationSteps.reduce((sum, step) => sum + step.count, 0)} sự kiện
                  </Badge>
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </div>
              </summary>
              <ul className="mt-4 space-y-3" aria-label="Funnel nâng cấp">
                {monetizationSteps.map((step) => (
                  <li key={step.id} className="rounded-[18px] border border-white/70 bg-white/82 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                      </div>
                      <Badge variant={step.count > 0 ? "default" : "outline"}>{step.count}</Badge>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                      Lần gần nhất: {formatDateTimeLabel(step.lastSeenAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </details>

            <details className="group rounded-[24px] border border-white/55 bg-white/72 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Dữ liệu trên thiết bị</p>
                  <p className="mt-1 pr-6 text-sm text-slate-600">Xuất dữ liệu hoặc xóa dấu vết local mà không đụng vào chu kỳ và review của bạn.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    Thiết bị này
                  </Badge>
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </div>
              </summary>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="bg-white/90" onClick={onExportLocalData}>
                  Xuất dữ liệu
                </Button>
                <Button variant="outline" className="bg-white/90" onClick={onOpenClearLocalDialog}>
                  Xóa dấu vết local
                </Button>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Sẽ xóa nhật ký sự kiện, outbox và trạng thái nhắc việc local. Dữ liệu chu kỳ 12 tuần và nhật ký vẫn được giữ nguyên.
              </p>
            </details>

            <details className="group rounded-[24px] border border-white/55 bg-white/72 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Outbox, đồng bộ và nhắc việc</p>
                  <p className="mt-1 pr-6 text-sm text-slate-600">Xem trạng thái đồng bộ, outbox gần đây và những nhắc việc đang chờ mà không phải kéo qua nhiều card rời.</p>
                </div>
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[24px] border border-sky-200 bg-sky-50/92 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Nhật ký sự kiện</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">{eventCount}</p>
                      <p className="mt-1 text-sm text-slate-600">Số thao tác đang được giữ lại trên thiết bị này.</p>
                    </div>
                    <Badge variant="outline" className="border-sky-200 bg-white/90 text-sky-700">
                      {appPreferences.allowLocalAnalytics ? "Bật" : "Tắt"}
                    </Badge>
                  </div>
                  <Button variant="outline" className="mt-4 w-full bg-white/90" onClick={onClearEventLog}>
                    Xóa log
                  </Button>
                </div>
                <div className="rounded-[24px] border border-violet-200 bg-violet-50/92 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Outbox trên thiết bị</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">{pendingOutboxCount} đang chờ</p>
                      <p className="text-sm text-slate-600">{archivedOutboxCount} mục đã lưu</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {lastSyncSnapshot ? `${getSyncStatusLabel(lastSyncSnapshot.status)} • ${lastSyncSnapshot.message}` : "Chưa có lần đồng bộ nào được chạy."}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-violet-200 bg-white/90 text-violet-700">
                      {appPreferences.keepLocalOutbox ? "Bật" : "Tắt"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <Button variant="outline" className="w-full bg-white/90" onClick={onRunOutboxSync}>
                      Đồng bộ ngay
                    </Button>
                    <Button variant="outline" className="w-full bg-white/90" onClick={onArchivePendingOutbox}>
                      Lưu lại mục đang chờ
                    </Button>
                    <Button variant="outline" className="w-full bg-white/90" onClick={onRestoreArchivedOutbox}>
                      Khôi phục mục đã lưu
                    </Button>
                    <Button variant="outline" className="w-full bg-white/90" onClick={onClearArchivedOutbox}>
                      Xóa outbox đã lưu
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-[24px] border border-white/65 bg-white/76 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nhắc việc đang hoạt động</p>
                    <p className="mt-1 text-sm text-slate-600">Danh sách nhắc việc local đang chờ được hiện.</p>
                  </div>
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {activeReminders.length}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2" aria-live="polite">
                  {activeReminders.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-slate-300 bg-white/86 px-4 py-4 text-sm text-slate-600">
                      Không có nhắc việc nào đang chờ lúc này.
                    </div>
                  ) : (
                    activeReminders.map((reminder) => (
                      <div key={reminder.id} className="rounded-[18px] border border-white/70 bg-white/84 p-4">
                        <p className="text-sm font-semibold text-slate-950">{reminder.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{reminder.description}</p>
                        <Button variant="outline" size="sm" className="mt-3 bg-white" onClick={() => onOpenReminder(reminder)}>
                          {getReminderActionLabel(reminder.kind)}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-3 rounded-[24px] border border-white/65 bg-white/76 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outbox gần đây</p>
                    <p className="mt-1 text-sm text-slate-600">3 mục mới nhất đang chờ hoặc đã được lưu lại.</p>
                  </div>
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {recentOutboxItems.length}
                  </Badge>
                </div>
                <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {recentOutboxItems.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-slate-300 bg-white/86 px-4 py-4 text-sm text-slate-600">
                      Chưa có mục nào trong outbox trên thiết bị.
                    </div>
                  ) : (
                    recentOutboxItems.map((item) => (
                      <div key={item.id} className="rounded-[18px] border border-white/70 bg-white/84 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-950">{getOutboxTypeLabel(item.type)}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                              {formatCalendarDate(item.createdAt)}
                            </p>
                          </div>
                          <Badge variant={item.status === "pending" ? "default" : "outline"}>
                            {item.status === "pending" ? "đang chờ" : "đã lưu"}
                          </Badge>
                        </div>
                        <p className="mt-3 break-words text-sm leading-6 text-slate-600">{getOutboxSummaryText(item)}</p>
                        <Button variant="outline" size="sm" className="mt-3 bg-white" onClick={() => onOutboxItemToggle(item)}>
                          {item.status === "pending" ? "Lưu mục này" : "Khôi phục về hàng chờ"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </details>

            <div className="rounded-[24px] border border-red-300/70 bg-[linear-gradient(180deg,_rgba(254,226,226,0.96)_0%,_rgba(254,242,242,0.92)_100%)] p-5 shadow-[0_20px_45px_-34px_rgba(220,38,38,0.18)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Làm mới chu kỳ</p>
              <p className="mt-2 text-sm text-red-900">
                Bắt đầu lại tuần 1 từ tuần hiện tại, giữ nguyên outcome và tactic, nhưng làm mới việc, check-in và review của chu kỳ này.
              </p>
              <Button className="mt-3 w-full bg-white/90" variant="outline" onClick={onOpenResetDialog}>
                <RotateCcw className="h-4 w-4" />
                Làm mới chu kỳ từ tuần này
              </Button>
            </div>

            <details className="group rounded-[24px] border border-white/55 bg-white/72 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Lối tắt nhanh</p>
                  <p className="mt-1 pr-6 text-sm text-slate-600">Đi sang Mục tiêu, Nhật ký hoặc bắt đầu một chu kỳ mới chỉ bằng một lần mở.</p>
                </div>
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-3">
                <Button className="w-full justify-start bg-white/90" variant="outline" onClick={onNavigateGoals}>
                  <Target className="h-4 w-4" />
                  Mở Mục tiêu
                </Button>
                <Button className="w-full justify-start bg-white/90" variant="outline" onClick={onNavigateJournal}>
                  <Flag className="h-4 w-4" />
                  Mở nhật ký
                </Button>
                <Button className="w-full justify-start" onClick={onNavigateSetup}>
                  <Settings2 className="h-4 w-4" />
                  Tạo chu kỳ mới từ setup
                </Button>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

