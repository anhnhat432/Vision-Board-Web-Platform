import type { CoreFlowStepId } from "@/app/utils/core-flow-position";

type DashboardNextActionInput = {
  hasGoal: boolean;
  hasTwelveWeekSystem: boolean;
  reviewDueToday: boolean;
  hasOpenTodayTasks: boolean;
  hasReviewedCurrentWeek: boolean;
  currentWeek: number | null;
  totalWeeks: number | null;
};

export type DashboardNextAction = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTarget: string;
};

export function getDashboardNextAction(state: DashboardNextActionInput): DashboardNextAction {
  if (!state.hasGoal) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Bắt đầu hành trình",
      description:
        "Chấm Cân bằng cuộc sống trước để Trang chính có dữ liệu thật, rồi mới chọn góc nhìn và mục tiêu SMART.",
      ctaLabel: "Đánh giá cân bằng cuộc sống",
      ctaTarget: "/life-balance",
    };
  }

  if (!state.hasTwelveWeekSystem) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Tạo kế hoạch 12 tuần",
      description: "Mục tiêu đã có. Bước tiếp theo là biến nó thành chu kỳ 12 tuần có việc lặp lại và lịch review.",
      ctaLabel: "Thiết lập 12 tuần",
      ctaTarget: "/12-week-setup",
    };
  }

  if (state.currentWeek && state.totalWeeks && state.currentWeek > state.totalWeeks) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Chu kỳ đã kết thúc, review tổng",
      description: "12 tuần đã khép lại. Hãy chốt review chu kỳ trước khi mở nhịp mới.",
      ctaLabel: "Mở review chu kỳ",
      ctaTarget: "/12-week-system",
    };
  }

  if (state.reviewDueToday && !state.hasReviewedCurrentWeek) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Đến ngày review tuần",
      description: "Chốt tuần hiện tại để biết nên giữ, giảm hay điều chỉnh việc lặp lại cho tuần tiếp theo.",
      ctaLabel: "Mở review",
      ctaTarget: "/12-week-system?tab=week",
    };
  }

  if (state.hasOpenTodayTasks) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Có việc cốt lõi hôm nay",
      description: "Mở Hôm nay và xử lý việc quan trọng nhất trước khi nhìn sang các khu vực khác.",
      ctaLabel: "Mở Hôm nay",
      ctaTarget: "/12-week-system?tab=today",
    };
  }

  return {
    eyebrow: "Việc tiếp theo nên làm",
    title: state.hasReviewedCurrentWeek ? "Tiếp tục chu kỳ" : "Mở nhịp 12 tuần",
    description: "Chu kỳ đang ổn. Vào trung tâm 12 tuần để xem Hôm nay, tuần hiện tại và tiến độ khi cần.",
    ctaLabel: "Mở 12 tuần",
    ctaTarget: "/12-week-system",
  };
}

/**
 * Nối Next_Step_Guidance của Dashboard với vị trí Core_Flow.
 *
 * Tái sử dụng `getDashboardNextAction` (giữ nguyên copy/eyebrow/title) rồi tinh
 * chỉnh `ctaTarget` để trỏ đúng **bước Core_Flow chưa hoàn tất đầu tiên** theo
 * thứ tự Core_Flow (Req 2.1). Chỉ ghi đè target khi route đó đã được đăng ký
 * trong `createAppRoutes` (Req 2.6) — nếu không, giữ nguyên target gốc của
 * `getDashboardNextAction` để không bao giờ trỏ tới route chưa đăng ký/bị guard.
 *
 * Hàm thuần (không import storage/routes) — nhận `stepRoute` và
 * `isRouteRegistered` qua tham số để dễ test và tránh phụ thuộc vòng.
 */
export function resolveDashboardNextStepGuidance(params: {
  baseAction: DashboardNextAction;
  firstIncompleteStepId: CoreFlowStepId | null;
  stepRoute: Record<CoreFlowStepId, string>;
  isRouteRegistered: (target: string) => boolean;
}): DashboardNextAction {
  const { baseAction, firstIncompleteStepId, stepRoute, isRouteRegistered } = params;

  // Không còn bước nào chưa hoàn tất (đã qua toàn bộ Core_Flow) → giữ guidance gốc.
  if (!firstIncompleteStepId) return baseAction;

  const target = stepRoute[firstIncompleteStepId];
  if (!target || !isRouteRegistered(target)) return baseAction;

  return { ...baseAction, ctaTarget: target };
}
