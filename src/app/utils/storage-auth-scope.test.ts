import { beforeEach, describe, expect, it } from "vitest";

import {
  activateAuthenticatedUserData,
  deleteAllUserData,
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

  it("deletes user data plus scoped snapshots and backend/local auxiliary keys", () => {
    saveUserData(createUserData("anonymous_browser", ["Local Goal"]));
    localStorage.setItem("visionboard_user_data:anonymous", JSON.stringify(createUserData("anonymous_archive")));
    localStorage.setItem("visionboard_user_data:auth:firebase_uid_one", JSON.stringify(createUserData("local_one")));
    localStorage.setItem("visionboard_user_data:auth:firebase_uid_two", JSON.stringify(createUserData("local_two")));
    localStorage.setItem("visionboard_user_data:auth_owner_uid", "firebase_uid_one");
    localStorage.setItem("backend_goal_links", JSON.stringify({ local_goal: "backend_goal" }));
    localStorage.setItem("backend_plan_links", JSON.stringify({ local_goal: { planId: "backend_plan" } }));
    localStorage.setItem("backend_order_links", JSON.stringify({ local_order: "backend_order" }));
    localStorage.setItem("backend_vision_board_links", JSON.stringify({ local_board: "backend_board" }));
    localStorage.setItem("visionboard_orders_v1", JSON.stringify([{ id: "order_1" }]));
    localStorage.setItem("visionboard_mock_billing_account", JSON.stringify({ customerId: "customer_1" }));
    localStorage.setItem("visionboard_mock_billing_session_session_1", JSON.stringify({ id: "session_1" }));
    localStorage.setItem("visionboard_last_outbox_sync", JSON.stringify({ status: "success" }));
    localStorage.setItem("visionboard_last_entitlement_sync", JSON.stringify({ ok: true }));
    localStorage.setItem("visionboard_last_restore_access", JSON.stringify({ ok: true }));
    localStorage.setItem("visionboard_new_user_guide_dismissed", "true");
    localStorage.setItem("visionboard_new_user_guide_seen_at", "2026-04-29T00:00:00.000Z");
    localStorage.setItem("visionboard_rescue_dismissed", JSON.stringify({ overdue_pile: "2026-04-30T00:00:00.000Z" }));

    deleteAllUserData();

    expect(localStorage.getItem("visionboard_user_data")).toBeNull();
    expect(localStorage.getItem("visionboard_user_data:anonymous")).toBeNull();
    expect(localStorage.getItem("visionboard_user_data:auth:firebase_uid_one")).toBeNull();
    expect(localStorage.getItem("visionboard_user_data:auth:firebase_uid_two")).toBeNull();
    expect(localStorage.getItem("visionboard_user_data:auth_owner_uid")).toBeNull();
    expect(localStorage.getItem("backend_goal_links")).toBeNull();
    expect(localStorage.getItem("backend_plan_links")).toBeNull();
    expect(localStorage.getItem("backend_order_links")).toBeNull();
    expect(localStorage.getItem("backend_vision_board_links")).toBeNull();
    expect(localStorage.getItem("visionboard_orders_v1")).toBeNull();
    expect(localStorage.getItem("visionboard_mock_billing_account")).toBeNull();
    expect(localStorage.getItem("visionboard_mock_billing_session_session_1")).toBeNull();
    expect(localStorage.getItem("visionboard_last_outbox_sync")).toBeNull();
    expect(localStorage.getItem("visionboard_last_entitlement_sync")).toBeNull();
    expect(localStorage.getItem("visionboard_last_restore_access")).toBeNull();
    expect(localStorage.getItem("visionboard_new_user_guide_dismissed")).toBeNull();
    expect(localStorage.getItem("visionboard_new_user_guide_seen_at")).toBeNull();
    expect(localStorage.getItem("visionboard_rescue_dismissed")).toBeNull();
  });
});
