import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootLayout } from "./components/RootLayout";
import { Achievements } from "./pages/Achievements";
import { BillingCheckoutQR } from "./pages/BillingCheckoutQR";
import { BillingPlan } from "./pages/BillingPlan";
import { Dashboard } from "./pages/Dashboard";
import { GoalTracker } from "./pages/GoalTracker";
import { ReflectionJournal } from "./pages/ReflectionJournal";
import { VisionBoardEditor } from "./pages/VisionBoardEditor";
import { VisionBoardGallery } from "./pages/VisionBoardGallery";

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

const TwelveWeekSystemPage = lazy(async () => ({
  default: (await import("./pages/12WeekSystem")).TwelveWeekSystem,
}));

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
        Component: Dashboard,
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
        path: "billing/confirm",
        ...lazyRoute(() => import("./pages/BillingConfirm"), "BillingConfirm"),
      },
      {
        path: "billing/checkout/:orderId?",
        Component: BillingCheckoutQR,
      },
      {
        path: "billing/mock-checkout",
        ...lazyRoute(() => import("./pages/MockBillingCheckout"), "MockBillingCheckout"),
      },
      {
        path: "billing/plan",
        Component: BillingPlan,
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
        Component: VisionBoardEditor,
      },
      {
        path: "admin/orders",
        ...lazyRoute(() => import("./pages/AdminOrdersPage"), "AdminOrdersPage"),
      },
      {
        path: "goals",
        Component: GoalTracker,
      },
      {
        path: "life-balance",
        ...lazyRoute(() => import("./pages/LifeBalance"), "LifeBalance"),
      },
      {
        path: "achievements",
        Component: Achievements,
      },
      {
        path: "journal",
        Component: ReflectionJournal,
      },
      {
        path: "gallery",
        Component: VisionBoardGallery,
      },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
