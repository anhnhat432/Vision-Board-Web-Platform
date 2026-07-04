import { useMemo } from "react";

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
const CHART_WIDTH = 560;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 12, right: 12, bottom: 28, left: 12 };

function buildWeekSlots(weeks: PlanProgressWeek[], totalWeeks: number): TrendPoint[] {
  const byWeek = new Map(weeks.map((week) => [week.weekNumber, week]));

  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const week = byWeek.get(weekNumber);
    return {
      week: weekNumber,
      percent: week?.executionScore ?? 0,
      completed: week?.completed ?? false,
    };
  });
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getPointCoordinates(point: TrendPoint, totalWeeks: number) {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const denominator = Math.max(1, totalWeeks - 1);
  return {
    x: CHART_PADDING.left + ((point.week - 1) / denominator) * plotWidth,
    y: CHART_PADDING.top + (1 - clampPercent(point.percent) / 100) * plotHeight,
  };
}

function buildLinePath(data: TrendPoint[], totalWeeks: number): string {
  return data
    .map((point, index) => {
      const { x, y } = getPointCoordinates(point, totalWeeks);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function PlanProgress({ weeks, totalWeeks = 12, currentWeek }: PlanProgressProps) {
  const data = useMemo(() => buildWeekSlots(weeks, totalWeeks), [weeks, totalWeeks]);
  const linePath = useMemo(() => buildLinePath(data, totalWeeks), [data, totalWeeks]);
  const completedWeeks = data.filter((week) => week.completed).length;
  const activePoint = currentWeek ? data.find((point) => point.week === currentWeek) : null;
  const activePointPosition = activePoint ? getPointCoordinates(activePoint, totalWeeks) : null;
  const ticks = TREND_TICKS.filter((tick) => tick <= totalWeeks);

  return (
    <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6">
      <div>
        <h3 className="text-base font-semibold text-app-ink">Đường 12 tuần</h3>
        <p className="mt-1 text-sm text-app-ink-muted">
          Tiến độ % theo tuần · {completedWeeks}/{totalWeeks} tuần đã review
        </p>
      </div>

      <div className="mt-5 h-[200px] overflow-hidden">
        <svg
          role="img"
          aria-label="Biểu đồ tiến độ kế hoạch 12 tuần"
          className="h-[200px] w-full overflow-visible"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <title>Tiến độ phần trăm theo tuần</title>
          <g>
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = CHART_PADDING.top + (1 - tick / 100) * (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom);
              return (
                <line
                  key={tick}
                  x1={CHART_PADDING.left}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="var(--app-line)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <path
              d={linePath}
              fill="none"
              stroke="var(--app-accent)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {activePointPosition ? (
              <circle
                cx={activePointPosition.x}
                cy={activePointPosition.y}
                r="5"
                fill="var(--app-accent)"
                stroke="var(--app-surface)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {ticks.map((week) => {
              const point = data[week - 1] ?? { week, percent: 0, completed: false };
              const { x } = getPointCoordinates(point, totalWeeks);
              return (
                <text key={week} x={x} y={CHART_HEIGHT - 8} fill="var(--app-ink-muted)" fontSize="11" textAnchor="middle">
                  {week}
                </text>
              );
            })}
          </g>
          {data.map((point) => {
            const { x, y } = getPointCoordinates(point, totalWeeks);
            return (
              <circle key={point.week} cx={x} cy={y} r="8" fill="transparent">
                <title>{`Tuần ${point.week}: ${point.percent}%${point.completed ? " · đã review" : ""}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
