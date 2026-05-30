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
    <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-app-line bg-app-surface p-6 md:p-8 text-center shadow-xs relative">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-app-accent">{eyebrow}</p>
      <h1 className="mt-1 font-serif text-2xl font-bold text-app-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm text-app-ink-soft">
        {description}
      </p>

      {/* 3 Step Onboarding Visual - Flat and structured */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 text-left">
        <div className="bg-app-bg border border-app-line/60 rounded-xl p-4 transition-colors hover:border-app-line">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-app-accent/15 text-xs font-bold text-app-accent">1</span>
          <h3 className="mt-2 font-serif text-sm font-bold text-app-ink">Lĩnh vực ưu tiên</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Chọn khía cạnh cuộc sống bạn muốn bứt phá trong chu kỳ này.</p>
        </div>

        <div className="bg-app-bg border border-app-line/60 rounded-xl p-4 transition-colors hover:border-app-line">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-app-warm/15 text-xs font-bold text-app-warm-strong">2</span>
          <h3 className="mt-2 font-serif text-sm font-bold text-app-ink">Mục tiêu SMART</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Xác định mục tiêu rõ ràng, đo lường được và khả thi cao.</p>
        </div>

        <div className="bg-app-bg border border-app-line/60 rounded-xl p-4 transition-colors hover:border-app-line">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-app-accent/15 text-xs font-bold text-app-accent">3</span>
          <h3 className="mt-2 font-serif text-sm font-bold text-app-ink">Kế hoạch 12 tuần</h3>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">Bẻ nhỏ thành các hành động tuần tự và chỉ số thực tế.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
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
      ? "border-app-line bg-app-surface"
      : tone === "error"
        ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)]/10"
        : "border-app-warm-border/40 bg-app-warm-soft/20";
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
    <div role={role} className={`rounded-xl border p-4 transition-colors ${toneClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-bg/50 border border-app-line/40">
          <Icon className={`h-4.5 w-4.5 ${iconClass}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={`text-sm font-semibold ${titleClass}`}>{title}</p>
          <p className="text-xs leading-relaxed text-app-ink-soft">{description}</p>
        </div>
        {children ? (
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center pt-1 sm:pt-0">
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

  const nextActionLabel = reviewDueToday
    ? "Đến hạn đánh giá (Review) tuần trước khi bắt đầu công việc mới."
    : firstPriorityTask
      ? `Việc quan trọng nhất hôm nay: ${firstPriorityTask.title}`
      : "Hôm nay đang gọn. Hãy lưu check-in hoặc xem tab Tuần.";

  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-app-ink-muted bg-app-bg px-2.5 py-0.5 rounded border border-app-line/60">
            Execution Command Center
          </span>

          <span className="sr-only">Nhịp 12 tuần</span>
          <InlineGoalTitleEdit
            title={activeGoal.title}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={1}
            titleClassName="break-words font-serif text-2xl font-bold leading-tight tracking-tight text-app-ink sm:text-3xl"
            inputClassName="h-auto rounded-lg px-2 py-1 font-serif text-2xl font-bold leading-tight tracking-tight text-app-ink sm:text-3xl"
          />

          {/* Core metadata: week number and rhythm status */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-semibold text-app-ink">
            <span className="text-app-accent">Tuần {currentWeek}/{system.totalWeeks}</span>
            <span className="text-app-line/60">|</span>
            <span className="flex items-center gap-1 text-app-ink-soft">
              <PhaseIcon className="h-3.5 w-3.5" />
              Nhịp {phaseInfo.label}
            </span>
          </div>

          {/* Next Best Action: highly integrated, clean and flat border-l style */}
          <div className="text-xs sm:text-sm text-app-ink leading-relaxed border-l-2 border-app-accent pl-3 mt-2">
            <span className="font-semibold text-app-accent uppercase tracking-wider text-[10px] block mb-0.5">Tiêu điểm tiếp theo</span>
            {nextActionLabel}
          </div>
        </div>

        {/* CTA Actions: bo góc rounded-xl phẳng, không scale hay shadow */}
        <div className="flex flex-col gap-2 sm:flex-row md:shrink-0 pt-2 md:pt-0">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-app-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onOpenFocusTab}
          >
            <span>{reviewDueToday ? "Mở review tuần" : "Xem việc hôm nay"}</span>
            <Target className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onOpenGoals}
          >
            Mở mục tiêu
          </button>
        </div>
      </div>

      {/* Subtle metadata at footer of header to reduce noise */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-app-ink-muted border-t border-app-line/30 pt-3">
        {domainLabel && <span>Lĩnh vực: {domainLabel}</span>}
        {domainLabel && <span className="opacity-40">•</span>}
        <span className="flex items-center gap-1">
          {syncBadgeLabel === "Đang đồng bộ" ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin text-app-accent" />
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
          <span>Còn {todayRemainingCount} việc hôm nay · Xong {todayCompletedCount}/{weekCompletion.total} việc tuần ({weekCompletion.percent}%)</span>
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
      className="rounded-xl border border-app-warm-border/50 bg-app-warm-soft/30 p-4 transition-colors"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-bg/50 border border-app-line/40 text-app-warm">
            <AlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-serif text-sm font-bold text-app-warm-strong leading-snug">{trigger.headline}</p>
            <p className="text-xs leading-relaxed text-app-ink-soft">{trigger.detail}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto pt-1 sm:pt-0">
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
