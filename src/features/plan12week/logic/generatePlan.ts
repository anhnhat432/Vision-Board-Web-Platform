import type { GoalArchetype } from "@/lib/smart-goal";

import { getArchetypeFirstAction, getArchetypePlanFullDefaults } from "./planArchetypeDefaults";
import type { LeadMetric, Plan12Week, Week } from "../types/planTypes";

export interface Generate12WeekPlanInput {
  id: string;
  goal_statement: string;
}

/**
 * Light-weight feasibility hint accepted by `generate12WeekPlan` to pick
 * the right week-1 sizing. Mirrors a subset of `PlanQualityFeasibilityContext`
 * to keep the dependency direction one-way (logic module stays standalone).
 */
export interface GeneratePlanFeasibilityHint {
  planLoad?: "lighter" | "balanced" | "push";
  weeklyCapacity?: "low" | "medium" | "high";
  bottleneckAxis?: string;
}

export interface Generate12WeekPlanOptions {
  /**
   * Optional goal archetype used to seed archetype-relevant defaults:
   *   - Week 1 focus + expectedOutput
   *   - Milestone expectedOutput at weeks 4 / 8 / 12
   *   - Default lead metric suggestions (empty logs, zero targets — user refines)
   *
   * When omitted the generator returns 12 empty weeks (previous behaviour).
   */
  goalArchetype?: GoalArchetype;
  /**
   * Optional feasibility hint. When indicates low feasibility (lighter load,
   * low weekly capacity, energy/confidence bottleneck) the generator seeds
   * a smaller week-1 first action so the plan stays startable.
   */
  feasibilityHint?: GeneratePlanFeasibilityHint;
}

function isLowFeasibility(hint: GeneratePlanFeasibilityHint | undefined): boolean {
  if (!hint) return false;
  if (hint.planLoad === "lighter") return true;
  if (hint.weeklyCapacity === "low") return true;
  if (hint.bottleneckAxis === "energy" || hint.bottleneckAxis === "confidence") return true;
  return false;
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyWeek(weekNumber: number): Week {
  return {
    weekNumber,
    focus: "",
    expectedOutput: "",
    tasks: [],
    leadMetrics: [],
  };
}

function buildArchetypeLeadMetrics(
  suggestions: readonly string[],
): LeadMetric[] {
  return suggestions.map((name) => ({
    name,
    weeklyTarget: 0,
    logs: [],
  }));
}

function buildArchetypeWeeks(
  goalArchetype: GoalArchetype,
  feasibilityHint: GeneratePlanFeasibilityHint | undefined,
): Week[] {
  const defaults = getArchetypePlanFullDefaults(goalArchetype);
  const leadMetrics = buildArchetypeLeadMetrics(defaults.leadIndicatorSuggestions);
  const lowFeasibility = isLowFeasibility(feasibilityHint);
  const firstAction = getArchetypeFirstAction(goalArchetype, { lowFeasibility });

  return Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const week = createEmptyWeek(weekNumber);

    // Seed week 1 with archetype focus + expectedOutput, first action, and lead metric suggestions
    if (weekNumber === 1) {
      week.focus = defaults.weekOneFocus;
      // Surface the concrete first action so user knows what to do in next 24-48h
      week.expectedOutput = `${defaults.weekOneExpectedOutput}\n\nViệc đầu tiên: ${firstAction}`;
      week.leadMetrics = leadMetrics;
      return week;
    }

    // Seed milestone weeks with archetype templates; other weeks stay empty
    if (weekNumber === 4) {
      week.expectedOutput = defaults.milestoneTemplates.week4;
    } else if (weekNumber === 8) {
      week.expectedOutput = defaults.milestoneTemplates.week8;
    } else if (weekNumber === 12) {
      week.expectedOutput = defaults.milestoneTemplates.week12;
    }

    return week;
  });
}

export function generate12WeekPlan(
  goal: Generate12WeekPlanInput,
  options?: Generate12WeekPlanOptions,
): Plan12Week {
  const goalArchetype = options?.goalArchetype;
  const weeks = goalArchetype
    ? buildArchetypeWeeks(goalArchetype, options?.feasibilityHint)
    : Array.from({ length: 12 }, (_, index) => createEmptyWeek(index + 1));

  return {
    id: createId(),
    vision: goal.goal_statement,
    smartGoalId: goal.id,
    startDate: new Date().toISOString(),
    weeks,
  };
}

