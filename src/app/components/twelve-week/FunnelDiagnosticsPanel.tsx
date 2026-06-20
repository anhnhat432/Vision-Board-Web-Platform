import { Activity, ShieldCheck } from "lucide-react";
import { useMemo } from "react";

import {
  buildFunnelDiagnosticsSnapshot,
  type FunnelDiagnosticsSnapshot,
  shouldShowFunnelDiagnostics,
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
  const data = useMemo(() => snapshot ?? (isEnabled ? buildFunnelDiagnosticsSnapshot() : null), [isEnabled, snapshot]);

  if (!isEnabled || !data) return null;

  return (
    <section
      data-testid="funnel-diagnostics-panel"
      className="rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle/80 p-4 shadow-sm sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--r-pill)] bg-app-line text-app-ink-soft">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-ink-soft">Funnel diagnostics (dev)</p>
        </div>
        <span className="rounded-[var(--r-pill)] border border-app-line bg-app-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
          Local-only
        </span>
      </header>

      <p
        data-testid="funnel-diagnostics-privacy-note"
        className="mt-[var(--space-inline)] flex items-start gap-1.5 text-xs leading-5 text-app-ink-soft"
      >
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-accent" aria-hidden="true" />
        <span>
          Panel chỉ hiển thị số đếm và bucket — không hiển thị nội dung mục tiêu, tên việc, ghi chú, email, hoặc id tài
          khoản. Dữ liệu chỉ đọc từ trình duyệt này, không gửi đi đâu.
        </span>
      </p>

      <Section title="Intent">
        <Row label="Intent" value={data.intent.label} />
        <Row label="Intent id" value={data.intent.id ?? "—"} />
      </Section>

      <Section title="Funnel steps">
        <Row label="Đã hoàn tất bước bắt đầu" value={boolText(data.steps.onboardingCompleted)} />
        <Row label="Cân bằng cuộc sống thật" value={boolText(data.steps.hasRealLifeBalance)} />
        <Row label="Focus area chosen" value={boolText(data.steps.hasFocusArea)} />
        <Row label="Mục tiêu SMART đang chờ" value={boolText(data.steps.hasPendingSmartGoal)} />
        <Row label="Kiểm tra tính khả thi đang chờ" value={boolText(data.steps.hasPendingFeasibility)} />
        <Row label="Has 12-week plan" value={boolText(data.steps.has12WeekPlan)} />
        <Row label="Active 12-week system" value={boolText(data.steps.hasActiveTwelveWeekSystem)} />
      </Section>

      <Section title="SMART quality">
        <Row label="Present" value={boolText(data.smart.present)} />
        <Row label="Quality level" value={data.smart.qualityLevel ?? "—"} />
        <Row label="Nhóm điểm" value={data.smart.overallScoreBucket ?? "—"} />
        <Row label="Has measurable target" value={nullableBool(data.smart.hasMeasurableTarget)} />
        <Row label="Có mốc hiện tại" value={nullableBool(data.smart.hasBaseline)} />
        <Row label="Weekly hours bucket" value={data.smart.weeklyHoursBucket ?? "—"} />
      </Section>

      <Section title="Kiểm tra tính khả thi">
        <Row label="Present" value={boolText(data.feasibility.present)} />
        <Row label="Result type" value={data.feasibility.resultType ?? "—"} />
        <Row label="Nhóm điểm đã chỉnh" value={data.feasibility.adjustedScoreBucket ?? "—"} />
        <Row label="Bottleneck axis" value={data.feasibility.bottleneckAxis ?? "—"} />
        <Row label="Plan load" value={data.feasibility.planLoad ?? "—"} />
        <Row label="Weekly capacity" value={data.feasibility.weeklyCapacity ?? "—"} />
      </Section>

      <Section title="Plan quality">
        <Row label="Present" value={boolText(data.plan.present)} />
        <Row label="Quality level" value={data.plan.qualityLevel ?? "—"} />
        <Row label="Nhóm điểm" value={data.plan.overallScoreBucket ?? "—"} />
        <Row label="Việc lặp lại" value={String(data.plan.leadIndicatorCount)} />
        <Row label="Core indicators" value={String(data.plan.coreIndicatorCount)} />
        <Row label="Optional indicators" value={String(data.plan.optionalIndicatorCount)} />
        <Row label="Cột mốc đã có" value={String(data.plan.milestoneCount)} />
        <Row label="Số việc tuần 1" value={String(data.plan.weekOneTaskCount)} />
        <Row label="Week 1 startable" value={nullableBool(data.plan.weekOneStartable)} />
      </Section>

      <Section title="Thực hiện">
        <Row label="Active system" value={boolText(data.execution.hasActiveSystem)} />
        <Row label="Current week" value={String(data.execution.currentWeek ?? "—")} />
        <Row label="Total weeks" value={String(data.execution.totalWeeks ?? "—")} />
        <Row label="Completed tasks" value={`${data.execution.completedTaskCount}/${data.execution.totalTaskCount}`} />
        <Row label="Reviews completed" value={String(data.execution.weeklyReviewsCompleted)} />
        <Row label="Pending reviews" value={String(data.execution.pendingWeeklyReviews)} />
        <Row label="Daily check-ins" value={String(data.execution.dailyCheckInCount)} />
        <Row
          label="Active week %"
          value={
            data.execution.activeWeekCompletionPercent !== null ? `${data.execution.activeWeekCompletionPercent}%` : "—"
          }
        />
        <Row label="Review đến hạn hôm nay" value={boolText(data.execution.reviewDueToday)} />
      </Section>

      <p className="mt-4 text-[0.65rem] uppercase tracking-[0.18em] text-app-ink-muted">Snapshot at {data.generatedAt}</p>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div data-section={title} className="mt-4 rounded-[var(--r-card)] border border-app-line/70 bg-app-surface/80 p-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">{title}</p>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] border border-app-line/70 bg-app-surface/70 px-2.5 py-1.5">
      <dt className="text-xs text-app-ink-soft">{label}</dt>
      <dd className="text-xs font-semibold text-app-ink">{value}</dd>
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
