import type { ReactNode } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Flame, Loader2, Sparkles, Target, TrendingUp, Zap } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Hero12WeekScene, PhaseHarvestChipIcon, PhasePeakChipIcon, PhaseRampChipIcon, SoftDotsPattern } from "@/app/components/illustrations";
import { MotionCountUp, MotionParallaxLayer } from "@/app/components/motion";
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

function getHeaderPhaseInfo(currentWeek: number) {
  if (currentWeek <= 4) {
    return {
      label: "Khởi động",
      chipIcon: PhaseRampChipIcon,
      badgeClassName:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/35 dark:text-violet-200",
      tileClassName:
        "border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:border-violet-500/30 dark:from-violet-950/40 dark:to-fuchsia-950/25",
      iconClassName:
        "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-950/70 dark:to-fuchsia-950/50 dark:text-violet-200",
    };
  }

  if (currentWeek <= 8) {
    return {
      label: "Bứt phá",
      chipIcon: PhasePeakChipIcon,
      badgeClassName:
        "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-950/35 dark:text-fuchsia-200",
      tileClassName:
        "border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-rose-50 dark:border-fuchsia-500/30 dark:from-fuchsia-950/40 dark:to-rose-950/25",
      iconClassName:
        "bg-gradient-to-br from-fuchsia-100 to-rose-100 text-fuchsia-700 dark:from-fuchsia-950/70 dark:to-rose-950/50 dark:text-fuchsia-200",
    };
  }

  return {
    label: "Thu hoạch",
    chipIcon: PhaseHarvestChipIcon,
    badgeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-200",
    tileClassName:
      "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-500/30 dark:from-emerald-950/40 dark:to-teal-950/25",
    iconClassName:
      "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-950/70 dark:to-teal-950/50 dark:text-emerald-200",
  };
}

export function TwelveWeekTabFallback({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border border-white/70 bg-white/80 shadow-sm">
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
    <Card className="overflow-hidden">
      <CardContent className="p-8 text-center sm:p-10 lg:p-14">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[var(--r-tile)] bg-[color:var(--muted)] text-[color:var(--tone-shell-primary)]">
          <Icon className={`h-10 w-10 ${kind === "loading" ? "animate-spin" : ""}`} />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-[var(--space-inline)] text-3xl font-semibold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-[var(--space-inline)] max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base" role="status">
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
    <div role={tone === "success" ? "status" : "alert"} className={`rounded-[var(--r-tile)] border px-4 py-4 ${toneClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-control)] ${iconClass}`}>
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
  const phaseInfo = getHeaderPhaseInfo(currentWeek);
  const PhaseChipIcon = phaseInfo.chipIcon;

  return (
    <Card className="page-enter relative overflow-hidden">
      <MotionParallaxLayer
        depth={0.3}
        className="pointer-events-none absolute -right-16 top-0 hidden w-[560px] text-[color:var(--tone-shell-primary)] opacity-12 xl:block"
        aria-hidden="true"
      >
        <Hero12WeekScene className="w-full" />
      </MotionParallaxLayer>
      <SoftDotsPattern className="pointer-events-none absolute right-0 top-0 hidden w-44 text-[color:var(--tone-shell-primary)] opacity-15 sm:block" />
      <CardContent className="relative z-10 p-4 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-3 sm:gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 stack-tight">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand" className="rounded-[var(--r-pill)] px-3 py-1.5">
                Nhịp 12 tuần
              </Badge>
              <Badge variant="outline" className={`rounded-[var(--r-pill)] px-3 py-1.5 ${phaseInfo.badgeClassName}`}>
                <Target className="mr-1 h-3.5 w-3.5" />
                <PhaseChipIcon className="mr-1 h-4 w-4" />
                Tuần {currentWeek}/{system.totalWeeks} - {phaseInfo.label}
              </Badge>
              <Badge variant="outline" className={`rounded-[var(--r-pill)] px-3 py-1.5 ${syncBadgeClass}`}>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-[var(--r-pill)] bg-current opacity-70" aria-hidden="true" />
                {syncBadgeLabel}
              </Badge>
              {reviewDueToday && (
                <Badge variant="outline" className="rounded-[var(--r-pill)] border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] px-3 py-1.5 text-[color:var(--color-warning-fg)]">
                  Review hôm nay
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="line-clamp-2 max-w-4xl break-words text-3xl font-semibold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                {activeGoal.title}
              </h1>
              <p data-testid="twelve-week-header-description" className="hidden max-w-3xl text-sm leading-7 text-slate-600 sm:block">
                Bắt đầu từ tab Hôm nay: tick việc quan trọng nhất, lưu check-in, rồi mở Tuần để review.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-700">
              <span className="rounded-[var(--r-pill)] bg-slate-100 px-3 py-1">
                {getLifeAreaLabel(activeGoal.focusArea || activeGoal.category)}
              </span>
              <span className="rounded-[var(--r-pill)] bg-slate-100 px-3 py-1">Gói {getPlanLabel(activePlanCode)}</span>
              {activeGoal.feasibilityResult && (
                <span className="rounded-[var(--r-pill)] bg-slate-100 px-3 py-1">
                  {getFeasibilityResultLabel(activeGoal.feasibilityResult)}
                </span>
              )}
            </div>
          </div>

          <div
            data-testid="twelve-week-header-metrics"
            className="hidden min-w-0 grid-cols-3 gap-2 sm:grid sm:gap-3 xl:w-[540px]"
          >
            <ProductVisual variant="execution" className="hidden min-h-[136px] rounded-[var(--r-tile)] border border-slate-200/70 bg-slate-50/72 sm:col-span-3 sm:block" />
            <div className="glass-surface-sm rounded-[var(--r-control)] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50 px-2 py-2 shadow-sm sm:rounded-[var(--r-tile)] sm:px-4 sm:py-3 dark:border-amber-500/30 dark:from-amber-950/35 dark:to-orange-950/25">
              <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-[var(--r-control)] bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-950/70 dark:to-orange-950/50 dark:text-amber-200">
                <Zap className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.14em]">Còn làm</p>
              <p className="count-up mt-1 text-xl font-bold tabular-nums text-slate-950 sm:text-2xl">{todayRemainingCount}</p>
              <p className="hidden text-xs text-slate-500 sm:block">{todayCompletedCount} việc đã chốt hôm nay</p>
            </div>
            <div className="glass-surface-sm rounded-[var(--r-control)] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 px-2 py-2 shadow-sm sm:rounded-[var(--r-tile)] sm:px-4 sm:py-3 dark:border-emerald-500/30 dark:from-emerald-950/35 dark:to-teal-950/25">
              <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-[var(--r-control)] bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-950/70 dark:to-teal-950/50 dark:text-emerald-200">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.14em]">Tuần</p>
              <p className="count-up mt-1 text-xl font-bold tabular-nums text-slate-950 sm:text-2xl">
                <MotionCountUp value={weekCompletion.percent} suffix="%" />
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Đang chạy"}
              </p>
            </div>
            <div
              className={`rounded-[var(--r-control)] border px-2 py-2 shadow-sm sm:rounded-[var(--r-tile)] sm:px-4 sm:py-3 ${
                reviewDueToday
                  ? "border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 dark:border-rose-500/30 dark:from-rose-950/35 dark:to-pink-950/25"
                  : phaseInfo.tileClassName
              }`}
            >
              <span
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-[var(--r-control)] ${
                  reviewDueToday
                    ? "bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700 dark:from-rose-950/70 dark:to-pink-950/50 dark:text-rose-200"
                    : phaseInfo.iconClassName
                }`}
              >
                {reviewDueToday ? <Flame className="h-4 w-4" aria-hidden="true" /> : <CalendarDays className="h-4 w-4" aria-hidden="true" />}
              </span>
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.14em] ${
                  reviewDueToday ? "text-rose-700 dark:text-rose-200" : "text-slate-500"
                }`}
              >
                Review
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-950 sm:text-base">
                {reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">{reviewStatusLabel}</p>
            </div>
          </div>
        </div>

        <div data-testid="twelve-week-header-actions" className="mt-4 hidden flex-col gap-3 border-t border-slate-200 pt-4 sm:flex lg:flex-row lg:items-center lg:justify-between">
          <p className="min-w-0 text-sm leading-6 text-slate-600">
            {reviewDueToday
              ? "Việc tiếp theo: chốt review tuần trước khi mở việc mới."
              : firstPriorityTask
                ? `Việc quan trọng nhất: ${firstPriorityTask.title}`
                : "Hôm nay đang gọn. Bạn có thể lưu check-in hoặc xem lại tab Tuần."}
          </p>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto" onClick={onOpenFocusTab}>
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
    <details className="group rounded-[var(--r-tile)] border border-slate-200 bg-white/88 px-4 py-3 shadow-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-900">
        <span>Đổi chu kỳ 12 tuần khác</span>
        <span className="rounded-[var(--r-pill)] border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          {allGoals.length} chu kỳ
        </span>
      </summary>
      <div className="mt-[var(--space-inline)] stack-tight border-t border-slate-200 pt-3">
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
      className={`rounded-[var(--r-tile)] border px-4 py-3 text-sm ${style.wrapper}`}
      onAnimationStart={() => onTriggerFired(trigger)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-pill)] ${style.icon}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${style.headline}`}>{trigger.headline}</p>
            <p className={`mt-0.5 text-xs leading-5 ${style.detail}`}>{trigger.detail}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:ml-auto sm:w-auto">
          <Button
            variant="secondary"
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
