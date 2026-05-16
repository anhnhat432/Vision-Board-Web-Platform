import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Compass,
  CreditCard,
  HardDrive,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Sun,
  User2,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useOutlet } from "react-router";
import {
  maybeShowBrowserReminderNotification,
  syncEntitlementsWithProvider,
  syncPendingOutbox,
} from "../utils/production";
import {
  exportUserDataSnapshot,
  getCurrentPlan,
  getUserData,
  initializeUserData,
  trackAppEvent,
  USER_DATA_UPDATED_EVENT_NAME,
} from "../utils/storage";
import { canSendRemoteAnalytics } from "../utils/analytics";
import {
  getNewUserGuideProgress,
  hasSeenNewUserGuide,
  isNewUserGuideDismissed,
  markNewUserGuideSeen,
} from "../utils/new-user-guide";
import { isDemoMode, shouldEnable12WeekImportDryRun, shouldEnable12WeekCloudImport } from "../utils/app-mode";
import {
  getAnonymousLocalDataMigrationCandidate,
  hasCompletedCloudImport,
  hasSkippedLocalDataMigrationPrompt,
  importAnonymousLocalDataToAccountScope,
  markCloudImportCompleted,
  markLocalDataMigrationPromptSkipped,
  type LocalDataMigrationCandidate,
} from "../utils/local-data-migration";
import {
  createTwelveWeekImportPayload,
  type TwelveWeekImportPayload,
} from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { AutoCloudSyncProvider } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  post12WeekImport,
  post12WeekImportValidation,
  type TwelveWeekImportRequest,
  type TwelveWeekImportValidationReport,
  type TwelveWeekImportValidationRequest,
} from "@/services/syncService";
import { BACKEND_PLAN_HYDRATION_EVENT_NAME, useBackendPlanHydration } from "../hooks/useBackendPlanHydration";
import { useTheme } from "../hooks/useTheme";
import { FooterAuroraIllustration } from "./illustrations";
import { MotionPageTransition } from "./motion";
import { MotivationalReminder } from "./MotivationalReminder";
import { NewUserGuideDialog } from "./NewUserGuide";
import {
  LocalDataMigrationPrompt,
  type CloudImportDryRunResult,
  type CloudImportResult,
} from "./root-layout/LocalDataMigrationPrompt";
import { GracePeriodBanner } from "./billing/GracePeriodBanner";
import { AppSidebar } from "./root-layout/AppSidebar";
import { CommandPalette, type CommandPaletteGoal } from "./root-layout/CommandPalette";
import { EmailVerificationBanner } from "./root-layout/EmailVerificationBanner";
import { FirstLoginRestoreToast } from "./root-layout/FirstLoginRestoreToast";
import { SyncStatusPill } from "./root-layout/SyncStatusPill";
import {
  buildAuthPath,
  getNavItemsForState,
  isActiveRoute,
  MOBILE_NAV_LABELS,
  NAV_ITEMS,
  prefetchRoute,
  WARM_PREFETCH_ROUTE_PATHS,
} from "./root-layout/navConfig";
import { GUIDED_PATHS, getRouteMeta, getRouteTone as getFallbackRouteTone } from "./root-layout/routeMeta";
import { buildLoginRedirect, isAuthProtectedPath, isPublicCheckoutPath, useWorkspaceGate } from "./root-layout/useWorkspaceGate";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Toaster } from "./ui/sonner";
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isImportValidationReport(value: unknown): value is TwelveWeekImportValidationReport {
  return (
    isRecord(value) &&
    (value.status === "valid" || value.status === "invalid") &&
    value.mode === "validate_only" &&
    value.dryRun === true &&
    isRecord(value.acceptedEntityCounts) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors)
  );
}

function getImportValidationReportFromError(error: unknown): TwelveWeekImportValidationReport | null {
  if (!isRecord(error)) return null;

  if (isImportValidationReport(error.details)) return error.details;
  if (isRecord(error.details) && isImportValidationReport(error.details.details)) {
    return error.details.details;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Không thể kiểm tra dữ liệu tài khoản lúc này.";
}

function createImportValidationRequestId(): string {
  return `import_validate_${Date.now().toString(36)}`;
}

function createCloudImportId(): string {
  return `cloud_import_${Date.now().toString(36)}`;
}

function getRouteTone(pathname: string): string | undefined {
  if (pathname.startsWith("/login")) return "onboarding";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/12-week-setup")) return "setup";
  if (pathname.startsWith("/12-week-system")) return "system";
  if (pathname.startsWith("/smart-goal-setup")) return "setup";
  if (pathname.startsWith("/feasibility")) return "setup";
  if (pathname.startsWith("/life-insight")) return "setup";
  if (pathname.startsWith("/life-balance")) return "balance";
  if (pathname.startsWith("/vision")) return "vision";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/achievements")) return "achievements";
  if (pathname.startsWith("/billing")) return "billing";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/gallery")) return "vision";
  if (pathname.startsWith("/vision-board")) return "vision";
  if (pathname.startsWith("/goals")) return "system";

  const fallbackTone = getFallbackRouteTone(pathname);
  return fallbackTone === "default" ? undefined : fallbackTone;
}

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isHotkey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isHotkey) return;
      event.preventDefault();
      setCommandPaletteOpen((open) => !open);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const desktopMoreRef = useRef<HTMLDivElement | null>(null);
  const [guideUserData, setGuideUserData] = useState(() => getUserData());
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [localDataMigrationCandidate, setLocalDataMigrationCandidate] = useState<LocalDataMigrationCandidate | null>(
    null,
  );
  const [isLocalDataMigrationPromptOpen, setIsLocalDataMigrationPromptOpen] = useState(false);
  const entitlementAutoSyncScopeRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (userProfile?.role === "admin") {
      navigate("/admin/orders", { replace: true });
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

    if (!demoMode && user && !userData.onboardingCompleted && location.pathname !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [
    demoMode,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    shouldRedirectToLogin,
    shouldWaitForWorkspace,
    user,
    userProfile?.role,
  ]);

  useEffect(() => {
    if (location.pathname) {
      setMobileMenuOpen(false);
      setDesktopMoreOpen(false);
      setGuideUserData(getUserData());
      document.title = getRouteMeta(location.pathname).title ?? "Dear Our Future";
    }
  }, [location.pathname]);

  useEffect(() => {
    if (demoMode || !isConfigured || !isApiBaseUrlConfigured() || !user || !userProfile) return;
    if (userProfile.role === "admin") return;

    const scopeKey = userProfile.id || user.uid;
    if (entitlementAutoSyncScopeRef.current === scopeKey) return;

    const currentData = getUserData();
    if (getCurrentPlan(currentData) !== "FREE") {
      entitlementAutoSyncScopeRef.current = scopeKey;
      return;
    }

    entitlementAutoSyncScopeRef.current = scopeKey;
    let cancelled = false;

    syncEntitlementsWithProvider().then((result) => {
      if (cancelled) return;
      if (result.ok && result.planCode !== "FREE") {
        setGuideUserData(getUserData());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [demoMode, isConfigured, user, userProfile]);

  useEffect(() => {
    if (!canSendRemoteAnalytics() || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const route = `${location.pathname}${location.search}${location.hash}`;
    const timeoutId = window.setTimeout(() => {
      window.gtag?.("event", "page_view", {
        app: "vision_board_web",
        page_path: route,
        page_title: document.title,
        signed_in: Boolean(user),
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.hash, location.pathname, location.search, user]);

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
    if (demoMode) return;
    if (shouldShowWorkspaceGate) return;
    if (!user) return;
    if (location.pathname !== "/") return;
    if (localDataMigrationCandidate && isLocalDataMigrationPromptOpen) return;

    const progress = getNewUserGuideProgress(guideUserData);
    if (progress.isComplete || isNewUserGuideDismissed() || hasSeenNewUserGuide()) {
      return;
    }

    setIsGuideOpen(true);
    markNewUserGuideSeen();
  }, [
    demoMode,
    guideUserData,
    isLocalDataMigrationPromptOpen,
    localDataMigrationCandidate,
    location.pathname,
    shouldShowWorkspaceGate,
    user,
  ]);

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

    setLocalDataMigrationCandidate(candidate);
    setIsLocalDataMigrationPromptOpen(true);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const warmPrimaryHeavyRoutes = () => {
      for (const path of WARM_PREFETCH_ROUTE_PATHS) {
        prefetchRoute(path);
      }
    };

    const timeoutId = globalThis.setTimeout(warmPrimaryHeavyRoutes, 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  const isActive = (path: string) => isActiveRoute(location.pathname, path);

  const handlePrefetch = useCallback((path: string) => prefetchRoute(path), []);
  const handleAuthNavigate = useCallback(
    (mode: "signin" | "signup") => {
      navigate(buildAuthPath(mode, location.pathname, location.search, location.hash));
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  const pageMeta = getRouteMeta(location.pathname);
  const isSignedOutVisitor = isConfigured && !user;
  const { bottomNavItems, mobileMenuNavItems, primaryNavItems, secondaryNavItems } =
    getNavItemsForState(isSignedOutVisitor);
  const isDesktopMoreNavActive = desktopMoreOpen || secondaryNavItems.some((item) => isActive(item.path));
  const isMoreNavActive = mobileMenuOpen || secondaryNavItems.some((item) => isActive(item.path));
  const routeTone = getRouteTone(location.pathname);
  const shellGradientStyle = {
    backgroundImage:
      "linear-gradient(135deg, var(--tone-shell-primary) 0%, var(--tone-shell-secondary) 58%, var(--tone-shell-tertiary) 100%)",
  };
  const shellBadgeStyle = {
    ...shellGradientStyle,
    boxShadow: "0 14px 28px -20px var(--tone-shell-shadow-strong)",
  };
  const activeNavStyle = {
    ...shellGradientStyle,
    boxShadow: "0 14px 30px -18px var(--tone-shell-shadow)",
  };
  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || "Khách";
  const accountEmail = user?.email || userProfile?.email || "";
  const currentAccountPlanCode = getCurrentPlan(guideUserData);
  const accountPlanLabel =
    currentAccountPlanCode === "PRO" ? "Pro" : currentAccountPlanCode === "PLUS" ? "Plus" : "Miễn phí";
  const accountAvatarLabel = (accountLabel || accountEmail || "A").trim().slice(0, 1).toUpperCase();
  const accountStatus = userProfileError ? "Lỗi hồ sơ" : accountEmail || "Tài khoản đã đăng nhập";
  const commandPaletteGoals: CommandPaletteGoal[] = (guideUserData.goals ?? [])
    .slice(0, 12)
    .map((goal) => ({
      id: goal.id,
      title: goal.title || "Mục tiêu chưa đặt tên",
      hasTwelveWeek: Boolean(goal.twelveWeekSystem),
    }));
  const canRetryUserProfile = Boolean(user) && !userProfileLoading && (!userProfile || Boolean(userProfileError));

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
                ? "flex size-10 items-center justify-center rounded-[var(--r-control)] border border-[color:var(--border)] bg-card text-foreground transition-colors hover:bg-[color:var(--muted)]"
                : "flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)] bg-foreground text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            }
            aria-label={triggerLabel}
            title={accountEmail || accountLabel}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-foreground text-xs font-bold uppercase text-background ${
                isMobile ? "h-7 w-7" : "h-8 w-8"
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
          className="w-72 p-1.5"
        >
          <DropdownMenuLabel className="px-2.5 py-3 normal-case tracking-normal">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-foreground text-xs font-bold uppercase text-background">
                {accountAvatarLabel}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Tài khoản
                </p>
                <p className="mt-1 truncate text-[14px] font-semibold tracking-tight text-foreground">
                  {accountEmail || accountLabel}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{accountPlanLabel}</Badge>
                  {!demoMode ? <SyncStatusPill compact={isMobile} /> : null}
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigateAppRoute("/settings")}>
            <Settings2 className="h-4 w-4" />
            Cài đặt
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigateAppRoute("/billing/plan")}>
            <CreditCard className="h-4 w-4" />
            Quản lý gói
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSigningOut}
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
        message: "Tài khoản trên trình duyệt này chưa có dữ liệu 12 tuần để kiểm tra.",
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
        message: "Tài khoản trên trình duyệt này chưa có dữ liệu 12 tuần để đồng bộ.",
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

  const localDataMigrationPrompt = (
    <LocalDataMigrationPrompt
      candidate={localDataMigrationCandidate}
      open={Boolean(localDataMigrationCandidate && isLocalDataMigrationPromptOpen)}
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
  );

  const pageTransitionContent = <MotionPageTransition pageKey={location.pathname}>{outlet}</MotionPageTransition>;

  if (GUIDED_PATHS.has(location.pathname)) {
    return (
      <AutoCloudSyncProvider>
        <div className="app-shell min-h-screen" data-route-tone={routeTone}>
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
              <HardDrive className="mr-1 inline h-3 w-3 align-text-bottom" />
              Bản demo · Dữ liệu lưu trên trình duyệt này.
            </div>
          ) : null}
          <main id="main-content" className="relative z-10" aria-label="Nội dung trang">
            {pageTransitionContent}
            {localDataMigrationPrompt}
            <Toaster />
          </main>
        </div>
        {!demoMode && user ? <FirstLoginRestoreToast /> : null}
      </AutoCloudSyncProvider>
    );
  }

  const showSidebar = !isSignedOutVisitor;

  return (
    <AutoCloudSyncProvider>
      <div className="app-shell min-h-screen" data-route-tone={routeTone}>
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
            onOpenGuide={() => {
              setGuideUserData(getUserData());
              setIsGuideOpen(true);
            }}
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
            shellBadgeStyle={shellBadgeStyle}
          />
        ) : null}

        <div className={showSidebar ? "lg:pl-[272px]" : undefined}>
        <header
          className={`sticky top-0 z-40 px-4 pt-2 sm:top-3 sm:px-6 sm:pt-0 lg:px-8 ${
            showSidebar ? "lg:hidden" : ""
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[var(--r-soft)] border border-[color:var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--card)_82%,transparent)] sm:px-4 sm:py-2.5">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigateAppRoute("/")}
                  className="flex shrink-0 items-center gap-2.5 rounded-[var(--r-control)] text-left transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                  aria-label="Về trang chủ Dear Our Future"
                >
                  <div
                    className="flex size-9 items-center justify-center rounded-[var(--r-control)] shadow-[0_2px_8px_-4px_var(--tone-shell-shadow)]"
                    style={shellBadgeStyle}
                  >
                    <Sparkles className="h-4 w-4 text-white" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-[14px] font-bold tracking-[-0.012em] text-foreground">
                      Dear Our Future
                    </span>
                  </div>
                </button>
              </div>

              <nav className="hidden flex-1 items-center justify-center md:flex">
                <div className="flex flex-wrap items-center gap-0.5 rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-1 py-1">
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
                        className={`h-8 shrink-0 rounded-[var(--r-pill)] px-3 text-sm font-semibold tracking-tight transition-colors duration-150 ${
                          active
                            ? "text-white hover:text-white"
                            : "bg-transparent text-muted-foreground shadow-none hover:bg-card hover:text-foreground"
                        }`}
                        style={active ? activeNavStyle : undefined}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.2 : 1.8} />
                        <span>{item.compactLabel ?? item.label}</span>
                      </Button>
                    );
                  })}

                  {secondaryNavItems.length > 0 ? (
                    <>
                      <div className="mx-1 h-4 w-px shrink-0 bg-[color:var(--border)]" />

                      <div ref={desktopMoreRef} className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-current={secondaryNavItems.some((item) => isActive(item.path)) ? "page" : undefined}
                          aria-expanded={desktopMoreOpen}
                          aria-haspopup="menu"
                          className={`h-8 shrink-0 rounded-[var(--r-pill)] px-3 text-sm font-semibold tracking-tight transition-colors duration-150 ${
                            isDesktopMoreNavActive
                              ? "text-white hover:text-white"
                              : "bg-transparent text-muted-foreground shadow-none hover:bg-card hover:text-foreground"
                          }`}
                          style={isDesktopMoreNavActive ? activeNavStyle : undefined}
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
                            className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-[var(--r-soft)] border border-[color:var(--border)] bg-popover p-1.5 shadow-[0_4px_8px_-2px_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.16)]"
                          >
                            <div className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                                  className={`my-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[calc(var(--r-control)-3px)] px-2.5 py-2 text-left text-sm font-medium tracking-tight outline-none transition-colors ${
                                    active
                                      ? "text-white focus:text-white"
                                      : "text-foreground hover:bg-[color:var(--muted)] focus:bg-[color:var(--muted)]"
                                  }`}
                                  style={active ? activeNavStyle : undefined}
                                >
                                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-muted-foreground"}`} />
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
              </nav>

              <div className="hidden shrink-0 items-center gap-1.5 md:flex">
                {user ? renderAccountMenu("desktop") : null}
                {!user ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAuthNavigate("signin")}
                      className="h-8 rounded-[var(--r-pill)] px-3 text-sm"
                    >
                      Đăng nhập
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAuthNavigate("signup")}
                      className="h-8 rounded-[var(--r-pill)] px-3.5 text-sm"
                    >
                      Đăng ký
                    </Button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)] text-muted-foreground transition-colors hover:bg-[color:var(--muted)] hover:text-foreground"
                  aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                >
                  {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="md:hidden flex min-w-0 items-center gap-1.5">
                <span className="hidden max-w-[120px] truncate text-sm font-semibold tracking-tight text-foreground sm:inline">
                  {pageMeta.label}
                </span>
                <button
                  type="button"
                  className="hidden size-10 items-center justify-center rounded-[var(--r-control)] border border-[color:var(--border)] bg-card text-foreground transition-colors hover:bg-[color:var(--muted)] sm:flex"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  aria-label={resolvedTheme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-[1.05rem] w-[1.05rem]" />
                  ) : (
                    <Moon className="h-[1.05rem] w-[1.05rem]" />
                  )}
                </button>
                {isSignedOutVisitor ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10 rounded-[var(--r-control)] px-3 text-sm"
                    onClick={() => handleAuthNavigate("signup")}
                  >
                    Đăng ký
                  </Button>
                ) : user ? (
                  renderAccountMenu("mobile")
                ) : (
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-[var(--r-control)] border border-[color:var(--border)] bg-card text-foreground transition-colors hover:bg-[color:var(--muted)]"
                    onClick={() => {
                      setGuideUserData(getUserData());
                      setIsGuideOpen(true);
                    }}
                    aria-label="Mở hướng dẫn sử dụng"
                  >
                    <Compass className="h-[1.05rem] w-[1.05rem]" />
                  </button>
                )}
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-[var(--r-control)] border border-[color:var(--border)] bg-card text-foreground transition-colors hover:bg-[color:var(--muted)]"
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
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="mobile-nav-menu" className="mx-auto mt-2 max-w-6xl md:hidden">
              <div className="glass-surface rounded-[var(--r-card)] p-3">
                <nav className="space-y-1" aria-label="Menu điều hướng">
                  {user ? (
                    <div className="mb-2 rounded-[var(--r-card)] border border-white/72 bg-white/82 px-4 py-3 text-left">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-slate-100 text-slate-600">
                          <User2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{accountLabel}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{accountStatus}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigateAppRoute("/settings");
                          }}
                          className="flex size-9 items-center justify-center rounded-[var(--r-tile)] border border-slate-200 bg-white text-slate-600"
                          aria-label="Mở cài đặt tài khoản"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={refreshUserProfile}
                          disabled={!canRetryUserProfile}
                          className="flex size-9 items-center justify-center rounded-[var(--r-tile)] border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
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
                          className="flex size-9 items-center justify-center rounded-[var(--r-tile)] border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
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
                    <div className="mb-2 grid grid-cols-2 gap-2 rounded-[var(--r-card)] border border-white/72 bg-white/82 p-2">
                      <Button
                        variant="outline"
                        className="w-full border-slate-200 bg-white text-slate-900"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleAuthNavigate("signin");
                        }}
                      >
                        Đăng nhập
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full"
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
                      setGuideUserData(getUserData());
                      setIsGuideOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="mb-2 flex w-full items-center gap-3 rounded-[var(--r-control)] border border-white/72 bg-white/82 px-4 py-3 text-left text-sm font-medium tracking-normal text-slate-700"
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
                        className={`flex w-full items-center gap-3 rounded-[var(--r-control)] px-4 py-3.5 text-left text-sm font-medium tracking-normal transition-transform duration-150 active:scale-[0.98] ${
                          active ? "text-white" : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                        }`}
                        style={active ? activeNavStyle : undefined}
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

        {showSidebar ? (
          <div className="sticky top-0 z-30 hidden lg:block">
            <div className="border-b border-[color:var(--border)] bg-[color-mix(in_srgb,var(--background)_72%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--background)_60%,transparent)]">
              <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <nav aria-label="Vị trí trang" className="flex min-w-0 items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Workspace</span>
                  <span aria-hidden="true" className="text-muted-foreground/60">
                    /
                  </span>
                  <span className="truncate font-semibold text-foreground">{pageMeta.label}</span>
                </nav>
                <div className="flex items-center gap-2">
                  {!demoMode && user ? <SyncStatusPill compact /> : null}
                  <button
                    type="button"
                    onClick={() => setCommandPaletteOpen(true)}
                    className="flex items-center gap-2 rounded-[var(--r-control)] border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                    aria-label="Mở command palette"
                  >
                    <Search className="h-3 w-3" />
                    <span>Tìm nhanh</span>
                    <kbd className="ml-1 hidden rounded border border-[color:var(--border)] bg-card px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground xl:inline-block">
                      ⌘K
                    </kbd>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <main
          className={`relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8 ${
            isSignedOutVisitor ? "" : "main-content-mobile-pad"
          }`}
          id="main-content"
          aria-label="Nội dung trang"
        >
          {/* Screen-reader route announcer */}
          <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
            {pageMeta.label}
          </div>
          {pageTransitionContent}
        </main>

        {user ? (
          <div className="pointer-events-none relative z-0 h-32 overflow-hidden text-violet-500" aria-hidden="true">
            <FooterAuroraIllustration className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full opacity-70 dark:opacity-40" />
          </div>
        ) : null}

        {user ? (
          <footer className="relative z-10 mx-auto max-w-6xl px-4 pb-24 text-xs tracking-tight text-muted-foreground sm:px-6 md:pb-8 lg:px-8">
            <div className="flex items-center justify-center gap-2 border-t border-[color:var(--border)] pt-4 md:justify-end">
              <span className="font-semibold">v1.0</span>
              <span aria-hidden="true">·</span>
              <span className="hidden max-w-[260px] truncate md:inline">{accountEmail || accountLabel}</span>
              <span className="hidden md:inline" aria-hidden="true">
                ·
              </span>
              <a
                href="/settings"
                className="font-semibold text-foreground underline-offset-4 transition-colors hover:underline"
                onClick={(event) => {
                  event.preventDefault();
                  navigateAppRoute("/settings");
                }}
              >
                Cài đặt
              </a>
            </div>
          </footer>
        ) : null}
        </div>

        {!isSignedOutVisitor ? (
          <nav
            className="bottom-nav md:hidden"
            aria-label="Điều hướng chính"
            style={{ animation: "bottom-nav-rise 0.38s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <div className="bottom-nav-inner">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className="bottom-nav-item"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigateAppRoute(item.path);
                    }}
                    onPointerEnter={() => handlePrefetch(item.path)}
                    title={item.label}
                  >
                    <div className="bottom-nav-icon">
                      <Icon
                        className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`}
                        strokeWidth={active ? 2.25 : 1.8}
                      />
                    </div>
                    <span className={`bottom-nav-label ${active ? "nav-label-active" : "text-slate-400"}`}>
                      {MOBILE_NAV_LABELS[item.path] ?? item.compactLabel ?? item.label}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                className="bottom-nav-item"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label="Khác"
                aria-current={isMoreNavActive ? "page" : undefined}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-menu"
              >
                <div className="bottom-nav-icon">
                  <Menu
                    className={`h-4 w-4 ${isMoreNavActive ? "text-white" : "text-slate-500"}`}
                    strokeWidth={isMoreNavActive ? 2.25 : 1.8}
                  />
                </div>
                <span className={`bottom-nav-label ${isMoreNavActive ? "nav-label-active" : "text-slate-400"}`}>
                  Khác
                </span>
              </button>
            </div>
          </nav>
        ) : null}

        {demoMode || user ? <MotivationalReminder /> : null}
        {showSidebar ? (
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
        ) : null}
        <NewUserGuideDialog open={isGuideOpen} onOpenChange={setIsGuideOpen} userData={guideUserData} />
        {localDataMigrationPrompt}
        <Toaster />
      </div>
      {!demoMode && user ? <FirstLoginRestoreToast /> : null}
    </AutoCloudSyncProvider>
  );
}
