import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, Award, CheckCircle2, Compass, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";

import { InlineGoalTitleEdit } from "@/app/components/twelve-week/InlineGoalTitleEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
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

export function TwelveWeekTabFallback({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface-empty rounded-xl border border-dashed border-app-line bg-app-bg/50 p-6 text-center">
      <Loader2 className="mx-auto h-5 w-5 animate-spin text-app-accent" aria-hidden="true" />
      <p className="sr-only">{title}</p>
      <p className="mt-2 text-xs text-app-ink-soft">Đang mở tab...</p>
      <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-app-ink-muted">{description}</p>
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

  if (kind === "loading") {
    return (
      <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-app-line bg-app-surface p-8 text-center shadow-xs">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-app-accent" aria-hidden="true" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-app-ink-muted">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-xl font-bold text-app-ink">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-app-ink-soft" role="status">
          {description}
        </p>
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-app-line bg-app-surface p-8 md:p-10 text-center shadow-xs relative overflow-hidden">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-app-accent">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-semibold leading-tight text-app-ink">{title}</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-app-ink-soft">
        {description}
      </p>

      {/* 3 Step Onboarding Visual - Clean paper note cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
        <div className="relative bg-app-bg/50 border border-app-line/60 rounded-xl p-5 shadow-2xs transition-colors duration-200">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-app-accent-soft text-xs font-bold text-app-accent">1</span>
          <h3 className="mt-3 font-serif text-base font-semibold text-app-ink">Lĩnh vực ưu tiên</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Chọn khía cạnh cuộc sống bạn muốn bứt phá trong chu kỳ này.</p>
        </div>

        <div className="relative bg-app-bg/50 border border-app-line/60 rounded-xl p-5 shadow-2xs transition-colors duration-200">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-app-warm-soft/60 text-xs font-bold text-app-warm-strong">2</span>
          <h3 className="mt-3 font-serif text-base font-semibold text-app-ink">Mục tiêu SMART</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Xác định mục tiêu rõ ràng, đo lường được và khả thi cao.</p>
        </div>

        <div className="relative bg-app-bg/50 border border-app-line/60 rounded-xl p-5 shadow-2xs transition-colors duration-200">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-app-accent-soft text-xs font-bold text-app-accent">3</span>
          <h3 className="mt-3 font-serif text-base font-semibold text-app-ink">Kế hoạch 12 tuần</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Bẻ nhỏ thành các hành động tuần tự và chỉ số thực tế.</p>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {children}
      </div>
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
      ? "border-app-line bg-app-surface/90 shadow-sm"
      : tone === "error"
        ? "border-red-200/50 bg-red-50/10 dark:border-red-950/30 dark:bg-red-950/10"
        : "border-app-warm-border/30 bg-app-warm-soft/20";
  const iconClass =
    tone === "success" ? "text-app-accent" : tone === "error" ? "text-red-600 dark:text-red-400" : "text-app-warm";
  const titleClass =
    tone === "warning"
      ? "font-serif text-app-warm-strong font-bold"
      : tone === "error"
        ? "font-serif text-red-700 dark:text-red-400 font-bold"
        : "text-app-ink font-bold";
  const role = tone === "success" ? "status" : "alert";

  return (
    <div role={role} className={`rounded-2xl border p-5 md:p-6 transition-all duration-150 ${toneClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-bg/60 border border-app-line/40 shadow-3xs">
          <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={`text-base font-semibold ${titleClass}`}>{title}</p>
          <p className="text-sm leading-relaxed text-app-ink-soft">{description}</p>
        </div>
        {children ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center pt-2 sm:pt-0">
            {children}
          </div>
        ) : null}
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
  onRenameGoal?: (title: string) => void | Promise<void>;
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
  onRenameGoal,
}: TwelveWeekDashboardHeaderProps) {
  const phaseInfo = getHeaderPhaseInfo(currentWeek);
  const PhaseIcon = phaseInfo.icon;
  const domainLabel = activeGoal.focusArea || activeGoal.category;

  return (
    <header className="relative border border-app-line/40 bg-app-surface rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent bg-app-accent-soft px-2.5 py-1 rounded">
              Hệ thống 12 tuần
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-soft bg-app-bg px-2.5 py-1 rounded">
              Tuần {currentWeek}/{system.totalWeeks}
            </span>
          </div>

          <span className="sr-only">Nhịp 12 tuần</span>
          <InlineGoalTitleEdit
            title={activeGoal.title}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={1}
            titleClassName="break-words font-serif text-2xl font-semibold leading-tight tracking-tight text-app-ink sm:text-3xl"
            inputClassName="h-auto rounded-xl px-3 py-2 font-serif text-2xl font-semibold leading-tight tracking-tight text-app-ink sm:text-3xl"
          />

          {/* Rhythm Status Indicator */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-app-ink-soft">
            <span className="flex items-center gap-1.5 text-app-ink-soft/80">
              <PhaseIcon className="h-4 w-4 text-app-accent shrink-0" />
              Nhịp {phaseInfo.label}
            </span>
          </div>
        </div>

        {/* Action Button: Rounded-xl premium buttons */}
        <div className="flex flex-col gap-2.5 sm:flex-row md:shrink-0 pt-2 md:pt-0">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-app-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 shadow-sm"
            onClick={onOpenFocusTab}
          >
            <span>{reviewDueToday ? "Mở review tuần" : "Xem việc hôm nay"}</span>
            <Target className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 shadow-xs"
            onClick={onOpenGoals}
          >
            Mở mục tiêu
          </button>
        </div>
      </div>

      {/* Next Best Action Card: Clean paper note card style */}
      <div className="relative overflow-hidden rounded-xl border-l-2 border-l-app-accent border-y border-r border-app-line/40 bg-app-bg/40 p-4 transition-colors duration-150">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-accent/90">Hành động tốt nhất tiếp theo</p>
            <p className="text-sm font-medium leading-relaxed text-app-ink">
              {reviewDueToday ? (
                <>
                  <span className="font-semibold text-app-warm-strong">Đến hạn review tuần:</span> Chốt review tuần trước khi mở việc mới để giữ nhịp thực thi.
                </>
              ) : firstPriorityTask ? (
                <>
                  <span className="font-semibold text-app-accent">Việc quan trọng nhất hôm nay:</span> {firstPriorityTask.title}
                </>
              ) : (
                "Hôm nay đang gọn. Bạn có thể lưu check-in hoặc xem lại tab Tuần để chuẩn bị."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Subtle metadata at footer of header to reduce noise */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-app-ink-soft border-t border-app-line/30 pt-3.5">
        {domainLabel && <span>Lĩnh vực: {domainLabel}</span>}
        {domainLabel && <span className="opacity-40">•</span>}
        <span className="flex items-center gap-1.5">
          {syncBadgeLabel === "Đang đồng bộ" ? (
            <Loader2 className="h-3 w-3 animate-spin text-app-accent" />
          ) : (
            <span className={`h-1.5 w-1.5 rounded-full ${syncBadgeLabel === "Đã lưu & đồng bộ" ? "bg-app-accent/70" : "bg-app-warm/70"}`} />
          )}
          Đồng bộ: {syncBadgeLabel}
        </span>
        <span className="opacity-40">•</span>
        <span>Gói: {getPlanLabel(activePlanCode)}</span>
        <span className="opacity-40">•</span>
        {reviewDueToday ? (
          <span>{reviewStatusLabel}</span>
        ) : (
          <span>Còn {todayRemainingCount} việc hôm nay · Xong {todayCompletedCount}/{weekCompletion.total} việc tuần này</span>
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
          className="h-auto w-full max-w-full rounded-xl border-app-line bg-app-surface px-4 py-2.5 text-sm font-semibold text-app-ink shadow-xs hover:bg-app-bg focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:max-w-md"
          aria-label="Chọn mục tiêu 12 tuần"
        >
          <SelectValue placeholder="Chọn mục tiêu" />
        </SelectTrigger>
        <SelectContent className="surface-raised rounded-xl border border-app-line bg-app-surface p-1.5 shadow-md backdrop-blur-none">
          {allGoals.map((goal) => (
            <SelectItem
              key={goal.id}
              value={goal.id}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-medium ${
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
    <div 
      role="alert" 
      className="relative overflow-hidden rounded-xl border border-app-warm-border/30 bg-app-warm-soft/10 p-5 transition-colors"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-bg/60 border border-app-line/40 text-app-warm">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-serif text-base font-semibold text-app-warm-strong leading-snug">{trigger.headline}</p>
            <p className="text-xs leading-relaxed text-app-ink-soft">{trigger.detail}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2.5 sm:w-auto pt-2 sm:pt-0">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-app-warm px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-app-warm hover:opacity-90 sm:flex-none"
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
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2 text-xs font-medium text-app-ink-muted transition-colors duration-150 hover:bg-app-bg hover:text-app-ink sm:flex-none"
            onClick={() => onDismiss(trigger.kind)}
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}
