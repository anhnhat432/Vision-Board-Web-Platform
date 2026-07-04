import { useId, useMemo } from "react";

import { getLifeAreaLabel, LIFE_AREAS } from "../utils/storage";

export interface LifeBalanceHistoryChartPoint {
  date: string;
  [key: string]: string | number;
}

interface LifeBalanceHistoryChartProps {
  data: LifeBalanceHistoryChartPoint[];
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 380;
const CHART_PADDING = { top: 18, right: 24, bottom: 82, left: 42 };
const SCORE_TICKS = [0, 2, 4, 6, 8, 10];

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, value));
}

function readScore(point: LifeBalanceHistoryChartPoint, label: string): number {
  const value = point[label];
  if (typeof value === "number") return clampScore(value);
  if (typeof value === "string") return clampScore(Number(value) || 0);
  return 0;
}

function getPointCoordinates(index: number, totalPoints: number, score: number) {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const denominator = Math.max(1, totalPoints - 1);

  return {
    x: CHART_PADDING.left + (index / denominator) * plotWidth,
    y: CHART_PADDING.top + (1 - clampScore(score) / 10) * plotHeight,
  };
}

function buildLinePath(points: { x: number; y: number }[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function getXAxisIndexes(totalPoints: number): number[] {
  if (totalPoints <= 1) return [0];
  const indexes = new Set([0, Math.floor((totalPoints - 1) / 2), totalPoints - 1]);
  return Array.from(indexes).sort((a, b) => a - b);
}

export function LifeBalanceHistoryChart({ data }: LifeBalanceHistoryChartProps) {
  const idSeed = useId().replace(/:/g, "");
  const clipPathId = `life-balance-chart-clip-${idSeed}`;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const xAxisIndexes = useMemo(() => getXAxisIndexes(data.length), [data.length]);
  const series = useMemo(
    () =>
      LIFE_AREAS.map((area) => {
        const label = getLifeAreaLabel(area.name);
        const points = data.map((point, index) => getPointCoordinates(index, data.length, readScore(point, label)));
        return {
          color: area.color,
          label,
          path: buildLinePath(points),
          points,
        };
      }),
    [data],
  );

  if (data.length === 0) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-card border border-app-line bg-app-surface/60 text-sm font-medium text-app-ink-muted">
        Chưa có dữ liệu lịch sử để vẽ biểu đồ.
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label="Biểu đồ lịch sử cân bằng cuộc sống"
      className="h-[380px] w-full overflow-visible"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
    >
      <title>Lịch sử điểm cân bằng cuộc sống theo ngày</title>
      <defs>
        <clipPath id={clipPathId}>
          <rect x={CHART_PADDING.left} y={CHART_PADDING.top} width={plotWidth} height={plotHeight} />
        </clipPath>
      </defs>

      <g>
        {SCORE_TICKS.map((tick) => {
          const y = CHART_PADDING.top + (1 - tick / 10) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={CHART_PADDING.left}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y1={y}
                y2={y}
                stroke="var(--app-line)"
                strokeDasharray="3 3"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text x={CHART_PADDING.left - 12} y={y + 4} fill="var(--app-ink-muted)" fontSize="12" textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={CHART_PADDING.left}
          x2={CHART_PADDING.left}
          y1={CHART_PADDING.top}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke="var(--app-line)"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={CHART_PADDING.left}
          x2={CHART_WIDTH - CHART_PADDING.right}
          y1={CHART_HEIGHT - CHART_PADDING.bottom}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke="var(--app-line)"
          vectorEffect="non-scaling-stroke"
        />

        {xAxisIndexes.map((index) => {
          const point = data[index];
          const { x } = getPointCoordinates(index, data.length, 0);
          return (
            <text key={`${point.date}-${index}`} x={x} y={CHART_HEIGHT - CHART_PADDING.bottom + 22} fill="var(--app-ink-muted)" fontSize="12" textAnchor="middle">
              {point.date}
            </text>
          );
        })}

        <g clipPath={`url(#${clipPathId})`}>
          {series.map((item) => (
            <path
              key={item.label}
              d={item.path}
              fill="none"
              stroke={item.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map((item) =>
            item.points.map((point, pointIndex) => (
              <circle
                key={`${item.label}-${data[pointIndex]?.date ?? point.x}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill={item.color}
              />
            )),
          )}
        </g>

        <g transform={`translate(${CHART_PADDING.left}, ${CHART_HEIGHT - 36})`}>
          {series.map((item, index) => {
            const column = index % 3;
            const row = Math.floor(index / 3);
            const x = column * 220;
            const y = row * 20;
            return (
              <g key={item.label} transform={`translate(${x}, ${y})`}>
                <line x1="0" x2="18" y1="0" y2="0" stroke={item.color} strokeWidth="3" strokeLinecap="round" />
                <text x="26" y="4" fill="var(--app-ink-soft)" fontSize="12">
                  {item.label}
                </text>
              </g>
            );
          })}
        </g>
      </g>

      {data.map((point, pointIndex) =>
        series.map((item) => {
          const coords = item.points[pointIndex];
          const score = readScore(point, item.label);
          return (
            <circle key={`${item.label}-${point.date}`} cx={coords.x} cy={coords.y} r="8" fill="transparent">
              <title>{`${point.date} · ${item.label}: ${score}/10`}</title>
            </circle>
          );
        }),
      )}
    </svg>
  );
}
