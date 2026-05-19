import type { ComponentType } from "react";

import type { AmbientIllustrationProps } from "../utils";
import {
  GoalArchetypeCreativeIcon,
  GoalArchetypeFinancialIcon,
  GoalArchetypeHabitIcon,
  GoalArchetypeHealthIcon,
  GoalArchetypeLearningIcon,
  GoalArchetypeRelationshipIcon,
} from "./PhaseAndArchetypeIcons";

type GoalArchetypeIconComponent = ComponentType<AmbientIllustrationProps>;

const GOAL_ARCHETYPE_ICON_MAP: Record<string, GoalArchetypeIconComponent> = {
  skill_learning: GoalArchetypeLearningIcon,
  exam_study: GoalArchetypeLearningIcon,
  health_fitness: GoalArchetypeHealthIcon,
  career_growth: GoalArchetypeFinancialIcon,
  financial_goal: GoalArchetypeFinancialIcon,
  project_completion: GoalArchetypeCreativeIcon,
  creative_output: GoalArchetypeCreativeIcon,
  habit_building: GoalArchetypeHabitIcon,
  relationship_life: GoalArchetypeRelationshipIcon,
  other: GoalArchetypeHabitIcon,
  "skill learning": GoalArchetypeLearningIcon,
  "exam / study": GoalArchetypeLearningIcon,
  education: GoalArchetypeLearningIcon,
  "fitness / health": GoalArchetypeHealthIcon,
  health: GoalArchetypeHealthIcon,
  "career / job search": GoalArchetypeFinancialIcon,
  career: GoalArchetypeFinancialIcon,
  "finance / saving": GoalArchetypeFinancialIcon,
  finance: GoalArchetypeFinancialIcon,
  "project completion": GoalArchetypeCreativeIcon,
  "habit building": GoalArchetypeHabitIcon,
  "personal growth": GoalArchetypeHabitIcon,
  relationships: GoalArchetypeRelationshipIcon,
  relationship: GoalArchetypeRelationshipIcon,
  family: GoalArchetypeRelationshipIcon,
  leisure: GoalArchetypeCreativeIcon,
};

export function getGoalArchetypeIcon(archetype: string | null | undefined): GoalArchetypeIconComponent {
  const key = String(archetype ?? "")
    .trim()
    .toLowerCase();
  return GOAL_ARCHETYPE_ICON_MAP[key] ?? GoalArchetypeHabitIcon;
}
