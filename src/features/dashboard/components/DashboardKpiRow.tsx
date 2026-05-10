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
    <div data-testid="dashboard-kpi-row" className="grid grid-cols-2 gap-2 sm:gap-[var(--space-stack)] lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-h-[74px] rounded-[var(--r-tile)] bg-white/92 p-3 ring-1 ring-slate-200 sm:min-h-20 sm:p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs sm:tracking-[0.16em]">{item.label}</p>
          <p className="mt-1 text-xl font-bold text-foreground sm:mt-2 sm:text-2xl">{item.value}</p>
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{item.note}</p>
        </div>
      ))}
    </div>
  );
}
