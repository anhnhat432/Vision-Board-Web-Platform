import { beforeEach, describe, expect, it } from "vitest";

import {
  activateAuthenticatedUserData,
  getUserData,
  persistActiveAuthenticatedUserData,
  saveUserData,
} from "./storage";
import type { AppPreferences, Goal, UserData } from "./storage-types";

const defaultAppPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

function createGoal(title: string): Goal {
  return {
    id: `goal_${title.toLowerCase().replace(/\s+/g, "_")}`,
    category: "career",
    title,
    description: "",
    deadline: "2026-12-31",
    tasks: [],
    createdAt: "2026-04-26T00:00:00.000Z",
  };
}

function createUserData(userId: string, goalTitles: string[] = []): UserData {
  return {
    storageVersion: 5,
    userId,
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: goalTitles.map(createGoal),
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: { ...defaultAppPreferences },
    onboardingCompleted: true,
  };
}

describe("authenticated user data scoping", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts an authenticated user from a clean local snapshot instead of anonymous stale data", () => {
    saveUserData(createUserData("anonymous_browser", ["Leak Sentinel Goal"]));

    activateAuthenticatedUserData("firebase_uid_one");

    expect(getUserData().goals.map((goal) => goal.title)).toEqual([]);
    expect(getUserData().userId).not.toBe("anonymous_browser");
  });

  it("keeps browser snapshots separate when the Firebase user changes", () => {
    activateAuthenticatedUserData("firebase_uid_one");
    saveUserData(createUserData("local_one", ["Account One Goal"]));

    activateAuthenticatedUserData("firebase_uid_two");
    expect(getUserData().goals.map((goal) => goal.title)).toEqual([]);

    saveUserData(createUserData("local_two", ["Account Two Goal"]));

    activateAuthenticatedUserData("firebase_uid_one");
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(["Account One Goal"]);

    activateAuthenticatedUserData("firebase_uid_two");
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(["Account Two Goal"]);
  });

  it("stores signed-out writes as anonymous after the active account is persisted", () => {
    activateAuthenticatedUserData("firebase_uid_one");
    saveUserData(createUserData("local_one", ["Account One Goal"]));

    persistActiveAuthenticatedUserData();
    saveUserData(createUserData("signed_out_browser", ["Signed Out Stale Goal"]));

    activateAuthenticatedUserData("firebase_uid_two");
    expect(getUserData().goals.map((goal) => goal.title)).toEqual([]);

    activateAuthenticatedUserData("firebase_uid_one");
    expect(getUserData().goals.map((goal) => goal.title)).toEqual(["Account One Goal"]);
  });
});
