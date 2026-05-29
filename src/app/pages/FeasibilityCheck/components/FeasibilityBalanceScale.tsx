import { useMemo, useState, useEffect, useRef } from "react";
import { QUESTIONS } from "../constants";

interface FeasibilityBalanceScaleProps {
  answers: Record<number, string>;
}

/* ── Animated counter ──────────────────────────────────────────────── */
function useAnimatedValue(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const start = currentRef.current;
    const diff = target - start;
    if (Math.abs(diff) < 0.001) return;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const value = start + diff * eased;
      currentRef.current = value;
      setDisplay(value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

/* ── Constants ─────────────────────────────────────────────────────── */
const CX = 200;  // Center X of SVG
const CY = 180;  // Center Y (pivot point)
const R = 140;   // Main arc radius
const ARC_WIDTH = 18;
const TOTAL_QUESTIONS = QUESTIONS.length;

// Helper: polar to cartesian (0° = left of semi-circle, 180° = right)
function polarToXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX - radius * Math.cos(rad),
    y: CY - radius * Math.sin(rad),
  };
}

// Build arc path
function arcPath(r: number, startAngle = 0, endAngle = 180) {
  const s = polarToXY(startAngle, r);
  const e = polarToXY(endAngle, r);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

export function FeasibilityBalanceScale({ answers }: FeasibilityBalanceScaleProps) {
  /* ── Score logic ── */
  const balanceData = useMemo(() => {
    let totalScore = 0;
    let answeredCount = 0;

    for (const q of QUESTIONS) {
      const answerVal = answers[q.id];
      if (answerVal) {
        const option = q.options.find((opt) => opt.value === answerVal);
        if (option) {
          totalScore += option.score;
          answeredCount++;
        }
      }
    }

    const average = answeredCount > 0 ? totalScore / answeredCount : 2.5;
    const normalized = (average - 2.5) / 1.5; // -1 to +1
    const needleAngle = normalized * 90;       // -90° to +90°

    return {
      needleAngle,
      average,
      answeredCount,
      isHeavyLeft: average < 2.3,
      isHeavyRight: average > 2.7,
    };
  }, [answers]);

  const { needleAngle, average, answeredCount, isHeavyLeft, isHeavyRight } = balanceData;
  const animatedAverage = useAnimatedValue(answeredCount > 0 ? average : 0, 1000);

  /* ── Per-axis scores ── */
  const axisScores = useMemo(() => {
    return QUESTIONS.map((q) => {
      const answerVal = answers[q.id];
      const option = answerVal ? q.options.find((opt) => opt.value === answerVal) : null;
      return {
        axis: q.axis,
        label: q.axisLabel,
        score: option?.score ?? 0,
        answered: Boolean(answerVal),
      };
    });
  }, [answers]);

  /* ── Status copy ── */
  const statusCopy = useMemo(() => {
    if (answeredCount === 0) {
      return { title: "Chờ hiệu chuẩn", sub: "Trả lời các câu hỏi để đo mức sẵn sàng", color: "#94a3b8" };
    }
    if (isHeavyLeft) {
      return { title: "Rào cản lớn — Cần tinh gọn", sub: `Đã đánh giá ${answeredCount}/${TOTAL_QUESTIONS} khía cạnh`, color: "#f43f5e" };
    }
    if (isHeavyRight) {
      return { title: "Khả thi cao — Sẵn sàng lập kế hoạch", sub: `Đã đánh giá ${answeredCount}/${TOTAL_QUESTIONS} khía cạnh`, color: "#10b981" };
    }
    return { title: "Cân bằng — Hãy duy trì kỷ luật", sub: `Đã đánh giá ${answeredCount}/${TOTAL_QUESTIONS} khía cạnh`, color: "#f59e0b" };
  }, [answeredCount, isHeavyLeft, isHeavyRight]);

  /* ── 3D Tilt ── */
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`,
      transition: "transform 0.1s ease-out",
    });
  };
  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg)",
      transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
    });
  };

  /* ── SVG Tick marks ── */
  const ticks = useMemo(() => {
    const result = [];
    for (let i = 0; i <= 40; i++) {
      const angle = (i / 40) * 180;
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0;
      const innerR = R + 2;
      const outerR = isMajor ? R + 14 : isMid ? R + 10 : R + 6;
      const p1 = polarToXY(angle, innerR);
      const p2 = polarToXY(angle, outerR);

      // Smooth color interpolation from rose → amber → emerald
      const t = i / 40;
      let r: number, g: number, b: number;
      if (t < 0.35) {
        const p = t / 0.35;
        r = 244 + (249 - 244) * p;
        g = 63 + (115 - 63) * p;
        b = 94 + (22 - 94) * p;
      } else if (t < 0.65) {
        const p = (t - 0.35) / 0.3;
        r = 249 + (245 - 249) * p;
        g = 115 + (158 - 115) * p;
        b = 22 + (11 - 22) * p;
      } else {
        const p = (t - 0.65) / 0.35;
        r = 245 + (16 - 245) * p;
        g = 158 + (185 - 158) * p;
        b = 11 + (129 - 11) * p;
      }

      result.push({ p1, p2, isMajor, isMid, angle, color: `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})` });
    }
    return result;
  }, []);

  /* ── Zone labels on arc ── */
  const zoneMarkers = useMemo(() => {
    return [
      { angle: 0, label: "1.0" },
      { angle: 90, label: "2.5" },
      { angle: 180, label: "4.0" },
    ].map((z) => {
      const pos = polarToXY(z.angle, R + 22);
      return { ...z, ...pos };
    });
  }, []);

  /* ── Needle dot position on arc ── */
  const needleDotAngle = answeredCount > 0 ? 90 + needleAngle : 90;
  const needleDot = polarToXY(needleDotAngle, R);

  /* ── Segment arc (filled portion based on score) ── */
  const filledArcEndAngle = answeredCount > 0 ? ((average - 1) / 3) * 180 : 0;

  // Calculate the arc length for dash animation
  const totalArcLen = Math.PI * R; // half-circle
  const filledLen = (filledArcEndAngle / 180) * totalArcLen;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Decorative 3D tilt only
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="relative rounded-2xl overflow-hidden transition-all duration-300"
    >
      {/* ═══ Outer container with refined border ═══ */}
      <div className="relative bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden">

        {/* ═══ Gauge area — dark inset panel ═══ */}
        <div className="relative mx-3 mt-3 rounded-xl bg-gradient-to-b from-slate-900 via-slate-925 to-slate-950 overflow-hidden">
          {/* Subtle noise texture */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Ambient glow behind arc */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-4 w-[280px] h-[140px] rounded-full pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse, ${statusCopy.color}15, transparent 70%)`,
            }}
          />

          {/* ── SVG Gauge ── */}
          <div className="relative w-full px-4 pt-6 pb-3 flex justify-center select-none">
            <svg viewBox="0 0 400 220" className="w-full max-w-[380px] h-auto overflow-visible" aria-hidden="true">
              <defs>
                {/* Arc gradient */}
                <linearGradient id="fbs-g" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="20%" stopColor="#f97316" />
                  <stop offset="40%" stopColor="#fbbf24" />
                  <stop offset="60%" stopColor="#a3e635" />
                  <stop offset="80%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>

                {/* Filled arc glow */}
                <filter id="fbs-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Needle drop-shadow */}
                <filter id="fbs-ns" x="-100%" y="-100%" width="300%" height="300%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.6" />
                </filter>

                {/* Hub shadow */}
                <filter id="fbs-hs" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1" stdDeviation="4" floodColor="black" floodOpacity="0.4" />
                </filter>

                {/* Indicator dot glow */}
                <filter id="fbs-dg" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ── Tick marks ── */}
              {ticks.map((t) => (
                <line
                  key={t.angle}
                  x1={t.p1.x} y1={t.p1.y}
                  x2={t.p2.x} y2={t.p2.y}
                  stroke={t.color}
                  strokeWidth={t.isMajor ? "2.5" : t.isMid ? "1.5" : "0.8"}
                  strokeLinecap="round"
                  opacity={t.isMajor ? 0.6 : t.isMid ? 0.35 : 0.15}
                />
              ))}

              {/* ── Zone labels ── */}
              {zoneMarkers.map((z) => (
                <text
                  key={z.label}
                  x={z.x}
                  y={z.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#64748b"
                  opacity="0.5"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: "'tnum'" }}
                >
                  {z.label}
                </text>
              ))}

              {/* ── Background track ── */}
              <path
                d={arcPath(R)}
                fill="none"
                stroke="#1e293b"
                strokeWidth={ARC_WIDTH}
                strokeLinecap="round"
              />

              {/* Inner subtle border of track */}
              <path
                d={arcPath(R)}
                fill="none"
                stroke="#334155"
                strokeWidth={ARC_WIDTH + 1}
                strokeLinecap="round"
                opacity="0.3"
              />

              {/* ── Filled gradient arc ── */}
              {answeredCount > 0 && (
                <>
                  {/* Glow layer */}
                  <path
                    d={arcPath(R)}
                    fill="none"
                    stroke="url(#fbs-g)"
                    strokeWidth={ARC_WIDTH + 8}
                    strokeLinecap="round"
                    strokeDasharray={`${totalArcLen}`}
                    strokeDashoffset={`${totalArcLen - filledLen}`}
                    filter="url(#fbs-glow)"
                    opacity="0.35"
                    style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
                  />
                  {/* Main fill */}
                  <path
                    d={arcPath(R)}
                    fill="none"
                    stroke="url(#fbs-g)"
                    strokeWidth={ARC_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={`${totalArcLen}`}
                    strokeDashoffset={`${totalArcLen - filledLen}`}
                    style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
                  />
                </>
              )}

              {/* ── Indicator dot on arc ── */}
              {answeredCount > 0 && (
                <g style={{ transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                  <circle
                    cx={needleDot.x}
                    cy={needleDot.y}
                    r="8"
                    fill="white"
                    filter="url(#fbs-dg)"
                    style={{ transition: "cx 1s cubic-bezier(0.34, 1.56, 0.64, 1), cy 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                  />
                  <circle
                    cx={needleDot.x}
                    cy={needleDot.y}
                    r="4"
                    fill={statusCopy.color}
                    style={{ transition: "cx 1s cubic-bezier(0.34, 1.56, 0.64, 1), cy 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                  />
                </g>
              )}

              {/* ── Needle ── */}
              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* Needle body — tapered polygon */}
                <polygon
                  points={`${CX - 2},${CY + 8} ${CX},${CY - R + 30} ${CX + 2},${CY + 8}`}
                  fill="#e2e8f0"
                  filter="url(#fbs-ns)"
                  opacity="0.9"
                />
                {/* Needle bright tip */}
                <polygon
                  points={`${CX - 1.2},${CY - R + 42} ${CX},${CY - R + 28} ${CX + 1.2},${CY - R + 42}`}
                  fill="white"
                />
              </g>

              {/* ── Center hub ── */}
              <circle cx={CX} cy={CY} r="16" fill="#0f172a" stroke="#334155" strokeWidth="1" filter="url(#fbs-hs)" />
              <circle cx={CX} cy={CY} r="12" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
              <circle cx={CX} cy={CY} r="4" fill="#94a3b8" />
              <circle cx={CX} cy={CY} r="1.5" fill="#e2e8f0" />

              {/* ── Score display in center below hub ── */}
              <text
                x={CX}
                y={CY + 42}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="36"
                fontWeight="800"
                fill="white"
                opacity={answeredCount > 0 ? 1 : 0.2}
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontFeatureSettings: "'tnum'",
                  transition: "opacity 0.5s ease",
                }}
              >
                {answeredCount > 0 ? animatedAverage.toFixed(1) : "—"}
              </text>
              <text
                x={CX}
                y={CY + 62}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="500"
                fill="#64748b"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                / 4.0
              </text>

              {/* ── Edge labels ── */}
              <text
                x={CX - R - 6}
                y={CY + 16}
                textAnchor="end"
                fontSize="9"
                fontWeight="700"
                fill="#fb7185"
                opacity="0.7"
                style={{ fontFamily: "'Inter', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Rào cản
              </text>
              <text
                x={CX + R + 6}
                y={CY + 16}
                textAnchor="start"
                fontSize="9"
                fontWeight="700"
                fill="#34d399"
                opacity="0.7"
                style={{ fontFamily: "'Inter', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Khả thi
              </text>
            </svg>
          </div>
        </div>

        {/* ═══ Bottom section — light panel ═══ */}
        <div className="px-4 pt-4 pb-4 space-y-3.5">
          {/* ── Axis breakdown ── */}
          <div className="space-y-1.5">
            {axisScores.map((ax) => {
              const pct = ax.answered ? (ax.score / 4) * 100 : 0;
              const barColor = !ax.answered
                ? "bg-slate-100 dark:bg-slate-800"
                : ax.score >= 3
                  ? "bg-emerald-500"
                  : ax.score === 2
                    ? "bg-amber-500"
                    : "bg-rose-500";
              const trackColor = "bg-slate-100 dark:bg-slate-800/80";
              const textColor = ax.answered
                ? "text-slate-700 dark:text-slate-200"
                : "text-slate-400 dark:text-slate-600";
              const scoreColor = !ax.answered
                ? "text-slate-300 dark:text-slate-700"
                : ax.score >= 3
                  ? "text-emerald-600 dark:text-emerald-400"
                  : ax.score === 2
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400";

              return (
                <div key={ax.axis} className="flex items-center gap-3 group/row">
                  <span className={`text-xs font-medium w-[100px] shrink-0 truncate transition-colors duration-300 ${textColor}`}>
                    {ax.label}
                  </span>
                  <div className={`flex-1 h-1.5 rounded-full ${trackColor} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold tabular-nums w-[28px] text-right transition-colors duration-300 ${scoreColor}`}
                    style={{ fontFeatureSettings: "'tnum'" }}
                  >
                    {ax.answered ? ax.score : "·"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-slate-100 dark:bg-slate-800/80" />

          {/* ── Status footer ── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                {statusCopy.title}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                {statusCopy.sub}
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-300"
              style={{
                borderColor: `${statusCopy.color}25`,
                backgroundColor: `${statusCopy.color}08`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: statusCopy.color,
                  boxShadow: `0 0 6px ${statusCopy.color}60`,
                }}
              />
              <span
                className="text-xs font-bold tabular-nums"
                style={{
                  color: statusCopy.color,
                  fontFeatureSettings: "'tnum'",
                }}
              >
                {answeredCount > 0 ? `${Math.round((average / 4) * 100)}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
