import { beforeEach, describe, expect, it } from "vitest";

import {
  getRemoteTaskIdForGoal,
  setRemoteTaskIdForGoal,
} from "@/features/plan12week/persistence/planLinkStore";
import { getBackendGoalId, saveGoalLink } from "@/lib/api/goalLinkStore";
import { getBackendOrderId, saveOrderLink } from "@/lib/api/orderLinkStore";
import {
  getBackendVisionBoardId,
  getLocalVisionBoardId,
  saveVisionBoardLink,
} from "@/lib/api/visionBoardLinkStore";
import { getScopedBackendLinkStorageKey } from "./backend-link-storage";
import { activateAuthenticatedUserData, deleteAllUserData } from "./storage";

describe("backend link storage auth scoping", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps anonymous link stores on the legacy default keys", () => {
    saveGoalLink("local_goal", "backend_goal");
    saveOrderLink("local_order", "backend_order");
    saveVisionBoardLink("local_board", "backend_board");
    setRemoteTaskIdForGoal("local_goal", "local_task", "backend_task");

    expect(getBackendGoalId("local_goal")).toBe("backend_goal");
    expect(getBackendOrderId("local_order")).toBe("backend_order");
    expect(getBackendVisionBoardId("local_board")).toBe("backend_board");
    expect(getLocalVisionBoardId("backend_board")).toBe("local_board");
    expect(getRemoteTaskIdForGoal("local_goal", "local_task")).toBe("backend_task");
    expect(localStorage.getItem("backend_goal_links")).toContain("backend_goal");
    expect(
      localStorage.getItem(getScopedBackendLinkStorageKey("backend_goal_links", "firebase_uid_one")),
    ).toBeNull();
  });

  it("isolates backend links between authenticated users", () => {
    activateAuthenticatedUserData("firebase_uid_one");
    saveGoalLink("shared_goal", "backend_goal_one");
    saveOrderLink("shared_order", "backend_order_one");
    saveVisionBoardLink("shared_board", "backend_board_one");
    setRemoteTaskIdForGoal("shared_goal", "shared_task", "backend_task_one");

    activateAuthenticatedUserData("firebase_uid_two");

    expect(getBackendGoalId("shared_goal")).toBeNull();
    expect(getBackendOrderId("shared_order")).toBeNull();
    expect(getBackendVisionBoardId("shared_board")).toBeNull();
    expect(getLocalVisionBoardId("backend_board_one")).toBeNull();
    expect(getRemoteTaskIdForGoal("shared_goal", "shared_task")).toBeNull();

    saveGoalLink("shared_goal", "backend_goal_two");
    saveOrderLink("shared_order", "backend_order_two");
    saveVisionBoardLink("shared_board", "backend_board_two");
    setRemoteTaskIdForGoal("shared_goal", "shared_task", "backend_task_two");

    activateAuthenticatedUserData("firebase_uid_one");

    expect(getBackendGoalId("shared_goal")).toBe("backend_goal_one");
    expect(getBackendOrderId("shared_order")).toBe("backend_order_one");
    expect(getBackendVisionBoardId("shared_board")).toBe("backend_board_one");
    expect(getLocalVisionBoardId("backend_board_one")).toBe("shared_board");
    expect(getRemoteTaskIdForGoal("shared_goal", "shared_task")).toBe("backend_task_one");

    activateAuthenticatedUserData("firebase_uid_two");

    expect(getBackendGoalId("shared_goal")).toBe("backend_goal_two");
    expect(getBackendOrderId("shared_order")).toBe("backend_order_two");
    expect(getBackendVisionBoardId("shared_board")).toBe("backend_board_two");
    expect(getRemoteTaskIdForGoal("shared_goal", "shared_task")).toBe("backend_task_two");
  });

  it("copies legacy links to the first authenticated owner without exposing them to another owner", () => {
    localStorage.setItem("backend_goal_links", JSON.stringify({ legacy_goal: "backend_legacy_goal" }));
    localStorage.setItem(
      "backend_plan_links",
      JSON.stringify({
        legacy_goal: {
          planId: "backend_legacy_plan",
          weekIdByNumber: {},
          metricIdByKey: {},
          taskIdByLocalTaskId: { legacy_task: "backend_legacy_task" },
        },
      }),
    );

    activateAuthenticatedUserData("firebase_uid_one");

    expect(getBackendGoalId("legacy_goal")).toBe("backend_legacy_goal");
    expect(getRemoteTaskIdForGoal("legacy_goal", "legacy_task")).toBe("backend_legacy_task");
    expect(localStorage.getItem(getScopedBackendLinkStorageKey("backend_goal_links", "firebase_uid_one"))).toContain(
      "backend_legacy_goal",
    );
    expect(localStorage.getItem("backend_goal_links")).toContain("backend_legacy_goal");

    activateAuthenticatedUserData("firebase_uid_two");

    expect(getBackendGoalId("legacy_goal")).toBeNull();
    expect(getRemoteTaskIdForGoal("legacy_goal", "legacy_task")).toBeNull();
  });

  it("clears legacy and scoped backend link stores when deleting all user data", () => {
    localStorage.setItem("backend_goal_links", JSON.stringify({ legacy_goal: "backend_goal" }));

    activateAuthenticatedUserData("firebase_uid_one");
    expect(getBackendGoalId("legacy_goal")).toBe("backend_goal");
    saveOrderLink("local_order", "backend_order");
    saveVisionBoardLink("local_board", "backend_board");
    setRemoteTaskIdForGoal("local_goal", "local_task", "backend_task");

    const scopedKeys = [
      getScopedBackendLinkStorageKey("backend_goal_links", "firebase_uid_one"),
      getScopedBackendLinkStorageKey("backend_plan_links", "firebase_uid_one"),
      getScopedBackendLinkStorageKey("backend_order_links", "firebase_uid_one"),
      getScopedBackendLinkStorageKey("backend_vision_board_links", "firebase_uid_one"),
    ];

    deleteAllUserData();

    expect(localStorage.getItem("backend_goal_links")).toBeNull();
    expect(localStorage.getItem("backend_plan_links")).toBeNull();
    expect(localStorage.getItem("backend_order_links")).toBeNull();
    expect(localStorage.getItem("backend_vision_board_links")).toBeNull();
    scopedKeys.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
    expect(localStorage.getItem("backend_link_store_legacy_owner_uid")).toBeNull();
  });
});
