import { addAchievementToData, checkAchievementsInData } from "./storage-achievement-ops";
import type { Achievement, AppPreferences, Goal, Reflection, UserData } from "./storage-types";

const defaultAppPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

function createGoal(partial?: Partial<Goal>): Goal {
  return {
    id: "goal_1",
    category: "Career",
    title: "Hoàn thành mục tiêu đầu tiên",
    description: "Một mục tiêu mẫu để kiểm thử thành tựu.",
    deadline: "2026-06-14",
    tasks: [{ id: "task_1", title: "Việc đầu tiên", completed: false }],
    createdAt: "2026-03-26T10:00:00.000Z",
    ...partial,
  };
}

function createReflection(partial?: Partial<Reflection>): Reflection {
  return {
    id: "reflection_1",
    date: "2026-03-26",
    title: "Một ghi chú ngắn",
    content: "Giữ nhịp đều trong hôm nay.",
    ...partial,
  };
}

function createUserData(): UserData {
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
    onboardingCompleted: true,
  };
}

describe("storage-achievement-ops", () => {
  it("adds achievements without creating duplicates", () => {
    const data = createUserData();
    const achievement: Omit<Achievement, "id" | "earnedAt"> = {
      title: "First Step",
      description: "Tạo mục tiêu đầu tiên của bạn",
      icon: "Target",
    };

    expect(addAchievementToData(data, achievement)).toBe(true);
    expect(addAchievementToData(data, achievement)).toBe(false);
    expect(data.achievements).toHaveLength(1);
  });

  it("grants first-step and reflection achievements from user data", () => {
    const data = createUserData();
    data.goals.push(createGoal());
    data.reflections.push(createReflection());

    const didAdd = checkAchievementsInData(data, new Date("2026-03-26T20:00:00.000Z"));
    const titles = data.achievements.map((achievement) => achievement.title);

    expect(didAdd).toBe(true);
    expect(titles).toContain("First Step");
    expect(titles).toContain("Reflective Mind");
  });
});
