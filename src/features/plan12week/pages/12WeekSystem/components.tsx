import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Compass, Loader2, Sparkles, Target } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ProductVisual } from "@/app/components/visuals/ProductVisual";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import {
  formatCalendarDate,
  getFeasibilityResultLabel,
  getLifeAreaLabel,
  getReviewDayLabel,
} from "@/app/utils/storage";
import type {
  Goal,
  PricingPlanCode,
  RescueTrigger,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
} from "@/app/utils/storage-types";
import { getPlanLabel } from "@/app/utils/twelve-week-premium";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

export function TwelveWeekTabFallback({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border border-white/70 bg-white/80 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.32)]">
      <CardContent className="flex min-h-[220px] flex-col justify-center gap-3 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="text-base font-semibold text-slate-900">Đang mở phần này...</p>
        <p className="mx-auto max-w-xl text-sm leading-7 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

export function TwelveWeekDashboardState({
  kind,
  eyebrow,
  title,
  description,
  children,
}: {
  kind: "loading" | "empty";
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const Icon = kind === "loading" ? Loader2 : Sparkles;

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.34)]">
      <CardContent className="p-8 text-center sm:p-10 lg:p-14">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-700">
          <Icon className={`h-10 w-10 ${kind === "loading" ? "animate-spin" : ""}`} />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-bold tracking-normal text-slate-900 sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base" role="status">
          {description}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

export function TwelveWeekDashboardNotice({
  tone,
  title,
  description,
  children,
}: {
  tone: "warning" | "error" | "success";
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-amber-200 bg-amber-50 text-amber-900";
  const iconClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "error"
        ? "bg-rose-100 text-rose-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div role={tone === "success" ? "status" : "alert"} className={`rounded-xl border px-4 py-4 ${toneClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
        </div>
        {children ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{children}</div> : null}
      </div>
    </div>
  );
}

interface TwelveWeekDashboardHeaderProps {
  activeGoal: Goal;
  system: TwelveWeekSystem;
  activePlanCode: PricingPlanCode;
  currentWeek: number;
  syncBadgeClass: string;
  syncBadgeLabel: string;
  reviewDueToday: boolean;
  todayRemainingCount: number;
  todayCompletedCount: number;
  weekCompletion: WeekCompletionSummary;
  currentWeekRange: WeekRange | null;
  reviewStatusLabel: string;
  firstPriorityTask: TwelveWeekTaskInstance | null;
  onOpenFocusTab: () => void;
  onOpenGoals: () => void;
}

export function TwelveWeekDashboardHeader({
  activeGoal,
  system,
  activePlanCode,
  currentWeek,
  syncBadgeClass,
  syncBadgeLabel,
  reviewDueToday,
  todayRemainingCount,
  todayCompletedCount,
  weekCompletion,
  currentWeekRange,
  reviewStatusLabel,
  firstPriorityTask,
  onOpenFocusTab,
  onOpenGoals,
}: TwelveWeekDashboardHeaderProps) {
  return (
    <Card className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.3)]">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                <Compass className="mr-1 h-3.5 w-3.5" />
                Nhịp 12 tuần
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                <Target className="mr-1 h-3.5 w-3.5" />
                Tuần {currentWeek}/{system.totalWeeks}
              </Badge>
              <Badge variant="outline" className={`rounded-full px-3 py-1.5 ${syncBadgeClass}`}>
                {syncBadgeLabel}
              </Badge>
              {reviewDueToday && (
                <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">
                  Review hôm nay
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="max-w-4xl break-words text-xl font-bold tracking-normal text-slate-950 sm:text-2xl">
                {activeGoal.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600">
                Bắt đầu từ tab Hôm nay: tick việc quan trọng nhất, lưu check-in, rồi mở Tuần để review. Dữ liệu đang
                lưu trên trình duyệt này.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {getLifeAreaLabel(activeGoal.focusArea || activeGoal.category)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Gói {getPlanLabel(activePlanCode)}</span>
              {activeGoal.feasibilityResult && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {getFeasibilityResultLabel(activeGoal.feasibilityResult)}
                </span>
              )}
            </div>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:w-[520px]">
            <ProductVisual variant="execution" className="hidden min-h-[130px] sm:col-span-3 sm:block" />
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Còn cần làm</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{todayRemainingCount}</p>
              <p className="text-xs text-slate-500">{todayCompletedCount} việc đã chốt hôm nay</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tuần này</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{weekCompletion.percent}%</p>
              <p className="text-xs text-slate-500">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Đang chạy"}
              </p>
            </div>
            <div
              className={`rounded-lg border px-4 py-3 ${
                reviewDueToday ? "border-amber-200 bg-amber-50/90" : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                  reviewDueToday ? "text-amber-700" : "text-slate-500"
                }`}
              >
                Review
              </p>
              <p className="mt-1 truncate text-base font-bold text-slate-950">
                {reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}
              </p>
              <p className="text-xs text-slate-500">{reviewStatusLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="min-w-0 text-sm leading-6 text-slate-600">
            {reviewDueToday
              ? "Việc tiếp theo: chốt review tuần trước khi mở việc mới."
              : firstPriorityTask
                ? `Việc quan trọng nhất: ${firstPriorityTask.title}`
                : "Hôm nay đang gọn. Bạn có thể lưu check-in hoặc xem lại tab Tuần."}
          </p>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto" onClick={onOpenFocusTab}>
              {reviewDueToday ? "Mở review tuần" : "Xem việc hôm nay"}
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-200 bg-white text-slate-900 hover:bg-slate-50 sm:w-auto"
              onClick={onOpenGoals}
            >
              Mở mục tiêu
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TwelveWeekGoalSwitcher({
  allGoals,
  activeGoalId,
  onLoadGoal,
}: {
  allGoals: Goal[];
  activeGoalId: string;
  onLoadGoal: (goalId: string) => void;
}) {
  if (allGoals.length <= 1) return null;

  return (
    <details className="group rounded-xl border border-slate-200 bg-white/88 px-4 py-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.2)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-900">
        <span>Đổi chu kỳ 12 tuần khác</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          {allGoals.length} chu kỳ
        </span>
      </summary>
      <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
        <p className="text-sm leading-6 text-slate-600">
          App đang ưu tiên chu kỳ active mới nhất; chỉ mở lại chu kỳ cũ khi cần đối chiếu.
        </p>
        <Select value={activeGoalId} onValueChange={onLoadGoal}>
          <SelectTrigger className="max-w-xl" aria-label="Chọn mục tiêu 12 tuần">
            <SelectValue placeholder="Chọn mục tiêu" />
          </SelectTrigger>
          <SelectContent>
            {allGoals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {goal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </details>
  );
}

interface TwelveWeekRescueTriggerBannerProps {
  trigger: RescueTrigger | null;
  onTriggerFired: (trigger: RescueTrigger) => void;
  onActionTaken: (trigger: RescueTrigger, action: "upgrade" | "navigate_system") => void;
  onOpenUpgrade: () => void;
  onOpenToday: () => void;
  onDismiss: (kind: RescueTrigger["kind"]) => void;
}

export function TwelveWeekRescueTriggerBanner({
  trigger,
  onTriggerFired,
  onActionTaken,
  onOpenUpgrade,
  onOpenToday,
  onDismiss,
}: TwelveWeekRescueTriggerBannerProps) {
  if (!trigger) return null;

  const severityStyles = {
    urgent: {
      wrapper: "border-rose-200 bg-rose-50",
      icon: "bg-rose-100 text-rose-600",
      headline: "text-rose-800",
      detail: "text-rose-700",
    },
    caution: {
      wrapper: "border-amber-200 bg-amber-50",
      icon: "bg-amber-100 text-amber-600",
      headline: "text-amber-800",
      detail: "text-amber-700",
    },
    watch: {
      wrapper: "border-slate-200 bg-slate-50",
      icon: "bg-slate-100 text-slate-500",
      headline: "text-slate-800",
      detail: "text-slate-600",
    },
  } as const;
  const style = severityStyles[trigger.severity];
  const isUpgradeTrigger = trigger.kind === "trial_ending";
  const ctaLabel = isUpgradeTrigger ? "Nâng cấp ngay" : "Xem lại hàng việc";

  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${style.wrapper}`}
      onAnimationStart={() => onTriggerFired(trigger)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${style.headline}`}>{trigger.headline}</p>
            <p className={`mt-0.5 text-xs leading-5 ${style.detail}`}>{trigger.detail}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:ml-auto sm:w-auto">
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => {
              const action = isUpgradeTrigger ? "upgrade" : "navigate_system";
              onActionTaken(trigger, action);
              if (isUpgradeTrigger) onOpenUpgrade();
              else onOpenToday();
            }}
          >
            {ctaLabel}
          </Button>
          <button
            type="button"
            className="px-1 text-xs opacity-60 transition-opacity hover:opacity-100"
            aria-label="Đóng thông báo"
            onClick={() => onDismiss(trigger.kind)}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
