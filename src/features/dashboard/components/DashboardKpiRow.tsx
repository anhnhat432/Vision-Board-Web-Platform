type DashboardKpiRowProps = {
  leadAverage: number;
  currentWeek: number | null;
  totalWeeks: number;
  streak: number;
  wheelScore: number;
};

function formatPercent(value: number) {
  return `${Math.max(0, Math.round(value))}%`;
}

function formatWheelScore(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  return value.toFixed(1);
}

export function DashboardKpiRow({ leadAverage, currentWeek, totalWeeks, streak, wheelScore }: DashboardKpiRowProps) {
  const items = [
    {
      label: "Lead score tuần",
      value: formatPercent(leadAverage),
      note: "nhịp hành động",
    },
    {
      label: "Tuần hiện tại",
      value: currentWeek ? `${currentWeek}/${totalWeeks}` : "--",
      note: "trong cycle",
    },
    {
      label: "Chuỗi tuần",
      value: String(streak),
      note: "tuần giữ nhịp",
    },
    {
      label: "Life score",
      value: formatWheelScore(wheelScore),
      note: "điểm trung bình",
    },
  ];

  return (
    <div data-testid="dashboard-kpi-row" className="grid gap-[var(--space-stack)] sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-h-20 rounded-[var(--r-tile)] bg-white/92 p-4 ring-1 ring-slate-200"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
        </div>
      ))}
    </div>
  );
}
