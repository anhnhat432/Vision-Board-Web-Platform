import type { WeeklyReviewEvidence } from "@/features/plan12week/logic";

interface WeeklyEvidenceSummaryProps {
  evidence: WeeklyReviewEvidence;
  formatCalendarDate: (value: string) => string;
}

function formatRatio(value: { completed: number; total: number; percent: number } | null): string {
  return value ? `${value.completed} / ${value.total} · ${value.percent}%` : "Chưa lên lịch";
}

function formatDelta(deltaPoints: number): string {
  const prefix = deltaPoints > 0 ? "+" : "";
  return `${prefix}${deltaPoints} điểm so với tuần trước`;
}

export function WeeklyEvidenceSummary({ evidence, formatCalendarDate }: WeeklyEvidenceSummaryProps) {
  return (
    <div data-testid="weekly-evidence-summary" className="min-w-0 space-y-4 p-4 sm:p-6">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-accent">Bằng chứng tuần</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="font-serif text-lg font-bold text-app-ink sm:text-xl">
              Tuần {evidence.weekNumber} / {evidence.totalWeeks}
            </h2>
            <span className="font-mono text-[11px] font-semibold text-app-ink-muted">
              {formatCalendarDate(evidence.dateRange.start)} – {formatCalendarDate(evidence.dateRange.end)}
            </span>
          </div>
        </div>

        {evidence.previousWeek && (
          <p className="rounded-full border border-app-line/70 bg-app-bg-subtle px-3 py-1 text-[11px] font-semibold text-app-ink-soft">
            {formatDelta(evidence.previousWeek.deltaPoints)}
          </p>
        )}
      </header>

      {evidence.completion.isEmpty ? (
        <p className="rounded-xl border border-dashed border-app-line bg-app-bg-subtle/35 px-4 py-4 text-sm leading-relaxed text-app-ink-soft">
          Tuần này chưa có việc được lên lịch.
        </p>
      ) : (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-app-line/60 py-4">
          <span className="font-serif text-3xl font-bold tracking-tight text-app-ink sm:text-4xl">
            {evidence.completion.completed} / {evidence.completion.total} việc
          </span>
          <span className="font-mono text-xl font-bold tabular-nums text-app-accent">
            {evidence.completion.percent}%
          </span>
        </div>
      )}

      <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-muted">Cốt lõi</dt>
          <dd className="mt-1 break-words font-mono text-sm font-semibold tabular-nums text-app-ink">
            {formatRatio(evidence.core)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-muted">Tùy chọn</dt>
          <dd className="mt-1 break-words font-mono text-sm font-semibold tabular-nums text-app-ink">
            {formatRatio(evidence.optional)}
          </dd>
        </div>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-muted">Check-in</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-app-ink">
            {evidence.checkIns.days > 0
              ? `${evidence.checkIns.days} / ${evidence.checkIns.possibleDays} ngày`
              : "Chưa có check-in tuần này"}
          </dd>
        </div>
      </dl>

      <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 border-t border-app-line/60 pt-3 text-xs font-medium text-app-ink-soft">
        {evidence.onTime && (
          <span className="font-mono tabular-nums">Đúng hạn {evidence.onTime.completed} / {evidence.onTime.total}</span>
        )}
        <span>{evidence.overdueOpenCount > 0 ? `${evidence.overdueOpenCount} việc quá hạn` : "Không còn việc quá hạn"}</span>
        {evidence.carryOverCount > 0 && <span>{evidence.carryOverCount} việc đã chuyển tuần</span>}
      </div>
    </div>
  );
}
