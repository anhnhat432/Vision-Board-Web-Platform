import { memo, useId } from "react";

interface SimpleRadarChartPoint {
  subject: string;
  value: number;
  fullMark?: number;
}

interface SimpleRadarChartProps {
  data: SimpleRadarChartPoint[];
  className?: string;
}

interface LabelLine {
  key: "full" | "head" | "tail";
  text: string;
}

const CX = 220;
const CY = 200;
const R = 140;
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1];

function pt(index: number, radius: number, total: number): [number, number] {
  const angle = (-90 + index * (360 / total)) * (Math.PI / 180);
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function splitLabel(label: string): LabelLine[] {
  const words = label.trim().split(/\s+/);
  if (words.length <= 2) return [{ key: "full", text: label }];

  const mid = Math.ceil(words.length / 2);
  return [
    { key: "head", text: words.slice(0, mid).join(" ") },
    { key: "tail", text: words.slice(mid).join(" ") },
  ];
}

export const SimpleRadarChart = memo(function SimpleRadarChart({ data, className }: SimpleRadarChartProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (data.length === 0) return null;

  const total = data.length;
  const summary = data.map((item) => `${item.subject}: ${item.value}/${item.fullMark ?? 10}`).join("; ");

  return (
    <div className={`w-full ${className || ""}`}>
      <svg
        aria-labelledby={`${titleId} ${descriptionId}`}
        viewBox="0 0 440 420"
        width="100%"
        style={{ maxWidth: 480, height: "auto", display: "block", margin: "0 auto" }}
        role="img"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={titleId}>Biểu đồ radar tổng quan</title>
        <desc id={descriptionId}>{summary}</desc>
        {RING_FRACTIONS.map((f) => {
          const r = R * f;
          const points = Array.from({ length: total }, (_, i) => {
            const [x, y] = pt(i, r, total);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ");
          return (
            <polygon
              key={`ring-${f}`}
              points={points}
              fill={f === 1 ? "var(--app-bg-subtle)" : "none"}
              stroke="var(--app-line)"
              strokeWidth={1}
            />
          );
        })}

        {data.map((item, i) => {
          const [x, y] = pt(i, R, total);
          return (
            <line
              key={`spoke-${item.subject}`}
              x1={CX}
              y1={CY}
              x2={x.toFixed(1)}
              y2={y.toFixed(1)}
              stroke="var(--app-line)"
              strokeWidth={1}
            />
          );
        })}

        <g className="dof-radar-grp">
          <polygon
            points={data
              .map((item, i) => {
                const [x, y] = pt(i, R * ((item.value ?? 0) / (item.fullMark ?? 10)), total);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ")}
            fill="color-mix(in srgb, var(--app-accent) 16%, transparent)"
            stroke="var(--app-accent)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />

          {data.map((item, i) => {
            const [x, y] = pt(i, R * ((item.value ?? 0) / (item.fullMark ?? 10)), total);
            return (
              <circle
                key={`dot-${item.subject}`}
                cx={x.toFixed(1)}
                cy={y.toFixed(1)}
                r={4}
                fill="var(--app-accent)"
                stroke="var(--app-surface)"
                strokeWidth={1.5}
              />
            );
          })}
        </g>

        {data.map((item, i) => {
          const [lx, ly] = pt(i, R + 24, total);
          const anchor = i === 0 || i === total / 2 ? "middle" : i < total / 2 ? "start" : "end";
          const yOff = i === 0 ? -6 : i === total / 2 ? 6 : 0;
          const lines = splitLabel(item.subject);
          const scoreDy = lines.length === 2 ? 13 + 12 : 13;

          return (
            <text
              key={`label-${item.subject}`}
              x={lx.toFixed(1)}
              y={(ly + yOff).toFixed(1)}
              textAnchor={anchor}
              fontFamily="'Be Vietnam Pro', sans-serif"
            >
              {lines.map((line, li) => (
                <tspan
                  key={`${item.subject}-${line.key}`}
                  x={lx.toFixed(1)}
                  dy={li === 0 ? 0 : li === 1 ? 12 : 13}
                  fontSize={10.5}
                  fontWeight={600}
                  fill="var(--app-ink-soft)"
                >
                  {line.text}
                </tspan>
              ))}
              <tspan
                x={lx.toFixed(1)}
                dy={scoreDy}
                fontSize={9.5}
                fontWeight={600}
                fill="var(--app-ink-muted)"
                fontFamily="'JetBrains Mono', monospace"
              >
                {item.value}/{item.fullMark ?? 10}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
});
