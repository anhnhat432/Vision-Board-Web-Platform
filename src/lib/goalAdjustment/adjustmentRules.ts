import type { DimensionKey } from "../feasibility/dimensionScore";
import { getDimensionStatus } from "../feasibility/dimensionStatus";
import type {
  GoalAdjustmentPriority,
  GoalAdjustmentRule,
  GoalAdjustmentRuleInput,
  GoalAdjustmentSuggestion,
} from "./adjustmentTypes";

function getPriorityForDimension(ruleDimension: DimensionKey, weakestDimension: DimensionKey): GoalAdjustmentPriority {
  return weakestDimension === ruleDimension ? 3 : 2;
}

function createSuggestion(suggestion: GoalAdjustmentSuggestion): GoalAdjustmentSuggestion[] {
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
    description: "Quỹ thời gian đang hạn chế. Giảm tải tuần và giữ nhịp nhẹ hơn.",
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
    description: "Mức sẵn sàng còn thấp. Bắt đầu bằng thói quen nhỏ trước, rồi mở rộng dần thành mục tiêu đầy đủ.",
    priority: getPriorityForDimension("readiness", weakestDimension),
  });
};

export const applyRiskRule: GoalAdjustmentRule = ({ dimensionScores, weakestDimension }: GoalAdjustmentRuleInput) => {
  if (getDimensionStatus(dimensionScores.risk) !== "weak") return [];

  return createSuggestion({
    type: "reduce_scope",
    title: "Giảm rủi ro",
    description: "Rủi ro đang cao. Nhận diện điểm cản sớm và chuẩn bị phương án dự phòng trước khi tăng sức.",
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
    title: "Điều chỉnh thời điểm mục tiêu",
    description: "Bối cảnh hiện tại chưa thuận. Đổi thời điểm để tránh xung đột với ưu tiên khác trong cuộc sống.",
    priority: getPriorityForDimension("context", weakestDimension),
  });
};

export const applyLowScoreRule: GoalAdjustmentRule = ({ feasibilityScore }: GoalAdjustmentRuleInput) => {
  if (feasibilityScore >= 0.45) return [];

  return createSuggestion({
    type: "reduce_scope",
    title: "Cân chỉnh lại mục tiêu trước khi lên kế hoạch",
    description: "Cân nhắc thu hẹp phạm vi mục tiêu hoặc dời thời điểm bắt đầu.",
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
