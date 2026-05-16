import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";

import type { WeeklyProgressPoint } from "@/features/dashboard/helpers/dashboardInsights";

interface TwelveWeekTrendCardProps {
  points: WeeklyProgressPoint[];
  currentWeek: number | null;
}

interface TrendPoint {
  week: number;
  percent: number;
  completedTasks: number;
  totalTasks: number;
}

const TREND_TICKS = [1, 4, 8, 12];
const EMPTY_POINTS: TrendPoint[] = Array.from({ length: 12 }, (_, index) => ({
  week: index + 1,
  percent: 0,
  completedTasks: 0,
  totalTasks: 0,
}));

function buildTrendPoints(points: WeeklyProgressPoint[]): TrendPoint[] {
  if (points.length === 0) return EMPTY_POINTS;

  const byWeek = new Map(points.map((point) => [point.weekNumber, point]));

  return EMPTY_POINTS.map((emptyPoint) => {
    const point = byWeek.get(emptyPoint.week);
    if (!point) return emptyPoint;

    return {
      week: point.weekNumber,
      percent: point.executionScore,
      completedTasks: point.completedTasks,
      totalTasks: point.totalTasks,
    };
  });
}

function getChartWidth(): number {
  if (typeof window === "undefined") return 560;
  return Math.max(320, Math.min(720, window.innerWidth - 64));
}

export function TwelveWeekTrendCard({ points, currentWeek }: TwelveWeekTrendCardProps) {
  const data = buildTrendPoints(points);
  const activePoint = currentWeek ? data.find((point) => point.week === currentWeek) : null;
  const chartWidth = getChartWidth();

  return (
    <section className="rounded-card border border-app-line bg-app-surface p-5 md:p-6" aria-labelledby="dashboard-trend-title">
      <div>
        <h2 id="dashboard-trend-title" className="text-[15px] font-semibold text-app-ink">
          Đường 12 tuần
        </h2>
        <p className="mt-1 text-[13px] text-app-ink-muted">Tiến độ % theo tuần</p>
      </div>

      <div className="mt-5 h-[180px] overflow-hidden">
        <LineChart data={data} width={chartWidth} height={180} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--app-ink-muted)" }}
            ticks={TREND_TICKS}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--app-surface)",
              borderColor: "var(--app-line)",
              borderRadius: "14px",
              color: "var(--app-ink)",
              fontSize: "12px",
            }}
            labelFormatter={(label) => `Tuần ${label}`}
            formatter={(value, name, item) => {
              const payload = item.payload as TrendPoint | undefined;
              const progress = typeof value === "number" ? `${value}%` : value;
              const details = payload ? ` · ${payload.completedTasks}/${payload.totalTasks} việc` : "";
              return [`${progress}${details}`, name === "percent" ? "Tiến độ" : name];
            }}
          />
          <Line
            type="monotone"
            dataKey="percent"
            stroke="var(--app-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--app-accent)" }}
          />
          {activePoint ? (
            <ReferenceDot
              x={activePoint.week}
              y={activePoint.percent}
              r={5}
              stroke="var(--app-accent)"
              fill="var(--app-accent)"
            />
          ) : null}
        </LineChart>
      </div>
    </section>
  );
}
