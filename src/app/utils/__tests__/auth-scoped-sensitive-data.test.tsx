import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSyncedUserData } from "@/app/hooks/useSyncedUserData";
import { MOCK_BILLING_ACCOUNT_KEY } from "@/app/utils/production/env";
import {
  completeMockCheckoutSession,
  getMockBillingAccount,
  mockBillingProvider,
} from "@/app/utils/production/mockBillingProvider";
import {
  activateAuthenticatedUserData,
  getCurrentPlan,
  getUserData,
  persistActiveAuthenticatedUserData,
  saveUserData,
  USER_DATA_STORAGE_KEY,
} from "@/app/utils/storage";
import { getScopedUserDataStorageKey } from "@/app/utils/storage-auth-scope";
import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  AUTH_OWNER_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
} from "@/app/utils/storage-constants";
import { createDemoUserData } from "@/app/utils/storage-demo-data";
import type { Goal, Reflection, UserData } from "@/app/utils/storage-types";

function makeGoal(title: string): Goal {
  return {
    id: `goal_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    category: "Career",
    title,
    description: "",
    deadline: "2026-12-31",
    tasks: [],
    createdAt: "2026-05-09T00:00:00.000Z",
  };
}

function makeReflection(title: string): Reflection {
  return {
    id: `reflection_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    date: "2026-05-09",
    title,
    content: "Private account note",
  };
}

function addAccountWork(title: string): void {
  const data = getUserData();
  data.goals = [makeGoal(title)];
  data.reflections = [makeReflection(`${title} note`)];
  data.onboardingCompleted = true;
  saveUserData(data);
}

function makeDemoSeed(): UserData {
  return createDemoUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
}

function makeEditedAnonymousData(title: string): UserData {
  const data = getUserData();
  data.goals = [makeGoal(title)];
  data.onboardingCompleted = true;
  return data;
}

async function mockUpgradePlus(): Promise<void> {
  const checkout = await mockBillingProvider.startCheckout({
    planCode: "PLUS",
    context: "plan",
    source: "settings",
  });
  const sessionId = new URL(checkout.checkoutUrl ?? "", window.location.origin).searchParams.get("session");
  if (!sessionId) throw new Error("Mock checkout did not return a session id.");

  completeMockCheckoutSession(sessionId);
}

function getAnonymousArchiveKeys(): string[] {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith("previousAnonymousArchive_"))
    .sort();
}

function PlanProbe() {
  const { userData } = useSyncedUserData();
  return <div data-testid="current-plan">{userData ? getCurrentPlan(userData) : "none"}</div>;
}

describe("auth-scoped sensitive data cleanup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears A billing and active data on logout so B starts FREE without A work", async () => {
    activateAuthenticatedUserData("firebase_uid_a");
    addAccountWork("A private goal");
    await mockUpgradePlus();

    expect(getCurrentPlan()).toBe("PLUS");
    expect(getMockBillingAccount()).not.toBeNull();

    localStorage.setItem("backend_goal_links:auth:firebase_uid_a", JSON.stringify({ goal_a: "backend_goal_a" }));
    localStorage.setItem("backend_goal_links:auth:firebase_uid_b", JSON.stringify({ goal_b: "backend_goal_b" }));
    localStorage.setItem("pendingMigration:firebase_uid_a", "pending-a");
    localStorage.setItem("pendingMigration:firebase_uid_b", "pending-b");

    persistActiveAuthenticatedUserData();

    expect(localStorage.getItem(AUTH_OWNER_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_DATA_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(MOCK_BILLING_ACCOUNT_KEY)).toBeNull();
    expect(localStorage.getItem("backend_goal_links:auth:firebase_uid_a")).toBeNull();
    expect(localStorage.getItem("backend_goal_links:auth:firebase_uid_b")).toContain("backend_goal_b");
    expect(localStorage.getItem("pendingMigration:firebase_uid_a")).toBeNull();
    expect(localStorage.getItem("pendingMigration:firebase_uid_b")).toBe("pending-b");

    const scopedA = JSON.parse(
      localStorage.getItem(getScopedUserDataStorageKey("firebase_uid_a")) ?? "null",
    ) as UserData | null;
    expect(scopedA?.goals.map((goal) => goal.title)).toEqual(["A private goal"]);
    expect(scopedA?.subscription).toBeNull();
    expect(scopedA?.entitlements ?? []).toEqual([]);

    activateAuthenticatedUserData("firebase_uid_b");

    expect(getCurrentPlan()).toBe("FREE");
    expect(getUserData().goals.map((goal) => goal.title)).toEqual([]);
    expect(getUserData().reflections.map((reflection) => reflection.title)).toEqual([]);
  });

  it("updates an open synced user data view after a mock upgrade storage event", async () => {
    activateAuthenticatedUserData("firebase_uid_a");
    render(<PlanProbe />);

    expect(screen.getByTestId("current-plan")).toHaveTextContent("FREE");

    await act(async () => {
      await mockUpgradePlus();
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: USER_DATA_STORAGE_KEY,
          newValue: localStorage.getItem(USER_DATA_STORAGE_KEY),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("current-plan")).toHaveTextContent("PLUS");
    });
  });

  it("clears untouched demo anonymous seed without archiving it on logout", () => {
    activateAuthenticatedUserData("firebase_uid_a");
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(makeDemoSeed()));

    persistActiveAuthenticatedUserData();

    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBeNull();
    expect(getAnonymousArchiveKeys()).toEqual([]);
  });

  it("archives edited anonymous data on logout and keeps only the three newest archives", () => {
    activateAuthenticatedUserData("firebase_uid_a");
    localStorage.setItem("previousAnonymousArchive_1000", JSON.stringify({ id: "oldest" }));
    localStorage.setItem("previousAnonymousArchive_2000", JSON.stringify({ id: "older" }));
    localStorage.setItem("previousAnonymousArchive_3000", JSON.stringify({ id: "old" }));
    localStorage.setItem(ANONYMOUS_USER_DATA_STORAGE_KEY, JSON.stringify(makeEditedAnonymousData("Anonymous draft")));

    persistActiveAuthenticatedUserData();

    const archiveKeys = getAnonymousArchiveKeys();
    expect(localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY)).toBeNull();
    expect(archiveKeys).toHaveLength(3);
    expect(archiveKeys).not.toContain("previousAnonymousArchive_1000");

    const archivedData = archiveKeys
      .map((key) => JSON.parse(localStorage.getItem(key) ?? "null") as UserData | { id: string } | null)
      .find((value): value is UserData => Boolean(value && "goals" in value));
    expect(archivedData?.goals.map((goal) => goal.title)).toEqual(["Anonymous draft"]);
  });
});
