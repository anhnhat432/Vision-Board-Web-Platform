import { getDimensionStatus } from "../feasibility/dimensionStatus";
import type { DimensionKey } from "../feasibility/dimensionScore";
import type {
  GoalAdjustmentPriority,
  GoalAdjustmentRule,
  GoalAdjustmentRuleInput,
  GoalAdjustmentSuggestion,
} from "./adjustmentTypes";

function getPriorityForDimension(
  ruleDimension: DimensionKey,
  weakestDimension: DimensionKey,
): GoalAdjustmentPriority {
  return weakestDimension === ruleDimension ? 3 : 2;
}

function createSuggestion(
  suggestion: GoalAdjustmentSuggestion,
): GoalAdjustmentSuggestion[] {
  return [suggestion];
}

export const applyCapacityRule: GoalAdjustmentRule = ({
  dimensionScores,
  weakestDimension,
}: GoalAdjustmentRuleInput) => {
  if (getDimensionStatus(dimensionScores.capacity) !== "weak") return [];

  return createSuggestion({
    type: "reduce_frequency",
    title: "Giảm tải tuần",
    description:
      "Sức chứa hiện tại đang thấp. Giảm tải tuần và giữ nhịp thực hiện nhẹ hơn.",
    priority: getPriorityForDimension("capacity", weakestDimension),
  });
};

export const applyReadinessRule: GoalAdjustmentRule = ({
  dimensionScores,
  weakestDimension,
}: GoalAdjustmentRuleInput) => {
  if (getDimensionStatus(dimensionScores.readiness) !== "weak") return [];

  return createSuggestion({
    type: "split_into_phases",
    title: "Bắt đầu bằng thói quen nhỏ hơn",
    description:
      "Mức sẵn sàng đang thấp. Bắt đầu bằng một thói quen nhỏ trước, rồi mở rộng dần tới mục tiêu đầy đủ.",
    priority: getPriorityForDimension("readiness", weakestDimension),
  });
};

export const applyRiskRule: GoalAdjustmentRule = ({
  dimensionScores,
  weakestDimension,
}: GoalAdjustmentRuleInput) => {
  if (getDimensionStatus(dimensionScores.risk) !== "weak") return [];

  return createSuggestion({
    type: "reduce_scope",
    title: "Giảm rủi ro",
    description:
      "Rủi ro đang cao. Nhận diện điểm cản sớm và chuẩn bị phương án dự phòng trước khi tăng sức.",
    priority: getPriorityForDimension("risk", weakestDimension),
  });
};

export const applyContextRule: GoalAdjustmentRule = ({
  dimensionScores,
  weakestDimension,
}: GoalAdjustmentRuleInput) => {
  if (getDimensionStatus(dimensionScores.context) !== "weak") return [];

  return createSuggestion({
    type: "delay_start",
    title: "Điều chỉnh thời điểm",
    description:
      "Bối cảnh hiện tại chưa đủ thuận. Điều chỉnh thời điểm để giảm xung đột với các ưu tiên cuộc sống.",
    priority: getPriorityForDimension("context", weakestDimension),
  });
};

export const applyLowScoreRule: GoalAdjustmentRule = ({
  feasibilityScore,
}: GoalAdjustmentRuleInput) => {
  if (feasibilityScore >= 0.45) return [];

  return createSuggestion({
    type: "reduce_scope",
    title: "Chỉnh lại mục tiêu trước khi lập kế hoạch",
    description: "Cân nhắc giảm phạm vi mục tiêu này hoặc lùi thời điểm bắt đầu.",
    priority: 3,
  });
};

export const GOAL_ADJUSTMENT_RULES: readonly GoalAdjustmentRule[] = [
  applyCapacityRule,
  applyReadinessRule,
  applyRiskRule,
  applyContextRule,
  applyLowScoreRule,
];
