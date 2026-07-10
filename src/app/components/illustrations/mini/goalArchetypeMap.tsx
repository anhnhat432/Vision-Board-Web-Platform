import { BookOpen, HeartPulse, type LucideIcon, Palette, Repeat, TrendingUp, Users } from "lucide-react";

type GoalArchetypeIconComponent = LucideIcon;

const GOAL_ARCHETYPE_ICON_MAP: Record<string, GoalArchetypeIconComponent> = {
  skill_learning: BookOpen,
  exam_study: BookOpen,
  health_fitness: HeartPulse,
  career_growth: TrendingUp,
  financial_goal: TrendingUp,
  project_completion: Palette,
  creative_output: Palette,
  habit_building: Repeat,
  relationship_life: Users,
  other: Repeat,
  "skill learning": BookOpen,
  "exam / study": BookOpen,
  education: BookOpen,
  "fitness / health": HeartPulse,
  health: HeartPulse,
  "career / job search": TrendingUp,
  career: TrendingUp,
  "finance / saving": TrendingUp,
  finance: TrendingUp,
  "project completion": Palette,
  "habit building": Repeat,
  "personal growth": Repeat,
  relationships: Users,
  relationship: Users,
  family: Users,
  leisure: Palette,
};

export function getGoalArchetypeIcon(archetype: string | null | undefined): GoalArchetypeIconComponent {
  const key = String(archetype ?? "")
    .trim()
    .toLowerCase();
  return GOAL_ARCHETYPE_ICON_MAP[key] ?? Repeat;
}
