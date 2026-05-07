import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Compass,
  HardDrive,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  User2,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useOutlet } from "react-router";
import { maybeShowBrowserReminderNotification, syncPendingOutbox } from "../utils/production";
import { exportUserDataSnapshot, getUserData, initializeUserData, trackAppEvent, USER_DATA_UPDATED_EVENT_NAME } from "../utils/storage";
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
import { MotivationalReminder } from "./MotivationalReminder";
import { NewUserGuideDialog } from "./NewUserGuide";
import {
  LocalDataMigrationPrompt,
  type CloudImportDryRunResult,
  type CloudImportResult,
} from "./root-layout/LocalDataMigrationPrompt";
import {
  buildAuthPath,
  getNavItemsForState,
  isActiveRoute,
  MOBILE_NAV_LABELS,
  prefetchRoute,
  WARM_PREFETCH_ROUTE_PATHS,
} from "./root-layout/navConfig";
import { GUIDED_PATHS, getRouteMeta, getRouteTone } from "./root-layout/routeMeta";
import { WorkspaceLoadingGate } from "./root-layout/WorkspaceLoadingGate";
import { buildLoginRedirect, isAuthProtectedPath, useWorkspaceGate } from "./root-layout/useWorkspaceGate";
import { Button } from "./ui/button";
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

  return "Không thể kiểm tra cloud import lúc này.";
}

function createImportValidationRequestId(): string {
  return `import_validate_${Date.now().toString(36)}`;
}

function createCloudImportId(): string {
  return `cloud_import_${Date.now().toString(36)}`;
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
  const desktopMoreRef = useRef<HTMLDivElement | null>(null);
  const [guideUserData, setGuideUserData] = useState(() => getUserData());
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [localDataMigrationCandidate, setLocalDataMigrationCandidate] =
    useState<LocalDataMigrationCandidate | null>(null);
  const [isLocalDataMigrationPromptOpen, setIsLocalDataMigrationPromptOpen] = useState(false);

  const routeScrollKey = `${location.pathname}${location.search}`;
  const currentRouteKey = `${routeScrollKey}${location.hash}`;
  const { shouldRedirectToLogin, shouldShowWorkspaceGate, shouldWaitForWorkspace, workspaceGateStage } =
    useWorkspaceGate({
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

    if (!demoMode && isAuthProtectedPath(location.pathname)) return;

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
    const currentPath = location.pathname;
    if (
      !currentPath ||
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const heroCards = Array.from(document.querySelectorAll<HTMLElement>(".hero-surface")).filter(
      (card) => !card.closest(".interactive-surface"),
    );

    const resetCard = (card: HTMLElement) => {
      card.style.setProperty("--hero-pointer-x", "0.5");
      card.style.setProperty("--hero-pointer-y", "0.5");
      card.style.setProperty("--hero-rotate-x", "0deg");
      card.style.setProperty("--hero-rotate-y", "0deg");
      card.style.setProperty("--hero-shift-x", "0px");
      card.style.setProperty("--hero-shift-y", "0px");
      card.dataset.heroHovering = "false";
    };

    const cleanups = heroCards.map((card) => {
      resetCard(card);

      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;

        const bounds = card.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return;

        const pointerX = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
        const pointerY = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
        const rotateX = ((0.5 - pointerY) * 3.5).toFixed(3);
        const rotateY = ((pointerX - 0.5) * 3.5).toFixed(3);
        const shiftX = ((pointerX - 0.5) * 6).toFixed(2);
        const shiftY = ((pointerY - 0.5) * 6).toFixed(2);

        card.style.setProperty("--hero-pointer-x", pointerX.toFixed(4));
        card.style.setProperty("--hero-pointer-y", pointerY.toFixed(4));
        card.style.setProperty("--hero-rotate-x", `${rotateX}deg`);
        card.style.setProperty("--hero-rotate-y", `${rotateY}deg`);
        card.style.setProperty("--hero-shift-x", `${shiftX}px`);
        card.style.setProperty("--hero-shift-y", `${shiftY}px`);
        card.dataset.heroHovering = "true";
      };

      const handleLeave = () => {
        resetCard(card);
      };

      card.addEventListener("pointermove", handleMove);
      card.addEventListener("pointerenter", handleMove);
      card.addEventListener("pointerleave", handleLeave);

      return () => {
        card.removeEventListener("pointermove", handleMove);
        card.removeEventListener("pointerenter", handleMove);
        card.removeEventListener("pointerleave", handleLeave);
        resetCard(card);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, [location.pathname]);

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
  const backendHydrationStatus = backendPlanHydration.result?.status;
  const accountStatus = !isConfigured
    ? "Demo local"
    : authLoading
      ? "Đang kiểm tra"
      : !user
        ? "Chưa đăng nhập"
        : userProfileLoading
          ? "Đang nối backend"
          : userProfileError
            ? "Lỗi profile"
            : userProfile
              ? backendPlanHydration.loading
                ? "Đang đồng bộ"
                : backendPlanHydration.error
                  ? "Lỗi đồng bộ"
                  : backendHydrationStatus === "partial"
                    ? "Đồng bộ một phần"
                    : backendHydrationStatus === "success"
                      ? "Đã đồng bộ"
                      : "Đã nối backend"
              : "Chờ profile";
  const accountStatusClass =
    userProfileError || backendPlanHydration.error
      ? "bg-red-50 text-red-700 ring-red-200"
      : backendHydrationStatus === "partial"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : backendPlanHydration.loading
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : userProfile
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-slate-50 text-slate-600 ring-slate-200";
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
    ? "Demo mode chỉ lưu local trên trình duyệt này, không gọi cloud import."
    : !user
      ? "Bạn cần đăng nhập trước khi kiểm tra cloud import."
      : !isApiBaseUrlConfigured()
        ? "Backend API chưa được cấu hình cho workspace này."
        : !shouldEnable12WeekImportDryRun()
          ? "Cloud import dry-run đang tắt bằng feature flag."
          : undefined;

  const handleValidateCloudImport = useCallback(async (): Promise<CloudImportDryRunResult> => {
    if (demoMode) {
      return {
        status: "skipped",
        message: "Demo mode chỉ lưu local trên trình duyệt này, không gọi cloud import.",
      };
    }

    if (!user?.uid) {
      return {
        status: "skipped",
        message: "Bạn cần đăng nhập trước khi kiểm tra cloud import.",
      };
    }

    if (!isApiBaseUrlConfigured()) {
      return {
        status: "skipped",
        message: "Backend API chưa được cấu hình cho workspace này.",
      };
    }

    if (!shouldEnable12WeekImportDryRun()) {
      return {
        status: "skipped",
        message: "Cloud import dry-run đang tắt bằng feature flag.",
      };
    }

    const importPayloads = getUserData()
      .goals.map(createTwelveWeekImportPayload)
      .filter((payload): payload is TwelveWeekImportPayload => Boolean(payload));
    if (importPayloads.length === 0) {
      return {
        status: "skipped",
        message: "Account scope trên trình duyệt này chưa có dữ liệu 12 tuần để kiểm tra.",
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
            ? "Payload hợp lệ cho cloud import dry-run. Backend chưa ghi cloud data."
            : "Backend báo payload chưa sẵn sàng cho cloud import.",
        report,
      };
    } catch (error) {
      const report = getImportValidationReportFromError(error);
      if (report) {
        return {
          status: "invalid",
          message: "Backend báo payload chưa sẵn sàng cho cloud import.",
          report,
        };
      }

      return {
        status: "error",
        message: getErrorMessage(error),
      };
    }
  }, [demoMode, user?.uid]);

  const cloudImportEnabled =
    !demoMode && Boolean(user) && isApiBaseUrlConfigured() && shouldEnable12WeekCloudImport();
  const cloudImportUnavailableReason = demoMode
    ? "Demo mode chỉ lưu local trên trình duyệt này, không gọi cloud import."
    : !user
      ? "Bạn cần đăng nhập trước khi import cloud."
      : !isApiBaseUrlConfigured()
        ? "Backend API chưa được cấu hình cho workspace này."
        : !shouldEnable12WeekCloudImport()
          ? "Cloud import chưa được bật bằng feature flag."
          : undefined;
  const cloudImportAlreadyCompleted = Boolean(
    user?.uid && localDataMigrationCandidate && hasCompletedCloudImport(user.uid, localDataMigrationCandidate.fingerprint),
  );

  const handleCloudImport = useCallback(async (): Promise<CloudImportResult> => {
    if (demoMode) {
      return {
        status: "skipped",
        message: "Demo mode chỉ lưu local trên trình duyệt này, không gọi cloud import.",
      };
    }

    if (!user?.uid) {
      return {
        status: "skipped",
        message: "Bạn cần đăng nhập trước khi import cloud.",
      };
    }

    if (!isApiBaseUrlConfigured()) {
      return {
        status: "skipped",
        message: "Backend API chưa được cấu hình cho workspace này.",
      };
    }

    if (!shouldEnable12WeekCloudImport()) {
      return {
        status: "skipped",
        message: "Cloud import chưa được bật bằng feature flag.",
      };
    }

    const importPayloads = getUserData()
      .goals.map(createTwelveWeekImportPayload)
      .filter((payload): payload is TwelveWeekImportPayload => Boolean(payload));
    if (importPayloads.length === 0) {
      return {
        status: "skipped",
        message: "Account scope trên trình duyệt này chưa có dữ liệu 12 tuần để import.",
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
      trackAppEvent(
        succeeded ? "cloud_import_succeeded" : "cloud_import_partial",
        undefined,
        {
          status: response.status,
          importId,
        },
      );

      return {
        status: response.status,
        message:
          response.status === "applied"
            ? "Dữ liệu đã được import lên cloud thành công."
            : response.status === "duplicate"
              ? "Dữ liệu này đã được import lên cloud trước đó."
              : response.status === "partial"
                ? "Import thành công một phần. Một số mục có thể chưa được ghi cloud."
                : response.message || "Import thất bại.",
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
        message: isRecord(error) && typeof error.message === "string" && error.message.trim()
          ? error.message
          : "Không thể import cloud lúc này. Dữ liệu local vẫn an toàn.",
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

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pageTransition = prefersReducedMotion
    ? ({
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      } as const)
    : ({
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
      } as const);

  if (shouldShowWorkspaceGate) {
    return <WorkspaceLoadingGate stage={workspaceGateStage} />;
  }

  if (GUIDED_PATHS.has(location.pathname)) {
    return (
      <div className="app-shell min-h-screen" data-route-tone={routeTone}>
        {demoMode ? (
          <div
            role="note"
            className="border-b border-amber-200 bg-amber-50/85 px-4 py-1.5 text-center text-[11px] font-medium text-amber-800 sm:px-6"
          >
            <HardDrive className="mr-1 inline h-3 w-3 align-text-bottom" />
            Đang ở chế độ <strong>demo</strong> — dữ liệu chỉ lưu trên trình duyệt này. Có thể bấm{" "}
            <span className="font-semibold">Tạm thoát</span> bất kỳ lúc nào để quay lại bảng điều khiển.
          </div>
        ) : null}
        <div className="relative z-10">
          <AnimatePresence initial={false}>
            <motion.div key={location.pathname} className="page-transition-shell" {...pageTransition}>
              {outlet}
            </motion.div>
          </AnimatePresence>
          {localDataMigrationPrompt}
          <Toaster />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen" data-route-tone={routeTone}>
      <a href="#main-content" className="skip-to-content">
        Bỏ qua điều hướng
      </a>

      <header className="sticky top-0 z-40 px-4 pt-2 sm:top-3 sm:px-6 sm:pt-0 lg:px-8">
        <div className="glass-surface mx-auto max-w-5xl rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.1)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigateAppRoute("/")}
                className="flex shrink-0 items-center gap-2.5 rounded-lg text-left transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                aria-label="Về trang chủ Dear Our Future"
              >
                <div className="flex size-9 items-center justify-center rounded-xl" style={shellBadgeStyle}>
                  <Sparkles className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold tracking-normal text-slate-900">Dear Our Future</h1>
                </div>
              </button>

              {demoMode ? (
                <span
                  title="Đang ở chế độ demo — dữ liệu chỉ lưu trên trình duyệt hiện tại, không gửi lên server."
                  className="hidden shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold leading-none text-amber-800 sm:inline-flex"
                >
                  <HardDrive className="h-3 w-3" aria-hidden="true" />
                  Demo · cục bộ
                </span>
              ) : null}
            </div>

            <nav className="hidden flex-1 items-center justify-center md:flex">
              <div className="flex flex-wrap items-center gap-0.5 rounded-full border border-slate-200/60 bg-slate-50/80 px-1.5 py-1">
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
                      className={`h-8 shrink-0 rounded-full px-3 text-[0.82rem] transition-colors transition-transform duration-150 active:scale-95 ${
                        active
                          ? "text-white hover:text-white"
                          : "bg-transparent text-slate-600 shadow-none hover:bg-white/90 hover:text-slate-900"
                      }`}
                      style={active ? activeNavStyle : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.compactLabel ?? item.label}</span>
                    </Button>
                  );
                })}

                {secondaryNavItems.length > 0 ? (
                  <>
                    <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200/60" />

                    <div ref={desktopMoreRef} className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-current={secondaryNavItems.some((item) => isActive(item.path)) ? "page" : undefined}
                        aria-expanded={desktopMoreOpen}
                        aria-haspopup="menu"
                        className={`h-8 shrink-0 rounded-full px-3 text-[0.82rem] transition-colors transition-transform duration-150 active:scale-95 ${
                          isDesktopMoreNavActive
                            ? "text-white hover:text-white"
                            : "bg-transparent text-slate-500 shadow-none hover:bg-white/90 hover:text-slate-700"
                        }`}
                        style={isDesktopMoreNavActive ? activeNavStyle : undefined}
                        onClick={() => setDesktopMoreOpen((open) => !open)}
                      >
                        <Menu className="h-3.5 w-3.5" />
                        <span>Thêm</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${desktopMoreOpen ? "rotate-180" : ""}`}
                        />
                      </Button>

                      {desktopMoreOpen ? (
                        <div
                          role="menu"
                          aria-label="Mục khác"
                          className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/96 p-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.32)] backdrop-blur-xl"
                        >
                          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Mục khác
                          </div>
                          <div className="mx-1 mb-1 h-px bg-slate-200/80" />
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
                                className={`my-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium tracking-normal outline-none transition-colors ${
                                  active
                                    ? "text-white focus:text-white"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 focus:bg-slate-50 focus:text-slate-950"
                                }`}
                                style={active ? activeNavStyle : undefined}
                              >
                                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
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

            <div className="hidden shrink-0 items-center gap-1 md:flex">
              {user ? (
                <button
                  type="button"
                  onClick={() => navigateAppRoute("/billing/plan")}
                  className="flex max-w-[180px] items-center gap-2 rounded-full border border-slate-200/60 bg-slate-50/80 px-2.5 py-1.5 text-left text-slate-700 transition-colors hover:bg-white"
                  title={accountLabel}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-600">
                    <User2 className="h-3 w-3" />
                  </span>
                  <span className="truncate text-xs font-medium">{accountLabel}</span>
                </button>
              ) : null}
              {!user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAuthNavigate("signin")}
                    className="h-8 rounded-full border-slate-200/60 bg-white/90 px-3 text-xs text-slate-700 hover:bg-white"
                  >
                    Đăng nhập
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAuthNavigate("signup")}
                    className="h-8 rounded-full bg-slate-900 px-3 text-xs text-white hover:bg-slate-800"
                  >
                    Đăng ký
                  </Button>
                </>
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/12"
                aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
              >
                {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="md:hidden flex min-w-0 items-center gap-2">
              <span className="hidden max-w-[120px] truncate text-sm font-medium tracking-normal text-slate-700 dark:text-slate-200 sm:inline">
                {pageMeta.label}
              </span>
              <button
                type="button"
                className="hidden size-11 items-center justify-center rounded-xl border border-white/72 bg-white/76 text-slate-700 transition-colors active:scale-95 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300 sm:flex"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label={resolvedTheme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-[1.1rem] w-[1.1rem]" />
                ) : (
                  <Moon className="h-[1.1rem] w-[1.1rem]" />
                )}
              </button>
              {isSignedOutVisitor ? (
                <Button
                  size="sm"
                  className="h-11 rounded-xl bg-slate-950 px-3 text-xs text-white shadow-sm hover:bg-slate-800"
                  onClick={() => handleAuthNavigate("signup")}
                >
                  Đăng ký
                </Button>
              ) : (
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-xl border border-white/72 bg-white/76 text-slate-700 transition-colors active:scale-95 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300"
                  onClick={() => {
                    setGuideUserData(getUserData());
                    setIsGuideOpen(true);
                  }}
                  aria-label="Mở hướng dẫn sử dụng"
                >
                  <Compass className="h-[1.1rem] w-[1.1rem]" />
                </button>
              )}
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-xl border border-white/72 bg-white/76 text-slate-700 transition-colors active:scale-95 hover:bg-white"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileMenuOpen ? <X className="h-[1.1rem] w-[1.1rem]" /> : <Menu className="h-[1.1rem] w-[1.1rem]" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-nav-menu" className="mx-auto mt-2 max-w-5xl md:hidden">
            <div className="glass-surface rounded-[28px] p-3">
              <nav className="space-y-1" aria-label="Menu điều hướng">
                {user ? (
                  <div className="mb-2 rounded-2xl border border-white/72 bg-white/82 px-4 py-3 text-left">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <User2 className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{accountLabel}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{accountStatus}</p>
                      </div>
                      <button
                        type="button"
                        onClick={refreshUserProfile}
                        disabled={!canRetryUserProfile}
                        className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
                        aria-label="Kiểm tra lại backend profile"
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
                        className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
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
                  <div className="mb-2 grid grid-cols-2 gap-2 rounded-2xl border border-white/72 bg-white/82 p-2">
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
                      className="w-full bg-slate-950 text-white hover:bg-slate-800"
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
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/72 bg-white/82 px-4 py-3 text-left text-sm font-medium tracking-normal text-slate-700"
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
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-medium tracking-normal transition-transform duration-150 active:scale-[0.98] ${
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

      <main
        className={`relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8 ${
          isSignedOutVisitor ? "" : "main-content-mobile-pad"
        }`}
        id="main-content"
        aria-label="Nội dung trang"
      >
        {/* Screen-reader route announcer */}
        <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
          {pageMeta.label}
        </div>
        <AnimatePresence initial={false}>
          <motion.div key={location.pathname} className="page-transition-shell" {...pageTransition}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

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
              aria-label="Thêm"
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
                Thêm
              </span>
            </button>
          </div>
        </nav>
      ) : null}

      {demoMode || user ? <MotivationalReminder /> : null}
      <NewUserGuideDialog open={isGuideOpen} onOpenChange={setIsGuideOpen} userData={guideUserData} />
      {localDataMigrationPrompt}
      <Toaster />
    </div>
  );
}
