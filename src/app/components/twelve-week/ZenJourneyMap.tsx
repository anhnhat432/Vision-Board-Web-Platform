import { useState } from "react";
import { Sparkles } from "lucide-react";

interface ScoreboardWeek {
  weekNumber: number;
  weeklyScore: number;
  leadCompletionPercent: number;
  reviewDone: boolean;
  mainMetricProgress: string;
}

interface ZenJourneyMapProps {
  scoreboard: ScoreboardWeek[];
  currentWeek: number;
}

// Định nghĩa toạ độ uốn lượn chữ S nghệ thuật cho 12 tuần trong khung viewBox 800x480
const WEEK_COORDINATES: Record<number, { x: number; y: number }> = {
  1: { x: 80, y: 400 },
  2: { x: 160, y: 350 },
  3: { x: 260, y: 380 },
  4: { x: 340, y: 300 },
  5: { x: 260, y: 220 },
  6: { x: 180, y: 160 },
  7: { x: 250, y: 80 },
  8: { x: 380, y: 70 },
  9: { x: 500, y: 130 },
  10: { x: 540, y: 240 },
  11: { x: 640, y: 320 },
  12: { x: 720, y: 260 },
};

// Hàm sinh thuộc tính d của thẻ path SVG nối liền các toạ độ uốn lượn mượt mà bằng đường cong Cubic Bezier
const generateSmoothPath = () => {
  let pathStr = `M ${WEEK_COORDINATES[1].x} ${WEEK_COORDINATES[1].y}`;
  for (let i = 1; i < 12; i++) {
    const p0 = WEEK_COORDINATES[i];
    const p1 = WEEK_COORDINATES[i + 1];
    // Điểm điều khiển uốn lượn mềm mại
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    pathStr += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return pathStr;
};

export function ZenJourneyMap({ scoreboard, currentWeek }: ZenJourneyMapProps) {
  const [activeWeek, setActiveWeek] = useState<ScoreboardWeek | null>(
    scoreboard.find((w) => w.weekNumber === currentWeek) || null
  );

  const pathD = generateSmoothPath();

  return (
    <div className="relative w-full rounded-2xl border border-app-line/60 bg-gradient-to-b from-app-surface via-app-bg to-app-surface p-5 shadow-inner">
      {/* Khung tiêu đề chánh niệm */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-app-line/40 pb-3">
        <div>
          <h3 className="font-serif text-lg font-medium text-app-ink flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-app-accent animate-pulse" />
            Bản đồ hành trình Zen Journey
          </h3>
          <p className="text-xs text-app-ink-soft">
            Con đường 12 tuần uốn lượn chánh niệm. Chạm vào mỗi trạm dừng (Zen Stone) để xem suy ngẫm sâu sắc bên dưới.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-app-ink-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Đã hoàn thành review
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
            Tuần hiện tại (Lửa trại)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-app-line" />
            Tương lai (Sương mù)
          </span>
        </div>
      </div>

      {/* Sân khấu bản đồ SVG thông thoáng 100% */}
      <div className="relative overflow-x-auto overflow-y-hidden pb-4 pt-4">
        <div className="min-w-[800px] h-[480px] relative">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 800 480"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Bản đồ hành trình 12 tuần"
          >
            {/* 1. ĐƯỜNG ĐI CHÍNH (ĐƯỜNG ẨN HÀNH HƯƠNG TỔNG THỂ) */}
            <path
              d={pathD}
              stroke="var(--app-line)"
              strokeWidth="4"
              strokeDasharray="8 8"
              opacity="0.3"
            />

            {/* 2. ĐƯỜNG ĐÃ ĐI QUA (Hành trình đã thắp sáng) */}
            <path
              d={pathD}
              stroke="var(--app-accent)"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.75"
              // Cắt nhỏ path chỉ hiển thị phần đến tuần hiện tại
              strokeDasharray="4000"
              strokeDashoffset={
                800 - Math.min(100, (currentWeek / 12) * 100) * 8
              }
              className="transition-all duration-1000 ease-in-out"
            />

            {/* 3. VẼ CÁC ĐƯỜNG NỐI VÀ ĐIỂM DỪNG CHÂN */}
            {scoreboard.map((week) => {
              const coord = WEEK_COORDINATES[week.weekNumber];
              if (!coord) return null;

              const isCurrent = week.weekNumber === currentWeek;
              const isFuture = week.weekNumber > currentWeek;
              const isDone = week.reviewDone;

              return (
                // biome-ignore lint/a11y/useSemanticElements: interactive SVG group represents a Camp/Stone
                <g
                  key={week.weekNumber}
                  className="cursor-pointer font-sans"
                  onClick={() => setActiveWeek(week)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Tuần ${week.weekNumber}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setActiveWeek(week);
                    }
                  }}
                >
                  {/* Aura phát sáng cho trạm hiện tại hoặc active */}
                  {(isCurrent || activeWeek?.weekNumber === week.weekNumber) && (
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="22"
                      fill={isCurrent ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.1)"}
                      className={isCurrent ? "animate-[ping_2.5s_infinite]" : "animate-pulse"}
                    />
                  )}

                  {/* Vòng tròn trạm dừng chân chính (Zen Rock / Stone) */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="14"
                    className={`transition-all duration-300 stroke-[3px] ${
                      isCurrent
                        ? "fill-amber-500 stroke-amber-200"
                        : isDone
                          ? "fill-emerald-500 stroke-emerald-100 dark:fill-emerald-600"
                          : isFuture
                            ? "fill-app-bg stroke-app-line/60 opacity-50"
                            : "fill-rose-500 stroke-rose-100 dark:fill-rose-600" // Cần review
                    } ${
                      activeWeek?.weekNumber === week.weekNumber
                        ? "scale-125 stroke-app-ink ring-2 ring-offset-2 ring-app-ink"
                        : "hover:scale-110"
                    }`}
                  />

                  {/* Icon phụ trợ bên trên hòn đá */}
                  {isFuture ? (
                    // Sương mù che phủ tương lai - ổ khóa nhỏ tự vẽ
                    <g transform={`translate(${coord.x - 5}, ${coord.y - 5})`} className="opacity-45">
                      <rect x="1" y="4" width="8" height="6" rx="1" fill="currentColor" className="text-app-ink-muted" />
                      <path d="M3,4 V2.5 A 2,2 0 0,1 7,2.5 V4" stroke="currentColor" strokeWidth="1" fill="none" className="text-app-ink-muted" />
                    </g>
                  ) : isCurrent ? (
                    // Lửa trại bập bùng (Campfire) cho tuần hiện tại vẽ bằng SVG path tự bập bùng tuyệt đối chuẩn xác
                    <g transform={`translate(${coord.x}, ${coord.y - 9}) scale(0.75)`}>
                      {/* Lớp lửa cam bên ngoài */}
                      <path
                        d="M 0 -11 C 3 -6, 5 -3, 5 2 C 5 5, 3 8, 0 8 C -3 8, -5 5, -5 2 C -5 -3, -3 -6, 0 -11 Z"
                        fill="#f59e0b"
                      >
                        <animate
                          attributeName="d"
                          values="M 0 -11 C 3 -6, 5 -3, 5 2 C 5 5, 3 8, 0 8 C -3 8, -5 5, -5 2 C -5 -3, -3 -6, 0 -11 Z;
                                  M 0 -13 C 2.5 -7, 6 -4, 6 2 C 6 6, 3 9, 0 9 C -3 9, -6 6, -6 2 C -6 -4, -2.5 -7, 0 -13 Z;
                                  M 0 -11 C 3 -6, 5 -3, 5 2 C 5 5, 3 8, 0 8 C -3 8, -5 5, -5 2 C -5 -3, -3 -6, 0 -11 Z"
                          dur="0.8s"
                          repeatCount="indefinite"
                        />
                      </path>
                      {/* Lớp lửa vàng ấm bên trong */}
                      <path
                        d="M 0 -7 C 2 -4, 3 -2, 3 1 C 3 3, 2 5, 0 5 C -2 5, -3 3, -3 1 C -3 -2, -2 -4, 0 -7 Z"
                        fill="#fcd34d"
                      >
                        <animate
                          attributeName="d"
                          values="M 0 -7 C 2 -4, 3 -2, 3 1 C 3 3, 2 5, 0 5 C -2 5, -3 3, -3 1 C -3 -2, -2 -4, 0 -7 Z;
                                  M 0 -9 C 1.5 -5, 4 -3, 4 1 C 4 4, 2 6, 0 6 C -2 6, -4 4, -4 1 C -4 -3, -1.5 -5, 0 -9 Z;
                                  M 0 -7 C 2 -4, 3 -2, 3 1 C 3 3, 2 5, 0 5 C -2 5, -3 3, -3 1 C -3 -2, -2 -4, 0 -7 Z"
                          dur="0.6s"
                          repeatCount="indefinite"
                        />
                      </path>
                      {/* Gỗ củi đốt mộc mạc bên dưới ngọn lửa */}
                      <path d="M -7 4 L 7 7 M -7 7 L 7 4" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
                    </g>
                  ) : (
                    // Điểm số tuần cho tuần đã hoàn tất
                    <text
                      x={coord.x}
                      y={coord.y + 3.5}
                      textAnchor="middle"
                      className="font-sans text-[9px] font-extrabold fill-white select-none"
                    >
                      {week.weeklyScore}
                    </text>
                  )}

                  {/* Nhãn văn bản Tuần x bên dưới mỗi điểm dừng */}
                  <text
                    x={coord.x}
                    y={coord.y + 28}
                    textAnchor="middle"
                    className={`font-sans text-[10px] font-bold ${
                      isCurrent
                        ? "fill-amber-600 dark:fill-amber-400 font-extrabold"
                        : isFuture
                          ? "fill-app-ink-muted opacity-50"
                          : "fill-app-ink"
                    }`}
                  >
                    T{week.weekNumber}
                  </text>
                </g>
              );
            })}

            {/* HIỆU ỨNG SƯƠNG MÙ CHE PHỦ (Fog of War) CHO CÁC TUẦN TƯƠNG LAI */}
            {scoreboard
              .filter((w) => w.weekNumber > currentWeek)
              .map((week) => {
                const coord = WEEK_COORDINATES[week.weekNumber];
                if (!coord) return null;

                return (
                  <g key={`fog-${week.weekNumber}`} className="pointer-events-none opacity-20">
                    <circle
                      cx={coord.x + (Math.sin(week.weekNumber) * 12)}
                      cy={coord.y + (Math.cos(week.weekNumber) * 8)}
                      r="28"
                      fill="url(#fogGradient)"
                      className="filter blur-[4px] animate-pulse"
                    />
                  </g>
                );
              })}

            {/* Định nghĩa dải màu và đổ bóng cho SVG */}
            <defs>
              {/* Radial gradient cho sương mù trắng sữa */}
              <radialGradient id="fogGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* TẤM CARD CHI TIẾT TRẠM DỪNG CHÂN NẰM THÔNG THOÁNG BÊN DƯỚI BẢN ĐỒ */}
      {activeWeek && (
        <div className="mt-6 rounded-2xl border border-app-line bg-gradient-to-br from-app-surface via-app-bg/30 to-app-surface p-5 shadow-sm transition-all duration-300 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line/40 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🪨</span>
              <div>
                <h4 className="font-serif text-base font-semibold text-app-ink flex items-center gap-2">
                  Trạm dừng chân: Tuần {activeWeek.weekNumber}
                  {activeWeek.weekNumber === currentWeek && (
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse border border-amber-500/20 flex items-center gap-0.5">
                      🔥 Hiện tại
                    </span>
                  )}
                </h4>
                <p className="text-xs text-app-ink-soft">
                  {activeWeek.weekNumber === currentWeek 
                    ? "Ngọn lửa kỷ luật đang thắp sáng tại trạm dừng này. Hãy tiếp tục duy trì!"
                    : activeWeek.reviewDone 
                      ? "Bạn đã vượt qua và hoàn thành việc suy ngẫm sâu sắc cho tuần này."
                      : "Trạm dừng tương lai hoặc cần bạn tiến hành review để thắp sáng."}
                </p>
              </div>
            </div>
            {activeWeek.weekNumber === currentWeek ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 border border-amber-500/20 animate-pulse">
                Đang thắp lửa
              </span>
            ) : activeWeek.reviewDone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                Đã hoàn tất review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-app-line px-3 py-1 text-xs font-bold text-app-ink-soft border border-app-line/60">
                {activeWeek.weekNumber > currentWeek ? "Tương lai" : "Cần review"}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-app-surface/60 p-4 border border-app-line/40 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Điểm hiệu suất</span>
              <p className="mt-2 font-serif text-3xl font-bold text-app-ink tabular-nums">
                {activeWeek.weeklyScore} <span className="text-xs font-sans font-normal text-app-ink-muted">điểm</span>
              </p>
            </div>
            <div className="rounded-xl bg-app-surface/60 p-4 border border-app-line/40 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Hoàn thành cốt lõi</span>
              <p className="mt-2 font-serif text-3xl font-bold text-app-ink tabular-nums">
                {activeWeek.leadCompletionPercent}%
              </p>
            </div>
            <div className="rounded-xl bg-app-surface/60 p-4 border border-app-line/40 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Chỉ số tiến triển</span>
              <p className="mt-2 text-xs font-semibold text-app-ink leading-relaxed line-clamp-2">
                {activeWeek.mainMetricProgress || "Chưa cập nhật chỉ số chính"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
