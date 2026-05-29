import { useMemo } from "react";
import { Scale, ShieldAlert, BadgeCheck } from "lucide-react";
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
    
    // Đưa điểm trung bình (1-4) về tỉ lệ xoay đĩa cân (-20 đến +20 độ)
    // Điểm cao (4.0) -> Khả thi cao -> Đĩa bên phải chìm xuống -> Cán cân xoay theo chiều kim đồng hồ (+)
    // Điểm thấp (1.0) -> Rào cản cao -> Đĩa bên trái chìm xuống -> Cán cân xoay ngược chiều kim đồng hồ (-)
    const normalized = (average - 2.5) / 1.5; // Khoảng từ -1.0 đến +1.0
    const angle = normalized * 20; // Lên đến 20 độ

    return {
      angle,
      average,
      answeredCount,
      isHeavyLeft: average < 2.3,
      isHeavyRight: average > 2.7,
      isBalanced: average >= 2.3 && average <= 2.7,
    };
  }, [answers]);

  const { angle, average, answeredCount, isHeavyLeft, isHeavyRight } = balanceData;

  // Tính toán nhãn trạng thái trực quan
  const statusLabel = () => {
    if (answeredCount === 0) return "Cán cân đang thăng bằng";
    if (isHeavyLeft) return "Rào cản nặng nề — Cần tinh gọn lại mục tiêu";
    if (isHeavyRight) return "Tính khả thi rất cao — Sẵn sàng lên kế hoạch";
    return "Cân bằng lý tưởng — Tiến triển tốt";
  };

  return (
    <div className="rounded-[14px] border border-app-line bg-app-surface p-5 flex flex-col items-center gap-4 transition-all duration-300">
      <div className="w-full flex items-center justify-between border-b border-app-line/60 pb-3">
        <div className="flex items-center gap-1.5">
          <Scale className="h-4.5 w-4.5 text-app-accent" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-app-ink-muted">
            Cán cân khả thi 12 tuần
          </span>
        </div>
        <span className="text-xs font-bold text-app-ink select-none bg-app-bg px-2.5 py-1 rounded-full border border-app-line/50">
          Điểm số: {answeredCount > 0 ? average.toFixed(1) : "—"}/4.0
        </span>
      </div>

      {/* SVG Canvas cán cân thăng bằng vật lý */}
      <div className="relative w-full max-w-[280px] h-[140px] flex items-center justify-center select-none">
        <svg
          viewBox="0 0 320 180"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          {/* Trục đỡ chính (Cột trụ giữa) */}
          <path
            d="M 160 30 L 160 160 M 130 160 L 190 160 M 145 160 L 160 145 L 175 160"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="text-app-ink-muted/50"
            fill="none"
          />
          <circle cx="160" cy="30" r="5" className="fill-app-ink text-app-surface stroke-2" />

          {/* NHÓM XOAY: Bao gồm thanh ngang và đĩa cân */}
          <g
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: "160px 30px",
              transition: "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Thanh đòn ngang (Beam) */}
            <line
              x1="60"
              y1="30"
              x2="260"
              y2="30"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-app-ink-muted"
            />
            
            {/* Kim chỉ thăng bằng ở trục giữa */}
            <line
              x1="160"
              y1="30"
              x2="160"
              y2="55"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-app-accent"
            />

            {/* ĐĨA CÂN BÊN TRÁI: Rào cản (Treo ở tọa độ 60, 30) */}
            <g
              style={{
                transform: `rotate(${-angle}deg)`,
                transformOrigin: "60px 30px",
                transition: "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            >
              {/* Dây treo đĩa cân */}
              <path
                d="M 60 30 L 35 110 M 60 30 L 85 110"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-app-ink-muted/40"
                fill="none"
              />
              {/* Đĩa cân */}
              <path
                d="M 30 110 Q 60 125 90 110 Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                className={isHeavyLeft ? "text-rose-500/20 stroke-rose-400" : "text-app-bg stroke-app-line"}
              />
              {/* Hạt rào cản đĩa trái */}
              {answeredCount > 0 && (
                <g className={isHeavyLeft ? "text-rose-500" : "text-app-ink-muted/60"}>
                  <circle cx="50" cy="105" r="4.5" className="fill-current animate-pulse" />
                  <circle cx="68" cy="107" r="3.5" className="fill-current" />
                  <circle cx="58" cy="102" r="5" className="fill-current" />
                </g>
              )}
            </g>

            {/* ĐĨA CÂN BÊN PHẢI: Khả thi (Treo ở tọa độ 260, 30) */}
            <g
              style={{
                transform: `rotate(${-angle}deg)`,
                transformOrigin: "260px 30px",
                transition: "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            >
              {/* Dây treo đĩa cân */}
              <path
                d="M 260 30 L 235 110 M 260 30 L 285 110"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-app-ink-muted/40"
                fill="none"
              />
              {/* Đĩa cân */}
              <path
                d="M 230 110 Q 260 125 290 110 Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                className={isHeavyRight ? "text-emerald-500/20 stroke-emerald-400" : "text-app-bg stroke-app-line"}
              />
              {/* Đốm sao khả thi vàng lấp lánh đĩa phải */}
              {answeredCount > 0 && (
                <g className={isHeavyRight ? "text-amber-500" : "text-app-ink-muted/60"}>
                  <circle cx="250" cy="105" r="4" className="fill-current" />
                  <circle cx="268" cy="104" r="5" className="fill-current animate-pulse" />
                  <circle cx="258" cy="107" r="3" className="fill-current" />
                </g>
              )}
            </g>
          </g>
        </svg>

        {/* Các nhãn chỉ hướng tĩnh chéo */}
        <div className="absolute left-1 bottom-1 flex items-center gap-1 opacity-70">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rào cản</span>
        </div>
        <div className="absolute right-1 bottom-1 flex items-center gap-1 opacity-70">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Nguồn lực</span>
        </div>
      </div>

      {/* Thông tin mô tả trạng thái phản hồi */}
      <div className="w-full text-center px-4 py-2 bg-app-bg/50 rounded-lg border border-app-line/40">
        <p className="text-xs font-semibold leading-relaxed text-app-ink">
          {statusLabel()}
        </p>
        <p className="text-[10px] text-app-ink-muted mt-0.5">
          {answeredCount === 0
            ? "Bắt đầu trả lời các câu hỏi bên dưới để hiệu chuẩn cán cân khả thi"
            : `Đã trả lời đánh giá ${answeredCount} khía cạnh khả thi`}
        </p>
      </div>
    </div>
  );
}
