import { lazy } from "react";

export const WeeklyReview = lazy(async () => ({
  default: (await import("@/features/plan12week/components/WeeklyReview")).WeeklyReview,
}));

export const PlanOverview = lazy(async () => ({
  default: (await import("@/features/plan12week/components/PlanOverview")).PlanOverview,
}));

export const WeekEditor = lazy(async () => ({
  default: (await import("@/features/plan12week/components/WeekEditor")).WeekEditor,
}));
