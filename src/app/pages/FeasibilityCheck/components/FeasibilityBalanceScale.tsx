import { useMemo, useState } from "react";
import { Scale, ShieldAlert, BadgeCheck, Sparkles } from "lucide-react";
import { QUESTIONS } from "../constants";

interface FeasibilityBalanceScaleProps {
  answers: Record<number, string>;
}

export function FeasibilityBalanceScale({ answers }: FeasibilityBalanceScaleProps) {
  // Tính điểm trung bình khả thi hiện tại
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

    const average = answeredCount > 0 ? totalScore / answeredCount : 2.5; // Mặc định cân bằng hoàn hảo (2.5)
    
    // Đưa điểm trung bình (1.0 đến 4.0) về góc xoay kim chỉ hướng (-90 đến +90 độ)
    const normalized = (average - 2.5) / 1.5; // Khoảng từ -1.0 đến +1.0
    const needleAngle = normalized * 90; // Xoay từ -90 đến 90 độ

    return {
      needleAngle,
      average,
      answeredCount,
      isHeavyLeft: average < 2.3,
      isHeavyRight: average > 2.7,
      isBalanced: average >= 2.3 && average <= 2.7,
    };
  }, [answers]);

  const { needleAngle, average, answeredCount, isHeavyLeft, isHeavyRight } = balanceData;

  // Hiệu ứng 3D Mouse-Tilt siêu cao cấp
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // khoảng từ -0.5 đến 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // khoảng từ -0.5 đến 0.5
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) scale3d(1.02, 1.02, 1.02)`,
      boxShadow: `${-x * 20}px ${-y * 20}px 35px rgba(99, 102, 241, 0.1), 0 25px 60px rgba(0, 0, 0, 0.12)`,
      transition: "transform 0.1s ease-out, box-shadow 0.1s ease-out",
    });
  };
  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      boxShadow: "0 20px 50px rgba(0, 0, 0, 0.05)",
      transition: "transform 0.5s ease, box-shadow 0.5s ease",
    });
  };

  // Tính toán nhãn trạng thái và sticker emoji trực quan với phong cách Iridescent / Glow
  const emotionSticker = useMemo(() => {
    if (answeredCount === 0) {
      return {
        emoji: "🔮",
        label: "Chờ hiệu chuẩn",
        style: "bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-700 shadow-sm",
      };
    }
    if (isHeavyLeft) {
      return {
        emoji: "🤯",
        label: "Quá tải · Rào cản lớn",
        style: "bg-gradient-to-r from-rose-500/10 via-red-500/10 to-amber-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
      };
    }
    if (isHeavyRight) {
      return {
        emoji: "🚀",
        label: "Sẵn sàng · Khả thi cao",
        style: "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
      };
    }
    return {
      emoji: "⚖️",
      label: "Cân bằng · Lý tưởng",
      style: "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-emerald-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    };
  }, [answeredCount, isHeavyLeft, isHeavyRight]);

  const statusLabel = () => {
    if (answeredCount === 0) return "Cán cân đang thăng bằng";
    if (isHeavyLeft) return "Rào cản khá nặng nề — Nên tinh gọn bớt việc";
    if (isHeavyRight) return "Mức độ khả thi rất tốt — Sẵn sàng lập kế hoạch";
    return "Cân bằng lý tưởng — Hãy duy trì kỷ luật";
  };

  // Tạo các radial ticks tinh tế cho thước đo bán nguyệt
  const radialTicks = useMemo(() => {
    const ticks = [];
    // Vẽ vạch từ góc 0 độ đến 180 độ, mỗi vạch cách nhau 15 độ
    for (let angle = 0; angle <= 180; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const r1 = 88;
      const r2 = 95;
      const x1 = 150 - r1 * Math.cos(rad);
      const y1 = 140 - r1 * Math.sin(rad);
      const x2 = 150 - r2 * Math.cos(rad);
      const y2 = 140 - r2 * Math.sin(rad);

      let tickColor = "stroke-rose-400/50 dark:stroke-rose-500/40";
      if (angle > 60 && angle <= 100) {
        tickColor = "stroke-amber-400/50 dark:stroke-amber-500/40";
      } else if (angle > 100 && angle <= 120) {
        tickColor = "stroke-yellow-400/50 dark:stroke-yellow-500/40";
      } else if (angle > 120) {
        tickColor = "stroke-emerald-400/50 dark:stroke-emerald-500/40";
      }

      ticks.push({ x1, y1, x2, y2, color: tickColor, angle });
    }
    return ticks;
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Mouse events are for decorative 3D tilt effect only
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="relative overflow-hidden rounded-[20px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-2xl p-6 flex flex-col items-center gap-4.5 transition-all duration-300 group"
    >
      {/* Background radial glow */}
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-indigo-500/10" />
      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-emerald-500/10" />

      <div className="w-full flex items-center justify-between border-b border-app-line/40 dark:border-slate-800/60 pb-3.5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500">
            <Scale className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold uppercase tracking-[0.12em] text-app-ink-muted">
            Đồng hồ khả thi 12 tuần
          </span>
        </div>
        <span className="text-sm font-bold text-app-ink select-none bg-white/80 dark:bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-app-line/40 dark:border-slate-800/60 shadow-sm flex items-center gap-1.5">
          {answeredCount > 0 && isHeavyRight && <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />}
          Điểm số: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{answeredCount > 0 ? average.toFixed(1) : "—"}</span>/4.0
        </span>
      </div>

      {/* SVG Canvas Gauge Meter */}
      <div className="relative w-full max-w-[280px] h-[135px] flex items-center justify-center select-none overflow-hidden mt-2 relative z-10">
        <svg
          viewBox="0 0 300 170"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            {/* Gradient màu sắc cho cung tròn chính */}
            <linearGradient id="feasibility-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" /> {/* rose-500 */}
              <stop offset="45%" stopColor="#f59e0b" /> {/* amber-500 */}
              <stop offset="55%" stopColor="#eab308" /> {/* yellow-500 */}
              <stop offset="100%" stopColor="#10b981" /> {/* emerald-500 */}
            </linearGradient>
            
            {/* Filter Neon Glow cao cấp cho kim chỉ hướng */}
            <filter id="needle-neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient cho kim phát sáng */}
            <linearGradient id="needle-glow-grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Vạch chia mức độ phụ (Radial Ticks) vẽ bằng nét vẽ sang trọng */}
          {radialTicks.map((tick) => (
            <line
              key={tick.angle}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              strokeWidth={tick.angle % 45 === 0 ? "2.5" : "1.5"}
              className={`${tick.color} transition-all duration-300`}
            />
          ))}

          {/* Vòng bán nguyệt nền xám mờ (Track) nét mảnh */}
          <path
            d="M 68 140 A 82 82 0 0 1 232 140"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className="text-slate-200 dark:text-slate-800"
          />

          {/* Vòng bán nguyệt màu gradient mỏng tinh tế */}
          <path
            d="M 68 140 A 82 82 0 0 1 232 140"
            fill="none"
            stroke="url(#feasibility-gauge-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="258"
            strokeDashoffset="0"
          />

          {/* NHÓM KIM CHỈ HƯỚNG XOAY PHÁT SÁNG */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: "150px 140px",
              transition: "transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Aura phát sáng neon dưới kim */}
            <line
              x1="150"
              y1="140"
              x2="150"
              y2="28"
              stroke="url(#needle-glow-grad)"
              strokeWidth="7"
              strokeLinecap="round"
              filter="url(#needle-neon-glow)"
              className="opacity-80"
            />
            
            {/* Thân kim chính mảnh mai sắc sảo */}
            <line
              x1="150"
              y1="140"
              x2="150"
              y2="28"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            
            {/* Đầu kim tam giác nhỏ sắc nét */}
            <polygon
              points="147.5,35 150,23 152.5,35"
              fill="#6366f1"
              className="drop-shadow-[0_0_3px_rgba(99,102,241,0.8)]"
            />
            
            {/* Khớp xoay ở tâm nhiều lớp chiều sâu */}
            <circle
              cx="150"
              cy="140"
              r="9"
              className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700 stroke-1 shadow-md"
            />
            <circle
              cx="150"
              cy="140"
              r="5"
              className="fill-indigo-500 shadow-inner"
            />
            <circle
              cx="150"
              cy="140"
              r="2"
              className="fill-white"
            />
          </g>
        </svg>

        {/* Text nhãn góc trái (Rào cản) và góc phải (Khả thi) */}
        <div className="absolute left-1 bottom-1 flex items-center gap-1.5 backdrop-blur-[4px] bg-white/40 dark:bg-black/20 px-2.5 py-1 rounded-md border border-white/20">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Rào cản</span>
        </div>
        <div className="absolute right-1 bottom-1 flex items-center gap-1.5 backdrop-blur-[4px] bg-white/40 dark:bg-black/20 px-2.5 py-1 rounded-md border border-white/20">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Khả thi</span>
        </div>
      </div>

      {/* Nhãn sticker cảm xúc động lớn dạng Iridescent Badge */}
      <div className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md ${emotionSticker.style}`}>
        <span className="text-base animate-bounce duration-1000">{emotionSticker.emoji}</span>
        <span className="tracking-wide text-xs">{emotionSticker.label}</span>
      </div>

      {/* Thông tin mô tả trạng thái phản hồi */}
      <div className="w-full text-center px-4 py-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-[1px] relative z-10">
        <p className="text-sm font-bold leading-relaxed text-app-ink">
          {statusLabel()}
        </p>
        <p className="text-xs text-app-ink-muted mt-1 font-semibold">
          {answeredCount === 0
            ? "Bắt đầu trả lời các câu hỏi bên dưới để hiệu chuẩn cán cân khả thi"
            : `Đã đánh giá ${answeredCount} / ${QUESTIONS.length} khía cạnh khả thi`}
        </p>
      </div>
    </div>
  );
}

