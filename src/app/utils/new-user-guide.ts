import { getActiveTwelveWeekGoal } from "./storage";
import type { UserData } from "./storage-types";

const GUIDE_DISMISSED_KEY = "visionboard_new_user_guide_dismissed";
const GUIDE_SEEN_KEY = "visionboard_new_user_guide_seen_at";
const GUIDE_UPDATED_EVENT = "visionboard:new-user-guide-updated";

export type NewUserGuideStepId = "create_goal" | "setup_cycle" | "complete_today" | "complete_review";

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

function getDemoGuideSteps(): NewUserGuideStep[] {
  return [
    {
      id: "create_goal",
      title: "Xem bảng điều khiển trước",
      description: "Mở bảng điều khiển để nhìn nhanh cấu trúc app và hiểu một chu kỳ 12 tuần trông như thế nào.",
      completed: false,
      href: "/",
      ctaLabel: "Mở bảng điều khiển",
    },
    {
      id: "setup_cycle",
      title: "Mở một mục tiêu mẫu",
      description:
        "Vào màn Mục tiêu để xem cách một mục tiêu đã đi qua insight, SMART và 12 tuần được biểu diễn ra sao.",
      completed: false,
      href: "/goals",
      ctaLabel: "Mở mục tiêu mẫu",
    },
    {
      id: "complete_today",
      title: "Thử hàng việc hôm nay",
      description: "Mở trung tâm 12 tuần và xem cách app trả lời câu hỏi: hôm nay tôi nên làm gì trước.",
      completed: false,
      href: "/12-week-system",
      ctaLabel: "Mở hôm nay",
    },
    {
      id: "complete_review",
      title: "Mở thử review tuần",
      description: "Chuyển sang tab Tuần để xem score, reflection và cách quyết định tải cho tuần sau.",
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
  const hasAnyGoal = userData.goals.length > 0;
  const hasCycle = Boolean(activeSystem);
  const hasTouchedToday =
    Boolean(activeSystem?.dailyCheckIns.length) ||
    Boolean(activeSystem?.taskInstances.some((task) => task.completed));
  const hasWeeklyReview = Boolean(activeSystem?.weeklyReviews.length);

  const steps: NewUserGuideStep[] = [
    {
      id: "create_goal",
      title: "Tạo mục tiêu đầu tiên",
      description: "Bắt đầu từ insight, rồi qua SMART và feasibility để mục tiêu rõ và đủ khả thi.",
      completed: hasAnyGoal,
      href: "/life-insight",
      ctaLabel: "Tạo mục tiêu",
    },
    {
      id: "setup_cycle",
      title: "Chốt chu kỳ 12 tuần",
      description: "Biến mục tiêu đó thành một chu kỳ có tactic, tuần đầu và ngày review rõ ràng.",
      completed: hasCycle,
      href: hasAnyGoal ? "/goals" : "/life-insight",
      ctaLabel: hasAnyGoal ? "Mở mục tiêu" : "Đi vào flow",
    },
    {
      id: "complete_today",
      title: "Chạm việc đầu tiên hôm nay",
      description: "Mở trung tâm 12 tuần, tick ít nhất một việc hoặc chốt check-in để tuần bắt đầu có nhịp.",
      completed: hasTouchedToday,
      href: "/12-week-system",
      ctaLabel: "Mở hôm nay",
    },
    {
      id: "complete_review",
      title: "Chốt một review tuần",
      description: "Cuối tuần review lại score, điều gì bị lệch và tuần sau nên giữ, giảm hay tăng tải.",
      completed: hasWeeklyReview,
      href: "/12-week-system?tab=week",
      ctaLabel: "Mở review tuần",
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
