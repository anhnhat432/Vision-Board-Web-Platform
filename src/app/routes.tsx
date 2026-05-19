import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootLayout } from "./components/RootLayout";
import { loadWithChunkReload } from "./utils/chunkLoad";

function lazyComponent<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return async () => {
    const module = await loadWithChunkReload(loader);
    return { Component: module[exportName] as ComponentType };
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

const TwelveWeekSystemPage = lazy(async () => {
  const mod = await loadWithChunkReload(() => import("./pages/12WeekSystem"));
  return { default: mod.TwelveWeekSystem };
});

function TwelveWeekSystemRoute() {
  return (
    <Suspense fallback={<RouteHydrateFallback />}>
      <TwelveWeekSystemPage />
    </Suspense>
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

export const appRoutes = [
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
        path: "terms",
        ...lazyRoute(() => import("./pages/TermsPage"), "TermsPage"),
      },
      {
        path: "privacy",
        ...lazyRoute(() => import("./pages/PrivacyPage"), "PrivacyPage"),
      },
      {
        path: "refund-policy",
        ...lazyRoute(() => import("./pages/RefundPolicyPage"), "RefundPolicyPage"),
      },
      {
        path: "settings",
        ...lazyRoute(() => import("./pages/SettingsPage"), "SettingsPage"),
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
        path: "12-week-setup-lab",
        ...lazyRoute(() => import("./pages/12WeekSetupLab"), "TwelveWeekSetupLab"),
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
        Component: TwelveWeekSystemRoute,
      },
      {
        path: "today-v2",
        ...lazyRoute(() => import("./pages/TodayV2/TodayV2Page"), "TodayV2Page"),
      },
      {
        path: "billing",
        Component: RedirectToBillingPlan,
      },
      {
        path: "billing/confirm",
        ...lazyRoute(() => import("./pages/BillingConfirm"), "BillingConfirm"),
      },
      {
        path: "billing/checkout/:orderId?",
        ...lazyRoute(() => import("./pages/BillingCheckoutQR"), "BillingCheckoutQR"),
      },
      {
        path: "billing/plan",
        ...lazyRoute(() => import("./pages/BillingPlan"), "BillingPlan"),
      },
      {
        path: "billing/faq",
        ...lazyRoute(() => import("./pages/BillingFAQPage"), "BillingFAQPage"),
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
];

export const router = createBrowserRouter(appRoutes);
