/**
 * Pure helper phân giải vị trí người dùng trong Core_Flow.
 *
 * Chỉ suy luận từ `completion` (các cờ boolean) và `currentStepId`. Helper này
 * KHÔNG import storage, KHÔNG đọc/ghi localStorage, KHÔNG side effect — nhằm
 * giữ nó thuần (pure) để test được bằng property-based testing.
 *
 * Dùng chung cho Dashboard (Next_Step_Guidance) và từng màn hình Core_Flow
 * (hiển thị "bước M / N" và Primary_CTA trỏ bước kế tiếp).
 */

/** Định danh các bước Core_Flow theo đúng thứ tự ưu tiên sản phẩm. */
export type CoreFlowStepId =
  | "life_balance"
  | "life_insight"
  | "smart_goal"
  | "feasibility"
  | "twelve_week_setup"
  | "today";

/** Cờ hoàn tất cho từng bước Core_Flow. */
export interface CoreFlowCompletion {
  life_balance: boolean;
  life_insight: boolean;
  smart_goal: boolean;
  feasibility: boolean;
  twelve_week_setup: boolean;
  today: boolean;
}

export interface CoreFlowPosition {
  /** Bước chưa hoàn tất đầu tiên theo thứ tự Core_Flow, hoặc null nếu đã xong hết. */
  firstIncompleteStepId: CoreFlowStepId | null;
  /** Vị trí hiện tại 1-based để render "bước M / N". */
  stepNumber: number;
  totalSteps: number;
  /** Bước kế tiếp của `currentStepId`, hoặc null nếu là bước cuối. */
  nextStepId: CoreFlowStepId | null;
}

/**
 * Thứ tự Core_Flow, là nguồn chân lý duy nhất cho `stepNumber`, `totalSteps`,
 * `nextStepId`, và thứ tự dò `firstIncompleteStepId`.
 */
export const CORE_FLOW_STEP_ORDER: readonly CoreFlowStepId[] = [
  "life_balance",
  "life_insight",
  "smart_goal",
  "feasibility",
  "twelve_week_setup",
  "today",
] as const;

/**
 * Phân giải vị trí Core_Flow từ bước hiện tại và trạng thái hoàn tất.
 *
 * - `firstIncompleteStepId`: bước `false` đầu tiên theo thứ tự `CORE_FLOW_STEP_ORDER`,
 *   hoặc `null` khi tất cả bước đã `true`.
 * - `stepNumber`: chỉ số 1-based của `currentStepId` trong `[1, totalSteps]`.
 * - `totalSteps`: tổng số bước Core_Flow.
 * - `nextStepId`: bước liền sau `currentStepId`, hoặc `null` khi `currentStepId`
 *   là bước cuối.
 */
export function resolveCoreFlowPosition(
  currentStepId: CoreFlowStepId,
  completion: CoreFlowCompletion,
): CoreFlowPosition {
  const totalSteps = CORE_FLOW_STEP_ORDER.length;
  const currentIndex = CORE_FLOW_STEP_ORDER.indexOf(currentStepId);

  const firstIncompleteStepId =
    CORE_FLOW_STEP_ORDER.find((stepId) => !completion[stepId]) ?? null;

  const isLastStep = currentIndex === totalSteps - 1;
  const nextStepId = isLastStep ? null : CORE_FLOW_STEP_ORDER[currentIndex + 1];

  return {
    firstIncompleteStepId,
    stepNumber: currentIndex + 1,
    totalSteps,
    nextStepId,
  };
}
