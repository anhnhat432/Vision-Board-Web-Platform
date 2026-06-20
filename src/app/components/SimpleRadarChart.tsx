interface SimpleRadarChartPoint {
  subject: string;
  value: number;
  fullMark?: number;
}

interface SimpleRadarChartProps {
  data: SimpleRadarChartPoint[];
  className?: string;
}

const CX = 220;
const CY = 200;
const R = 140;
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1];

function pt(index: number, radius: number, total: number): [number, number] {
  const angle = (-90 + index * (360 / total)) * (Math.PI / 180);
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function splitLabel(label: string): string[] {
  const words = label.trim().split(/\s+/);
  if (words.length <= 2) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function SimpleRadarChart({ data, className }: SimpleRadarChartProps) {
  if (data.length === 0) return null;

  const total = data.length;

  return (
    <div className={`w-full ${className || ""}`}>
      <svg
        aria-label="Biểu đồ radar tổng quan"
        viewBox="0 0 440 420"
        width="100%"
        style={{ maxWidth: 480, height: "auto", display: "block", margin: "0 auto" }}
        role="img"
        preserveAspectRatio="xMidYMid meet"
      >
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
              fill={f === 1 ? "#FAFAF7" : "none"}
              stroke="rgba(23,21,15,0.10)"
              strokeWidth={1}
            />
          );
        })}

        {Array.from({ length: total }, (_, i) => {
          const [x, y] = pt(i, R, total);
          return (
            <line
              key={`spoke-${i}`}
              x1={CX}
              y1={CY}
              x2={x.toFixed(1)}
              y2={y.toFixed(1)}
              stroke="rgba(23,21,15,0.08)"
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
            fill="rgba(12,94,58,0.16)"
            stroke="#0C5E3A"
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
                fill="#0C5E3A"
                stroke="#fff"
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
                  key={`${item.subject}-${li}`}
                  x={lx.toFixed(1)}
                  dy={li === 0 ? 0 : li === 1 ? 12 : 13}
                  fontSize={10.5}
                  fontWeight={600}
                  fill="#5C574B"
                >
                  {line}
                </tspan>
              ))}
              <tspan
                x={lx.toFixed(1)}
                dy={scoreDy}
                fontSize={9.5}
                fontWeight={600}
                fill="#A8A296"
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
}
