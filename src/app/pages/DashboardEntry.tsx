import { lazy, Suspense, useState } from "react";
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

export function DashboardEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, user } = useAuthContext();
  const demoMode = isDemoMode();
  const [initialUserData] = useState(() => getUserData());
  const authDestination = `${location.pathname}${location.search}${location.hash}`;
  const isSignedOut = !user;
  const hasSignedOutRealLocalData = !demoMode && isSignedOut && hasLocalWorkspaceData(initialUserData);

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
