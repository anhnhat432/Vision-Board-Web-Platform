import { CalendarDays, Save } from "lucide-react";

interface DashboardHeroProps {
  caption: string;
  currentWeek: number | null;
  totalWeeks: number;
  displayName: string;
  lastSavedLabel: string;
}

export function DashboardHero({
  caption,
  currentWeek,
  totalWeeks,
  displayName,
  lastSavedLabel,
}: DashboardHeroProps) {
  return (
    <header
      data-testid="dashboard-context-strip"
      className="flex flex-col gap-4 rounded-card border border-app-line bg-app-surface/85 px-5 py-4 shadow-app-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">{caption}</p>
        <h1 className="mt-1 truncate font-serif text-2xl font-bold text-app-ink">Chào {displayName}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-app-ink-soft">
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-app-accent/20 bg-app-accent-subtle px-3 py-2 text-app-accent">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Tuần {currentWeek ?? "--"} / {totalWeeks}
        </span>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-app-line bg-app-bg-subtle px-3 py-2">
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Đã lưu cục bộ · {lastSavedLabel}
        </span>
      </div>
    </header>
  );
}
