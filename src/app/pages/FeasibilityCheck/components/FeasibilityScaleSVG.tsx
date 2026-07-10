export interface FeasibilityScaleSVGProps {
  tiltAngle: number;
  isHeavyLeft: boolean;
  isHeavyRight: boolean;
  showDetails?: boolean;
  answers?: Record<number, string>;
}

export function FeasibilityScaleSVG({
  tiltAngle,
  isHeavyLeft,
  isHeavyRight,
  showDetails = false,
  answers = {},
}: FeasibilityScaleSVGProps) {
  // Lấy các câu trả lời để tính số lượng vật phẩm hiển thị động
  const timeVal = answers[1]; // lt1, 1to3, 3to5, gt5
  const energyVal = answers[2]; // energy_drained, energy_low, energy_stable, energy_high
  const resourceVal = answers[3]; // resources_missing, resources_basic, resources_mostly_ready, resources_ready
  const obstacleVal = answers[5]; // motivation, time, resources, complexity, none

  // Xác định vật phẩm trên đĩa cân phải (Thời gian & Sức chứa)
  const showTimeIcon = timeVal === "3to5" || timeVal === "gt5";
  const showEnergyIcon = energyVal === "energy_stable" || energyVal === "energy_high";
  const showResourceIcon = resourceVal === "resources_mostly_ready" || resourceVal === "resources_ready";

  // Xác định vật phẩm trên đĩa cân trái (Tham vọng & Rào cản)
  const showStormIcon = obstacleVal !== "none" && obstacleVal !== undefined;
  const showHeavyRock = obstacleVal === "time" || obstacleVal === "complexity";

  return (
    <svg viewBox="0 0 300 170" className="w-full h-full overflow-visible" aria-hidden="true">
      {/* 1. Trụ đỡ trung tâm (cột chống) */}
      {/* Chân đế dẹt */}
      <rect x="110" y="145" width="80" height="8" rx="4" className="fill-app-line/20 dark:fill-app-line/30" />
      <path d="M 120 145 L 180 145 L 170 135 L 130 135 Z" className="fill-app-line/10 dark:fill-app-line/20" />
      {/* Thân trụ */}
      <rect
        x="147"
        y="60"
        width="6"
        height="80"
        rx="1.5"
        className="fill-app-line-strong/40 dark:fill-app-line-strong/60"
      />
      {/* Khớp trục quay */}
      <circle cx="150" cy="60" r="5" className="fill-app-line-strong/80 dark:fill-app-line-strong" />
      <circle cx="150" cy="60" r="2.2" className="fill-app-surface dark:fill-app-bg" />

      {/* 2. Thanh ngang beam (Xoay theo tiltAngle quanh 150, 60) */}
      <g
        style={{
          transform: `rotate(${tiltAngle}deg)`,
          transformOrigin: "150px 60px",
          transition: "transform 0.8s var(--ease-overshoot)",
        }}
      >
        {/* Thanh đòn ngang chính */}
        <line
          x1="60"
          y1="60"
          x2="240"
          y2="60"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-app-line-strong/60 dark:text-app-line-strong/40"
        />

        {/* Móc treo 2 đầu */}
        <circle
          cx="60"
          cy="60"
          r="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-app-line-strong/80 dark:text-app-line-strong"
        />
        <circle
          cx="240"
          cy="60"
          r="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-app-line-strong/80 dark:text-app-line-strong"
        />

        {/* 3. Nhóm Treo đĩa cân bên trái (Ambition/Rào cản - triệt tiêu góc nghiêng để luôn thẳng đứng) */}
        <g
          style={{
            transform: `rotate(${-tiltAngle}deg)`,
            transformOrigin: "60px 60px",
            transition: "transform 0.8s var(--ease-overshoot)",
          }}
        >
          {/* Dây treo đĩa trái (tam giác ngược nối xuống đĩa) */}
          <line
            x1="60"
            y1="60"
            x2="42"
            y2="112"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-app-line/60 dark:text-app-line/40"
          />
          <line
            x1="60"
            y1="60"
            x2="78"
            y2="112"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-app-line/60 dark:text-app-line/40"
          />

          {/* Đĩa cân trái */}
          <path
            d="M 38 112 C 38 123, 82 123, 82 112"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-app-status-error/80"
          />

          {/* Vật phẩm trên đĩa cân trái: Đám mây rào cản ☁️ và mục tiêu 🎯 */}
          <circle
            cx="60"
            cy="103"
            r="14"
            className="fill-app-status-error/5 stroke-app-status-error/20"
            strokeWidth="1"
          />

          {/* Các vật phẩm động dựa trên câu trả lời */}
          <g style={{ transform: "translate(50px, 94px)" }}>
            <text className="text-[17px] select-none">🎯</text>
          </g>

          {showStormIcon && (
            <g style={{ transform: "translate(38px, 90px)" }}>
              <text className="text-[14px] select-none">☁️</text>
            </g>
          )}

          {showHeavyRock && (
            <g style={{ transform: "translate(60px, 98px)" }}>
              <text className="text-[14px] select-none">🪨</text>
            </g>
          )}

          {showDetails && isHeavyLeft && (
            <g style={{ transform: "translate(52px, 80px)" }} className="animate-bounce">
              <text className="text-[13px] select-none">⚠️</text>
            </g>
          )}
        </g>

        {/* 4. Nhóm Treo đĩa cân bên phải (Capacity/Sức chứa - triệt tiêu góc nghiêng) */}
        <g
          style={{
            transform: `rotate(${-tiltAngle}deg)`,
            transformOrigin: "240px 60px",
            transition: "transform 0.8s var(--ease-overshoot)",
          }}
        >
          {/* Dây treo đĩa phải */}
          <line
            x1="240"
            y1="60"
            x2="222"
            y2="112"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-app-line/60 dark:text-app-line/40"
          />
          <line
            x1="240"
            y1="60"
            x2="258"
            y2="112"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-app-line/60 dark:text-app-line/40"
          />

          {/* Đĩa cân phải */}
          <path
            d="M 218 112 C 218 123, 262 123, 262 112"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-app-status-success/80"
          />

          {/* Vật phẩm trên đĩa cân phải: Cát giờ ⏳ và điện ⚡ */}
          <circle
            cx="240"
            cy="103"
            r="14"
            className="fill-app-status-success/5 stroke-app-status-success/20"
            strokeWidth="1"
          />

          {/* Vật phẩm động dựa trên thời gian, năng lượng, nguồn lực */}
          {showTimeIcon ? (
            <g style={{ transform: "translate(229px, 94px)" }}>
              <text className="text-[17px] select-none">⏳</text>
            </g>
          ) : (
            <g style={{ transform: "translate(230px, 94px)" }} className="opacity-40">
              <text className="text-[15px] select-none">⏳</text>
            </g>
          )}

          {showEnergyIcon && (
            <g style={{ transform: "translate(243px, 90px)" }}>
              <text className="text-[14px] select-none">⚡</text>
            </g>
          )}

          {showResourceIcon && (
            <g style={{ transform: "translate(220px, 98px)" }}>
              <text className="text-[12px] select-none">🛠️</text>
            </g>
          )}

          {showDetails && isHeavyRight && (
            <g style={{ transform: "translate(232px, 80px)" }} className="animate-pulse">
              <text className="text-[13px] select-none">✨</text>
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
