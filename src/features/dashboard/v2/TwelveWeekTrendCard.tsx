import { TrendingUp } from "lucide-react";
import type { TooltipProps } from "recharts";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

// Custom Glassmorphism Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload?.length) {
    const data = payload[0].payload as TrendPoint;
    return (
      <div className="bg-white dark:bg-neutral-900 border border-app-line p-3 rounded-[12px] text-xs space-y-1">
        <p className="font-bold text-app-ink">Tuần {label}</p>
        <p className="text-app-accent font-extrabold text-[13px]">Tiến độ: {data.percent}%</p>
        <p className="text-app-ink-soft font-semibold">
          Đã xong: {data.completedTasks}/{data.totalTasks} việc
        </p>
      </div>
    );
  }
  return null;
};

export function TwelveWeekTrendCard({ points, currentWeek }: TwelveWeekTrendCardProps) {
  const data = buildTrendPoints(points);
  const activePoint = currentWeek ? data.find((point) => point.week === currentWeek) : null;

  return (
    <section
      className="rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6 transition-all duration-300 hover:border-app-accent/20"
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
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--app-accent)" stopOpacity={0.02} />
                <stop offset="95%" stopColor="var(--app-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--app-line)" strokeDasharray="2 2" vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--app-ink-muted)", fontWeight: "bold" }}
              ticks={TREND_TICKS}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="percent"
              stroke="var(--app-accent)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProgress)"
              activeDot={{ r: 4, fill: "var(--app-accent)", stroke: "var(--app-surface)", strokeWidth: 1 }}
            />
            {activePoint ? (
              <ReferenceDot
                x={activePoint.week}
                y={activePoint.percent}
                r={5}
                stroke="var(--app-surface)"
                strokeWidth={1}
                fill="var(--app-accent)"
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
