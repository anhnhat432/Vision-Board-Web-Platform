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

  it("waits for backend plan hydration when profile is missing onboardingCompletedAt (B1 follow-up)", () => {
    // P1 audit verify 2026-05-26: backend trả profile với onboardingCompletedAt=null
    // dù user đã có 12-week plan. Phải gate bounce /onboarding cho đến khi
    // useBackendPlanHydration fetch /api/plans xong, để guard có chance đọc
    // userData.goals[].twelveWeekSystem từ localStorage đã hydrate.
    const state = resolveWorkspaceGateState({
      ...baseInput,
      userProfile: { id: "profile_1", onboardingCompletedAt: null },
      backendHydrationLoading: true,
    });

    expect(state.shouldWaitForWorkspace).toBe(true);
    expect(state.shouldShowWorkspaceGate).toBe(true);
  });

  it("does NOT wait for backend hydration when profile already has onboardingCompletedAt", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      userProfile: { id: "profile_1", onboardingCompletedAt: "2026-04-25T08:20:19.406Z" },
      backendHydrationLoading: true,
    });

    expect(state.shouldWaitForWorkspace).toBe(false);
  });

  it("does NOT wait for backend hydration when hydration is already done", () => {
    const state = resolveWorkspaceGateState({
      ...baseInput,
      userProfile: { id: "profile_1", onboardingCompletedAt: null },
      backendHydrationLoading: false,
    });

    expect(state.shouldWaitForWorkspace).toBe(false);
  });
});
