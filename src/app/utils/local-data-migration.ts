import { CURRENT_STORAGE_VERSION, DEFAULT_APP_PREFERENCES, MOTIVATIONAL_QUOTES } from "./storage-constants";
import { createDemoUserData } from "./storage-demo-data";
import type {
  Goal,
  Reflection,
  TwelveWeekSystem,
  UserData,
  VisionBoard,
  WheelOfLifeRecord,
} from "./storage-types";

type ComparableValue = Record<string, unknown>;

let seededDemoComparableSnapshot: string | null = null;

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function compareById<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function compareWheelRecords(left: WheelOfLifeRecord, right: WheelOfLifeRecord): number {
  return JSON.stringify(left.areas).localeCompare(JSON.stringify(right.areas));
}

function createComparableTwelveWeekSystem(system: TwelveWeekSystem | undefined): ComparableValue | null {
  if (!system) return null;

  return {
    goalType: system.goalType,
    vision12Week: system.vision12Week,
    templateId: system.templateId,
    templateName: system.templateName,
    lagMetric: system.lagMetric,
    leadIndicators: system.leadIndicators,
    milestones: system.milestones,
    successEvidence: system.successEvidence,
    reviewDay: system.reviewDay,
    week12Outcome: system.week12Outcome,
    weeklyActions: system.weeklyActions,
    successMetric: system.successMetric,
    startDate: system.startDate,
    endDate: system.endDate,
    timezone: system.timezone,
    weekStartsOn: system.weekStartsOn,
    status: system.status,
    dailyReminderTime: system.dailyReminderTime,
    tacticLoadPreference: system.tacticLoadPreference,
    preferredDays: system.preferredDays,
    personalConstraint: system.personalConstraint,
    reentryCount: system.reentryCount,
    currentWeek: system.currentWeek,
    totalWeeks: system.totalWeeks,
    weeklyPlans: system.weeklyPlans,
    taskInstances: system.taskInstances.map((task) => ({
      ...task,
      scheduledDate: "",
      completedAt: task.completedAt ? "" : undefined,
    })),
    dailyCheckIns: system.dailyCheckIns.map((checkIn) => ({
      ...checkIn,
      date: "",
    })),
    weeklyReviews: system.weeklyReviews,
    scoreboard: system.scoreboard,
    dailyUpdates: system.dailyUpdates?.map((update) => ({
      ...update,
      date: "",
    })),
    legacyWeeklyReviews: system.legacyWeeklyReviews,
    legacyScoreboard: system.legacyScoreboard,
  };
}

function createComparableGoal(goal: Goal): ComparableValue {
  return {
    id: goal.id,
    category: goal.category,
    title: goal.title,
    description: goal.description,
    tasks: [...goal.tasks].sort(compareById),
    feasibilityResult: goal.feasibilityResult,
    readinessScore: goal.readinessScore,
    focusArea: goal.focusArea,
    twelveWeekSystem: createComparableTwelveWeekSystem(goal.twelveWeekSystem),
    twelveWeekPlan: goal.twelveWeekPlan,
  };
}

function createComparableVisionBoard(board: VisionBoard): ComparableValue {
  return {
    id: board.id,
    name: board.name,
    year: board.year,
    items: [...board.items].sort(compareById),
  };
}

function createComparableReflection(reflection: Reflection): ComparableValue {
  return {
    id: reflection.id,
    title: reflection.title,
    content: reflection.content,
    mood: reflection.mood,
    entryType: reflection.entryType,
    linkedGoalId: reflection.linkedGoalId,
    linkedWeekNumber: reflection.linkedWeekNumber,
  };
}

function createComparableWheelHistory(wheelHistory: WheelOfLifeRecord[]): Array<Omit<WheelOfLifeRecord, "date">> {
  return [...wheelHistory]
    .sort(compareWheelRecords)
    .map((record) => ({
      areas: record.areas,
    }));
}

function createComparableUserWorkSnapshot(data: UserData): ComparableValue {
  return {
    goals: [...data.goals].sort(compareById).map(createComparableGoal),
    visionBoards: [...data.visionBoards].sort(compareById).map(createComparableVisionBoard),
    reflections: [...data.reflections].sort(compareById).map(createComparableReflection),
    wheelOfLifeHistory: createComparableWheelHistory(data.wheelOfLifeHistory),
    currentWheelOfLife: data.currentWheelOfLife,
    onboardingCompleted: data.onboardingCompleted,
    isHydratedFromDemo: data.isHydratedFromDemo === true,
  };
}

function getSeededDemoComparableSnapshot(): string {
  if (!seededDemoComparableSnapshot) {
    const demoData = createDemoUserData({
      currentStorageVersion: CURRENT_STORAGE_VERSION,
      defaultAppPreferences: DEFAULT_APP_PREFERENCES,
      motivationalQuotes: MOTIVATIONAL_QUOTES,
    });
    seededDemoComparableSnapshot = JSON.stringify(createComparableUserWorkSnapshot(demoData));
  }

  return seededDemoComparableSnapshot;
}

function isUntouchedSeededDemoData(data: UserData): boolean {
  if (data.isHydratedFromDemo !== true) return false;
  return JSON.stringify(createComparableUserWorkSnapshot(data)) === getSeededDemoComparableSnapshot();
}

function hasRealWheelScores(data: UserData): boolean {
  const historicalScores = data.wheelOfLifeHistory.some((record) => record.areas.some((area) => area.score > 0));
  const currentScores = data.currentWheelOfLife.some((area) => area.score > 0);
  return historicalScores || currentScores;
}

function hasMeaningfulTwelveWeekSystem(system: TwelveWeekSystem | undefined): boolean {
  if (!system) return false;

  return (
    hasText(system.vision12Week) ||
    hasText(system.week12Outcome) ||
    hasText(system.successEvidence) ||
    system.leadIndicators.length > 0 ||
    system.weeklyPlans.some((week) => hasText(week.focus) || hasText(week.milestone) || week.completed) ||
    system.taskInstances.length > 0 ||
    system.dailyCheckIns.length > 0 ||
    system.weeklyReviews.some(
      (review) =>
        review.reviewCompleted ||
        hasText(review.biggestOutputThisWeek) ||
        hasText(review.mainObstacle) ||
        hasText(review.nextWeekPriority),
    )
  );
}

function hasMeaningfulGoal(goal: Goal): boolean {
  return (
    hasText(goal.title) ||
    hasText(goal.description) ||
    goal.tasks.length > 0 ||
    Boolean(goal.twelveWeekPlan) ||
    hasMeaningfulTwelveWeekSystem(goal.twelveWeekSystem)
  );
}

function hasMeaningfulVisionBoard(board: VisionBoard): boolean {
  return hasText(board.name) || board.items.length > 0;
}

function hasMeaningfulReflection(reflection: Reflection): boolean {
  return hasText(reflection.title) || hasText(reflection.content);
}

export function hasMeaningfulLocalWork(data: UserData): boolean {
  if (isUntouchedSeededDemoData(data)) return false;

  return (
    data.goals.some(hasMeaningfulGoal) ||
    data.visionBoards.some(hasMeaningfulVisionBoard) ||
    data.reflections.some(hasMeaningfulReflection) ||
    hasRealWheelScores(data)
  );
}
