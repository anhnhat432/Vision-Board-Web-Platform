import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, Award, CheckCircle2, Compass, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { getReviewDayLabel } from "@/app/utils/storage";
import type {
  Goal,
  PricingPlanCode,
  RescueTrigger,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
} from "@/app/utils/storage-types";
import { getPlanLabel } from "@/app/utils/twelve-week-premium";

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

function getHeaderPhaseInfo(currentWeek: number) {
  if (currentWeek <= 4) {
    return {
      label: "Khởi động",
      icon: Compass,
    };
  }

  if (currentWeek <= 8) {
    return {
      label: "Bứt phá",
      icon: TrendingUp,
    };
  }

  return {
    label: "Thu hoạch",
    icon: Award,
  };
}

function getTokenSyncBadgeClass(syncBadgeClass: string, syncBadgeLabel: string): string {
  if (syncBadgeClass.includes("app-") || syncBadgeClass.includes("color:")) return syncBadgeClass;

  if (syncBadgeLabel === "Đã lưu & đồng bộ") {
    return "border-transparent bg-app-accent-soft text-app-accent";
  }

  if (syncBadgeLabel === "Đã lưu trên thiết bị") {
    return "border-app-warm-border bg-app-warm-soft text-app-warm";
  }

  return "border-app-line bg-app-bg text-app-ink-soft";
}

export function TwelveWeekTabFallback({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-card border border-app-line bg-app-surface p-8 text-center">
      <Loader2 className="mx-auto h-5 w-5 animate-spin text-app-accent" aria-hidden="true" />
      <p className="sr-only">{title}</p>
      <p className="mt-3 text-[14px] text-app-ink-soft">Đang mở tab...</p>
      <p className="mx-auto mt-2 max-w-xl text-[14px] leading-6 text-app-ink-muted">{description}</p>
    </div>
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
    <div className="mx-auto mt-12 max-w-2xl rounded-card border border-app-line bg-app-surface p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
        <Icon className={`h-5 w-5 ${kind === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
      </div>
      <p className="mt-4 text-[13px] font-medium uppercase tracking-[0.18em] text-app-ink-muted">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-[24px] font-medium leading-tight text-app-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-[15px] leading-6 text-app-ink-soft" role="status">
        {description}
      </p>
      {children}
    </div>
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
      ? "border-app-line bg-app-surface"
      : tone === "error"
        ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)]"
        : "border-app-warm-border bg-app-warm-soft";
  const iconClass =
    tone === "success"
      ? "text-app-accent"
      : tone === "error"
        ? "text-[color:var(--color-danger-fg)]"
        : "text-app-warm";
  const titleClass =
    tone === "warning"
      ? "font-serif text-app-warm-strong"
      : tone === "error"
        ? "text-[color:var(--color-danger-fg)]"
        : "text-app-ink";
  const role = tone === "success" ? "status" : "alert";

  return (
    <div role={role} className={`rounded-card border p-4 ${toneClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-medium ${titleClass}`}>{title}</p>
          <p className="mt-1 text-[14px] leading-6 text-app-ink-soft">{description}</p>
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
  reviewStatusLabel,
  firstPriorityTask,
  onOpenFocusTab,
  onOpenGoals,
}: TwelveWeekDashboardHeaderProps) {
  const phaseInfo = getHeaderPhaseInfo(currentWeek);
  const PhaseIcon = phaseInfo.icon;
  const tokenSyncBadgeClass = getTokenSyncBadgeClass(syncBadgeClass, syncBadgeLabel);
  const domainLabel = activeGoal.focusArea || activeGoal.category;
  const nextActionLabel = reviewDueToday
    ? "Việc tiếp theo: chốt review tuần trước khi mở việc mới."
    : firstPriorityTask
      ? `Việc quan trọng nhất: ${firstPriorityTask.title}`
      : "Hôm nay đang gọn. Bạn có thể lưu check-in hoặc xem lại tab Tuần.";

  return (
    <header>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-app-ink-muted">HỆ THỐNG 12 TUẦN</p>
          <span className="sr-only">Nhịp 12 tuần</span>
          <h1 className="mt-2 break-words font-serif text-[30px] font-medium leading-tight tracking-tight text-app-ink">
            {activeGoal.title || "Kế hoạch hiện tại"}
          </h1>
          <p data-testid="twelve-week-header-description" className="mt-1 text-[14px] leading-6 text-app-ink-soft">
            Tuần {currentWeek} / {system.totalWeeks}{domainLabel ? ` · ${domainLabel}` : ""}
          </p>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-app-ink-soft">{nextActionLabel}</p>
        </div>

        <div data-testid="twelve-week-header-actions" className="flex flex-col gap-2 sm:flex-row md:shrink-0">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-app-accent px-4 py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-app-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onOpenFocusTab}
          >
            {reviewDueToday ? "Mở review tuần" : "Xem việc hôm nay"}
            <Target className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-[14px] font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onOpenGoals}
          >
            Mở mục tiêu
          </button>
        </div>
      </div>

      <div data-testid="twelve-week-header-metrics" className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-app-accent-soft px-3 py-1 text-[13px] font-medium text-app-accent">
          Tuần {currentWeek} / {system.totalWeeks}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-bg px-3 py-1 text-[13px] text-app-ink-soft">
          <PhaseIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {phaseInfo.label}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium ${tokenSyncBadgeClass}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
          {syncBadgeLabel}
        </span>
        <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-3 py-1 text-[13px] text-app-ink-soft">
          Gói {getPlanLabel(activePlanCode)}
        </span>
        {reviewDueToday && (
          <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-3 py-1 text-[13px] text-app-ink-soft">
            {getReviewDayLabel(system.reviewDay)} · {reviewStatusLabel}
          </span>
        )}
        {!reviewDueToday && (
          <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-3 py-1 text-[13px] text-app-ink-soft">
            Còn {todayRemainingCount} hôm nay · {todayCompletedCount}/{weekCompletion.total} việc tuần
          </span>
        )}
      </div>
    </header>
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
    <div className="flex">
      <Select value={activeGoalId} onValueChange={onLoadGoal}>
        <SelectTrigger
          className="h-auto w-full max-w-full rounded-lg border-app-line bg-app-surface px-3.5 py-2 text-[14px] font-medium text-app-ink shadow-none hover:bg-app-bg focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:max-w-md"
          aria-label="Chọn mục tiêu 12 tuần"
        >
          <SelectValue placeholder="Chọn mục tiêu" />
        </SelectTrigger>
        <SelectContent className="rounded-card border border-app-line bg-app-surface p-1.5 shadow-md backdrop-blur-none">
          {allGoals.map((goal) => (
            <SelectItem
              key={goal.id}
              value={goal.id}
              className={`cursor-pointer rounded-md px-2.5 py-2 text-[14px] ${
                goal.id === activeGoalId
                  ? "bg-app-accent-soft text-app-accent focus:bg-app-accent-soft focus:text-app-accent"
                  : "text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
              }`}
            >
              {goal.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
  const firedTriggerKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!trigger) return;

    const triggerKey = `${trigger.kind}:${trigger.headline}`;
    if (firedTriggerKeyRef.current === triggerKey) return;

    firedTriggerKeyRef.current = triggerKey;
    onTriggerFired(trigger);
  }, [onTriggerFired, trigger]);

  if (!trigger) return null;

  const isUpgradeTrigger = trigger.kind === "trial_ending";
  const ctaLabel = isUpgradeTrigger ? "Nâng cấp ngay" : "Xem ngay";

  return (
    <div role="alert" className="rounded-card border border-app-warm-border bg-app-warm-soft p-4 md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-app-warm" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[17px] font-medium text-app-warm-strong">{trigger.headline}</p>
            <p className="mt-1 text-[14px] leading-6 text-app-ink-soft">{trigger.detail}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-transparent bg-app-warm px-4 py-2 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-app-warm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:flex-none"
            onClick={() => {
              const action = isUpgradeTrigger ? "upgrade" : "navigate_system";
              onActionTaken(trigger, action);
              if (isUpgradeTrigger) onOpenUpgrade();
              else onOpenToday();
            }}
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center rounded-lg px-4 py-2 text-[14px] font-medium text-app-ink-muted transition-colors duration-150 hover:bg-app-surface hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30 sm:flex-none"
            onClick={() => onDismiss(trigger.kind)}
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}
