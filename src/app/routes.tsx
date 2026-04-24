import type { ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
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

function RouteHydrateFallback() {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-6 py-12" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white/90 p-6 text-center shadow-[0_18px_44px_-34px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Dear Our Future</p>
        <p className="mt-3 text-base font-semibold text-slate-900">Đang mở trang...</p>
      </div>
    </div>
  );
}

function lazyRoute<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return {
    lazy: lazyComponent(loader, exportName),
    HydrateFallback: RouteHydrateFallback,
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
    path: "/login",
    ...lazyRoute(() => import("./pages/LoginPage"), "LoginPage"),
  },
  {
    path: "/",
    Component: RootLayout,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        index: true,
        ...lazyRoute(() => import("./pages/Dashboard"), "Dashboard"),
      },
      {
        path: "onboarding",
        ...lazyRoute(() => import("./pages/Onboarding"), "Onboarding"),
      },
      {
        path: "life-insight",
        ...lazyRoute(() => import("./pages/LifeInsight"), "LifeInsight"),
      },
      {
        path: "feasibility",
        ...lazyRoute(() => import("./pages/FeasibilityCheck"), "FeasibilityCheck"),
      },
      {
        path: "smart-goal-setup",
        ...lazyRoute(() => import("./pages/SMARTGoalSetup"), "SMARTGoalSetup"),
      },
      {
        path: "12-week-setup",
        ...lazyRoute(() => import("./pages/12WeekSetup"), "TwelveWeekSetup"),
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
        ...lazyRoute(() => import("./pages/12WeekSystem"), "TwelveWeekSystem"),
      },
      {
        path: "billing/mock-checkout",
        ...lazyRoute(() => import("./pages/MockBillingCheckout"), "MockBillingCheckout"),
      },
      {
        path: "billing/plan",
        ...lazyRoute(() => import("./pages/BillingPlan"), "BillingPlan"),
      },
      {
        // Protected routes — require authentication
        Component: ProtectedRoute,
        children: [
          {
            path: "order",
            ...lazyRoute(() => import("./pages/OrderPage"), "OrderPage"),
          },
          {
            path: "order-status/:orderId?",
            ...lazyRoute(() => import("./pages/OrderStatusPage"), "OrderStatusPage"),
          },
        ],
      },
      {
        path: "vision-board/:id?",
        ...lazyRoute(() => import("./pages/VisionBoardEditor"), "VisionBoardEditor"),
      },
      {
        path: "admin/orders",
        ...lazyRoute(() => import("./pages/AdminOrdersPage"), "AdminOrdersPage"),
      },
      {
        path: "goals",
        ...lazyRoute(() => import("./pages/GoalTracker"), "GoalTracker"),
      },
      {
        path: "life-balance",
        ...lazyRoute(() => import("./pages/LifeBalance"), "LifeBalance"),
      },
      {
        path: "achievements",
        ...lazyRoute(() => import("./pages/Achievements"), "Achievements"),
      },
      {
        path: "journal",
        ...lazyRoute(() => import("./pages/ReflectionJournal"), "ReflectionJournal"),
      },
      {
        path: "gallery",
        ...lazyRoute(() => import("./pages/VisionBoardGallery"), "VisionBoardGallery"),
      },
    ],
  },
]);
