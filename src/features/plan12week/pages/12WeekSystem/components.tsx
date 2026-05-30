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
    <div className="surface-empty rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-8 text-center">
      <Loader2 className="mx-auto h-5 w-5 animate-spin text-app-accent" aria-hidden="true" />
      <p className="sr-only">{title}</p>
      <p className="mt-3 text-sm text-app-ink-soft">Đang mở tab...</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-app-ink-muted">{description}</p>
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
      <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-dashed border-app-line bg-app-surface/50 p-12 text-center shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-accent-soft text-app-accent shadow-sm animate-pulse">
          <Icon className="h-6 w-6 animate-spin" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-app-ink-muted">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-2xl font-bold leading-tight text-app-ink">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-app-ink-soft" role="status">
          {description}
        </p>
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-app-line bg-app-surface p-8 md:p-12 text-center shadow-md relative overflow-hidden">
      {/* Wooden Pin Decorator */}
      <div className="absolute top-4 left-4 text-2xl select-none" aria-hidden="true">📌</div>
      <div className="absolute top-4 right-4 text-2xl select-none" aria-hidden="true">📌</div>

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-app-accent shadow-sm">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-app-accent">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-app-ink">{title}</h1>
      <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-app-ink-soft">
        {description}
      </p>

      {/* 3 Step Onboarding Visual Guideline - paper note cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
        <div 
          className="relative bg-app-accent-soft/15 border border-app-accent-soft/30 rounded-2xl p-5 shadow-sm transition-transform duration-300 hover:scale-[1.03]"
          style={{ transform: "rotate(-1deg)" }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg select-none">📌</div>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-app-accent/20 text-xs font-bold text-app-accent">1</span>
          <h3 className="mt-3 font-serif text-base font-bold text-app-ink">Lĩnh vực ưu tiên</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Chọn khía cạnh cuộc sống bạn muốn bứt phá nhất trong chu kỳ này.</p>
        </div>

        <div 
          className="relative bg-app-warm-soft/20 border border-app-warm-border/30 rounded-2xl p-5 shadow-sm transition-transform duration-300 hover:scale-[1.03]"
          style={{ transform: "rotate(0.8deg)" }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg select-none">📌</div>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-app-warm/20 text-xs font-bold text-app-warm-strong">2</span>
          <h3 className="mt-3 font-serif text-base font-bold text-app-ink">Mục tiêu SMART</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Thiết lập mục tiêu rõ ràng, đo lường được và có tính khả thi cao.</p>
        </div>

        <div 
          className="relative bg-app-accent-soft/15 border border-app-accent-soft/30 rounded-2xl p-5 shadow-sm transition-transform duration-300 hover:scale-[1.03]"
          style={{ transform: "rotate(-0.5deg)" }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg select-none">📌</div>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-app-accent/20 text-xs font-bold text-app-accent">3</span>
          <h3 className="mt-3 font-serif text-base font-bold text-app-ink">Kế hoạch 12 tuần</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Bẻ nhỏ mục tiêu thành các hành động lặp lại và chỉ số tuần tự.</p>
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
      ? "border-app-line bg-app-surface shadow-sm"
      : tone === "error"
        ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)]/20 backdrop-blur-sm"
        : "border-app-warm-border/50 bg-app-warm-soft/40 backdrop-blur-sm";
  const iconClass =
    tone === "success" ? "text-app-accent" : tone === "error" ? "text-[color:var(--color-danger-fg)]" : "text-app-warm";
  const titleClass =
    tone === "warning"
      ? "font-serif text-app-warm-strong font-bold"
      : tone === "error"
        ? "text-[color:var(--color-danger-fg)] font-bold"
        : "text-app-ink font-bold";
  const role = tone === "success" ? "status" : "alert";

  return (
    <div role={role} className={`rounded-2xl border p-5 md:p-6 transition-all duration-200 hover:shadow-md ${toneClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-bg/60 shadow-sm">
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
    <header className="relative space-y-6">
      {/* Background phygital subtle pin decorator */}
      <div className="absolute -top-4 -left-4 hidden md:block text-2xl select-none" aria-hidden="true">
        📌
      </div>

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent bg-app-accent-soft px-2.5 py-1 rounded-md">
              Hệ thống 12 tuần
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-app-line bg-app-surface px-2.5 py-0.5 text-xs font-semibold text-app-ink-soft shadow-xs">
              Tuần {currentWeek}/{system.totalWeeks}
            </span>
          </div>

          <span className="sr-only">Nhịp 12 tuần</span>
          <InlineGoalTitleEdit
            title={activeGoal.title}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={1}
            titleClassName="break-words font-serif text-3xl font-bold leading-tight tracking-tight text-app-ink sm:text-4xl"
            inputClassName="h-auto rounded-xl px-3 py-2 font-serif text-2xl font-bold leading-tight tracking-tight text-app-ink sm:text-3xl"
          />

          {/* Metadata Row: Clean and subtle */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-app-ink-soft">
            {domainLabel && (
              <span className="font-semibold text-app-ink">
                Lĩnh vực: {domainLabel}
              </span>
            )}
            {domainLabel && <span className="text-app-line">•</span>}
            <span className="flex items-center gap-1">
              <PhaseIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Giai đoạn {phaseInfo.label}
            </span>
            <span className="text-app-line">•</span>
            <span className="flex items-center gap-1">
              {syncBadgeLabel === "Đang đồng bộ" ? (
                <Loader2 className="h-3 w-3 animate-spin text-app-accent" />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${syncBadgeLabel === "Đã lưu & đồng bộ" ? "bg-app-accent" : "bg-app-warm"}`} />
              )}
              {syncBadgeLabel}
            </span>
            <span className="text-app-line">•</span>
            <span className="font-medium text-app-ink">Gói {getPlanLabel(activePlanCode)}</span>
          </div>
        </div>

        {/* CTA Actions: 1 Primary Capsule and 1 Subtle Secondary */}
        <div className="flex flex-col gap-2.5 sm:flex-row md:shrink-0">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-app-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-app-accent/90 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onOpenFocusTab}
          >
            <span>{reviewDueToday ? "Mở review tuần" : "Xem việc hôm nay"}</span>
            <Target className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-app-line bg-app-surface px-5 py-3 text-sm font-medium text-app-ink transition-all duration-200 hover:bg-app-bg hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onOpenGoals}
          >
            Mở mục tiêu
          </button>
        </div>
      </div>

      {/* Next Best Action Card: Phygital paper note style, tilted very slightly */}
      <div 
        className="relative overflow-hidden rounded-2xl border border-app-accent-soft/40 bg-app-accent-soft/10 p-5 transition-all duration-200 hover:shadow-md"
        style={{ transform: "rotate(-0.2deg)" }}
      >
        <div className="absolute top-2 right-2 text-base opacity-40 select-none hidden sm:block">📌</div>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-app-accent/90">Hành động tốt nhất tiếp theo</p>
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

      {/* Quick stats grid below */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap text-xs text-app-ink-soft">
        <div className="rounded-xl border border-app-line bg-app-surface/60 p-3 sm:px-4 sm:py-2">
          <span className="block text-app-ink-muted">Hoàn thành tuần này</span>
          <span className="font-serif text-lg font-bold text-app-ink">{weekCompletion.percent}%</span>
        </div>
        <div className="rounded-xl border border-app-line bg-app-surface/60 p-3 sm:px-4 sm:py-2">
          <span className="block text-app-ink-muted">Việc hôm nay</span>
          <span className="font-serif text-lg font-bold text-app-ink">{todayRemainingCount} việc còn lại</span>
        </div>
        {reviewDueToday ? (
          <div className="col-span-2 rounded-xl border border-app-line bg-app-surface/60 p-3 sm:px-4 sm:py-2 sm:col-span-1">
            <span className="block text-app-ink-muted">Trạng thái review</span>
            <span className="font-serif text-lg font-bold text-app-ink text-app-warm-strong">{reviewStatusLabel}</span>
          </div>
        ) : (
          <div className="col-span-2 rounded-xl border border-app-line bg-app-surface/60 p-3 sm:px-4 sm:py-2 sm:col-span-1">
            <span className="block text-app-ink-muted">Tiến độ chung</span>
            <span className="font-serif text-lg font-bold text-app-ink text-app-accent">{todayCompletedCount}/{weekCompletion.total} việc</span>
          </div>
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
        <SelectContent className="surface-raised rounded-2xl border border-app-line bg-app-surface p-1.5 shadow-md backdrop-blur-none">
          {allGoals.map((goal) => (
            <SelectItem
              key={goal.id}
              value={goal.id}
              className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium ${
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
      className="relative overflow-hidden rounded-2xl border border-app-warm-border/60 bg-app-warm-soft/40 p-5 md:p-6 transition-all duration-200 hover:shadow-md"
      style={{ transform: "rotate(0.2deg)" }}
    >
      <div className="absolute top-2 right-2 text-base opacity-30 select-none">📌</div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-bg/60 shadow-sm text-app-warm">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-serif text-lg font-bold text-app-warm-strong leading-snug">{trigger.headline}</p>
            <p className="text-sm leading-relaxed text-app-ink-soft">{trigger.detail}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2.5 sm:w-auto pt-2 sm:pt-0">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-app-warm px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-app-warm hover:opacity-90 hover:scale-[1.02] active:scale-95 sm:flex-none"
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
            className="inline-flex flex-1 items-center justify-center rounded-full border border-app-line bg-app-surface/80 px-5 py-2.5 text-sm font-medium text-app-ink-muted transition-all duration-150 hover:bg-app-bg hover:text-app-ink hover:scale-[1.02] active:scale-95 sm:flex-none"
            onClick={() => onDismiss(trigger.kind)}
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}
