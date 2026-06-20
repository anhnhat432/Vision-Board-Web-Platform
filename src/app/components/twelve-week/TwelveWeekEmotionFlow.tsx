import { Calendar, FileText, Smile } from "lucide-react";
import { useMemo, useState } from "react";
import type { TwelveWeekSystem } from "../../utils/storage-types";

interface WeekRange {
  start: string;
  end: string;
}

interface TwelveWeekEmotionFlowProps {
  system: TwelveWeekSystem;
  currentWeekRange: WeekRange | null;
  currentWeek: number;
}

interface DayMoodInfo {
  dateStr: string;
  label: string; // "Thứ 2", "Thứ 3"...
  dayName: string;
  mood: "low" | "steady" | "high" | "none";
  note: string;
  stoicQuote?: string;
  stoicReflection?: string;
  hasData: boolean;
}

const MOOD_COLORS = {
  high: "text-app-status-warning bg-app-status-warning/10 border-app-status-warning/25",
  steady: "text-app-status-success bg-app-status-success/10 border-app-status-success/25",
  low: "text-app-status-info bg-app-status-info/10 border-app-status-info/25",
  none: "text-app-ink-muted bg-app-bg/50 border-app-line",
};

const MOOD_LABELS = {
  high: "Hưng phấn / Tích cực",
  steady: "Bình ổn / Tự tại",
  low: "Trầm lắng / Căng thẳng",
  none: "Chưa ghi nhận",
};

export function TwelveWeekEmotionFlow({ system, currentWeekRange, currentWeek }: TwelveWeekEmotionFlowProps) {
  const [selectedDay, setSelectedDay] = useState<DayMoodInfo | null>(null);

  // Sinh 7 ngày của tuần và lấy dữ liệu tương ứng
  const daysData = useMemo<DayMoodInfo[]>(() => {
    if (!currentWeekRange) return [];

    const startDate = new Date(currentWeekRange.start);
    const result: DayMoodInfo[] = [];
    const weekdays = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const tzOffset = currentDate.getTimezoneOffset() * 60000;
      const dateStr = new Date(currentDate.getTime() - tzOffset).toISOString().split("T")[0];

      // 1. Lấy dữ liệu check-in trong hệ thống 12 tuần
      const checkIn = system.dailyCheckIns?.find((c) => c.date === dateStr);

      // 2. Lấy dữ liệu Daily Stoic Card đã lưu ở localStorage
      let stoicQuote = "";
      let stoicReflection = "";
      try {
        const savedStoic = localStorage.getItem(`daily_stoic_reflection_${dateStr}`);
        if (savedStoic) {
          const parsed = JSON.parse(savedStoic);
          stoicQuote = parsed.quote || "";
          stoicReflection = parsed.reflection || "";
        }
      } catch {
        // Bỏ qua nếu có lỗi đọc localStorage
      }

      const dayName = weekdays[i];
      const hasData = Boolean(checkIn || stoicReflection);

      result.push({
        dateStr,
        label: i === 6 ? "CN" : `T${i + 2}`,
        dayName: i === 6 ? "Chủ Nhật" : `Thứ ${dayName}`,
        mood: (checkIn?.mood as "low" | "steady" | "high" | undefined) ?? "none",
        note: checkIn?.optionalNote || "",
        stoicQuote,
        stoicReflection,
        hasData,
      });
    }

    return result;
  }, [system, currentWeekRange]);

  // Thiết lập đường cong SVG
  // Trục X từ 30 đến 290
  // Trục Y: high=30, steady=75, low=120, none=75
  const svgPath = useMemo(() => {
    if (daysData.length === 0) return "";

    const points = daysData.map((d, index) => {
      const x = 30 + index * 43.33; // 43.33px distance between points
      let y = 75; // steady & none
      if (d.mood === "high") y = 30;
      else if (d.mood === "low") y = 120;
      return { x, y };
    });

    // Vẽ đường cong Bezier trơn tru qua các điểm
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + 21.66;
      const cpY1 = p0.y;
      const cpX2 = p1.x - 21.66;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [daysData]);

  if (daysData.length === 0) return null;

  return (
    <div className="rounded-xl border border-app-line bg-app-surface p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-app-line/60 pb-3">
        <div className="flex items-center gap-2">
          <Smile className="h-5 w-5 text-app-warm animate-pulse" />
          <div>
            <h3 className="text-base font-semibold text-app-ink">Dòng chảy Cảm xúc Tuần {currentWeek}</h3>
            <p className="text-[11px] text-app-ink-soft">Kết nối tâm trạng hàng ngày để suy ngẫm sâu sắc hơn</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-app-ink-muted uppercase tracking-wider bg-app-bg px-2.5 py-1 rounded-full border border-app-line/50">
          Chánh niệm
        </span>
      </div>

      {/* Biểu đồ SVG Emotion Wave Flow */}
      <div className="relative w-full h-[150px] bg-app-bg/40 rounded-xl border border-app-line/40 p-2 overflow-visible select-none flex items-center justify-center">
        {/* Lưới đường viền phụ ngang */}
        <div className="absolute inset-x-4 top-[30px] border-t border-dashed border-app-line/30 flex justify-between px-2 pointer-events-none">
          <span className="text-[8px] font-bold text-app-status-warning/40 uppercase tracking-widest -mt-1.5">Tích cực</span>
        </div>
        <div className="absolute inset-x-4 top-[75px] border-t border-dashed border-app-line/30 flex justify-between px-2 pointer-events-none">
          <span className="text-[8px] font-bold text-app-accent/40 uppercase tracking-widest -mt-1.5">Bình ổn</span>
        </div>
        <div className="absolute inset-x-4 top-[120px] border-t border-dashed border-app-line/30 flex justify-between px-2 pointer-events-none">
          <span className="text-[8px] font-bold text-app-status-info/40 uppercase tracking-widest -mt-1.5">Trầm lắng</span>
        </div>

        <svg
          viewBox="0 0 320 150"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="Đường cong dòng chảy cảm xúc trong tuần"
        >
          {/* Đường cong cảm xúc */}
          <path
            d={svgPath}
            fill="none"
            stroke="url(#emotion-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="opacity-80"
          />

          {/* Cấu hình dải màu cho đường cong */}
          <defs>
            <linearGradient id="emotion-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          {/* Các điểm ngày lượn sóng tương tác */}
          {daysData.map((d, index) => {
            const x = 30 + index * 43.33;
            let y = 75;
            if (d.mood === "high") y = 30;
            else if (d.mood === "low") y = 120;

            const isSelected = selectedDay?.dateStr === d.dateStr;

            // Xác định màu điểm
            let pColor = "#94a3b8"; // none (xám)
            if (d.mood === "high")
              pColor = "#f59e0b"; // vàng
            else if (d.mood === "steady")
              pColor = "#10b981"; // emerald
            else if (d.mood === "low") pColor = "#6366f1"; // indigo

            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG groups can act as buttons in visual charts
              <g
                key={d.dateStr}
                role="button"
                tabIndex={0}
                className="cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-app-accent/30 rounded"
                aria-label={`Chi tiết cảm xúc ${d.dayName}`}
                onClick={() => setSelectedDay(isSelected ? null : d)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedDay(isSelected ? null : d);
                  }
                }}
              >
                {/* Vòng tròn hiệu ứng hào quang hover */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? "11" : "8"}
                  className="fill-current text-app-line/20 opacity-0 group-hover:opacity-100 transition-all duration-300"
                />
                {/* Vòng tròn viền trắng sang trọng */}
                <circle cx={x} cy={y} r="6.5" className="fill-app-surface stroke-2" style={{ stroke: pColor }} />
                {/* Điểm nhân chính */}
                <circle
                  cx={x}
                  cy={y}
                  r="3.5"
                  style={{ fill: pColor }}
                  className={d.mood !== "none" ? "animate-pulse" : ""}
                />
                {/* Nhãn Thứ bên dưới */}
                <text
                  x={x}
                  y="142"
                  textAnchor="middle"
                  className={`text-[9px] font-bold font-mono tracking-wider ${
                    isSelected ? "fill-app-accent font-extrabold" : "fill-app-ink-muted"
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* POP-OVER CHI TIẾT CẢM XÚC HÀNG NGÀY KHI CLICK */}
      {selectedDay && (
        <div
          className={`rounded-xl border p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${MOOD_COLORS[selectedDay.mood]}`}
        >
          <div className="flex items-center justify-between border-b border-app-line/50 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {selectedDay.dayName} ({selectedDay.dateStr})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs font-semibold hover:underline opacity-80"
            >
              Đóng
            </button>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <p className="font-semibold flex items-center gap-1">
              ✨ Tâm trạng: <span className="underline">{MOOD_LABELS[selectedDay.mood]}</span>
            </p>

            {/* Hiển thị châm ngôn Stoic trong ngày */}
            {selectedDay.stoicQuote && (
              <div className="bg-app-surface/60 rounded-lg p-2.5 border border-app-line/40">
                <p className="font-serif italic text-app-ink-soft select-none text-[11px] leading-relaxed">
                  “{selectedDay.stoicQuote}”
                </p>
                {selectedDay.stoicReflection && (
                  <p className="mt-2 text-app-ink font-medium border-t border-app-line/30 pt-1.5">
                    💭 Phản tư của bạn: {selectedDay.stoicReflection}
                  </p>
                )}
              </div>
            )}

            {/* Hiển thị nhật ký check-in */}
            {selectedDay.note ? (
              <div className="flex gap-1.5 items-start mt-1">
                <FileText className="h-3.5 w-3.5 shrink-0 opacity-70 mt-0.5" />
                <p className="text-app-ink font-medium">📝 Nhật ký: {selectedDay.note}</p>
              </div>
            ) : (
              !selectedDay.stoicReflection && (
                <p className="text-[11px] italic text-app-ink-muted">
                  Không có ghi chép nhật ký chánh niệm nào cho ngày này.
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
