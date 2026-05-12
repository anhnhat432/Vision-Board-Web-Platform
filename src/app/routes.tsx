import type { ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootLayout } from "./components/RootLayout";
import { loadWithChunkReload } from "./utils/chunkLoad";

function lazyComponent<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return async () => {
    const module = await loadWithChunkReload(loader);
    return {
      Component: module[exportName] as ComponentType,
    };
  };
}

function RouteHydrateFallback() {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-6 py-12" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-[var(--r-control)] border border-slate-200 bg-white/90 p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Dear Our Future</p>
        <p className="mt-3 text-base font-semibold text-slate-900">Đang mở trang...</p>
      </div>
    </div>
  );
}

function lazyRoute<TModule extends Record<string, unknown>>(loader: () => Promise<TModule>, exportName: keyof TModule) {
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

function RedirectToBillingPlan() {
  return <Navigate to="/billing/plan" replace />;
}

function RedirectToAdminOrders() {
  return <Navigate to="/admin/orders" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    ...lazyRoute(() => import("./pages/LoginPage"), "LoginPage"),
  },
  {
    path: "/admin",
    Component: AdminLayout,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        index: true,
        Component: RedirectToAdminOrders,
      },
      {
        path: "orders",
        ...lazyRoute(() => import("./pages/AdminOrdersPage"), "AdminOrdersPage"),
      },
    ],
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
        path: "vision",
        ...lazyRoute(() => import("./pages/AspirationalVision"), "AspirationalVision"),
      },
      {
        path: "12-week-setup",
        ...lazyRoute(() => import("../features/plan12week/pages/12WeekSetup.tsx"), "TwelveWeekSetup"),
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
        children: [
          {
            index: true,
            ...lazyRoute(() => import("../features/plan12week/pages/12WeekSystem.tsx"), "TwelveWeekSystem"),
          },
          {
            path: "settings",
            ...lazyRoute(() => import("../features/plan12week/pages/12WeekSystemSettings"), "TwelveWeekSystemSettings"),
          },
        ],
      },
      {
        path: "billing/mock-checkout",
        ...lazyRoute(() => import("./pages/MockBillingCheckout"), "MockBillingCheckout"),
      },
      {
        path: "billing",
        Component: RedirectToBillingPlan,
      },
      {
        path: "account/billing",
        Component: RedirectToBillingPlan,
      },
      {
        path: "billing/plan",
        ...lazyRoute(() => import("./pages/BillingPlan"), "BillingPlan"),
      },
      {
        path: "billing/checkout/:orderId?",
        ...lazyRoute(() => import("./pages/BillingCheckoutQR"), "BillingCheckoutQR"),
      },
      {
        path: "settings",
        ...lazyRoute(() => import("./pages/SettingsPage"), "SettingsPage"),
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
