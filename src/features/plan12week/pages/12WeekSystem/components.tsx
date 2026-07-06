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
    <div role={role} className={`rounded-2xl border p-4 transition-all duration-150 md:p-6 ${toneClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-line/30 bg-app-bg/50 shadow-3xs sm:h-11 sm:w-11">
          <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={`text-sm sm:text-base ${titleClass}`}>{title}</p>
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
  syncBadgeClass: _syncBadgeClass,
  syncBadgeLabel,
  reviewDueToday,
  todayRemainingCount,
  todayCompletedCount,
  weekCompletion,
  reviewStatusLabel: _reviewStatusLabel,
  firstPriorityTask: _firstPriorityTask,
  onOpenFocusTab,
  onOpenGoals,
  onRenameGoal,
}: TwelveWeekDashboardHeaderProps) {
  const phaseInfo = getHeaderPhaseInfo(currentWeek);
  const _PhaseIcon = phaseInfo.icon;
  const _domainLabel = activeGoal.focusArea || activeGoal.category;
  const cyclePercent = Math.max(
    0,
    Math.min(100, Math.round((currentWeek / Math.max(1, system.totalWeeks)) * 100)),
  );
  const weekPercent = Math.max(0, Math.min(100, Math.round(weekCompletion.percent)));
  const gaugeOffset = 339.292 * (1 - cyclePercent / 100);

  return (
    <header className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-app-accent to-app-accent-hover py-[30px] px-[34px] text-white">
      {/* Dot pattern overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          opacity: 0.6,
        }}
      />
      {/* Glow circle top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[60px] -right-[30px] h-[240px] w-[240px] rounded-full"
        style={{ background: "var(--app-highlight-10, rgba(198,242,78,0.1))" }}
      />
      {/* Decorative ring 1 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[90px] -right-[60px] h-[300px] w-[300px] rounded-full border"
        style={{ borderColor: "var(--app-highlight-12, rgba(198,242,78,0.12))" }}
      />
      {/* Decorative ring 2 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[120px] right-[120px] h-[260px] w-[260px] rounded-full border"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      />

      <div className="relative grid gap-[30px] lg:grid-cols-[1fr_380px] lg:items-center">
        {/* LEFT COLUMN */}
        <div className="min-w-0">
          {/* Pills row 1 */}
          <div
            data-testid="twelve-week-header-description"
            className="flex flex-wrap items-center gap-2 mb-4"
          >
            <span className="rounded-full border border-white/[0.16] bg-white/[0.12] px-[11px] py-[5px] text-[10px] font-bold uppercase tracking-[0.1em] text-white/90">
              Hệ thống 12 tuần
            </span>
            <span className="rounded-full border border-white/[0.16] bg-white/[0.12] px-[11px] py-[5px] text-[10px] font-bold uppercase tracking-[0.1em] text-white/90 font-mono">
              Tuần {currentWeek} / {system.totalWeeks}
            </span>
            <span className="inline-flex items-center gap-[6px] rounded-full bg-app-highlight px-[11px] py-[5px] text-[10px] font-bold uppercase tracking-[0.08em] text-app-ink">
              <span className="inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-app-accent" />
              <span>Nhịp {phaseInfo.label}</span>
            </span>
          </div>

          {/* Title */}
          <div className="mb-4">
          <InlineGoalTitleEdit
            title={activeGoal.title}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={1}
            titleClassName="break-words font-serif text-[clamp(24px,2.7vw,32px)] font-extrabold leading-[1.12] tracking-[-0.02em] max-w-[24ch] text-white"
            inputClassName="h-auto rounded-lg bg-white/10 px-2 py-1 font-serif text-[clamp(24px,2.7vw,32px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-white"
          />
          </div>

          {/* Pills row 2 */}
          <div className="flex flex-wrap items-center gap-2 mb-[22px]">
            <span className="rounded-full bg-white/[0.1] px-3 py-[5px] text-[11.5px] font-semibold">Gói {getPlanLabel(activePlanCode)}</span>
            <span className="inline-flex items-center gap-2 text-[11.5px] font-medium text-white/60">
              <span className="inline-block h-1 w-1 rounded-full bg-white/60" />
              {syncBadgeLabel}
            </span>
          </div>

          {/* Buttons */}
          <div
            data-testid="twelve-week-header-actions"
            className="flex flex-wrap gap-[10px]"
          >
            <button
              type="button"
              className="inline-flex items-center justify-center gap-[9px] rounded-full bg-white px-[20px] py-[12px] text-[13.5px] font-bold text-app-accent transition-colors hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/50"
              onClick={onOpenFocusTab}
            >
              <span>{reviewDueToday ? "Review tuần này" : "Xem việc hôm nay"}</span>
              <Target className="h-[15px] w-[15px]" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.1] px-[20px] py-[12px] text-[13.5px] font-semibold text-white transition-colors hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              onClick={onOpenGoals}
            >
              Mở mục tiêu
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN — gauge + stat cards */}
        <div className="flex flex-col gap-[14px]">
          {/* Gauge card */}
          <div className="relative flex items-center gap-[18px] overflow-hidden rounded-[18px] border border-white/[0.12] bg-white/[0.06] p-[22px]">
            {/* Glow behind gauge */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[6px] top-[6px] h-[130px] w-[130px] rounded-full blur-[36px]"
              style={{ background: "var(--app-highlight-22, rgba(198,242,78,0.22))" }}
            />
            {/* SVG gauge */}
            <div className="relative h-[128px] w-[128px] shrink-0">
              <svg viewBox="0 0 128 128" className="h-[128px] w-[128px] -rotate-90" aria-hidden="true">
                <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke="var(--app-highlight)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="339.29"
                  strokeDashoffset={gaugeOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-serif text-[32px] font-extrabold leading-none text-white">
                  {currentWeek}
                  <span className="text-[16px] text-white/60">/{system.totalWeeks}</span>
                </span>
                <span className="mt-[3px] text-[9px] font-bold uppercase tracking-[0.06em] text-white/60">tuần chu kỳ</span>
              </div>
            </div>
            {/* Gauge text */}
            <div className="relative min-w-0">
              <div className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-app-highlight">Tiến độ chu kỳ</div>
              <p className="text-[12.5px] leading-[1.5] text-white/80">
                Đang ở nhịp {phaseInfo.label.toLowerCase()} — giữ đều mỗi tuần một đầu ra thật.
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-[12px]">
            <div className="rounded-[13px] border border-white/[0.1] bg-white/[0.06] p-[14px]">
              <div className="font-serif text-[26px] font-extrabold leading-none text-app-highlight">{weekPercent}%</div>
              <div className="mt-[5px] text-[11px] font-medium text-white/60">Tuần này</div>
            </div>
            <div className="rounded-[13px] border border-white/[0.1] bg-white/[0.06] p-[14px]">
              <div className="font-serif text-[26px] font-extrabold leading-none text-white">
                {todayCompletedCount}
                <span className="text-[15px] text-white/60">/{todayCompletedCount + todayRemainingCount}</span>
              </div>
              <div className="mt-[5px] text-[11px] font-medium text-white/60">Việc hôm nay</div>
            </div>
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
          className="h-auto w-full max-w-full rounded-[14px] border-app-line bg-app-surface px-4 py-2.5 text-[14px] font-semibold text-app-ink shadow-2xs hover:bg-app-bg/50 focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto sm:max-w-md transition-all"
          aria-label="Chọn mục tiêu 12 tuần"
        >
          <SelectValue placeholder="Chọn mục tiêu" />
        </SelectTrigger>
        <SelectContent className="surface-raised rounded-2xl border border-app-line/60 bg-app-surface p-1.5 shadow-app-md backdrop-blur-none">
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
