import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Surface-reduction: server-owned reference ids (externalCustomerId /
// externalSubscriptionId) must not be persisted to localStorage. This is
// verified at two levels:
//   1. Pure helper sanitizeSubscriptionForStorage strips the two fields.
//   2. Round-trip through saveUserData/getUserData never persists them, and
//      pre-existing stored data containing them is cleaned on load (migration),
//      while entitlement-driving fields (planCode/status/renewsAt/entitlements)
//      are preserved unchanged.

import { sanitizeSubscriptionForStorage } from "./storage-billing-ops";
import { getUserData, resetUserDataCache, saveUserData } from "./storage";
import {
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
  STORAGE_KEY,
} from "./storage-constants";
import { createEmptyUserData } from "./storage-demo-data";
import type { Subscription, UserData } from "./storage-types";

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    planCode: "PLUS",
    status: "active",
    billingCycle: "monthly",
    startedAt: "2026-04-15T00:00:00.000Z",
    renewsAt: "2026-05-15T00:00:00.000Z",
    canceledAt: null,
    providerMode: "api_contract",
    isLocalTestMode: false,
    externalCustomerId: "cus_live_123",
    externalSubscriptionId: "sub_live_456",
    lastSyncedAt: "2026-04-15T00:00:00.000Z",
    ...overrides,
  };
}

function makeUserData(subscription: Subscription | null): UserData {
  const data = createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
  data.subscription = subscription;
  return data;
}

beforeEach(() => {
  localStorage.clear();
  resetUserDataCache();
});

afterEach(() => {
  localStorage.clear();
  resetUserDataCache();
});

describe("sanitizeSubscriptionForStorage (pure helper)", () => {
  it("returns null for null input", () => {
    expect(sanitizeSubscriptionForStorage(null)).toBeNull();
  });

  it("strips external reference ids but preserves every other field", () => {
    const input = makeSubscription();
    const result = sanitizeSubscriptionForStorage(input);

    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("externalCustomerId");
    expect(result).not.toHaveProperty("externalSubscriptionId");
    // Entitlement-driving + display fields untouched.
    expect(result).toMatchObject({
      planCode: "PLUS",
      status: "active",
      billingCycle: "monthly",
      startedAt: "2026-04-15T00:00:00.000Z",
      renewsAt: "2026-05-15T00:00:00.000Z",
      providerMode: "api_contract",
      isLocalTestMode: false,
      lastSyncedAt: "2026-04-15T00:00:00.000Z",
    });
  });

  it("does not mutate the input object", () => {
    const input = makeSubscription();
    sanitizeSubscriptionForStorage(input);
    expect(input.externalCustomerId).toBe("cus_live_123");
    expect(input.externalSubscriptionId).toBe("sub_live_456");
  });
});

describe("subscription external ids are never persisted to localStorage", () => {
  it("saveUserData does not write external ids to the stored payload", () => {
    expect(saveUserData(makeUserData(makeSubscription()))).toBe(true);

    const raw = localStorage.getItem(STORAGE_KEY) ?? "";
    expect(raw).not.toContain("externalCustomerId");
    expect(raw).not.toContain("externalSubscriptionId");
    expect(raw).not.toContain("cus_live_123");
    expect(raw).not.toContain("sub_live_456");

    // Subscription still present and entitlement-driving fields intact.
    const loaded = getUserData();
    expect(loaded.subscription?.planCode).toBe("PLUS");
    expect(loaded.subscription?.status).toBe("active");
    expect(loaded.subscription?.renewsAt).toBe("2026-05-15T00:00:00.000Z");
    expect(loaded.subscription).not.toHaveProperty("externalCustomerId");
    expect(loaded.subscription).not.toHaveProperty("externalSubscriptionId");
  });

  it("strips external ids from pre-existing stored data on load (migration)", () => {
    // Simulate data written by a previous version that persisted external ids.
    const legacy = makeUserData(makeSubscription());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    resetUserDataCache();

    const loaded = getUserData();
    expect(loaded.subscription?.planCode).toBe("PLUS");
    expect(loaded.subscription).not.toHaveProperty("externalCustomerId");
    expect(loaded.subscription).not.toHaveProperty("externalSubscriptionId");
  });

  it("keeps a null subscription as null", () => {
    expect(saveUserData(makeUserData(null))).toBe(true);
    expect(getUserData().subscription ?? null).toBeNull();
  });
});
