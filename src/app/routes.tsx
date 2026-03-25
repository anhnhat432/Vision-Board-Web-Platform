import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";

function lazyComponent<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return async () => {
    const module = await loader();
    return {
      Component: module[exportName] as ComponentType,
    };
  };
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        lazy: lazyComponent(() => import("./pages/Dashboard"), "Dashboard"),
      },
      {
        path: "onboarding",
        lazy: lazyComponent(() => import("./pages/Onboarding"), "Onboarding"),
      },
      {
        path: "life-insight",
        lazy: lazyComponent(() => import("./pages/LifeInsight"), "LifeInsight"),
      },
      {
        path: "feasibility",
        lazy: lazyComponent(() => import("./pages/FeasibilityCheck"), "FeasibilityCheck"),
      },
      {
        path: "smart-goal-setup",
        lazy: lazyComponent(() => import("./pages/SMARTGoalSetup"), "SMARTGoalSetup"),
      },
      {
        path: "12-week-setup",
        lazy: lazyComponent(() => import("./pages/12WeekSetup"), "TwelveWeekSetup"),
      },
      {
        path: "12-week-dashboard",
        lazy: lazyComponent(() => import("./pages/12WeekDashboard"), "TwelveWeekDashboard"),
      },
      {
        path: "12-week-plan-setup",
        lazy: lazyComponent(() => import("./pages/12WeekPlanSetup"), "TwelveWeekPlanSetup"),
      },
      {
        path: "12-week-plan-overview",
        lazy: lazyComponent(() => import("./pages/12WeekPlanOverview"), "TwelveWeekPlanOverview"),
      },
      {
        path: "12-week-system",
        lazy: lazyComponent(() => import("./pages/12WeekSystem"), "TwelveWeekSystem"),
      },
      {
        path: "vision-board/:id?",
        lazy: lazyComponent(() => import("./pages/VisionBoardEditor"), "VisionBoardEditor"),
      },
      {
        path: "goals",
        lazy: lazyComponent(() => import("./pages/GoalTracker"), "GoalTracker"),
      },
      {
        path: "life-balance",
        lazy: lazyComponent(() => import("./pages/LifeBalance"), "LifeBalance"),
      },
      {
        path: "achievements",
        lazy: lazyComponent(() => import("./pages/Achievements"), "Achievements"),
      },
      {
        path: "journal",
        lazy: lazyComponent(() => import("./pages/ReflectionJournal"), "ReflectionJournal"),
      },
      {
        path: "gallery",
        lazy: lazyComponent(() => import("./pages/VisionBoardGallery"), "VisionBoardGallery"),
      },
    ],
  },
]);
