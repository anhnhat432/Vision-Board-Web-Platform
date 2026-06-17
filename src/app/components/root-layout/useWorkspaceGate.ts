export type WorkspaceGateStage = "redirect-login" | "auth" | "profile" | "sync";

interface UseWorkspaceGateOptions {
  authLoading: boolean;
  backendHydrationLoading: boolean;
  demoMode: boolean;
  isConfigured: boolean;
  pathname: string;
  user: unknown | null;
  userProfile: unknown | null;
  userProfileError: string | null;
  userProfileLoading: boolean;
}

interface WorkspaceGateState {
  shouldRedirectToLogin: boolean;
  shouldWaitForWorkspace: boolean;
  shouldShowWorkspaceGate: boolean;
  workspaceGateStage: WorkspaceGateStage;
}

export function isAuthProtectedPath(pathname: string): boolean {
  return pathname === "/12-week-setup" || pathname === "/order" || pathname.startsWith("/order-status");
}

export function isPublicCheckoutPath(pathname: string): boolean {
  return (
    pathname === "/billing/confirm" || pathname === "/billing/checkout" || pathname.startsWith("/billing/checkout/")
  );
}

export function isPublicHomePath(pathname: string): boolean {
  return pathname === "/";
}

export function isPublicLegalPath(pathname: string): boolean {
  return (
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/billing/faq" ||
    pathname === "/help"
  );
}

export function buildLoginRedirect(pathname: string, search: string, hash: string) {
  const destination = `${pathname}${search}${hash}`;
  return {
    destination,
    loginPath: `/login?next=${encodeURIComponent(destination)}`,
  };
}

export function resolveWorkspaceGateState({
  authLoading,
  backendHydrationLoading,
  demoMode,
  pathname,
  user,
  userProfile,
  userProfileError,
  userProfileLoading,
}: UseWorkspaceGateOptions): WorkspaceGateState {
  const isPublicHome = isPublicHomePath(pathname);
  const canRenderWhileSignedOut =
    isPublicHome || isPublicLegalPath(pathname) || isAuthProtectedPath(pathname) || isPublicCheckoutPath(pathname);
  const hasUser = Boolean(user);
  const shouldRedirectToLogin = !demoMode && !authLoading && !hasUser && !canRenderWhileSignedOut;
  const shouldWaitForAuth = !demoMode && (!isPublicHome || hasUser) && authLoading;
  // Khi đã có profile (kể cả từ cache), không lock UI dù đang refresh ngầm —
  // tránh việc bootstrap 429 khiến class demo bị giữ ở splash hoặc bounce
  // sang /onboarding (B1 fallback).
  const shouldWaitForProfile =
    !demoMode && !authLoading && hasUser && !userProfile && !userProfileError && userProfileLoading;
  // B1 follow-up (verify 2026-05-26 trên prod): backend trả profile với
  // onboardingCompletedAt=null ngay cả khi user đã có 12-week plan trên DB
  // (data inconsistency). RootLayout guard sẽ bounce về /onboarding nếu
  // không thấy plan trong localStorage. Vì useBackendPlanHydration vẫn
  // đang fetch /api/plans, ta phải gate bounce cho đến khi plan hydrate
  // xong. Chỉ áp dụng khi:
  //   - user đã có profile (đã qua bootstrap),
  //   - profile thiếu onboardingCompletedAt (cần plan để fallback),
  //   - hydration đang loading.
  const profileMissingOnboardingFlag =
    Boolean(userProfile) && !(userProfile as { onboardingCompletedAt?: string | null } | null)?.onboardingCompletedAt;
  const shouldWaitForBackendPlan =
    !demoMode && !authLoading && hasUser && profileMissingOnboardingFlag && backendHydrationLoading;
  const shouldWaitForWorkspace = shouldWaitForAuth || shouldWaitForProfile || shouldWaitForBackendPlan;
  const workspaceGateStage: WorkspaceGateStage = shouldRedirectToLogin
    ? "redirect-login"
    : shouldWaitForAuth
      ? "auth"
      : shouldWaitForProfile
        ? "profile"
        : "sync";

  return {
    shouldRedirectToLogin,
    shouldWaitForWorkspace,
    shouldShowWorkspaceGate: shouldRedirectToLogin || shouldWaitForWorkspace,
    workspaceGateStage,
  };
}

export function useWorkspaceGate(options: UseWorkspaceGateOptions): WorkspaceGateState {
  return resolveWorkspaceGateState(options);
}
