import { render, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/types/api";

const apiClientMock = vi.hoisted(() => ({
  post: vi.fn(),
}));

const authHookMock = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  useAuth: vi.fn(),
}));

const monitoringMock = vi.hoisted(() => ({
  captureFrontendException: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  post: apiClientMock.post,
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  captureFrontendException: monitoringMock.captureFrontendException,
}));

vi.mock("./useAuth", () => ({
  useAuth: authHookMock.useAuth,
}));

import { AuthProvider, useAuthContext } from "./AuthContext";
import { writeCachedUserProfile } from "./userProfileCache";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: "firebase_uid_auth_monitor",
    email: "auth-monitor@example.com",
    emailVerified: true,
    ...overrides,
  } as User;
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const now = "2026-06-26T00:00:00.000Z";
  return {
    id: "profile_auth_monitor",
    firebaseUid: "firebase_uid_auth_monitor",
    email: "auth-monitor@example.com",
    displayName: "Auth Monitor",
    role: "user",
    onboardingCompletedAt: null,
    termsAcceptedAt: null,
    avatarUrl: null,
    locale: "vi",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function Probe() {
  const auth = useAuthContext();
  return createElement(
    "div",
    { "data-testid": "profile-state" },
    auth.isProfileFromCache ? "cache" : auth.userProfileError ?? "ready",
  );
}

function renderAuthProvider() {
  return render(createElement(AuthProvider, null, createElement(Probe)));
}

beforeEach(() => {
  localStorage.clear();
  apiClientMock.post.mockReset();
  authHookMock.refreshUser.mockReset();
  monitoringMock.captureFrontendException.mockReset();
  authHookMock.useAuth.mockReturnValue({
    user: makeUser(),
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    getToken: vi.fn(),
    refreshUser: authHookMock.refreshUser,
    isConfigured: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuthProvider profile bootstrap monitoring", () => {
  it("captures final profile bootstrap failures with safe metadata", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("profile unavailable"), { status: 400 });
    apiClientMock.post.mockRejectedValue(error);

    renderAuthProvider();

    await waitFor(() => expect(monitoringMock.captureFrontendException).toHaveBeenCalledTimes(1), { timeout: 6_000 });
    expect(monitoringMock.captureFrontendException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: {
          area: "auth",
          operation: "profile_bootstrap",
        },
        extra: expect.objectContaining({
          attempts: 3,
          cacheFallbackAvailable: false,
          recoverable: false,
          status: 400,
          timedOut: false,
        }),
      }),
    );
    expect(JSON.stringify(monitoringMock.captureFrontendException.mock.calls[0]?.[1])).not.toContain(
      "firebase_uid_auth_monitor",
    );
    expect(JSON.stringify(monitoringMock.captureFrontendException.mock.calls[0]?.[1])).not.toContain(
      "auth-monitor@example.com",
    );
  });

  it("still uses cached profile fallback after a monitored recoverable failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cachedProfile = makeProfile();
    writeCachedUserProfile(cachedProfile);
    apiClientMock.post.mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429, rateLimited: true }));

    renderAuthProvider();

    await waitFor(() => expect(monitoringMock.captureFrontendException).toHaveBeenCalledTimes(1), { timeout: 6_000 });
    await waitFor(() =>
      expect(document.querySelector("[data-testid='profile-state']")).toHaveTextContent("cache"),
    );
    expect(monitoringMock.captureFrontendException.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        extra: expect.objectContaining({
          cacheFallbackAvailable: true,
          recoverable: true,
          status: 429,
        }),
      }),
    );
  });
});
