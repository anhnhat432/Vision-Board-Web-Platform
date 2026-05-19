import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSubscriptionGraceState } from "./billing-grace-period";
import { getCurrentPlanFromData } from "./storage-billing-ops";
import type { AppPreferences, Entitlement, Subscription, UserData } from "./storage-types";
import { getEntitlementsForPlan } from "./twelve-week-premium";

const NOW = new Date("2026-05-15T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const defaultAppPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: false,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

function isoFromNow(offsetMs: number): string {
  return new Date(NOW.getTime() + offsetMs).toISOString();
}

function createUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    storageVersion: 4,
    userId: "user_billing_grace",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: { ...defaultAppPreferences },
    subscription: null,
    entitlements: [],
    onboardingCompleted: true,
    ...overrides,
  };
}

function createPlusSubscription(renewsAt: string): Subscription {
  return {
    planCode: "PLUS",
    status: "active",
    billingCycle: "monthly",
    startedAt: "2026-04-15T00:00:00.000Z",
    renewsAt,
    canceledAt: null,
    providerMode: "api_contract",
    isLocalTestMode: false,
  };
}

function createPlusUserData(
  renewsAt: string,
  entitlements: Entitlement[] = getEntitlementsForPlan("PLUS", NOW.toISOString()),
): UserData {
  return createUserData({
    subscription: createPlusSubscription(renewsAt),
    entitlements,
  });
}

describe("subscription grace period", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns active=true, inGracePeriod=false when renewsAt is in future", () => {
    const data = createPlusUserData(isoFromNow(DAY_MS));

    expect(getSubscriptionGraceState(data)).toEqual({
      active: true,
      inGracePeriod: false,
      gracePeriodEndsAt: null,
      daysRemaining: 1,
    });
  });

  it("returns active=true, inGracePeriod=true when 1 day past renewsAt", () => {
    const renewsAt = isoFromNow(-DAY_MS);
    const data = createPlusUserData(renewsAt);

    expect(getSubscriptionGraceState(data)).toEqual({
      active: true,
      inGracePeriod: true,
      gracePeriodEndsAt: isoFromNow(2 * DAY_MS),
      daysRemaining: 2,
    });
  });

  it("returns active=true, inGracePeriod=true when 2.9 days past renewsAt", () => {
    const renewsAt = isoFromNow(-2.9 * DAY_MS);
    const data = createPlusUserData(renewsAt);

    expect(getSubscriptionGraceState(data)).toEqual({
      active: true,
      inGracePeriod: true,
      gracePeriodEndsAt: new Date(new Date(renewsAt).getTime() + 3 * DAY_MS).toISOString(),
      daysRemaining: 1,
    });
  });

  it("returns active=false when 3.1 days past renewsAt", () => {
    const data = createPlusUserData(isoFromNow(-3.1 * DAY_MS));

    expect(getSubscriptionGraceState(data)).toEqual({
      active: false,
      inGracePeriod: false,
      gracePeriodEndsAt: null,
      daysRemaining: 0,
    });
  });

  it("revokes entitlements only after grace period ends", () => {
    const entitlements = getEntitlementsForPlan("PLUS", NOW.toISOString());
    const data = createPlusUserData(isoFromNow(-3.1 * DAY_MS), entitlements);
    let persistCalls = 0;

    const plan = getCurrentPlanFromData(data, () => {
      persistCalls += 1;
    });

    expect(plan).toBe("FREE");
    expect(data.subscription?.status).toBe("canceled");
    expect(data.entitlements).toEqual([]);
    expect(persistCalls).toBe(1);
  });

  it("preserves entitlements during grace period", () => {
    const entitlements = getEntitlementsForPlan("PLUS", NOW.toISOString());
    const data = createPlusUserData(isoFromNow(-DAY_MS), entitlements);
    let persistCalls = 0;

    const plan = getCurrentPlanFromData(data, () => {
      persistCalls += 1;
    });

    expect(plan).toBe("PLUS");
    expect(data.subscription?.status).toBe("active");
    expect(data.entitlements).toEqual(entitlements);
    expect(persistCalls).toBe(0);
  });
});
