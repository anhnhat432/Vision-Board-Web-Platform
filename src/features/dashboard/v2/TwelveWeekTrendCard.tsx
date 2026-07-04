import { TrendingUp } from "lucide-react";
import { useId, useMemo } from "react";

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
const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const CHART_PADDING = { top: 10, right: 12, bottom: 28, left: 12 };
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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getPointCoordinates(point: TrendPoint) {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  return {
    x: CHART_PADDING.left + ((point.week - 1) / 11) * plotWidth,
    y: CHART_PADDING.top + (1 - clampPercent(point.percent) / 100) * plotHeight,
  };
}

function buildLinePath(data: TrendPoint[]): string {
  return data
    .map((point, index) => {
      const { x, y } = getPointCoordinates(point);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(data: TrendPoint[]): string {
  if (data.length === 0) return "";

  const linePath = buildLinePath(data);
  const first = getPointCoordinates(data[0]);
  const last = getPointCoordinates(data[data.length - 1]);
  const baselineY = CHART_HEIGHT - CHART_PADDING.bottom;
  return `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
}

export function TwelveWeekTrendCard({ points, currentWeek }: TwelveWeekTrendCardProps) {
  const gradientIdSeed = useId().replace(/:/g, "");
  const gradientId = `dashboard-trend-fill-${gradientIdSeed}`;
  const data = useMemo(() => buildTrendPoints(points), [points]);
  const linePath = useMemo(() => buildLinePath(data), [data]);
  const areaPath = useMemo(() => buildAreaPath(data), [data]);
  const activePoint = currentWeek ? data.find((point) => point.week === currentWeek) : null;
  const activePointPosition = activePoint ? getPointCoordinates(activePoint) : null;

  return (
    <section
      className="rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6 transition-all duration-300 hover:border-app-accent/20"
      aria-labelledby="dashboard-trend-title"
    >
      <div className="mb-5 border-b border-app-line pb-4">
        <h2
          id="dashboard-trend-title"
          className="mb-1.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-app-ink"
        >
          <TrendingUp className="h-[15px] w-[15px] text-app-accent" />
          Đường 12 tuần
        </h2>
        <p className="text-[12.5px] text-app-ink-soft">Tiến độ % thực thi theo từng tuần</p>
      </div>

      <div className="mt-5 h-[180px] overflow-hidden relative">
        {currentWeek !== null && currentWeek < 3 ? (
          <div className="absolute inset-0 bg-app-surface z-10 flex flex-col items-center justify-center text-center p-4 rounded-xl">
            <span className="text-2xl mb-1 animate-pulse">📈</span>
            <p className="text-xs font-bold text-app-ink">Đường 12 tuần đang chuẩn bị</p>
            <p className="text-[10px] text-app-ink-muted leading-relaxed max-w-[28ch] mt-1 font-semibold">
              Biểu đồ sẽ tự động vẽ từ Tuần 3 khi bạn có đủ dữ liệu hành động tích lũy.
            </p>
          </div>
        ) : null}
        <svg
          role="img"
          aria-label="Biểu đồ tiến độ 12 tuần"
          className="h-[180px] w-full overflow-visible"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <title>Tiến độ thực thi theo từng tuần</title>
          <g>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--app-accent)" stopOpacity={0.02} />
                <stop offset="95%" stopColor="var(--app-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
                  strokeDasharray="2 2"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <path d={areaPath} fill={`url(#${gradientId})`} />
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
                fill="var(--app-highlight)"
                stroke="var(--app-accent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {TREND_TICKS.map((week) => {
              const point = data[week - 1] ?? { week, percent: 0, completedTasks: 0, totalTasks: 0 };
              const { x } = getPointCoordinates(point);
              return (
                <text
                  key={week}
                  x={x}
                  y={CHART_HEIGHT - 8}
                  fill="var(--app-ink-muted)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {week}
                </text>
              );
            })}
          </g>
          {data.map((point) => {
            const { x, y } = getPointCoordinates(point);
            return (
              <circle key={point.week} cx={x} cy={y} r="9" fill="transparent">
                <title>{`Tuần ${point.week}: ${point.percent}% (${point.completedTasks}/${point.totalTasks} việc)`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
