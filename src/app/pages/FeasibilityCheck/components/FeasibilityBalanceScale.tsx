import { useMemo } from "react";
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

  const { needleAngle, average, answeredCount, isHeavyLeft, isHeavyRight, isBalanced } = balanceData;

  // Tính toán nhãn trạng thái và sticker emoji trực quan
  const emotionSticker = useMemo(() => {
    if (answeredCount === 0) {
      return { emoji: "🔮", label: "Chờ hiệu chuẩn", color: "text-app-ink-muted bg-app-bg border-app-line" };
    }
    if (isHeavyLeft) {
      return { emoji: "🤯", label: "Quá tải · Rào cản lớn", color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30" };
    }
    if (isHeavyRight) {
      return { emoji: "🚀", label: "Sẵn sàng · Khả thi cao", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30" };
    }
    return { emoji: "⚖️", label: "Cân bằng · Lý tưởng", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30" };
  }, [answeredCount, isHeavyLeft, isHeavyRight]);

  const statusLabel = () => {
    if (answeredCount === 0) return "Cán cân đang thăng bằng";
    if (isHeavyLeft) return "Rào cản khá nặng nề — Nên tinh gọn bớt việc";
    if (isHeavyRight) return "Mức độ khả thi rất tốt — Sẵn sàng lập kế hoạch";
    return "Cân bằng lý tưởng — Hãy duy trì kỷ luật";
  };

  return (
    <div className="rounded-[14px] border border-app-line bg-app-surface p-5 flex flex-col items-center gap-4 transition-all duration-300">
      <div className="w-full flex items-center justify-between border-b border-app-line/60 pb-3">
        <div className="flex items-center gap-1.5">
          <Scale className="h-4.5 w-4.5 text-app-accent" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-app-ink-muted">
            Đồng hồ khả thi 12 tuần
          </span>
        </div>
        <span className="text-xs font-bold text-app-ink select-none bg-app-bg px-2.5 py-1 rounded-full border border-app-line/50 flex items-center gap-1">
          {answeredCount > 0 && isHeavyRight && <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />}
          Điểm số: {answeredCount > 0 ? average.toFixed(1) : "—"}/4.0
        </span>
      </div>

      {/* SVG Canvas Gauge Meter */}
      <div className="relative w-full max-w-[280px] h-[130px] flex items-center justify-center select-none overflow-hidden">
        <svg
          viewBox="0 0 300 170"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          {/* Định nghĩa Gradient màu sắc cho đồng hồ bán nguyệt */}
          <defs>
            <linearGradient id="feasibility-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" /> {/* rose-500 */}
              <stop offset="45%" stopColor="#f59e0b" /> {/* amber-500 */}
              <stop offset="55%" stopColor="#eab308" /> {/* yellow-500 */}
              <stop offset="100%" stopColor="#10b981" /> {/* emerald-500 */}
            </linearGradient>
          </defs>

          {/* Vòng bán nguyệt nền xám mờ */}
          <path
            d="M 60 140 A 90 90 0 0 1 240 140"
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            strokeLinecap="round"
            className="text-app-line/40 dark:text-app-line/20"
          />

          {/* Vòng bán nguyệt màu gradient */}
          <path
            d="M 60 140 A 90 90 0 0 1 240 140"
            fill="none"
            stroke="url(#feasibility-gauge-gradient)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset="0"
          />

          {/* Vạch chia mức độ phụ */}
          <line x1="150" y1="50" x2="150" y2="60" stroke="currentColor" strokeWidth="2.5" className="text-app-surface" />
          <line x1="86" y1="76" x2="93" y2="83" stroke="currentColor" strokeWidth="2.5" className="text-app-surface" />
          <line x1="214" y1="76" x2="207" y2="83" stroke="currentColor" strokeWidth="2.5" className="text-app-surface" />

          {/* NHÓM KIM CHỈ HƯỚNG XOAY */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: "150px 140px",
              transition: "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Thân kim tam giác thon nhọn */}
            <polygon
              points="146,140 150,42 154,140"
              className="fill-app-ink dark:fill-app-ink/80 stroke-app-surface dark:stroke-app-surface/20 stroke-1"
            />
            {/* Khớp xoay ở tâm */}
            <circle
              cx="150"
              cy="140"
              r="7"
              className="fill-app-accent stroke-app-surface dark:stroke-app-bg stroke-2"
            />
          </g>
        </svg>

        {/* Text nhãn góc trái (Rào cản) và góc phải (Khả thi) */}
        <div className="absolute left-2 bottom-1 flex items-center gap-1 opacity-70">
          <ShieldAlert className="h-3 w-3 text-rose-500" />
          <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rào cản</span>
        </div>
        <div className="absolute right-2 bottom-1 flex items-center gap-1 opacity-70">
          <BadgeCheck className="h-3 w-3 text-emerald-500" />
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Khả thi</span>
        </div>
      </div>

      {/* Nhãn sticker cảm xúc động lớn hơn dưới đồng hồ */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-300 transform scale-100 hover:scale-105 select-none ${emotionSticker.color}`}>
        <span className="text-base animate-bounce">{emotionSticker.emoji}</span>
        <span>{emotionSticker.label}</span>
      </div>

      {/* Thông tin mô tả trạng thái phản hồi */}
      <div className="w-full text-center px-4 py-2 bg-app-bg/50 rounded-lg border border-app-line/40">
        <p className="text-xs font-semibold leading-relaxed text-app-ink">
          {statusLabel()}
        </p>
        <p className="text-[10px] text-app-ink-muted mt-0.5">
          {answeredCount === 0
            ? "Bắt đầu trả lời các câu hỏi bên dưới để hiệu chuẩn cán cân khả thi"
            : `Đã đánh giá ${answeredCount} / ${QUESTIONS.length} khía cạnh khả thi`}
        </p>
      </div>
    </div>
  );
}
