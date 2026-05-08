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
  return pathname === "/order" || pathname.startsWith("/order-status");
}

export function isPublicHomePath(pathname: string): boolean {
  return pathname === "/";
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
  demoMode,
  pathname,
  user,
  userProfile,
  userProfileError,
  userProfileLoading,
}: UseWorkspaceGateOptions): WorkspaceGateState {
  const isPublicHome = isPublicHomePath(pathname);
  const hasUser = Boolean(user);
  const shouldRedirectToLogin =
    !demoMode && !authLoading && !hasUser && !isPublicHome && !isAuthProtectedPath(pathname);
  const shouldWaitForAuth = !demoMode && (!isPublicHome || hasUser) && authLoading;
  const shouldWaitForProfile =
    !demoMode && !authLoading && hasUser && (userProfileLoading || (!userProfile && !userProfileError));
  const shouldWaitForWorkspace = shouldWaitForAuth || shouldWaitForProfile;
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
