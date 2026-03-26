import { useId } from "react";

interface SimpleRadarChartPoint {
  subject: string;
  value: number;
  fullMark?: number;
}

interface SimpleRadarChartProps {
  data: SimpleRadarChartPoint[];
  height?: number;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
  className?: string;
}

const VIEWBOX_SIZE = 560;
const CENTER = VIEWBOX_SIZE / 2;
const OUTER_RADIUS = 150;
const GRID_LEVELS = 5;
const LABEL_RADIUS = OUTER_RADIUS + 28;

function toRadians(index: number, total: number) {
  return -Math.PI / 2 + (index / total) * Math.PI * 2;
}

function toPoint(radius: number, angle: number) {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function getLabelPoint(angle: number) {
  const basePoint = toPoint(LABEL_RADIUS, angle);
  const horizontalBias = Math.cos(angle);
  const verticalBias = Math.sin(angle);

  return {
    x: basePoint.x + (Math.abs(horizontalBias) > 0.45 ? horizontalBias * 6 : 0),
    y:
      basePoint.y +
      (verticalBias < -0.55 ? -8 : 0) +
      (verticalBias > 0.55 ? 10 : 0),
  };
}

function buildPolygonPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
}

function getTextAnchor(x: number) {
  if (x < CENTER - 18) return "end";
  if (x > CENTER + 18) return "start";
  return "middle";
}

function splitLabel(label: string) {
  const words = label.trim().split(/\s+/);
  if (words.length <= 2) return [label];

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

export function SimpleRadarChart({
  data,
  height = 320,
  stroke = "#7c3aed",
  fill = "#7c3aed",
  fillOpacity = 0.24,
  className,
}: SimpleRadarChartProps) {
  if (data.length === 0) return null;

  const gradientId = useId();
  const levels = Array.from({ length: GRID_LEVELS }, (_, index) => index + 1);
  const total = data.length;
  const fullMark = Math.max(...data.map((item) => item.fullMark ?? 10), 1);

  const axisPoints = data.map((_, index) => {
    const angle = toRadians(index, total);
    return {
      angle,
      inner: toPoint(0, angle),
      outer: toPoint(OUTER_RADIUS, angle),
      label: getLabelPoint(angle),
    };
  });

  const valuePoints = data.map((item, index) => {
    const angle = axisPoints[index]?.angle ?? toRadians(index, total);
    const ratio = Math.max(0, Math.min((item.value ?? 0) / (item.fullMark ?? fullMark), 1));
    return toPoint(OUTER_RADIUS * ratio, angle);
  });

  return (
    <div className={className} style={{ height }}>
      <svg
        aria-label="Biểu đồ radar tổng quan"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={fill} stopOpacity={fillOpacity + 0.18} />
            <stop offset="100%" stopColor={fill} stopOpacity={fillOpacity} />
          </linearGradient>
        </defs>

        {levels.map((level) => {
          const radius = (OUTER_RADIUS / GRID_LEVELS) * level;
          const points = axisPoints.map(({ angle }) => toPoint(radius, angle));
          return (
            <path
              key={`grid-${level}`}
              d={buildPolygonPath(points)}
              fill={level === GRID_LEVELS ? "#f8fafc" : "none"}
              stroke="#dbe3f1"
              strokeWidth={1}
            />
          );
        })}

        {axisPoints.map(({ inner, outer }, index) => (
          <line
            key={`axis-${data[index]?.subject ?? index}`}
            stroke="#e2e8f0"
            strokeWidth={1}
            x1={inner.x}
            x2={outer.x}
            y1={inner.y}
            y2={outer.y}
          />
        ))}

        <path d={buildPolygonPath(valuePoints)} fill={`url(#${gradientId})`} stroke={stroke} strokeWidth={3} />

        {valuePoints.map((point, index) => (
          <circle
            key={`point-${data[index]?.subject ?? index}`}
            cx={point.x}
            cy={point.y}
            fill="#ffffff"
            r={5}
            stroke={stroke}
            strokeWidth={3}
          />
        ))}

        {axisPoints.map(({ label }, index) => {
          const item = data[index];
          if (!item) return null;

          const lines = splitLabel(item.subject);
          const anchor = getTextAnchor(label.x);
          const scorePoint = {
            x: label.x,
            y: label.y + (lines.length > 1 ? 18 : 14),
          };

          return (
            <g key={`label-${item.subject}`}>
              <text
                fill="#475569"
                fontSize="12"
                fontWeight="600"
                textAnchor={anchor}
                x={label.x}
                y={label.y}
              >
                {lines.map((line, lineIndex) => (
                  <tspan
                    dy={lineIndex === 0 ? 0 : 16}
                    key={`${item.subject}-${line}`}
                    x={label.x}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
              <text
                fill="#94a3b8"
                fontSize="11"
                fontWeight="500"
                textAnchor={anchor}
                x={scorePoint.x}
                y={scorePoint.y + (lines.length - 1) * 16}
              >
                {item.value}/{item.fullMark ?? fullMark}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
