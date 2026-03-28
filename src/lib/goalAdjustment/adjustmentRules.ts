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
    title: "Reduce Weekly Workload",
    description:
      "Capacity is currently limited. Reduce weekly workload and keep a lighter execution rhythm.",
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
    title: "Start With A Smaller Habit",
    description:
      "Readiness is low. Start with a smaller habit first, then scale into the full goal.",
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
    title: "Reduce Risk Exposure",
    description:
      "Risk is high. Identify obstacles early and prepare backup strategies before scaling effort.",
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
    title: "Adjust Goal Timing",
    description:
      "Current context is not supportive enough. Adjust timing to reduce conflicts with life priorities.",
    priority: getPriorityForDimension("context", weakestDimension),
  });
};

export const applyLowScoreRule: GoalAdjustmentRule = ({
  feasibilityScore,
}: GoalAdjustmentRuleInput) => {
  if (feasibilityScore >= 0.45) return [];

  return createSuggestion({
    type: "reduce_scope",
    title: "Recalibrate Goal Before Planning",
    description: "Consider reducing the scope of this goal or delaying the start.",
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
