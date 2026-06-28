import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { buildLoginPath } from "@/features/dashboard/helpers/dashboardNavigation";
import { PublicVisitorView } from "@/features/dashboard/v2/PublicVisitorView";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { isDemoMode } from "../utils/app-mode";
import { getUserData } from "../utils/storage";

const SignedInDashboard = lazy(() =>
  import("./Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);

const SIGNED_OUT_ROUTE_WARM_DELAY_MS = 12_000;

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
}

let loginRouteWarmPromise: Promise<unknown> | null = null;
let onboardingRouteWarmPromise: Promise<unknown> | null = null;

function warmLoginRoute(): void {
  loginRouteWarmPromise ??= import("./LoginPage").catch((error) => {
    loginRouteWarmPromise = null;
    throw error;
  });
  void loginRouteWarmPromise.catch(() => {});
}

function warmOnboardingRoute(): void {
  onboardingRouteWarmPromise ??= import("./Onboarding").catch((error) => {
    onboardingRouteWarmPromise = null;
    throw error;
  });
  void onboardingRouteWarmPromise.catch(() => {});
}

function DashboardRouteFallback() {
  return (
    <div className="min-h-screen bg-app-bg px-4 py-8 text-app-ink">
      <div className="mx-auto max-w-6xl rounded-card border border-app-line bg-app-surface p-6 shadow-app-sm">
        <p className="text-sm font-semibold text-app-ink">Đang mở trang chính...</p>
      </div>
    </div>
  );
}

function hasLocalWorkspaceData(userData: ReturnType<typeof getUserData>): boolean {
  return (
    userData.goals.length > 0 ||
    userData.currentWheelOfLife.some((area) => area.score > 0) ||
    userData.reflections.length > 0 ||
    userData.visionBoards.length > 0
  );
}

function shouldSkipBackgroundRouteWarm(): boolean {
  if (typeof window === "undefined") return true;

  const connection = (window.navigator as NavigatorWithConnection).connection;
  if (connection?.saveData) return true;
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return true;

  return window.navigator.hardwareConcurrency <= 4;
}

export function DashboardEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, user } = useAuthContext();
  const demoMode = isDemoMode();
  const [initialUserData] = useState(() => getUserData());
  const authDestination = `${location.pathname}${location.search}${location.hash}`;
  const isSignedOut = !user;
  const hasSignedOutRealLocalData = !demoMode && isSignedOut && hasLocalWorkspaceData(initialUserData);
  const warmStartRoute = demoMode ? warmOnboardingRoute : warmLoginRoute;

  useEffect(() => {
    if (!isSignedOut || typeof window === "undefined") return undefined;
    if (shouldSkipBackgroundRouteWarm()) return undefined;

    let idleHandle: number | null = null;
    const timerId = window.setTimeout(() => {
      const warmRoutes = () => {
        warmLoginRoute();
        if (demoMode) warmOnboardingRoute();
      };

      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(warmRoutes, { timeout: 3_000 });
      } else {
        warmRoutes();
      }
    }, SIGNED_OUT_ROUTE_WARM_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, [demoMode, isSignedOut]);

  const handleAuthNavigate = (mode: "signin" | "signup") => {
    navigate(buildLoginPath(mode, authDestination));
  };

  const handlePublicVisitorStart = () => {
    if (isSignedOut && !demoMode) {
      handleAuthNavigate("signup");
      return;
    }

    void import("../utils/analytics").then(({ trackAnalyticsEvent }) => {
      trackAnalyticsEvent("demo_started", {
        source: "dashboard",
        app_mode: demoMode ? "demo" : "real",
        signed_in: Boolean(user),
        auth_configured: isConfigured,
        start_destination: "onboarding",
      });
    });
    navigate("/onboarding");
  };

  if (isSignedOut) {
    return (
      <PublicVisitorView
        isDemo={demoMode}
        hasLocalData={hasSignedOutRealLocalData}
        onStart={handlePublicVisitorStart}
        onStartIntent={warmStartRoute}
        onAuthIntent={warmLoginRoute}
        onSignIn={() => handleAuthNavigate("signin")}
        onSignUp={() => handleAuthNavigate("signup")}
      />
    );
  }

  return (
    <Suspense fallback={<DashboardRouteFallback />}>
      <SignedInDashboard />
    </Suspense>
  );
}
