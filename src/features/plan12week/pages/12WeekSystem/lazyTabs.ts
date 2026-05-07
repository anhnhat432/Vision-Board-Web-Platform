import { lazy } from "react";
import { loadWithChunkReload } from "@/app/utils/chunkLoad";

export const WeeklyReview = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("@/features/plan12week/components/WeeklyReview")).WeeklyReview,
  })),
);

export const PlanOverview = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("@/features/plan12week/components/PlanOverview")).PlanOverview,
  })),
);

export const WeekEditor = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("@/features/plan12week/components/WeekEditor")).WeekEditor,
  })),
);
