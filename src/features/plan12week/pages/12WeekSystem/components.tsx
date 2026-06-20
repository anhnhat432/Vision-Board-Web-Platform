import { AlertTriangle, Award, CheckCircle2, Compass, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

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
    <div className="surface-empty rounded-2xl border border-dashed border-app-line bg-gradient-to-br from-app-bg/30 to-app-surface/60 p-8 text-center shadow-xs">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-app-accent-soft/30 text-app-accent mb-3">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </div>
      <p className="sr-only">{title}</p>
      <p className="text-sm font-medium text-app-ink-soft">Đang tải góc nhìn của bạn...</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-app-ink-muted">{description}</p>
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
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-app-line bg-app-surface p-8 text-center shadow-app-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-app-accent" aria-hidden="true" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-app-ink-muted">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-xl font-semibold text-app-ink">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-app-ink-soft" role="status">
          {description}
        </p>
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-app-line bg-app-surface p-8 md:p-12 text-center shadow-app-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent-soft text-app-accent">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-app-accent">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold leading-tight text-app-ink tracking-tight">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-app-ink-soft">{description}</p>

      {/* 3 Step Onboarding Visual - Warm soft cards */}
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 text-left">
        <div className="rounded-2xl border border-app-line bg-app-bg p-6 transition-colors hover:border-app-accent/40">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-app-accent-soft text-xs font-bold text-app-accent">
            1
          </span>
          <h3 className="mt-4 font-serif text-base font-semibold text-app-ink">Lĩnh vực ưu tiên</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft">
            Tìm kiếm khía cạnh cuộc sống bạn khao khát được cải thiện lúc này.
          </p>
        </div>

        <div className="rounded-2xl border border-app-line bg-app-bg p-6 transition-colors hover:border-app-accent/40">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-app-accent-soft text-xs font-bold text-app-accent">
            2
          </span>
          <h3 className="mt-4 font-serif text-base font-semibold text-app-ink">Mục tiêu SMART</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft">
            Định hình ước mơ thành một đích đến rõ ràng, đo lường được.
          </p>
        </div>

        <div className="rounded-2xl border border-app-line bg-app-bg p-6 transition-colors hover:border-app-accent/40">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-app-accent-soft text-xs font-bold text-app-accent">
            3
          </span>
          <h3 className="mt-4 font-serif text-base font-semibold text-app-ink">Kế hoạch 12 tuần</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-app-ink-soft">
            Chia nhỏ hành động và cùng đồng hành qua từng tuần thực thi.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">{children}</div>
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
      ? "border-app-line/80 bg-app-surface/90 shadow-2xs"
      : tone === "error"
        ? "border-app-status-error/30 bg-app-status-error/10"
        : "border-app-status-warning/30 bg-app-status-warning/10";
  const iconClass =
    tone === "success" ? "text-app-accent" : tone === "error" ? "text-app-status-error" : "text-app-status-warning";
  const titleClass =
    tone === "warning"
      ? "font-serif text-app-status-warning font-semibold"
      : tone === "error"
        ? "font-serif text-app-status-error font-semibold"
        : "text-app-ink font-semibold";
  const role = tone === "success" ? "status" : "alert";

  return (
    <div role={role} className={`rounded-2xl border p-5 md:p-6 transition-all duration-150 ${toneClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-bg/50 border border-app-line/30 shadow-3xs">
          <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={`text-base ${titleClass}`}>{title}</p>
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
  const _domainLabel = activeGoal.focusArea || activeGoal.category;
  const cyclePercent = Math.max(
    0,
    Math.min(100, Math.round((currentWeek / Math.max(1, system.totalWeeks)) * 100)),
  );
  const weekPercent = Math.max(0, Math.min(100, Math.round(weekCompletion.percent)));

  return (
    <header className="relative overflow-hidden rounded-3xl bg-app-accent p-6 text-white shadow-lg md:p-8">
      {/* lớp sáng mảnh phía trên — tạo chiều sâu, không dùng blur/mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div className="min-w-0 space-y-3">
          <div
            data-testid="twelve-week-header-description"
            className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider"
          >
            <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-white/90">
              Hệ thống 12 tuần
            </span>
            <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-white/90">
              Tuần {currentWeek} / {system.totalWeeks}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-app-highlight px-2.5 py-0.5 text-app-ink">
              <PhaseIcon className="h-3 w-3 shrink-0" />
              <span>Nhịp {phaseInfo.label}</span>
            </span>
          </div>

          <InlineGoalTitleEdit
            title={activeGoal.title}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={1}
            titleClassName="break-words font-serif text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-white"
            inputClassName="h-auto rounded-lg bg-white/10 px-2 py-1 font-serif text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-white"
          />

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/70">
            <span className="rounded-md border border-white/15 px-1.5 py-0.5">Gói {getPlanLabel(activePlanCode)}</span>
            <span>·</span>
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border border-transparent ${syncBadgeClass}`}
            >
              {syncBadgeLabel}
            </span>
          </div>

          <div
            data-testid="twelve-week-header-actions"
            className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center"
          >
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-app-surface px-6 py-2.5 text-xs font-bold text-app-accent shadow-sm transition-colors hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/50"
              onClick={onOpenFocusTab}
            >
              <span>{reviewDueToday ? "Review tuần này" : "Xem việc hôm nay"}</span>
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              onClick={onOpenGoals}
            >
              Mở mục tiêu
            </button>
          </div>
        </div>

        {/* Bảng tiến độ — điểm nhấn số liệu nổi bật */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-black/20 p-4">
          <div className="col-span-2">
            <div className="flex items-end justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                Tiến độ chu kỳ
              </span>
              <span className="font-serif text-lg font-semibold tabular-nums text-white">
                {currentWeek}
                <span className="text-sm text-white/60">/{system.totalWeeks}</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
              <div className="h-full rounded-full bg-app-highlight" style={{ width: `${cyclePercent}%` }} />
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <div className="font-serif text-2xl font-semibold tabular-nums text-white">{weekPercent}%</div>
            <div className="mt-0.5 text-[10px] font-medium text-white/70">Tuần này</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="font-serif text-2xl font-semibold tabular-nums text-white">
              {todayCompletedCount}
              <span className="text-sm text-white/60">/{todayCompletedCount + todayRemainingCount}</span>
            </div>
            <div className="mt-0.5 text-[10px] font-medium text-white/70">Việc hôm nay</div>
          </div>
        </div>
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
          className="h-auto w-full max-w-full rounded-2xl border-app-line/60 bg-app-surface px-4 py-2.5 text-sm font-semibold text-app-ink shadow-2xs hover:bg-app-bg/50 focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:max-w-md transition-all"
          aria-label="Chọn mục tiêu 12 tuần"
        >
          <SelectValue placeholder="Chọn mục tiêu" />
        </SelectTrigger>
        <SelectContent className="surface-raised rounded-2xl border border-app-line/60 bg-app-surface p-1.5 shadow-md backdrop-blur-none">
          {allGoals.map((goal) => (
            <SelectItem
              key={goal.id}
              value={goal.id}
              className={`cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
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
      className="relative overflow-hidden rounded-2xl border border-app-status-warning/20 bg-gradient-to-br from-app-surface via-app-surface to-app-status-warning/10 p-5 shadow-2xs transition-colors"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-bg/50 border border-app-line/30 text-app-status-warning shadow-3xs">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-serif text-base font-semibold text-app-status-warning leading-snug">
              {trigger.headline}
            </p>
            <p className="text-xs leading-relaxed text-app-ink-soft">{trigger.detail}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2.5 sm:w-auto pt-2 sm:pt-0">
          <button
            type="button"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-app-status-warning px-5 py-2.5 text-xs font-bold text-white transition-all duration-150 hover:bg-app-status-warning/90 hover:opacity-95 hover:shadow-2xs sm:flex-none"
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
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-app-line/80 bg-app-surface px-5 py-2.5 text-xs font-semibold text-app-ink-soft transition-all duration-150 hover:bg-app-bg hover:text-app-ink hover:shadow-3xs sm:flex-none"
            onClick={() => onDismiss(trigger.kind)}
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}
