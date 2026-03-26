import { createDemoUserData, shouldHydrateDemoData } from "./storage-demo-data";
import type { AppPreferences, UserData } from "./storage-types";

const defaultAppPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

function createEmptyUserData(): UserData {
  return {
    storageVersion: 4,
    userId: "user_test",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: { ...defaultAppPreferences },
    onboardingCompleted: false,
  };
}

describe("storage-demo-data", () => {
  it("detects when the app should hydrate demo data", () => {
    expect(shouldHydrateDemoData(createEmptyUserData())).toBe(true);

    const seeded = createEmptyUserData();
    seeded.onboardingCompleted = true;
    expect(shouldHydrateDemoData(seeded)).toBe(false);
  });

  it("creates a normalized demo dataset for the app shell", () => {
    const demoData = createDemoUserData({
      currentStorageVersion: 4,
      defaultAppPreferences,
      motivationalQuotes: ["Giữ nhịp đều, rồi tăng tốc sau."],
    });

    expect(demoData.storageVersion).toBe(4);
    expect(demoData.isHydratedFromDemo).toBe(true);
    expect(demoData.goals.length).toBeGreaterThan(0);
    expect(demoData.visionBoards.length).toBe(1);
    expect(demoData.reflections.length).toBeGreaterThan(0);
    expect(demoData.lastMotivationalQuote).toBe("Giữ nhịp đều, rồi tăng tốc sau.");
    expect(demoData.goals[0]?.twelveWeekSystem?.taskInstances.length ?? 0).toBeGreaterThan(0);
  });
});
