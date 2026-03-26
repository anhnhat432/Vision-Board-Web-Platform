import type { ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
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

function RedirectToTwelveWeekSetup() {
  return <Navigate to="/12-week-setup" replace />;
}

function RedirectToTwelveWeekSystem() {
  return <Navigate to="/12-week-system" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: <AppErrorBoundary />,
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
        Component: RedirectToTwelveWeekSystem,
      },
      {
        path: "12-week-plan-setup",
        Component: RedirectToTwelveWeekSetup,
      },
      {
        path: "12-week-plan-overview",
        Component: RedirectToTwelveWeekSystem,
      },
      {
        path: "12-week-system",
        lazy: lazyComponent(() => import("./pages/12WeekSystem"), "TwelveWeekSystem"),
      },
      {
        path: "billing/mock-checkout",
        lazy: lazyComponent(() => import("./pages/MockBillingCheckout"), "MockBillingCheckout"),
      },
      {
        path: "billing/plan",
        lazy: lazyComponent(() => import("./pages/BillingPlan"), "BillingPlan"),
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
