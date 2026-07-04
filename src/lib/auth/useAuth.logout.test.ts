import { act, renderHook, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMock = vi.hoisted(() => {
  let currentUser: Pick<User, "uid"> | null = null;

  return {
    auth: {
      get currentUser() {
        return currentUser;
      },
    },
    setCurrentUser(user: Pick<User, "uid"> | null) {
      currentUser = user;
    },
    getFirebaseToken: vi.fn(),
    loginWithEmail: vi.fn(),
    loginWithGoogle: vi.fn(),
    logoutFirebase: vi.fn(async () => {
      currentUser = null;
    }),
    registerWithEmail: vi.fn(),
    subscribeAuthState: vi.fn((callback: (user: User | null) => void) => {
      callback(currentUser as User | null);
      return () => undefined;
    }),
    subscribeIdToken: vi.fn((callback: (user: User | null) => void) => {
      callback(currentUser as User | null);
      return () => undefined;
    }),
  };
});

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => firebaseMock.auth,
  getFirebaseToken: firebaseMock.getFirebaseToken,
  isFirebaseAuthEnabled: () => true,
  loginWithEmail: firebaseMock.loginWithEmail,
  loginWithGoogle: firebaseMock.loginWithGoogle,
  logoutFirebase: firebaseMock.logoutFirebase,
  registerWithEmail: firebaseMock.registerWithEmail,
  subscribeAuthState: firebaseMock.subscribeAuthState,
  subscribeIdToken: firebaseMock.subscribeIdToken,
}));

import { LAST_ENTITLEMENT_SYNC_KEY, MOCK_BILLING_ACCOUNT_KEY } from "@/app/utils/production/env";
import { deleteAllUserData, getCurrentPlan, getUserData, saveUserData } from "@/app/utils/storage";
import { getScopedUserDataStorageKey } from "@/app/utils/storage-auth-scope";
import { getMutationQueueStorageKey } from "@/features/plan12week/persistence/mutationQueue";
import { useAuth } from "./useAuth";

const USER_A_UID = "firebase_uid_a";
const USER_B_UID = "firebase_uid_b";
const NOW = "2026-05-14T12:00:00.000Z";

function makeAuthUser(uid: string): Pick<User, "uid"> {
  return { uid };
}

function seedPlusBillingState(): void {
  const data = getUserData();
  data.subscription = {
    planCode: "PLUS",
    status: "active",
    billingCycle: "season-pass",
    startedAt: NOW,
    renewsAt: null,
    canceledAt: null,
    providerMode: "mock_provider",
    externalCustomerId: "customer_a",
    externalSubscriptionId: "subscription_a",
    lastSyncedAt: NOW,
  };
  data.entitlements = [{ key: "premium_templates", sourcePlan: "PLUS", grantedAt: NOW }];
  saveUserData(data);

  localStorage.setItem(
    MOCK_BILLING_ACCOUNT_KEY,
    JSON.stringify({
      customerId: "customer_a",
      subscriptionId: "subscription_a",
      planCode: "PLUS",
      status: "active",
      billingCycle: "season-pass",
      startedAt: NOW,
      renewsAt: null,
      entitlements: data.entitlements,
      updatedAt: NOW,
    }),
  );
  localStorage.setItem(
    LAST_ENTITLEMENT_SYNC_KEY,
    JSON.stringify({
      at: NOW,
      status: "success",
      providerMode: "mock_provider",
      planCode: "PLUS",
      entitlementCount: 1,
      message: "Synced Plus for user A",
    }),
  );
}

describe("useAuth logout", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "vision-board-test");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "test-app-id");
    localStorage.clear();
    deleteAllUserData();
    firebaseMock.setCurrentUser(null);
    firebaseMock.getFirebaseToken.mockReset();
    firebaseMock.loginWithEmail.mockReset();
    firebaseMock.loginWithGoogle.mockReset();
    firebaseMock.logoutFirebase.mockClear();
    firebaseMock.registerWithEmail.mockReset();
    firebaseMock.subscribeAuthState.mockClear();
    firebaseMock.subscribeIdToken.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("clears billing, entitlement sync, and UID-scoped mutation queue before signing out", async () => {
    firebaseMock.setCurrentUser(makeAuthUser(USER_A_UID));
    localStorage.setItem("firebase_id_token", "token_a");

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user?.uid).toBe(USER_A_UID);
    });

    seedPlusBillingState();

    const userAQueueKey = getMutationQueueStorageKey(USER_A_UID);
    const userBQueueKey = getMutationQueueStorageKey(USER_B_UID);
    localStorage.setItem(
      userAQueueKey,
      JSON.stringify({
        version: 1,
        ownerUid: USER_A_UID,
        deviceId: "device_a",
        updatedAt: NOW,
        items: [{ id: "mutation_a" }],
      }),
    );
    localStorage.setItem(
      userBQueueKey,
      JSON.stringify({
        version: 1,
        ownerUid: USER_B_UID,
        deviceId: "device_b",
        updatedAt: NOW,
        items: [{ id: "mutation_b" }],
      }),
    );

    expect(getCurrentPlan()).toBe("PLUS");
    expect(localStorage.getItem(MOCK_BILLING_ACCOUNT_KEY)).not.toBeNull();
    expect(localStorage.getItem(LAST_ENTITLEMENT_SYNC_KEY)).not.toBeNull();
    expect(localStorage.getItem(userAQueueKey)).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(firebaseMock.logoutFirebase).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(MOCK_BILLING_ACCOUNT_KEY)).toBeNull();
    expect(localStorage.getItem(LAST_ENTITLEMENT_SYNC_KEY)).toBeNull();
    expect(localStorage.getItem(userAQueueKey)).toBeNull();
    expect(localStorage.getItem(userBQueueKey)).not.toBeNull();

    const scopedA = JSON.parse(localStorage.getItem(getScopedUserDataStorageKey(USER_A_UID)) ?? "null");
    expect(scopedA?.subscription).toBeNull();
    expect(scopedA?.entitlements ?? []).toEqual([]);
  });
});
