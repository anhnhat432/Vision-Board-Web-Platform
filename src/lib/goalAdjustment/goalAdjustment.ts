import type { DimensionKey, DimensionScores } from "../feasibility/dimensionScore";
import { GOAL_ADJUSTMENT_RULES } from "./adjustmentRules";
import type {
  GoalAdjustmentRuleInput,
  GoalAdjustmentSuggestion,
} from "./adjustmentTypes";

const MAX_ADJUSTMENT_SUGGESTIONS = 4;

function dedupeSuggestions(
  suggestions: GoalAdjustmentSuggestion[],
): GoalAdjustmentSuggestion[] {
  const seen = new Set<string>();
  const unique: GoalAdjustmentSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = `${suggestion.type}:${suggestion.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(suggestion);
  }

  return unique;
}

function sortByPriority(
  suggestions: GoalAdjustmentSuggestion[],
): GoalAdjustmentSuggestion[] {
  return [...suggestions].sort((left, right) => right.priority - left.priority);
}

export function generateGoalAdjustments(
  dimensionScores: DimensionScores,
  feasibilityScore: number,
  weakestDimension: DimensionKey,
): GoalAdjustmentSuggestion[] {
  const ruleInput: GoalAdjustmentRuleInput = {
    dimensionScores,
    feasibilityScore,
    weakestDimension,
  };

  const suggestions = GOAL_ADJUSTMENT_RULES.flatMap((rule) => rule(ruleInput));
  const dedupedSuggestions = dedupeSuggestions(suggestions);
  const sortedSuggestions = sortByPriority(dedupedSuggestions);

  return sortedSuggestions.slice(0, MAX_ADJUSTMENT_SUGGESTIONS);
}
