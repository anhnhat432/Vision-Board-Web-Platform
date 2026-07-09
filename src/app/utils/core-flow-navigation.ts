/**
 * Ánh xạ bước Core_Flow ↔ route đã đăng ký, dùng cho Primary_CTA "bước kế tiếp".
 *
 * Chỉ đọc bảng route tĩnh từ `createAppRoutes` để kiểm tra route có được đăng ký
 * hay không (Req 2.6, 2.7). KHÔNG sửa guard/route, KHÔNG side effect ngoài việc
 * dựng lại cấu trúc route (các loader lazy không được thực thi khi chỉ dựng mảng).
 */

import { createAppRoutes } from "../routes";
import { type AppMode, getAppMode } from "./app-mode";
import type { CoreFlowCompletion, CoreFlowStepId } from "./core-flow-position";
import type { UserData } from "./storage-types";

/** Route đích (đã đăng ký trong `createAppRoutes`) cho mỗi bước Core_Flow. */
export const CORE_FLOW_STEP_ROUTE: Record<CoreFlowStepId, string> = {
  life_balance: "/life-balance",
  life_insight: "/life-insight",
  smart_goal: "/smart-goal-setup",
  feasibility: "/feasibility",
  twelve_week_setup: "/12-week-setup",
  today: "/12-week-system",
};

/** Nhãn Primary_CTA khi trỏ tới từng bước (dùng khi bước đó là bước kế tiếp). */
export const CORE_FLOW_NEXT_STEP_CTA_LABEL: Record<CoreFlowStepId, string> = {
  life_balance: "Tiếp tục: Đánh giá cân bằng",
  life_insight: "Tiếp tục: Chọn trọng tâm",
  smart_goal: "Tiếp tục: Viết mục tiêu",
  feasibility: "Tiếp tục: Kiểm tra tính thực tế",
  twelve_week_setup: "Tiếp tục: Tạo kế hoạch 12 tuần",
  today: "Bắt đầu làm việc hôm nay",
};

interface RouteNode {
  path?: string;
  children?: readonly RouteNode[];
}

/**
 * Thu thập toàn bộ path tuyệt đối đã đăng ký từ `createAppRoutes(appMode)`.
 * Route index (không có `path`) được ánh xạ về prefix hiện tại.
 */
export function collectRegisteredRoutePaths(appMode: AppMode = getAppMode()): Set<string> {
  const paths = new Set<string>();

  const walk = (nodes: readonly RouteNode[], prefix: string) => {
    for (const node of nodes) {
      let full = prefix;
      if (typeof node.path === "string") {
        full = node.path.startsWith("/")
          ? node.path
          : `${prefix === "/" ? "" : prefix}/${node.path}`.replace(/\/{2,}/g, "/");
        paths.add(full === "" ? "/" : full);
      }
      if (node.children) {
        walk(node.children, full === "" ? "/" : full);
      }
    }
  };

  walk(createAppRoutes(appMode) as readonly RouteNode[], "");
  return paths;
}

/**
 * true nếu `target` (bỏ query/hash) khớp một route đã đăng ký trong
 * `createAppRoutes`. Dùng để quyết định hiển thị/ẩn Primary_CTA "next" (Req 2.7).
 */
export function isRegisteredRoute(target: string, appMode: AppMode = getAppMode()): boolean {
  const pathname = target.split(/[?#]/)[0];
  return collectRegisteredRoutePaths(appMode).has(pathname);
}

/**
 * Suy ra `CoreFlowCompletion` từ `UserData` (chỉ đọc, không side effect).
 *
 * Dùng để cấp `completion` cho `resolveCoreFlowPosition` khi hiển thị
 * Next_Step_Guidance / Primary_CTA. KHÔNG thay đổi Storage_Contract — chỉ đọc
 * các trường sẵn có (`onboardingCompleted`, `currentWheelOfLife`, `goals`).
 */
export function deriveCoreFlowCompletion(userData: UserData | null | undefined): CoreFlowCompletion {
  const hasScores = Boolean(userData?.currentWheelOfLife?.some((area) => area.score > 0));
  const goals = userData?.goals ?? [];
  const hasGoal = goals.length > 0;
  const hasFocus = hasGoal || goals.some((goal) => Boolean(goal.focusArea));
  const hasFeasibility = goals.some(
    (goal) => Boolean(goal.feasibilityResult) || typeof goal.readinessScore === "number",
  );
  const hasTwelveWeek = goals.some((goal) => Boolean(goal.twelveWeekSystem) || Boolean(goal.twelveWeekPlan));

  return {
    life_balance: Boolean(userData?.onboardingCompleted) && hasScores,
    life_insight: hasFocus,
    smart_goal: hasGoal,
    feasibility: hasFeasibility,
    twelve_week_setup: hasTwelveWeek,
    today: hasTwelveWeek,
  };
}
