import { useMemo } from "react";
import { Activity, ShieldCheck } from "lucide-react";

import {
  buildFunnelDiagnosticsSnapshot,
  shouldShowFunnelDiagnostics,
  type FunnelDiagnosticsSnapshot,
} from "@/app/utils/funnel-diagnostics";

interface FunnelDiagnosticsPanelProps {
  /**
   * Override the env-flag gate. When omitted, the panel only renders if
   * `VITE_SHOW_FUNNEL_DIAGNOSTICS=true` was set at build time. Tests can
   * pass `enabled` directly to bypass the env read.
   */
  enabled?: boolean;
  /**
   * Inject a deterministic snapshot. Without this prop the panel
   * computes the snapshot at mount time from real localStorage state.
   */
  snapshot?: FunnelDiagnosticsSnapshot;
}

/**
 * Internal-only diagnostics panel.
 *
 * Hidden by default in production / public demo. Visible only when:
 *   1. The build was run with `VITE_SHOW_FUNNEL_DIAGNOSTICS=true`, OR
 *   2. The caller explicitly passed `enabled={true}` (used in tests).
 *
 * Renders only derived counts, bucketed levels, and known enum ids.
 * Never echoes user free text. Includes a visible privacy-guard line
 * so anyone reading the panel knows what they are looking at.
 */
export function FunnelDiagnosticsPanel({ enabled, snapshot }: FunnelDiagnosticsPanelProps) {
  const isEnabled = enabled ?? shouldShowFunnelDiagnostics();
  const data = useMemo(
    () => snapshot ?? (isEnabled ? buildFunnelDiagnosticsSnapshot() : null),
    [isEnabled, snapshot],
  );

  if (!isEnabled || !data) return null;

  return (
    <section
      data-testid="funnel-diagnostics-panel"
      className="rounded-2xl border border-slate-300 bg-slate-50/80 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.18)] sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            Funnel diagnostics (dev)
          </p>
        </div>
        <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Local-only
        </span>
      </header>

      <p
        data-testid="funnel-diagnostics-privacy-note"
        className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-600"
      >
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
        <span>
          Panel chỉ hiển thị số đếm và bucket — không hiển thị nội dung mục tiêu, tên việc, ghi chú,
          email, hoặc id tài khoản. Dữ liệu chỉ đọc từ trình duyệt này, không gửi đi đâu.
        </span>
      </p>

      <Section title="Intent">
        <Row label="Intent" value={data.intent.label} />
        <Row label="Intent id" value={data.intent.id ?? "—"} />
      </Section>

      <Section title="Funnel steps">
        <Row label="Onboarding completed" value={boolText(data.steps.onboardingCompleted)} />
        <Row label="Real life balance" value={boolText(data.steps.hasRealLifeBalance)} />
        <Row label="Focus area chosen" value={boolText(data.steps.hasFocusArea)} />
        <Row label="Pending SMART goal" value={boolText(data.steps.hasPendingSmartGoal)} />
        <Row label="Pending feasibility" value={boolText(data.steps.hasPendingFeasibility)} />
        <Row label="Has 12-week plan" value={boolText(data.steps.has12WeekPlan)} />
        <Row label="Active 12-week system" value={boolText(data.steps.hasActiveTwelveWeekSystem)} />
      </Section>

      <Section title="SMART quality">
        <Row label="Present" value={boolText(data.smart.present)} />
        <Row label="Quality level" value={data.smart.qualityLevel ?? "—"} />
        <Row label="Score bucket" value={data.smart.overallScoreBucket ?? "—"} />
        <Row label="Has measurable target" value={nullableBool(data.smart.hasMeasurableTarget)} />
        <Row label="Has baseline" value={nullableBool(data.smart.hasBaseline)} />
        <Row label="Weekly hours bucket" value={data.smart.weeklyHoursBucket ?? "—"} />
      </Section>

      <Section title="Feasibility">
        <Row label="Present" value={boolText(data.feasibility.present)} />
        <Row label="Result type" value={data.feasibility.resultType ?? "—"} />
        <Row label="Adjusted score bucket" value={data.feasibility.adjustedScoreBucket ?? "—"} />
        <Row label="Bottleneck axis" value={data.feasibility.bottleneckAxis ?? "—"} />
        <Row label="Plan load" value={data.feasibility.planLoad ?? "—"} />
        <Row label="Weekly capacity" value={data.feasibility.weeklyCapacity ?? "—"} />
      </Section>

      <Section title="Plan quality">
        <Row label="Present" value={boolText(data.plan.present)} />
        <Row label="Quality level" value={data.plan.qualityLevel ?? "—"} />
        <Row label="Score bucket" value={data.plan.overallScoreBucket ?? "—"} />
        <Row label="Lead indicators" value={String(data.plan.leadIndicatorCount)} />
        <Row label="Core indicators" value={String(data.plan.coreIndicatorCount)} />
        <Row label="Optional indicators" value={String(data.plan.optionalIndicatorCount)} />
        <Row label="Milestones present" value={String(data.plan.milestoneCount)} />
        <Row label="Week 1 task count" value={String(data.plan.weekOneTaskCount)} />
        <Row label="Week 1 startable" value={nullableBool(data.plan.weekOneStartable)} />
      </Section>

      <Section title="Execution">
        <Row label="Active system" value={boolText(data.execution.hasActiveSystem)} />
        <Row label="Current week" value={String(data.execution.currentWeek ?? "—")} />
        <Row label="Total weeks" value={String(data.execution.totalWeeks ?? "—")} />
        <Row
          label="Completed tasks"
          value={`${data.execution.completedTaskCount}/${data.execution.totalTaskCount}`}
        />
        <Row label="Reviews completed" value={String(data.execution.weeklyReviewsCompleted)} />
        <Row label="Pending reviews" value={String(data.execution.pendingWeeklyReviews)} />
        <Row label="Daily check-ins" value={String(data.execution.dailyCheckInCount)} />
        <Row
          label="Active week %"
          value={
            data.execution.activeWeekCompletionPercent !== null
              ? `${data.execution.activeWeekCompletionPercent}%`
              : "—"
          }
        />
        <Row label="Review due today" value={boolText(data.execution.reviewDueToday)} />
      </Section>

      <p className="mt-4 text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
        Snapshot at {data.generatedAt}
      </p>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div data-section={title} className="mt-4 rounded-2xl border border-white/72 bg-white/82 p-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/72 px-2.5 py-1.5">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-xs font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function boolText(value: boolean): string {
  return value ? "yes" : "no";
}

function nullableBool(value: boolean | null): string {
  if (value === null) return "—";
  return boolText(value);
}
