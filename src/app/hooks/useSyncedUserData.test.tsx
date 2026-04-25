import { act, renderHook, waitFor } from "@testing-library/react";

import { useSyncedUserData } from "./useSyncedUserData";
import { saveUserData, USER_DATA_STORAGE_KEY, USER_DATA_UPDATED_EVENT_NAME } from "../utils/storage";
import type { AppPreferences, UserData } from "../utils/storage-types";

const defaultAppPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

function createUserData(userId: string): UserData {
  return {
    storageVersion: 5,
    userId,
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: { ...defaultAppPreferences },
    onboardingCompleted: true,
  };
}

describe("useSyncedUserData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reloads local data after same-tab saves", async () => {
    saveUserData(createUserData("user_before"));

    const { result } = renderHook(() => useSyncedUserData());

    expect(result.current.userData?.userId).toBe("user_before");

    act(() => {
      saveUserData(createUserData("user_after"));
    });

    await waitFor(() => {
      expect(result.current.userData?.userId).toBe("user_after");
    });
  });

  it("exports the storage key and same-tab update event", async () => {
    const listener = vi.fn();
    window.addEventListener(USER_DATA_UPDATED_EVENT_NAME, listener);

    try {
      saveUserData(createUserData("user_event"));

      await waitFor(() => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(localStorage.getItem(USER_DATA_STORAGE_KEY)).not.toBeNull();
    } finally {
      window.removeEventListener(USER_DATA_UPDATED_EVENT_NAME, listener);
    }
  });
});
