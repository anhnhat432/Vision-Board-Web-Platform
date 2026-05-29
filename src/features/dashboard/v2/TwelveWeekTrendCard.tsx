import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";

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

export function TwelveWeekTrendCard({ points, currentWeek }: TwelveWeekTrendCardProps) {
  const data = buildTrendPoints(points);
  const activePoint = currentWeek ? data.find((point) => point.week === currentWeek) : null;

  return (
    <section
      className="rounded-[14px] border border-app-line bg-app-surface p-5 md:p-6"
      aria-labelledby="dashboard-trend-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5">
        <h2 id="dashboard-trend-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-app-accent" />
          Đường 12 tuần
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">Tiến độ % thực thi theo từng tuần</p>
      </div>

      <div className="mt-5 h-[180px] overflow-hidden">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--app-ink-muted)", fontWeight: "bold" }}
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
                boxShadow: "none",
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
              strokeWidth={2.5}
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
        </ResponsiveContainer>
      </div>
    </section>
  );
}
