import { describe, expect, it } from "vitest";

import { resolveWorkspaceGateState } from "./useWorkspaceGate";

const baseInput = {
  authLoading: false,
  backendHydrationLoading: false,
  demoMode: false,
  isConfigured: true,
  pathname: "/12-week-system",
  user: { uid: "uid-1" },
  userProfile: null as unknown,
  userProfileError: null as string | null,
  userProfileLoading: false,
};

describe("resolveWorkspaceGateState", () => {
  it("waits for profile when there is no profile, no error, and bootstrap is loading", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      userProfileLoading: true,
    });

    expect(state.shouldWaitForWorkspace).toBe(true);
    expect(state.workspaceGateStage).toBe("profile");
  });

  it("does NOT wait when profile is already available (cache hit) even while still loading", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      userProfile: { id: "profile_1" },
      userProfileLoading: true,
    });

    expect(state.shouldWaitForWorkspace).toBe(false);
    expect(state.shouldShowWorkspaceGate).toBe(false);
    expect(state.workspaceGateStage).toBe("sync");
  });

  it("does NOT wait when profile bootstrap finished with an error (gate handled by error UI)", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      userProfileError: "boom",
      userProfileLoading: false,
    });

    expect(state.shouldWaitForWorkspace).toBe(false);
    expect(state.workspaceGateStage).toBe("sync");
  });

  it("redirects to login when no user and path is auth-protected", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      user: null,
      pathname: "/journal",
    });

    expect(state.shouldRedirectToLogin).toBe(true);
    expect(state.workspaceGateStage).toBe("redirect-login");
  });

  it("does not redirect to login on public legal page", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      user: null,
      pathname: "/terms",
    });

    expect(state.shouldRedirectToLogin).toBe(false);
  });

  it("waits for auth while authLoading is true and a user is signed in", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      authLoading: true,
    });

    expect(state.shouldWaitForWorkspace).toBe(true);
    expect(state.workspaceGateStage).toBe("auth");
  });

  it("skips gate entirely in demo mode", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      demoMode: true,
      user: null,
      userProfileLoading: true,
    });

    expect(state.shouldRedirectToLogin).toBe(false);
    expect(state.shouldWaitForWorkspace).toBe(false);
  });
});
