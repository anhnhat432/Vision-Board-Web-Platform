import type { DimensionKey, DimensionScores } from "../feasibility/dimensionScore";

export type AdjustmentType =
  | "reduce_scope"
  | "reduce_frequency"
  | "delay_start"
  | "split_into_phases";

export type GoalAdjustmentPriority = 1 | 2 | 3;

export interface GoalAdjustmentSuggestion {
  type: AdjustmentType;
  title: string;
  description: string;
  priority: GoalAdjustmentPriority;
}

export interface GoalAdjustmentRuleInput {
  dimensionScores: DimensionScores;
  feasibilityScore: number;
  weakestDimension: DimensionKey;
}

export type GoalAdjustmentRule = (
  input: GoalAdjustmentRuleInput,
) => GoalAdjustmentSuggestion[];
