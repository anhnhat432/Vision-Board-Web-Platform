import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";

export interface PlanProgressWeek {
  weekNumber: number;
  executionScore: number;
  completed: boolean;
}

interface PlanProgressProps {
  weeks: PlanProgressWeek[];
  totalWeeks?: number;
  currentWeek?: number;
}

interface TrendPoint {
  week: number;
  percent: number;
  completed: boolean;
}

const TREND_TICKS = [1, 4, 8, 12];

function buildWeekSlots(weeks: PlanProgressWeek[], totalWeeks: number): TrendPoint[] {
  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const week = weeks.find((item) => item.weekNumber === weekNumber);
    return {
      week: weekNumber,
      percent: week?.executionScore ?? 0,
      completed: week?.completed ?? false,
    };
  });
}

function getChartWidth(): number {
  if (typeof window === "undefined") return 560;
  return Math.max(320, Math.min(720, window.innerWidth - 64));
}

export function PlanProgress({ weeks, totalWeeks = 12, currentWeek }: PlanProgressProps) {
  const data = buildWeekSlots(weeks, totalWeeks);
  const completedWeeks = data.filter((week) => week.completed).length;
  const activePoint = currentWeek ? data.find((point) => point.week === currentWeek) : null;
  const chartWidth = getChartWidth();

  return (
    <section className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
      <div>
        <h3 className="text-base font-semibold text-app-ink">Đường 12 tuần</h3>
        <p className="mt-1 text-sm text-app-ink-muted">
          Tiến độ % theo tuần · {completedWeeks}/{totalWeeks} tuần đã review
        </p>
      </div>

      <div className="mt-5 h-[200px] overflow-hidden">
        <LineChart data={data} width={chartWidth} height={200} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            formatter={(value, name) => {
              const progress = typeof value === "number" ? `${value}%` : value;
              return [progress, name === "percent" ? "Tiến độ" : name];
            }}
          />
          <Line
            type="monotone"
            dataKey="percent"
            stroke="var(--app-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "var(--app-accent)" }}
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
