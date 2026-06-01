import { hasScoredLifeBalance } from "./core-flow-guard";
import { APP_STORAGE_KEYS, getActiveTwelveWeekGoal } from "./storage";
import type { UserData } from "./storage-types";

const GUIDE_DISMISSED_KEY = "visionboard_new_user_guide_dismissed";
const GUIDE_SEEN_KEY = "visionboard_new_user_guide_seen_at";
const GUIDE_UPDATED_EVENT = "visionboard:new-user-guide-updated";

export type NewUserGuideStepId =
  | "dashboard_preview"
  | "goal_preview"
  | "life_balance"
  | "life_insight"
  | "smart_goal"
  | "feasibility"
  | "setup_cycle"
  | "complete_today"
  | "complete_review";

export interface NewUserGuideStep {
  id: NewUserGuideStepId;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  ctaLabel: string;
}

export interface NewUserGuideProgress {
  steps: NewUserGuideStep[];
  completedCount: number;
  totalSteps: number;
  nextStep: NewUserGuideStep | null;
  isComplete: boolean;
}

function emitGuideUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GUIDE_UPDATED_EVENT));
}

function hasLocalDraft(key: string): boolean {
  if (typeof window === "undefined") return false;
  const value = window.localStorage.getItem(key);
  return value !== null && value.trim().length > 0;
}

function getDemoGuideSteps(): NewUserGuideStep[] {
  return [
    {
      id: "dashboard_preview",
      title: "Xem Trang chính trước",
      description: "Mở Trang chính để nhìn nhanh cấu trúc web và hiểu một chu kỳ 12 tuần trông như thế nào.",
      completed: false,
      href: "/",
      ctaLabel: "Mở Trang chính",
    },
    {
      id: "goal_preview",
      title: "Mở một mục tiêu mẫu",
      description:
        "Vào màn Mục tiêu để xem cách một mục tiêu đã đi qua góc nhìn cuộc sống, mục tiêu SMART và 12 tuần được trình bày ra sao.",
      completed: false,
      href: "/goals",
      ctaLabel: "Mở mục tiêu mẫu",
    },
    {
      id: "complete_today",
      title: "Thử việc hôm nay",
      description: "Mở trung tâm 12 tuần và xem cách web trả lời câu hỏi: hôm nay tôi nên làm gì trước.",
      completed: false,
      href: "/12-week-system",
      ctaLabel: "Mở hôm nay",
    },
    {
      id: "complete_review",
      title: "Mở thử review tuần",
      description: "Chuyển sang tab Tuần để xem điểm, phần nhìn lại và cách quyết định tải cho tuần sau.",
      completed: false,
      href: "/12-week-system?tab=week",
      ctaLabel: "Mở review tuần",
    },
  ];
}

export function getNewUserGuideProgress(userData: UserData): NewUserGuideProgress {
  if (userData.isHydratedFromDemo) {
    const steps = getDemoGuideSteps();

    return {
      steps,
      completedCount: 0,
      totalSteps: steps.length,
      nextStep: steps[0] ?? null,
      isComplete: false,
    };
  }

  const activeGoal = getActiveTwelveWeekGoal(userData.goals);
  const activeSystem = activeGoal?.twelveWeekSystem ?? null;
  const hasCycle = Boolean(activeSystem);
  const hasLifeBalance = hasScoredLifeBalance(userData) || hasCycle;
  const hasAnyGoal = userData.goals.length > 0;
  const hasInsight = hasCycle || (hasLifeBalance && (hasAnyGoal || hasLocalDraft(APP_STORAGE_KEYS.selectedFocusArea)));
  const hasSmartGoal = hasCycle || (hasInsight && (hasAnyGoal || hasLocalDraft(APP_STORAGE_KEYS.pendingSmartGoal)));
  const hasFeasibility =
    hasCycle || (hasSmartGoal && (hasAnyGoal || hasLocalDraft(APP_STORAGE_KEYS.pendingFeasibilityResult)));
  const hasTouchedToday =
    hasCycle &&
    (Boolean(activeSystem?.dailyCheckIns.length) ||
      Boolean(activeSystem?.taskInstances.some((task) => task.completed)));

  const steps: NewUserGuideStep[] = [
    {
      id: "life_balance",
      title: "Đánh giá Cân bằng cuộc sống",
      description: "Chấm điểm 8 lĩnh vực để biết hiện tại mình đang lệch ở đâu và nên ưu tiên nơi nào.",
      completed: hasLifeBalance,
      href: "/onboarding",
      ctaLabel: "Đánh giá cân bằng",
    },
    {
      id: "life_insight",
      title: "Chọn góc nhìn cuộc sống",
      description: "Dùng dữ liệu Cân bằng cuộc sống để chọn một lĩnh vực trọng tâm, thay vì bắt đầu từ cảm hứng mơ hồ.",
      completed: hasInsight,
      href: "/life-insight",
      ctaLabel: "Chọn trọng tâm",
    },
    {
      id: "smart_goal",
      title: "Viết mục tiêu SMART",
      description: "Biến trọng tâm đó thành mục tiêu có kết quả, chỉ số đo, thời gian và lý do rõ ràng.",
      completed: hasSmartGoal,
      href: hasInsight ? "/smart-goal-setup" : "/life-insight",
      ctaLabel: hasInsight ? "Viết mục tiêu SMART" : "Chọn trọng tâm trước",
    },
    {
      id: "feasibility",
      title: "Kiểm tra tính khả thi",
      description: "Đo mức sẵn sàng trước khi dựng kế hoạch, để mục tiêu không quá nặng so với lịch sống hiện tại.",
      completed: hasFeasibility,
      href: hasSmartGoal ? "/feasibility" : "/smart-goal-setup",
      ctaLabel: hasSmartGoal ? "Kiểm tra khả thi" : "Viết mục tiêu SMART trước",
    },
    {
      id: "setup_cycle",
      title: "Chốt chu kỳ 12 tuần",
      description:
        "Biến mục tiêu đó thành một chu kỳ có kết quả, việc lặp lại, chỉ số, tuần đầu và ngày review rõ ràng.",
      completed: hasCycle,
      href: hasFeasibility ? "/12-week-setup" : "/feasibility",
      ctaLabel: hasFeasibility ? "Tạo kế hoạch 12 tuần" : "Kiểm tra khả thi trước",
    },
    {
      id: "complete_today",
      title: "Chạm việc đầu tiên hôm nay",
      description: "Mở trung tâm 12 tuần, tick ít nhất một việc hoặc chốt check-in để tuần bắt đầu có nhịp.",
      completed: hasTouchedToday,
      href: "/12-week-system",
      ctaLabel: "Mở hôm nay",
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const nextStep = steps.find((step) => !step.completed) ?? null;

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    nextStep,
    isComplete: completedCount === steps.length,
  };
}

export function isNewUserGuideDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GUIDE_DISMISSED_KEY) === "true";
}

export function dismissNewUserGuide(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUIDE_DISMISSED_KEY, "true");
  emitGuideUpdate();
}

export function restoreNewUserGuide(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUIDE_DISMISSED_KEY);
  emitGuideUpdate();
}

export function hasSeenNewUserGuide(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(GUIDE_SEEN_KEY));
}

export function markNewUserGuideSeen(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUIDE_SEEN_KEY, new Date().toISOString());
  emitGuideUpdate();
}

export function subscribeToNewUserGuideChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(GUIDE_UPDATED_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(GUIDE_UPDATED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
