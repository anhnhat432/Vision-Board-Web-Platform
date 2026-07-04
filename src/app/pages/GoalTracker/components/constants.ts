import type { SpotlightTourStep } from "@/app/components/SpotlightTour";

export const GOALTRACKER_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "hero",
    targetId: "goaltracker-hero",
    title: "Bắt đầu mục tiêu ở đây",
    description:
      "Khi chưa biết đi tiếp thế nào, dùng hai nút đầu trang để vào luồng 12 tuần có hướng dẫn hoặc tạo nhanh một mục tiêu SMART.",
  },
  {
    id: "summary",
    targetId: "goaltracker-summary",
    title: "Xem sức khỏe mục tiêu trong một hàng",
    description:
      "Dải số liệu này cho biết bạn đang có bao nhiêu mục tiêu, bao nhiêu việc đã chốt và mục tiêu nào cần chú ý trước.",
  },
  {
    id: "goals",
    targetId: "goaltracker-goals",
    title: "Quản lý mục tiêu chính ở khu vực này",
    description:
      "Danh sách bên dưới là nơi mở hệ 12 tuần, đánh dấu việc nhỏ, hoặc xử lý mục tiêu quá hạn mà không phải quét toàn bộ trang.",
  },
];

export const completedGoalStyle = `
  @media (prefers-reduced-motion: no-preference) {
    @keyframes completedBorderGlow {
      0%, 100% {
        border-color: rgba(16, 185, 129, 0.35);
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.08), inset 0 0 4px rgba(16, 185, 129, 0.02);
      }
      50% {
        border-color: rgba(52, 211, 153, 0.7);
        box-shadow: 0 0 20px rgba(52, 211, 153, 0.22), inset 0 0 6px rgba(52, 211, 153, 0.04);
      }
    }
  }
  .completed-goal-glow {
    will-change: border-color, box-shadow;
    animation: completedBorderGlow 4s infinite ease-in-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .completed-goal-glow {
      animation: none;
      border-color: rgba(16, 185, 129, 0.35);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.08), inset 0 0 4px rgba(16, 185, 129, 0.02);
    }
  }
  .perspective-1000 {
    perspective: 1000px;
  }
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
  .card-transition {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .goaltracker-visual-text::before {
    content: attr(data-visual-text);
  }
`;
