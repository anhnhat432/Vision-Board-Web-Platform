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
      description: "Chấm Life Balance trước để dashboard có dữ liệu thật, rồi mới chọn insight và mục tiêu SMART.",
      ctaLabel: "Đánh giá cân bằng cuộc sống",
      ctaTarget: "/life-balance",
    };
  }

  if (!state.hasTwelveWeekSystem) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Tạo kế hoạch 12 tuần",
      description: "Mục tiêu đã có. Bước tiếp theo là biến nó thành cycle 12 tuần có lead indicators và lịch review.",
      ctaLabel: "Thiết lập 12 tuần",
      ctaTarget: "/12-week-setup",
    };
  }

  if (state.currentWeek && state.totalWeeks && state.currentWeek > state.totalWeeks) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Cycle đã kết thúc, review tổng",
      description: "12 tuần đã khép lại. Hãy chốt cycle review trước khi mở nhịp mới.",
      ctaLabel: "Mở Cycle Review",
      ctaTarget: "/12-week-system",
    };
  }

  if (state.reviewDueToday && !state.hasReviewedCurrentWeek) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Đến ngày review tuần",
      description: "Chốt tuần hiện tại để biết nên giữ, giảm hay điều chỉnh lead indicators cho tuần tiếp theo.",
      ctaLabel: "Mở review",
      ctaTarget: "/12-week-system?tab=week",
    };
  }

  if (state.hasOpenTodayTasks) {
    return {
      eyebrow: "Việc tiếp theo nên làm",
      title: "Có việc cốt lõi hôm nay",
      description: "Mở Today và xử lý việc quan trọng nhất trước khi nhìn sang các surface khác.",
      ctaLabel: "Mở Today",
      ctaTarget: "/12-week-system?tab=today",
    };
  }

  return {
    eyebrow: "Việc tiếp theo nên làm",
    title: state.hasReviewedCurrentWeek ? "Tiếp tục cycle" : "Mở nhịp 12 tuần",
    description: "Cycle đang ổn. Vào trung tâm 12 tuần để xem Today, tuần hiện tại và tiến độ khi cần.",
    ctaLabel: "Mở 12 tuần",
    ctaTarget: "/12-week-system",
  };
}
