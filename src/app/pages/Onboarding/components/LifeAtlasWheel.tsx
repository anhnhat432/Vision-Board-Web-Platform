import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { LifeArea } from "../../../utils/storage";

interface LifeAtlasWheelProps {
  lifeAreas: LifeArea[];
  reviewedAreaIndices: Set<number>;
  activeAreaIndex: number | null;
  averageScore: number;
  mode: "welcome" | "assessment";
  onWedgeHover?: (index: number | null) => void;
  onWedgeClick?: (index: number) => void;
  className?: string;
}

const DESIGN_WEDGE_COLORS: Array<{ stroke: string; fill: string; gradient: [string, string] }> = [
  { stroke: "#2563EB", fill: "#D9E5FC", gradient: ["#2563EB", "#60A5FA"] },
  { stroke: "#E7A400", fill: "#FBEBC2", gradient: ["#E7A400", "#FBBF24"] },
  { stroke: "#16A34A", fill: "#CDEBD8", gradient: ["#16A34A", "#34D399"] },
  { stroke: "#7C5CFC", fill: "#E2DAFE", gradient: ["#7C5CFC", "#A78BFA"] },
  { stroke: "#E8456B", fill: "#FAD3DE", gradient: ["#E8456B", "#FB7185"] },
  { stroke: "#0E9F8E", fill: "#C9EDE7", gradient: ["#0E9F8E", "#2DD4BF"] },
  { stroke: "#EA7A2B", fill: "#FBDEC4", gradient: ["#EA7A2B", "#FB923C"] },
  { stroke: "#2BA8E0", fill: "#CDE9F8", gradient: ["#2BA8E0", "#38BDF8"] },
];

function polarPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function buildWedgePath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) {
  const center = 140;
  const outerStart = polarPoint(center, center, outerRadius, startAngle);
  const outerEnd = polarPoint(center, center, outerRadius, endAngle);
  const innerEnd = polarPoint(center, center, innerRadius, endAngle);
  const innerStart = polarPoint(center, center, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function LifeAtlasWheel({
  lifeAreas,
  reviewedAreaIndices,
  activeAreaIndex,
  averageScore,
  mode,
  onWedgeHover,
  onWedgeClick,
  className,
}: LifeAtlasWheelProps) {
  const reduceMotion = useReducedMotion();
  const showPreview = mode === "welcome";
  const areaCount = lifeAreas.length;
  const segmentAngle = 360 / areaCount;

  const growthArea = useMemo(() => {
    return [...lifeAreas].sort((a, b) => a.score - b.score)[0];
  }, [lifeAreas]);

  const growthAreaIndex = Math.max(
    0,
    lifeAreas.findIndex((area) => area.name === growthArea.name),
  );
  const pinPoint = polarPoint(140, 140, 108, growthAreaIndex * segmentAngle);

  return (
    <div className={className}>
      <div className="relative mx-auto aspect-square w-full max-w-[320px] rounded-card border border-app-line bg-app-bg-subtle p-3 shadow-app-sm sm:max-w-[360px] sm:p-4">
        <svg
          role="img"
          aria-label={`Atlas cuộc sống gồm ${areaCount} vùng`}
          className="h-full w-full"
          viewBox="0 0 280 280"
        >
          <title>{`Atlas cuộc sống ${areaCount} vùng`}</title>
          <defs>
            {lifeAreas.map((area, index) => {
              const colors = DESIGN_WEDGE_COLORS[index] ?? DESIGN_WEDGE_COLORS[0];
              return (
                <radialGradient
                  key={`grad-${area.name}`}
                  id={`wedge-gradient-${index}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop offset="0%" stopColor={colors.gradient[1]} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={colors.gradient[0]} stopOpacity="0.5" />
                </radialGradient>
              );
            })}
          </defs>
          <circle cx="140" cy="140" r="122" fill="var(--app-surface)" stroke="rgba(23,21,15,0.07)" strokeWidth="1" />
          {[54, 84, 114].map((radius) => (
            <circle
              key={radius}
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="rgba(23,21,15,0.07)"
              strokeWidth="1"
            />
          ))}
          {lifeAreas.map((_, index) => {
            const angle = index * segmentAngle;
            const start = polarPoint(140, 140, 28, angle);
            const end = polarPoint(140, 140, 124, angle);
            return (
              <line
                key={angle}
                x1={start.x}
                x2={end.x}
                y1={start.y}
                y2={end.y}
                stroke="rgba(23,21,15,0.07)"
                strokeWidth="1"
              />
            );
          })}
          {lifeAreas.map((area, index) => {
            const scoreRatio = Math.max(0.08, Math.min(area.score / 10, 1));
            const half = segmentAngle * (20 / 45);
            const startAngle = index * segmentAngle - half;
            const endAngle = index * segmentAngle + half;
            const isReviewed = reviewedAreaIndices.has(index);
            const isActive = activeAreaIndex === index;
            const visible = showPreview || isReviewed || isActive;
            const colors = DESIGN_WEDGE_COLORS[index] ?? DESIGN_WEDGE_COLORS[0];
            const outerRadius = 42 + scoreRatio * 72;
            const labelPoint = polarPoint(140, 140, 134, index * segmentAngle);

            return (
              <g key={area.name} className="dof-wheel-grp">
                <motion.path
                  d={buildWedgePath(startAngle, endAngle, 28, outerRadius)}
                  fill={`url(#wedge-gradient-${index})`}
                  fillOpacity={visible ? (isActive ? 0.85 : 0.65) : 0.12}
                  stroke={colors.stroke}
                  strokeOpacity={visible ? 0.9 : 0.25}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeLinejoin="round"
                  style={{
                    cursor: onWedgeClick ? "pointer" : "default",
                    filter: isActive ? `drop-shadow(0 0 8px ${colors.stroke}50)` : "none",
                    transition: reduceMotion ? "none" : "all 0.3s ease",
                  }}
                  whileHover={reduceMotion ? {} : { scale: 1.02 }}
                  onMouseEnter={() => onWedgeHover?.(index)}
                  onMouseLeave={() => onWedgeHover?.(null)}
                  onClick={() => onWedgeClick?.(index)}
                />
                <circle
                  cx={labelPoint.x}
                  cy={labelPoint.y}
                  r={isActive ? 5 : 4.5}
                  fill={visible ? colors.stroke : "rgba(23,21,15,0.15)"}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
          <circle cx="140" cy="140" r="24" fill="var(--app-surface)" stroke="var(--app-line)" strokeWidth="1" />
          <text
            x="140"
            y="136"
            fill="#A8A296"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.12em"
            textAnchor="middle"
            fontFamily="'Be Vietnam Pro', sans-serif"
          >
            LIFE
          </text>
          <text
            x="140"
            y="155"
            fill="#0C5E3A"
            fontSize="22"
            fontWeight="800"
            textAnchor="middle"
            fontFamily="'Bricolage Grotesque', sans-serif"
          >
            {averageScore.toFixed(1)}
          </text>
          <g className="dof-pin transition-transform duration-300">
            <line
              x1={pinPoint.x}
              x2={pinPoint.x + 10}
              y1={pinPoint.y + 6}
              y2={pinPoint.y + 20}
              stroke="#17150F"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path
              d={`M${pinPoint.x} ${pinPoint.y + 14} C${pinPoint.x - 7} ${pinPoint.y + 4} ${pinPoint.x - 10} ${pinPoint.y} ${pinPoint.x - 10} ${pinPoint.y - 5} A10 10 0 1 1 ${pinPoint.x + 10} ${pinPoint.y - 5} C${pinPoint.x + 10} ${pinPoint.y} ${pinPoint.x + 7} ${pinPoint.y + 4} ${pinPoint.x} ${pinPoint.y + 14} Z`}
              fill="#0C5E3A"
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx={pinPoint.x} cy={pinPoint.y - 5} r="3.6" fill="#fff" />
          </g>
        </svg>
      </div>
    </div>
  );
}
