import {
  ChevronDown,
  ChevronRight,
  Compass,
  CreditCard,
  Facebook,
  FileText,
  HardDrive,
  HelpCircle,
  Instagram,
  LogIn,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Sun,
  User2,
  X,
} from "lucide-react";
import { lazy, Suspense, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router";
import { AssistantPageContextProvider } from "@/app/features/assistant/AssistantPageContextProvider";
import { AutoCloudSyncProvider } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import {
  createTwelveWeekImportPayload,
  type TwelveWeekImportPayload,
} from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  post12WeekImport,
  post12WeekImportValidation,
  type TwelveWeekImportRequest,
  type TwelveWeekImportValidationRequest,
} from "@/services/syncService";
import { BACKEND_PLAN_HYDRATION_EVENT_NAME, useBackendPlanHydration } from "../../hooks/useBackendPlanHydration";
import { startPageTour } from "../../hooks/usePageTour";
import { useTheme } from "../../hooks/useTheme";
import { isDemoMode, shouldEnable12WeekCloudImport, shouldEnable12WeekImportDryRun } from "../../utils/app-mode";
import {
  getAnonymousLocalDataMigrationCandidate,
  hasCompletedCloudImport,
  hasSkippedLocalDataMigrationPrompt,
  importAnonymousLocalDataToAccountScope,
  type LocalDataMigrationCandidate,
  markCloudImportCompleted,
  markLocalDataMigrationPromptSkipped,
} from "../../utils/local-data-migration";
import { hasCompletedFirstRunGuidance, hasSeenNewUserGuide, markNewUserGuideSeen } from "../../utils/new-user-guide";
import { maybeShowBrowserReminderNotification, syncPendingOutbox } from "../../utils/production";
import {
  exportUserDataSnapshot,
  getCurrentPlan,
  getUserData,
  initializeUserData,
  trackAppEvent,
  USER_DATA_UPDATED_EVENT_NAME,
} from "../../utils/storage";
import { GracePeriodBanner } from "../billing/GracePeriodBanner";
import { AppPublicFooter } from "../layout/AppPublicFooter";
import { startScreenGuide, ScreenGuideContext } from "../ScreenGuide";
import { OfflineBanner } from "../states/OfflineBanner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { LazyMindfulPlayer } from "../ui/lazy-mindful-player";
import { Toaster } from "../ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { AppSidebar } from "./AppSidebar";
import type { CommandPaletteGoal } from "./CommandPalette";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { FirstLoginRestoreToast } from "./FirstLoginRestoreToast";
import {
  createCloudImportId,
  createImportValidationRequestId,
  getErrorMessage,
  getImportValidationReportFromError,
  isRecord,
} from "./helpers";
import { useEntitlementsAutoSync } from "./hooks/useEntitlementsAutoSync";
import { usePageViewAnalytics } from "./hooks/usePageViewAnalytics";
import { useCommandPaletteHotkey, useWarmPrefetch } from "./hooks/useUiBootstrap";
import type { CloudImportDryRunResult, CloudImportResult } from "./LocalDataMigrationPrompt";
import {
  buildAuthPath,
  getNavItemsForState,
  isActiveRoute,
  MOBILE_NAV_LABELS,
  NAV_ITEMS,
  prefetchRoute,
} from "./navConfig";
import { GUIDED_PATHS, applyRouteDocumentMetadata, getBreadcrumbTrail, getRouteMeta } from "./routeMeta";
import { SyncStatusIndicatorContainer } from "./SyncStatusIndicatorContainer";
import { SyncStatusPill } from "./SyncStatusPill";
import { buildLoginRedirect, isAuthProtectedPath, isPublicCheckoutPath, useWorkspaceGate } from "./useWorkspaceGate";

const AIAssistant = lazy(() =>
  import("@/app/features/assistant/AIAssistant").then((module) => ({
    default: module.AIAssistant,
  })),
);

const CommandPalette = lazy(() =>
  import("./CommandPalette").then((module) => ({
    default: module.CommandPalette,
  })),
);

const LocalDataMigrationPrompt = lazy(() =>
  import("./LocalDataMigrationPrompt").then((module) => ({
    default: module.LocalDataMigrationPrompt,
  })),
);

const MotionPageTransition = lazy(() =>
  import("../motion/MotionPageTransition").then((module) => ({
    default: module.MotionPageTransition,
  })),
);

const MotivationalReminder = lazy(() =>
  import("../MotivationalReminder").then((module) => ({
    default: module.MotivationalReminder,
  })),
);

const NewUserGuideDialog = lazy(() =>
  import("../NewUserGuide").then((module) => ({
    default: module.NewUserGuideDialog,
  })),
);

type ContextualGuide = { kind: "spotlight"; tourName: string } | { kind: "screen"; screenId: string };

function normalizePathname(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function getContextualGuide(pathname: string, isSignedOutVisitor: boolean): ContextualGuide | null {
  const normalizedPathname = normalizePathname(pathname);

  if (!isSignedOutVisitor) {
    if (normalizedPathname === "/" || normalizedPathname.startsWith("/dashboard")) {
      return { kind: "spotlight", tourName: "dashboard" };
    }
    if (normalizedPathname.startsWith("/goals")) return { kind: "spotlight", tourName: "goaltracker" };
    if (normalizedPathname.startsWith("/12-week-system")) {
      return { kind: "spotlight", tourName: "twelve-week-system" };
    }
  }

  if (normalizedPathname.startsWith("/onboarding")) return { kind: "screen", screenId: "onboarding" };
  if (normalizedPathname.startsWith("/vision-board")) return { kind: "screen", screenId: "vision-board-editor" };
  if (normalizedPathname.startsWith("/vision")) return { kind: "screen", screenId: "aspirational-vision" };
  if (normalizedPathname.startsWith("/life-balance")) return { kind: "screen", screenId: "life-balance" };
  if (normalizedPathname.startsWith("/life-insight")) return { kind: "screen", screenId: "life-insight" };
  if (normalizedPathname.startsWith("/smart-goal-setup")) return { kind: "screen", screenId: "smart-goal" };
  if (normalizedPathname.startsWith("/feasibility")) return { kind: "screen", screenId: "feasibility" };
  if (normalizedPathname.startsWith("/12-week-setup") || normalizedPathname.startsWith("/12-week-plan-setup")) {
    return { kind: "screen", screenId: "12-week-setup" };
  }
  if (normalizedPathname.startsWith("/12-week-plan-overview") || normalizedPathname.startsWith("/today")) {
    return { kind: "spotlight", tourName: "twelve-week-system" };
  }
  if (normalizedPathname.startsWith("/gallery")) return { kind: "screen", screenId: "vision-board-gallery" };
  if (normalizedPathname.startsWith("/journal")) return { kind: "screen", screenId: "reflection-journal" };
  if (normalizedPathname.startsWith("/settings")) return { kind: "screen", screenId: "settings" };
  if (normalizedPathname === "/billing" || normalizedPathname === "/billing/plan") {
    return { kind: "screen", screenId: "billing-plan" };
  }

  return null;
}

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  // Assistant only available on core flow routes (real mode)
  const ASSISTANT_ROUTES = new Set([
    "/",
    "/onboarding",
    "/goals",
    "/life-balance",
    "/life-insight",
    "/smart-goal-setup",
    "/feasibility",
    "/12-week-setup",
    "/12-week-system",

    "/journal",
  ]);
  const showAssistant = ASSISTANT_ROUTES.has(location.pathname);
  const outlet = useOutlet();
  const demoMode = isDemoMode();
  const {
    authLoading,
    isConfigured,
    logout,
    refreshUserProfile,
    user,
    userProfile,
    userProfileError,
    userProfileLoading,
  } = useAuthContext();
  const backendPlanHydration = useBackendPlanHydration({
    enabled: !demoMode && isConfigured && Boolean(userProfile),
    scopeKey: userProfile?.id ?? null,
  });
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useCommandPaletteHotkey(setCommandPaletteOpen);
  const desktopMoreRef = useRef<HTMLDivElement | null>(null);
  const [guideUserData, setGuideUserData] = useState(() => getUserData());
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const welcomeGuideOpenedThisSessionRef = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [localDataMigrationCandidate, setLocalDataMigrationCandidate] = useState<LocalDataMigrationCandidate | null>(
    null,
  );
  const [isLocalDataMigrationPromptOpen, setIsLocalDataMigrationPromptOpen] = useState(false);
  const [mobileVisitorMenuOpen, setMobileVisitorMenuOpen] = useState(false);

  const routeScrollKey = `${location.pathname}${location.search}`;
  const currentRouteKey = `${routeScrollKey}${location.hash}`;
  const { shouldRedirectToLogin, shouldShowWorkspaceGate, shouldWaitForWorkspace } = useWorkspaceGate({
    authLoading,
    backendHydrationLoading: backendPlanHydration.loading,
    demoMode,
    isConfigured,
    pathname: location.pathname,
    user,
    userProfile,
    userProfileError,
    userProfileLoading,
  });

  const navigateAppRoute = useCallback(
    (path: string) => {
      const targetUrl = new URL(path, window.location.origin);
      const targetRouteKey = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

      if (currentRouteKey === targetRouteKey) return;

      startTransition(() => {
        navigate(path);
      });
    },
    [currentRouteKey, navigate],
  );

  useLayoutEffect(() => {
    if (!routeScrollKey || typeof window === "undefined" || location.hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.hash, routeScrollKey]);

  useEffect(() => {
    const userData = initializeUserData();
    setGuideUserData(userData);
  }, []);

  // location.hash and location.search are intentionally omitted from deps. They are only
  // read inside buildLoginRedirect() which already runs when shouldRedirectToLogin /
  // pathname change. Including them caused the effect (and its synchronous getUserData())
  // to fire on every hash / query-string change inside the same page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  useEffect(() => {
    if (userProfile?.role === "admin") {
      if (!location.pathname.startsWith("/admin/")) {
        navigate("/admin/dashboard", { replace: true });
      }
      return;
    }

    if (shouldRedirectToLogin) {
      const { destination, loginPath } = buildLoginRedirect(location.pathname, location.search, location.hash);
      navigate(loginPath, { replace: true, state: { from: destination } });
      return;
    }

    if (shouldWaitForWorkspace) {
      return;
    }

    const userData = getUserData();
    setGuideUserData(userData);

    if (!demoMode && (isAuthProtectedPath(location.pathname) || isPublicCheckoutPath(location.pathname))) return;

    // Only force first-time users onto /onboarding once. If they explicitly
    // chose "Để sau" / "Thoát" during this session, respect that and let them
    // explore the dashboard. The flag lives in sessionStorage so a fresh tab
    // still nudges them back to onboarding.
    const onboardingDeferred =
      typeof window !== "undefined" && window.sessionStorage.getItem("onboarding-deferred") === "1";

    // Fresh browser/incognito chưa có userData.onboardingCompleted=true trong
    // localStorage. Nhưng nếu backend trả userProfile.onboardingCompletedAt
    // (user đã onboard từ trước trên thiết bị khác), không được bounce về
    // /onboarding — họ đã làm rồi. P1 audit 2026-05-24 phát hiện regression
    // này khi /api/auth/profile bị rate-limit → cache profile vẫn có
    // onboardingCompletedAt nên ta tin nó.
    const hasServerOnboardingFlag = Boolean(userProfile?.onboardingCompletedAt);

    // Nếu user đã có 12-week plan (đồng bộ từ tài khoản hoặc setup trên thiết
    // bị khác) thì coi như đã qua onboarding — đừng bounce về /onboarding
    // làm họ confused. Verify 2026-05-24 trên prod với account vqkklr0@: có
    // plan đầy đủ nhưng cả 2 flag onboardingCompleted đều false → bị bounce.
    // Dùng cả userData (snapshot ngay) và guideUserData (re-render sau backend
    // hydrate event) để cover race condition khi plan đến từ cloud sau khi
    // user vừa login lần đầu.
    const hasTwelveWeekPlan =
      userData.goals?.some((goal) => Boolean(goal.twelveWeekSystem)) ||
      guideUserData.goals?.some((goal) => Boolean(goal.twelveWeekSystem)) ||
      false;

    if (
      !demoMode &&
      user &&
      !userData.onboardingCompleted &&
      !hasServerOnboardingFlag &&
      !hasTwelveWeekPlan &&
      !onboardingDeferred &&
      location.pathname !== "/onboarding"
    ) {
      navigate("/onboarding");
    }
  }, [
    demoMode,
    guideUserData.goals,
    location.pathname,
    navigate,
    shouldRedirectToLogin,
    shouldWaitForWorkspace,
    user,
    userProfile?.onboardingCompletedAt,
    userProfile?.role,
  ]);

  useEffect(() => {
    if (location.pathname) {
      setMobileMenuOpen(false);
      setDesktopMoreOpen(false);
      // Note: guideUserData is refreshed by the USER_DATA_UPDATED_EVENT_NAME +
      // BACKEND_PLAN_HYDRATION_EVENT_NAME listeners below. Re-reading on every navigate is
      // redundant and adds a synchronous localStorage parse to each route change.
      applyRouteDocumentMetadata(location.pathname);
    }
  }, [location.pathname]);

  useEntitlementsAutoSync({
    demoMode,
    isConfigured,
    user,
    userProfile,
    onPlanUpgraded: () => setGuideUserData(getUserData()),
  });

  useEffect(() => {
    if (!desktopMoreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!desktopMoreRef.current?.contains(event.target as Node)) {
        setDesktopMoreOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDesktopMoreOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [desktopMoreOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    if (!mobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpenGuide = () => {
      setGuideUserData(getUserData());
      setIsGuideOpen(true);
    };
    const handleBackendHydrated = () => {
      setGuideUserData(getUserData());
    };
    window.addEventListener("visionboard:open-guide", handleOpenGuide);
    window.addEventListener(USER_DATA_UPDATED_EVENT_NAME, handleBackendHydrated);
    window.addEventListener(BACKEND_PLAN_HYDRATION_EVENT_NAME, handleBackendHydrated);

    return () => {
      window.removeEventListener("visionboard:open-guide", handleOpenGuide);
      window.removeEventListener(USER_DATA_UPDATED_EVENT_NAME, handleBackendHydrated);
      window.removeEventListener(BACKEND_PLAN_HYDRATION_EVENT_NAME, handleBackendHydrated);
    };
  }, []);

  useEffect(() => {
    if (demoMode || shouldShowWorkspaceGate || !user) {
      setLocalDataMigrationCandidate(null);
      setIsLocalDataMigrationPromptOpen(false);
      return;
    }

    const candidate = getAnonymousLocalDataMigrationCandidate();
    if (!candidate || hasSkippedLocalDataMigrationPrompt(user.uid, candidate.fingerprint)) {
      setLocalDataMigrationCandidate(null);
      setIsLocalDataMigrationPromptOpen(false);
      return;
    }

    // Tự động import — không hiện dialog cho người dùng
    const result = importAnonymousLocalDataToAccountScope(user.uid, candidate.fingerprint);
    markLocalDataMigrationPromptSkipped(user.uid, candidate.fingerprint);
    if (result.status === "imported" || result.status === "merged") {
      setGuideUserData(getUserData());
    }
    setLocalDataMigrationCandidate(null);
    setIsLocalDataMigrationPromptOpen(false);
  }, [demoMode, shouldShowWorkspaceGate, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!demoMode && !user) {
      return;
    }

    const runBackgroundSync = () => {
      void syncPendingOutbox();
      maybeShowBrowserReminderNotification();
    };

    runBackgroundSync();

    const handleFocus = () => {
      maybeShowBrowserReminderNotification();
    };

    const handleOnline = () => {
      runBackgroundSync();
    };

    const intervalId = window.setInterval(() => {
      maybeShowBrowserReminderNotification();
    }, 60_000);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [demoMode, user]);

  useWarmPrefetch(demoMode || Boolean(user));
  usePageViewAnalytics(Boolean(user));

  const isActive = (path: string) => isActiveRoute(location.pathname, path);

  const handlePrefetch = useCallback((path: string) => prefetchRoute(path), []);
  const handleAuthNavigate = useCallback(
    (mode: "signin" | "signup") => {
      navigate(buildAuthPath(mode, location.pathname, location.search, location.hash));
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  const pageMeta = getRouteMeta(location.pathname);
  const breadcrumbTrail = getBreadcrumbTrail(location.pathname);
  const isSignedOutVisitor = isConfigured && !user;
  const { bottomNavItems, mobileMenuNavItems, primaryNavItems, secondaryNavItems } =
    getNavItemsForState(isSignedOutVisitor);
  const isDesktopMoreNavActive = desktopMoreOpen || secondaryNavItems.some((item) => isActive(item.path));
  const isMoreNavActive = mobileMenuOpen || secondaryNavItems.some((item) => isActive(item.path));
  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || "Khách";
  const accountEmail = user?.email || userProfile?.email || "";
  const currentAccountPlanCode = getCurrentPlan(guideUserData);
  const accountPlanLabel = currentAccountPlanCode === "PLUS" ? "Plus" : "Miễn phí";
  const accountAvatarLabel = (accountLabel || accountEmail || "A").trim().slice(0, 1).toUpperCase();
  const accountStatus = userProfileError ? "Lỗi hồ sơ" : accountEmail || "Tài khoản đã đăng nhập";
  const normalizedPathname = normalizePathname(location.pathname);
  const isPublicLanding = !user && normalizedPathname === "/";
  const isTwelveWeekExecutionWorkspace = normalizedPathname.startsWith("/12-week-system");
  const suppressAutoWelcomeGuide =
    normalizedPathname.startsWith("/admin") ||
    normalizedPathname.startsWith("/vision-board") ||
    normalizedPathname.startsWith("/gallery");
  const commandPaletteGoals: CommandPaletteGoal[] = (guideUserData.goals ?? []).slice(0, 12).map((goal) => ({
    id: goal.id,
    title: goal.title || "Mục tiêu chưa đặt tên",
    hasTwelveWeek: Boolean(goal.twelveWeekSystem),
  }));
  const canRetryUserProfile = Boolean(user) && !userProfileLoading && (!userProfile || Boolean(userProfileError));

  const hasUnseenContextualGuide = (() => {
    if (typeof window === "undefined") return false;

    const contextualGuide = getContextualGuide(location.pathname, isSignedOutVisitor);
    if (!contextualGuide) return false;

    try {
      if (contextualGuide.kind === "screen") {
        return window.localStorage.getItem(`visionboard_screen_guide_seen:${contextualGuide.screenId}`) !== "true";
      }

      return window.localStorage.getItem(`visionboard_page_tour_seen:${contextualGuide.tourName}`) !== "true";
    } catch {
      return false;
    }
  })();

  const handleOpenGuide = useCallback(() => {
    const contextualGuide = getContextualGuide(location.pathname, isSignedOutVisitor);
    if (contextualGuide?.kind === "spotlight") {
      startPageTour(contextualGuide.tourName, { force: true });
      return;
    }
    if (contextualGuide?.kind === "screen") {
      startScreenGuide(contextualGuide.screenId, { force: true });
      return;
    }

    setGuideUserData(getUserData());
    setIsGuideOpen(true);
  }, [isSignedOutVisitor, location.pathname]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isPublicLanding ||
      suppressAutoWelcomeGuide ||
      isSignedOutVisitor ||
      shouldShowWorkspaceGate ||
      shouldWaitForWorkspace ||
      hasSeenNewUserGuide() ||
      hasCompletedFirstRunGuidance()
    ) {
      return;
    }

    welcomeGuideOpenedThisSessionRef.current = true;
    setGuideUserData(getUserData());
    setIsGuideOpen(true);
    markNewUserGuideSeen();
  }, [isPublicLanding, isSignedOutVisitor, shouldShowWorkspaceGate, shouldWaitForWorkspace, suppressAutoWelcomeGuide]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      shouldShowWorkspaceGate ||
      shouldWaitForWorkspace ||
      isGuideOpen ||
      welcomeGuideOpenedThisSessionRef.current ||
      !hasSeenNewUserGuide() ||
      hasCompletedFirstRunGuidance()
    ) {
      return undefined;
    }

    const contextualGuide = getContextualGuide(location.pathname, isSignedOutVisitor);
    if (contextualGuide?.kind !== "spotlight") {
      return undefined;
    }

    // Let the routed page mount its tour listener and target elements before
    // asking the tour to open. If the welcome overview opened in this session,
    // skip the automatic tour so both guidance layers never stack.
    const timer = window.setTimeout(() => {
      startPageTour(contextualGuide.tourName);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isGuideOpen, isSignedOutVisitor, location.pathname, shouldShowWorkspaceGate, shouldWaitForWorkspace]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const renderAccountMenu = (variant: "desktop" | "mobile") => {
    const isMobile = variant === "mobile";
    const triggerLabel = isMobile ? "Mở menu tài khoản di động" : "Mở menu tài khoản";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={
              isMobile
                ? "flex size-11 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                : "flex h-8 w-8 items-center justify-center rounded-full bg-app-accent text-white transition-colors duration-150 hover:bg-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            }
            aria-label={triggerLabel}
            title={accountEmail || accountLabel}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase ${
                isMobile ? "h-7 w-7 bg-app-accent-soft text-app-accent" : "h-8 w-8 bg-app-accent text-white"
              }`}
              aria-hidden="true"
            >
              {accountAvatarLabel}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          aria-label="Tài khoản"
          className="w-72 rounded-card border border-app-line bg-app-surface p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
        >
          <DropdownMenuLabel className="px-2.5 py-3 normal-case tracking-normal">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent text-xs font-semibold uppercase text-white">
                {accountAvatarLabel}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-app-ink-muted">Tài khoản</p>
                <p className="mt-1 truncate text-sm font-medium tracking-tight text-app-ink">
                  {accountEmail || accountLabel}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{accountPlanLabel}</Badge>
                  {!demoMode ? <SyncStatusPill compact={isMobile} /> : null}
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-app-line" />
          <DropdownMenuItem
            onSelect={() => navigateAppRoute("/settings")}
            className="text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
          >
            <Settings2 className="h-4 w-4 text-app-ink-muted" />
            Cài đặt
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => navigateAppRoute("/billing/plan")}
            className="text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
          >
            <CreditCard className="h-4 w-4 text-app-ink-muted" />
            Quản lý gói
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-app-line" />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSigningOut}
            className="text-[color:var(--color-danger-fg)] focus:bg-[color:var(--color-danger-bg)]"
            onSelect={() => {
              void handleSignOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const handleSkipLocalDataMigration = useCallback(() => {
    if (user?.uid && localDataMigrationCandidate) {
      markLocalDataMigrationPromptSkipped(user.uid, localDataMigrationCandidate.fingerprint);
    }

    setIsLocalDataMigrationPromptOpen(false);
    setLocalDataMigrationCandidate(null);
  }, [localDataMigrationCandidate, user?.uid]);

  const handleImportLocalDataMigration = useCallback(() => {
    if (!user?.uid || !localDataMigrationCandidate) {
      return { status: "inactive_auth_scope" as const };
    }

    const result = importAnonymousLocalDataToAccountScope(user.uid, localDataMigrationCandidate.fingerprint);
    if (result.status === "imported") {
      markLocalDataMigrationPromptSkipped(user.uid, localDataMigrationCandidate.fingerprint);
      setGuideUserData(getUserData());
    }

    return result;
  }, [localDataMigrationCandidate, user?.uid]);

  const cloudImportDryRunEnabled =
    !demoMode && Boolean(user) && isApiBaseUrlConfigured() && shouldEnable12WeekImportDryRun();
  const cloudImportDryRunUnavailableReason = demoMode
    ? "Dữ liệu hiện chỉ lưu trên trình duyệt này, chưa bật nhập dữ liệu tài khoản."
    : !user
      ? "Bạn cần đăng nhập trước khi kiểm tra dữ liệu tài khoản."
      : !isApiBaseUrlConfigured()
        ? "Kết nối tài khoản chưa được cấu hình cho không gian làm việc này."
        : !shouldEnable12WeekImportDryRun()
          ? "Kiểm tra dữ liệu trước khi đồng bộ chưa được bật."
          : undefined;

  const handleValidateCloudImport = useCallback(async (): Promise<CloudImportDryRunResult> => {
    if (demoMode) {
      return {
        status: "skipped",
        message: "Dữ liệu hiện chỉ lưu trên trình duyệt này, chưa bật nhập dữ liệu tài khoản.",
      };
    }

    if (!user?.uid) {
      return {
        status: "skipped",
        message: "Bạn cần đăng nhập trước khi kiểm tra dữ liệu tài khoản.",
      };
    }

    if (!isApiBaseUrlConfigured()) {
      return {
        status: "skipped",
        message: "Kết nối tài khoản chưa được cấu hình cho không gian làm việc này.",
      };
    }

    if (!shouldEnable12WeekImportDryRun()) {
      return {
        status: "skipped",
        message: "Kiểm tra dữ liệu trước khi đồng bộ chưa được bật.",
      };
    }

    const importPayloads = getUserData()
      .goals.map(createTwelveWeekImportPayload)
      .filter((payload): payload is TwelveWeekImportPayload => Boolean(payload));
    if (importPayloads.length === 0) {
      return {
        status: "skipped",
        message: "Tài khoản này chưa có dữ liệu 12 tuần để kiểm tra.",
      };
    }

    const requestId = createImportValidationRequestId();
    const request: TwelveWeekImportValidationRequest = {
      requestId,
      idempotencyKey: `account_scope_import_dry_run:${requestId}`,
      source: "account_scope_import_dry_run",
      mode: "validate_only",
      workspace: {
        goals: importPayloads,
      },
    };

    try {
      const report = await post12WeekImportValidation(request);
      return {
        status: report.status === "valid" ? "valid" : "invalid",
        message:
          report.status === "valid"
            ? "Dữ liệu hợp lệ để đồng bộ lên tài khoản. Chưa có dữ liệu nào bị thay đổi."
            : "Dữ liệu chưa sẵn sàng để đồng bộ lên tài khoản.",
        report,
      };
    } catch (error) {
      const report = getImportValidationReportFromError(error);
      if (report) {
        return {
          status: "invalid",
          message: "Dữ liệu chưa sẵn sàng để đồng bộ lên tài khoản.",
          report,
        };
      }

      return {
        status: "error",
        message: getErrorMessage(error),
      };
    }
  }, [demoMode, user?.uid]);

  const cloudImportEnabled = !demoMode && Boolean(user) && isApiBaseUrlConfigured() && shouldEnable12WeekCloudImport();
  const cloudImportUnavailableReason = demoMode
    ? "Dữ liệu hiện chỉ lưu trên trình duyệt này, chưa bật nhập dữ liệu tài khoản."
    : !user
      ? "Bạn cần đăng nhập trước khi nhập dữ liệu tài khoản."
      : !isApiBaseUrlConfigured()
        ? "Kết nối tài khoản chưa được cấu hình cho không gian làm việc này."
        : !shouldEnable12WeekCloudImport()
          ? "Đồng bộ dữ liệu tài khoản chưa được bật."
          : undefined;
  const cloudImportAlreadyCompleted = Boolean(
    user?.uid &&
      localDataMigrationCandidate &&
      hasCompletedCloudImport(user.uid, localDataMigrationCandidate.fingerprint),
  );

  const handleCloudImport = useCallback(async (): Promise<CloudImportResult> => {
    if (demoMode) {
      return {
        status: "skipped",
        message: "Dữ liệu hiện chỉ lưu trên trình duyệt này, chưa bật nhập dữ liệu tài khoản.",
      };
    }

    if (!user?.uid) {
      return {
        status: "skipped",
        message: "Bạn cần đăng nhập trước khi nhập dữ liệu tài khoản.",
      };
    }

    if (!isApiBaseUrlConfigured()) {
      return {
        status: "skipped",
        message: "Kết nối tài khoản chưa được cấu hình cho không gian làm việc này.",
      };
    }

    if (!shouldEnable12WeekCloudImport()) {
      return {
        status: "skipped",
        message: "Đồng bộ dữ liệu tài khoản chưa được bật.",
      };
    }

    const importPayloads = getUserData()
      .goals.map(createTwelveWeekImportPayload)
      .filter((payload): payload is TwelveWeekImportPayload => Boolean(payload));
    if (importPayloads.length === 0) {
      return {
        status: "skipped",
        message: "Tài khoản này chưa có dữ liệu 12 tuần để đồng bộ.",
      };
    }

    // Safe analytics: only counts, no raw text
    trackAppEvent("cloud_import_started", undefined, {
      goalCount: String(importPayloads.length),
      source: "local_data_migration_prompt",
    });

    const importId = createCloudImportId();
    const request: TwelveWeekImportRequest = {
      importId,
      idempotencyKey: `account_scope_cloud_import:${importId}`,
      source: "account_scope_cloud_import",
      workspace: {
        goals: importPayloads,
      },
    };

    try {
      const response = await post12WeekImport(request);
      const succeeded = response.status === "applied" || response.status === "duplicate";

      if (succeeded && localDataMigrationCandidate) {
        markCloudImportCompleted(user.uid, localDataMigrationCandidate.fingerprint);
      }

      // Safe analytics: only status, no raw text
      trackAppEvent(succeeded ? "cloud_import_succeeded" : "cloud_import_partial", undefined, {
        status: response.status,
        importId,
      });

      return {
        status: response.status,
        message:
          response.status === "applied"
            ? "Dữ liệu đã được đồng bộ lên tài khoản thành công."
            : response.status === "duplicate"
              ? "Dữ liệu này đã được đồng bộ lên tài khoản trước đó."
              : response.status === "partial"
                ? "Đồng bộ dữ liệu thành công một phần. Một số mục có thể chưa được lưu."
                : response.message || "Đồng bộ dữ liệu thất bại.",
        response,
      };
    } catch (error) {
      // Safe analytics: only error code, no raw text
      trackAppEvent("cloud_import_failed", undefined, {
        errorCode: isRecord(error) && typeof error.errorCode === "string" ? error.errorCode : "unknown",
        importId,
      });

      return {
        status: "error",
        message:
          isRecord(error) && typeof error.message === "string" && error.message.trim()
            ? error.message
            : "Không thể đồng bộ dữ liệu tài khoản lúc này. Dữ liệu trên thiết bị vẫn an toàn.",
      };
    }
  }, [demoMode, localDataMigrationCandidate, user?.uid]);

  const handleExportBackup = useCallback(() => {
    try {
      const backupJson = exportUserDataSnapshot();
      const blob = new Blob([backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `visionboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // best-effort backup
    }
  }, []);

  const shouldShowLocalDataMigrationPrompt = Boolean(localDataMigrationCandidate && isLocalDataMigrationPromptOpen);
  const localDataMigrationPrompt = shouldShowLocalDataMigrationPrompt ? (
    <Suspense fallback={null}>
      <LocalDataMigrationPrompt
        candidate={localDataMigrationCandidate}
        open={shouldShowLocalDataMigrationPrompt}
        onImport={handleImportLocalDataMigration}
        onValidateCloudImport={handleValidateCloudImport}
        onCloudImport={handleCloudImport}
        cloudImportDryRunEnabled={cloudImportDryRunEnabled}
        cloudImportEnabled={cloudImportEnabled}
        cloudImportUnavailableReason={cloudImportUnavailableReason}
        cloudImportDryRunUnavailableReason={cloudImportDryRunUnavailableReason}
        cloudImportAlreadyCompleted={cloudImportAlreadyCompleted}
        onExportBackup={handleExportBackup}
        onSkip={handleSkipLocalDataMigration}
      />
    </Suspense>
  ) : null;

  const pageTransitionContent = user ? (
    <Suspense fallback={outlet}>
      <MotionPageTransition pageKey={location.pathname}>{outlet}</MotionPageTransition>
    </Suspense>
  ) : (
    outlet
  );

  if (GUIDED_PATHS.has(location.pathname)) {
    return (
      <AutoCloudSyncProvider>
        <AssistantPageContextProvider>
          <ScreenGuideContext.Provider value={true}>
          <div className="app-shell min-h-screen bg-app-bg">
            <OfflineBanner />
            <a href="#main-content" className="skip-to-content">
              Bỏ qua điều hướng
            </a>
            <EmailVerificationBanner />
            <GracePeriodBanner />
            {demoMode ? (
              <div
                role="note"
                className="border-b border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] px-4 py-1.5 text-center text-xs font-medium text-[color:var(--color-info-fg)] sm:px-6"
              >
                <HardDrive className="mr-1 inline h-3 w-3 align-text-bottom" aria-hidden="true" />
                Bản demo · Dữ liệu lưu trên trình duyệt này.
              </div>
            ) : null}
            <main id="main-content" className="relative" aria-label="Nội dung trang">
              <div className="pointer-events-none sticky top-3 z-40 mx-auto flex w-full max-w-6xl justify-end px-3 pt-3 sm:px-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="pointer-events-auto relative border-app-line bg-app-surface/95 text-app-ink-soft shadow-app-sm backdrop-blur hover:text-app-ink"
                      onClick={handleOpenGuide}
                      aria-label="Mở hướng dẫn sử dụng"
                    >
                      <Compass className="size-4" aria-hidden="true" />
                      {hasUnseenContextualGuide ? (
                        <span className="absolute -right-0.5 -top-0.5 flex size-2" aria-hidden="true">
                          <span className="absolute inline-flex size-full rounded-full bg-app-accent/70 motion-safe:animate-ping" />
                          <span className="relative inline-flex size-2 rounded-full bg-app-accent" />
                        </span>
                      ) : null}
                      <span className="hidden sm:inline">Hướng dẫn</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    Hướng dẫn sử dụng
                  </TooltipContent>
                </Tooltip>
              </div>
              {pageTransitionContent}
              {localDataMigrationPrompt}

              <Toaster />
            </main>
            {showAssistant && user ? (
              <Suspense fallback={null}>
                <AIAssistant />
              </Suspense>
            ) : null}
          </div>
          </ScreenGuideContext.Provider>
        </AssistantPageContextProvider>
      </AutoCloudSyncProvider>
    );
  }

  // Landing public "Dear Our Future" dựng header + footer riêng (kèm Đăng nhập/
  // Đăng ký/âm thanh tập trung), nên ẩn chrome mặc định của shell ở route "/".
  // Dùng !user (không phụ thuộc isConfigured) để khớp điều kiện Dashboard hiển thị
  // PublicVisitorView — tránh trùng header khi demo chưa cấu hình Firebase.
  const isAdminRoute = location.pathname.startsWith("/admin/");
  const showSidebar = !isSignedOutVisitor && !isPublicLanding && !isAdminRoute;

  return (
    <AutoCloudSyncProvider>
      <AssistantPageContextProvider>
        <div className="app-shell min-h-screen">
          <OfflineBanner />
          <a href="#main-content" className="skip-to-content">
            Bỏ qua điều hướng
          </a>
          <EmailVerificationBanner />
          <GracePeriodBanner />

          {showSidebar ? (
            <AppSidebar
              primaryNavItems={primaryNavItems}
              secondaryNavItems={secondaryNavItems}
              isActive={isActive}
              onNavigate={navigateAppRoute}
              onPrefetch={handlePrefetch}
              onOpenGuide={handleOpenGuide}
              resolvedTheme={resolvedTheme === "dark" ? "dark" : "light"}
              onToggleTheme={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              user={
                user
                  ? {
                      email: accountEmail || null,
                      displayName: accountLabel || null,
                      avatarLetter: accountAvatarLabel,
                      planLabel: accountPlanLabel,
                    }
                  : null
              }
              onAuthNavigate={handleAuthNavigate}
              onOpenSettings={() => navigateAppRoute("/settings")}
              onOpenAccountInfo={() => navigateAppRoute("/settings")}
              onSignOut={() => {
                void handleSignOut();
              }}
              isSigningOut={isSigningOut}
              shellBadgeStyle={{}}
            />
          ) : null}

          <div className={showSidebar ? "flex-1 lg:pl-[248px]" : "flex-1"}>
            {isPublicLanding ? null : (
              <header
                className={`sticky top-0 z-40 border-b border-app-line/80 bg-app-bg transition-[border-color] duration-150 ${
                  showSidebar ? "lg:hidden" : ""
                }`}
              >
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 shrink-0 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => navigateAppRoute("/")}
                        className="-mx-1.5 flex shrink-0 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-colors duration-150 hover:bg-app-ink/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                        aria-label="Về trang chủ Dear Our Future"
                      >
                        <img
                          src="/favicon-192.png"
                          alt=""
                          aria-hidden="true"
                          loading="eager"
                          className="size-9 rounded-lg object-cover shadow-xs ring-1 ring-app-accent/20 transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="min-w-0">
                          <span className="inline-block text-sm font-semibold tracking-tight text-app-ink">
                            Dear Our Future
                          </span>
                        </div>
                      </button>
                    </div>

                    <nav aria-label="Chính" className="hidden flex-1 items-center justify-center md:flex">
                      {isSignedOutVisitor ? (
                        <span className="hidden text-xs text-app-ink-muted lg:inline">12 tuần sống có chủ đích</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 rounded-full border border-app-line bg-app-surface px-1 py-1">
                          {primaryNavItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            return (
                              <Button
                                key={item.path}
                                variant="ghost"
                                size="sm"
                                onClick={() => navigateAppRoute(item.path)}
                                onPointerEnter={() => handlePrefetch(item.path)}
                                aria-current={active ? "page" : undefined}
                                title={item.label}
                                className={`h-8 shrink-0 rounded-full px-3 text-sm font-medium tracking-tight transition-colors duration-150 ${
                                  active
                                    ? "bg-app-accent text-white hover:bg-app-accent hover:text-white"
                                    : "bg-transparent text-app-ink-soft shadow-none hover:bg-app-bg hover:text-app-ink"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.2 : 1.8} />
                                <span>{item.compactLabel ?? item.label}</span>
                              </Button>
                            );
                          })}

                          {secondaryNavItems.length > 0 ? (
                            <>
                              <div className="mx-1 h-4 w-px shrink-0 bg-app-line" />

                              <div ref={desktopMoreRef} className="relative">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-current={
                                    secondaryNavItems.some((item) => isActive(item.path)) ? "page" : undefined
                                  }
                                  aria-expanded={desktopMoreOpen}
                                  aria-haspopup="menu"
                                  className={`h-8 shrink-0 rounded-full px-3 text-sm font-medium tracking-tight transition-colors duration-150 ${
                                    isDesktopMoreNavActive
                                      ? "bg-app-accent text-white hover:bg-app-accent hover:text-white"
                                      : "bg-transparent text-app-ink-soft shadow-none hover:bg-app-bg hover:text-app-ink"
                                  }`}
                                  onClick={() => setDesktopMoreOpen((open) => !open)}
                                >
                                  <Menu className="h-3.5 w-3.5" />
                                  <span>Khác</span>
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform ${desktopMoreOpen ? "rotate-180" : ""}`}
                                  />
                                </Button>

                                {desktopMoreOpen ? (
                                  <div
                                    role="menu"
                                    aria-label="Mục khác"
                                    className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-card border border-app-line bg-app-surface p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
                                  >
                                    <div className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-app-ink-muted">
                                      Mục khác
                                    </div>
                                    {secondaryNavItems.map((item) => {
                                      const Icon = item.icon;
                                      const active = isActive(item.path);

                                      return (
                                        <button
                                          key={item.path}
                                          type="button"
                                          role="menuitem"
                                          aria-current={active ? "page" : undefined}
                                          onPointerEnter={() => handlePrefetch(item.path)}
                                          onClick={() => {
                                            setDesktopMoreOpen(false);
                                            navigateAppRoute(item.path);
                                          }}
                                          className={`my-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium tracking-tight outline-none transition-colors ${
                                            active
                                              ? "bg-app-accent-soft text-app-accent focus:bg-app-accent-soft"
                                              : "text-app-ink hover:bg-app-bg focus:bg-app-bg"
                                          }`}
                                        >
                                          <Icon
                                            className={`h-4 w-4 shrink-0 ${active ? "text-app-accent" : "text-app-ink-muted"}`}
                                          />
                                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            </>
                          ) : null}
                        </div>
                      )}
                    </nav>

                    <div className="hidden shrink-0 items-center gap-1.5 md:flex">
                      {!demoMode && user ? <SyncStatusIndicatorContainer testId="sync-status-indicator" /> : null}
                      {user ? renderAccountMenu("desktop") : null}
                      {!user ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAuthNavigate("signin")}
                            className="h-8 rounded-full px-3 text-sm text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
                          >
                            Đăng nhập
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAuthNavigate("signup")}
                            className="h-8 rounded-full bg-app-accent px-3.5 text-sm text-white hover:bg-app-accent hover:text-white"
                          >
                            Đăng ký
                          </Button>
                        </>
                      ) : null}
                      <LazyMindfulPlayer />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                            aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                          >
                            {resolvedTheme === "dark" ? (
                              <Sun className="h-3.5 w-3.5" />
                            ) : (
                              <Moon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {resolvedTheme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="md:hidden flex min-w-0 items-center gap-1.5">
                      <LazyMindfulPlayer />
                      <span className="hidden max-w-[120px] truncate text-sm font-medium tracking-tight text-app-ink sm:inline">
                        {pageMeta.label}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="hidden size-11 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:flex"
                            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                            aria-label={resolvedTheme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
                          >
                            {resolvedTheme === "dark" ? (
                              <Sun className="h-[1.05rem] w-[1.05rem]" />
                            ) : (
                              <Moon className="h-[1.05rem] w-[1.05rem]" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {resolvedTheme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
                        </TooltipContent>
                      </Tooltip>
                      {isSignedOutVisitor ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 rounded-lg bg-app-accent px-3 text-sm text-white hover:bg-app-accent hover:text-white"
                            onClick={() => handleAuthNavigate("signup")}
                          >
                            Đăng ký
                          </Button>
                          <DropdownMenu open={mobileVisitorMenuOpen} onOpenChange={setMobileVisitorMenuOpen}>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="relative flex size-11 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                                aria-label="Mở menu"
                              >
                                <Menu className="h-[1.05rem] w-[1.05rem]" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onSelect={() => handleAuthNavigate("signin")}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Đăng nhập
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  handleOpenGuide();
                                  setMobileVisitorMenuOpen(false);
                                }}
                              >
                                <Compass className="mr-2 h-4 w-4" />
                                Hướng dẫn sử dụng
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => {
                                  navigateAppRoute("/billing/faq");
                                  setMobileVisitorMenuOpen(false);
                                }}
                              >
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Câu hỏi thường gặp
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  navigateAppRoute("/terms");
                                  setMobileVisitorMenuOpen(false);
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Điều khoản
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  navigateAppRoute("/privacy");
                                  setMobileVisitorMenuOpen(false);
                                }}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Chính sách bảo mật
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : user ? (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="relative flex size-11 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                                onClick={handleOpenGuide}
                                aria-label="Mở hướng dẫn sử dụng"
                              >
                                <Compass className="h-[1.05rem] w-[1.05rem]" />
                                {hasUnseenContextualGuide ? (
                                  <span className="absolute -right-0.5 -top-0.5 flex size-2" aria-hidden="true">
                                    <span className="absolute inline-flex size-full rounded-full bg-app-accent/70 motion-safe:animate-ping" />
                                    <span className="relative inline-flex size-2 rounded-full bg-app-accent" />
                                  </span>
                                ) : null}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Hướng dẫn sử dụng</TooltipContent>
                          </Tooltip>
                          {renderAccountMenu("mobile")}
                        </>
                      ) : (
                        <button
                          type="button"
                          className="relative flex size-11 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                          onClick={handleOpenGuide}
                          aria-label="Mở hướng dẫn sử dụng"
                        >
                          <Compass className="h-[1.05rem] w-[1.05rem]" />
                          {hasUnseenContextualGuide ? (
                            <span className="absolute -right-0.5 -top-0.5 flex size-2" aria-hidden="true">
                              <span className="absolute inline-flex size-full rounded-full bg-app-accent/70 motion-safe:animate-ping" />
                              <span className="relative inline-flex size-2 rounded-full bg-app-accent" />
                            </span>
                          ) : null}
                        </button>
                      )}
                      {!isSignedOutVisitor && (
                        <button
                          type="button"
                          className="flex size-11 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                          onClick={() => setMobileMenuOpen((open) => !open)}
                          aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
                          aria-expanded={mobileMenuOpen}
                          aria-controls="mobile-nav-menu"
                        >
                          {mobileMenuOpen ? (
                            <X className="h-[1.05rem] w-[1.05rem]" />
                          ) : (
                            <Menu className="h-[1.05rem] w-[1.05rem]" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {mobileMenuOpen && (
                  <div id="mobile-nav-menu" className="mx-auto mt-2 max-w-7xl px-4 md:hidden">
                    <div className="rounded-card border border-app-line bg-app-surface p-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                      <nav className="space-y-1" aria-label="Menu điều hướng">
                        {user ? (
                          <div className="mb-2 rounded-card border border-app-line bg-app-bg px-4 py-3 text-left">
                            <div className="flex items-center gap-3">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                                <User2 className="h-5 w-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-app-ink">{accountLabel}</p>
                                <p className="mt-1 text-xs font-medium text-app-ink-muted">{accountStatus}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  navigateAppRoute("/settings");
                                }}
                                className="flex size-9 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink disabled:opacity-50"
                                aria-label="Mở cài đặt tài khoản"
                              >
                                <Settings2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={refreshUserProfile}
                                disabled={!canRetryUserProfile}
                                className="flex size-9 items-center justify-center rounded-[var(--r-tile)] border border-app-line bg-app-surface text-app-ink-soft disabled:opacity-50"
                                aria-label="Kiểm tra lại hồ sơ tài khoản"
                              >
                                <RefreshCw className={`h-4 w-4 ${userProfileLoading ? "animate-spin" : ""}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  void handleSignOut();
                                }}
                                disabled={isSigningOut}
                                className="flex size-9 items-center justify-center rounded-[var(--r-tile)] border border-app-line bg-app-surface text-app-ink-soft disabled:opacity-50"
                                aria-label="Đăng xuất"
                              >
                                <LogOut className="h-4 w-4" />
                              </button>
                            </div>
                            {userProfileError ? (
                              <p className="mt-2 text-xs leading-5 text-red-600">{userProfileError}</p>
                            ) : null}
                          </div>
                        ) : null}
                        {!user ? (
                          <div className="mb-2 grid grid-cols-2 gap-2 rounded-card border border-app-line bg-app-bg p-2">
                            <Button
                              variant="outline"
                              className="w-full border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                handleAuthNavigate("signin");
                              }}
                            >
                              Đăng nhập
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full bg-app-accent text-white hover:bg-app-accent hover:text-white"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                handleAuthNavigate("signup");
                              }}
                            >
                              Đăng ký
                            </Button>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenGuide();
                            setMobileMenuOpen(false);
                          }}
                          className="mb-2 flex w-full items-center gap-3 rounded-lg border border-app-line bg-app-surface px-4 py-3 text-left text-sm font-medium tracking-normal text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink"
                        >
                          <Compass className="h-5 w-5" />
                          <span>Hướng dẫn sử dụng</span>
                        </button>
                        {mobileMenuNavItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);

                          return (
                            <button
                              key={item.path}
                              type="button"
                              onClick={() => {
                                navigateAppRoute(item.path);
                                setMobileMenuOpen(false);
                              }}
                              onFocus={() => handlePrefetch(item.path)}
                              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left text-sm font-medium tracking-normal transition-colors duration-150 ${
                                active
                                  ? "bg-app-accent-soft text-app-accent"
                                  : "text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
                              }`}
                              aria-current={active ? "page" : undefined}
                            >
                              <Icon className="h-5 w-5 shrink-0" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  </div>
                )}
              </header>
            )}

            {showSidebar ? (
              <div className="sticky top-0 z-40 hidden border-b border-app-line bg-app-bg/95 backdrop-blur-sm lg:block">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                  <nav aria-label="Vị trí trang" className="flex min-w-0 items-center gap-2">
                    {breadcrumbTrail.length >= 2 ? (
                      <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <li className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigateAppRoute("/")}
                            className="rounded text-xs text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                          >
                            Workspace
                          </button>
                          <ChevronRight className="size-3.5 text-app-ink-muted" aria-hidden="true" />
                        </li>
                        {breadcrumbTrail.map((crumb, index) => {
                          const isLast = index === breadcrumbTrail.length - 1;
                          return (
                            <li key={crumb.path} className="inline-flex min-w-0 items-center gap-1.5">
                              {isLast ? (
                                <span aria-current="page" className="truncate text-sm font-medium text-app-ink">
                                  {crumb.label}
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => navigateAppRoute(crumb.path)}
                                    className="truncate rounded text-sm text-app-ink-soft transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                                  >
                                    {crumb.label}
                                  </button>
                                  <ChevronRight className="size-3.5 text-app-ink-muted" aria-hidden="true" />
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <>
                        <span className="text-xs text-app-ink-muted">Workspace</span>
                        <span aria-hidden="true" className="text-app-ink-muted">
                          /
                        </span>
                        <span className="truncate text-sm font-medium text-app-ink">{pageMeta.label}</span>
                      </>
                    )}
                  </nav>
                  <div className="flex items-center gap-2">
                    {!demoMode && user ? <SyncStatusPill compact /> : null}
                    <button
                      type="button"
                      onClick={() => setCommandPaletteOpen(true)}
                      className="flex items-center gap-2.5 rounded-[11px] border border-app-line bg-app-surface px-3.5 py-2 text-sm font-medium text-app-ink-muted transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                      aria-label="Mở command palette"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>Tìm nhanh</span>
                      <kbd className="ml-0.5 hidden rounded-md border border-app-line bg-app-bg px-1.5 py-0.5 font-mono text-[11px] font-medium text-app-ink-muted sm:inline-block">
                        ⌘K
                      </kbd>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <main
              className={`relative ${isSignedOutVisitor || isPublicLanding ? "" : "main-content-mobile-pad"}`}
              id="main-content"
              aria-label="Nội dung trang"
            >
              {/* Screen-reader route announcer */}
              <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
                {pageMeta.label}
              </div>
              {pageTransitionContent}
              {isSignedOutVisitor && !isPublicLanding && !isTwelveWeekExecutionWorkspace ? <AppPublicFooter /> : null}
            </main>

            {user && !isTwelveWeekExecutionWorkspace ? (
              <footer className="mx-auto max-w-7xl px-4 pb-24 text-xs tracking-tight text-app-ink-muted sm:px-6 md:pb-8 lg:px-8">
                <div className="flex flex-col items-center gap-3 border-t border-app-line pt-4 md:flex-row md:justify-between">
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <span className="font-semibold">v1.0</span>
                    <span aria-hidden="true">·</span>
                    <span className="hidden max-w-[260px] truncate md:inline">{accountEmail || accountLabel}</span>
                    <span className="hidden md:inline" aria-hidden="true">
                      ·
                    </span>
                    <a
                      href="/settings"
                      className="font-semibold text-app-ink underline-offset-4 transition-colors hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        navigateAppRoute("/settings");
                      }}
                    >
                      Cài đặt
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="https://www.tiktok.com/@dofexe201"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                      className="inline-flex size-7 items-center justify-center rounded-full text-app-ink-muted transition-colors duration-150 hover:text-app-accent"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M19.5 6.5a5 5 0 0 1-3.5-1.5V15a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V2h3a5 5 0 0 0 3.5 3.5z" />
                      </svg>
                      <span className="sr-only">TikTok</span>
                    </a>
                    <a
                      href="https://www.instagram.com/dearourfuture"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="inline-flex size-7 items-center justify-center rounded-full text-app-ink-muted transition-colors duration-150 hover:text-app-accent"
                    >
                      <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">Instagram</span>
                    </a>
                    <a
                      href="https://www.facebook.com/profile.php?id=61589773962146"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="inline-flex size-7 items-center justify-center rounded-full text-app-ink-muted transition-colors duration-150 hover:text-app-accent"
                    >
                      <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">Facebook</span>
                    </a>
                  </div>
                </div>
              </footer>
            ) : null}
          </div>

          {!isSignedOutVisitor && !isPublicLanding ? (
            <nav
              className="bottom-nav md:hidden"
              aria-label="Điều hướng dưới"
              style={{ animation: "bottom-nav-rise 0.38s var(--ease-emphasized) both" }}
            >
              <div className="bottom-nav-inner bg-app-surface border-t border-app-line/75 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] rounded-t-2xl p-2 pb-[calc(0.4rem+env(safe-area-inset-bottom,0))]">
                {bottomNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      className="bottom-nav-item rounded-xl transition-transform duration-100 active:scale-95"
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigateAppRoute(item.path);
                      }}
                      onPointerEnter={() => handlePrefetch(item.path)}
                      title={item.label}
                    >
                      <div
                        className={`bottom-nav-icon transition-[color,background-color,transform] duration-150 ${active ? "bg-app-accent shadow-xs scale-105 text-white" : "text-app-ink-muted/80"}`}
                      >
                        <Icon
                          className={`h-4.5 w-4.5 ${active ? "text-white" : "text-app-ink-soft group-hover:text-app-ink"}`}
                          strokeWidth={active ? 2.25 : 1.8}
                        />
                      </div>
                      <span
                        className={`bottom-nav-label font-semibold text-[10px] tracking-tight ${active ? "text-app-accent font-bold" : "text-app-ink-soft/90"}`}
                      >
                        {MOBILE_NAV_LABELS[item.path] ?? item.compactLabel ?? item.label}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="bottom-nav-item rounded-xl transition-transform duration-100 active:scale-95"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  aria-label="Khác"
                  aria-current={isMoreNavActive ? "page" : undefined}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-nav-menu"
                >
                  <div
                    className={`bottom-nav-icon transition-[color,background-color,transform] duration-150 ${isMoreNavActive ? "bg-app-accent shadow-xs scale-105 text-white" : "text-app-ink-muted/80"}`}
                  >
                    <Menu
                      className={`h-4.5 w-4.5 ${isMoreNavActive ? "text-white" : "text-app-ink-soft"}`}
                      strokeWidth={isMoreNavActive ? 2.25 : 1.8}
                    />
                  </div>
                  <span
                    className={`bottom-nav-label font-semibold text-[10px] tracking-tight ${isMoreNavActive ? "text-app-accent font-bold" : "text-app-ink-soft/90"}`}
                  >
                    Khác
                  </span>
                </button>
              </div>
            </nav>
          ) : null}

          {(demoMode || user) && !isPublicLanding ? (
            <Suspense fallback={null}>
              <MotivationalReminder />
            </Suspense>
          ) : null}
          {showSidebar && commandPaletteOpen ? (
            <Suspense fallback={null}>
              <CommandPalette
                open={commandPaletteOpen}
                onOpenChange={setCommandPaletteOpen}
                navItems={NAV_ITEMS}
                goals={commandPaletteGoals}
                onNavigate={navigateAppRoute}
                onOpenGoal={(goalId) => navigateAppRoute(`/goals?goal=${goalId}`)}
                onOpenTwelveWeek={(goalId) => {
                  try {
                    localStorage.setItem("latest_12_week_goal_id", goalId);
                    localStorage.setItem("latest_12_week_system_goal_id", goalId);
                  } catch {
                    /* ignore storage errors */
                  }
                  navigateAppRoute("/12-week-system");
                }}
              />
            </Suspense>
          ) : null}
          {isGuideOpen ? (
            <Suspense fallback={null}>
              <NewUserGuideDialog open={isGuideOpen} onOpenChange={setIsGuideOpen} userData={guideUserData} />
            </Suspense>
          ) : null}
          {localDataMigrationPrompt}

          <Toaster />
          {showAssistant && user ? (
            <Suspense fallback={null}>
              <AIAssistant />
            </Suspense>
          ) : null}
        </div>
      </AssistantPageContextProvider>
      {!demoMode && user ? <FirstLoginRestoreToast /> : null}
    </AutoCloudSyncProvider>
  );
}
