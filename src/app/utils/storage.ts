// Local Storage Management Utility

import type {
  Achievement,
  AppPreferences,
  EntitlementKey,
  FunnelStepSummary,
  Goal,
  InAppReminder,
  LifeArea,
  PricingPlanCode,
  Reflection,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UserData,
  VisionBoard,
} from "./storage-types";
import {
  formatCalendarDate as formatCalendarDateFromModule,
  formatDateInputValue as formatDateInputValueFromModule,
  getCalendarDateKey as getCalendarDateKeyFromModule,
  getCalendarDayDifference as getCalendarDayDifferenceFromModule,
  parseCalendarDate as parseCalendarDateFromModule,
  sortReflectionsByDateDesc as sortReflectionsByDateDescFromModule,
} from "./storage-date-utils";
import {
  getActiveTwelveWeekGoal as getActiveTwelveWeekGoalFromModule,
  getGoalExecutionStats as getGoalExecutionStatsFromModule,
  getTwelveWeekCurrentWeek as getTwelveWeekCurrentWeekFromModule,
  getTwelveWeekMissedTasks as getTwelveWeekMissedTasksFromModule,
  getTwelveWeekTacticCount as getTwelveWeekTacticCountFromModule,
  getTwelveWeekTasksForWeek as getTwelveWeekTasksForWeekFromModule,
  getTwelveWeekTodayTasks as getTwelveWeekTodayTasksFromModule,
  getTwelveWeekWeekCompletion as getTwelveWeekWeekCompletionFromModule,
  getTwelveWeekWeekRange as getTwelveWeekWeekRangeFromModule,
  isTwelveWeekReviewDueToday as isTwelveWeekReviewDueTodayFromModule,
  migrateLegacyUserData as migrateLegacyUserDataFromModule,
  normalizeGoal as normalizeGoalFromModule,
} from "./storage-twelve-week";
import {
  addGoalToData,
  deleteGoalFromData,
  resetTwelveWeekGoalCycleInData,
  updateGoalInData,
  updateWheelOfLifeInData,
  upgradeLegacyGoalToSystemInData,
} from "./storage-goal-ops";
import {
  addReflectionToData,
  deleteReflectionFromData,
  upsertReflectionInData,
} from "./storage-reflection-ops";
import {
  archiveOutboxItemInData,
  clearArchivedOutboxInData,
  clearEventLogInData,
  clearLocalDeviceSignalsInData,
  getInAppRemindersFromData,
  getTwelveWeekFunnelSummaryFromData,
  restoreArchivedOutboxInData,
  restoreOutboxItemInData,
  trackAppEventInData,
  updateAppPreferencesInData,
} from "./storage-local-ops";
import {
  addVisionBoardToData,
  deleteVisionBoardFromData,
  updateVisionBoardInData,
} from "./storage-vision-board-ops";
import {
  addAchievementToData,
  checkAchievementsInData,
} from "./storage-achievement-ops";
import {
  createDemoUserData as createDemoUserDataFromModule,
  shouldHydrateDemoData as shouldHydrateDemoDataFromModule,
} from "./storage-demo-data";
import { getEntitlementsForPlan, normalizePlanCode } from "./twelve-week-premium";

export type {
  Achievement,
  AppPreferences,
  DailyUpdate,
  FunnelStepSummary,
  Goal,
  InAppReminder,
  LagMetric,
  LeadIndicator,
  LifeArea,
  Milestones,
  PricingPlanCode,
  Entitlement,
  EntitlementKey,
  Subscription,
  SubscriptionStatus,
  BillingCycle,
  Reflection,
  ScoreboardWeek,
  SyncOutboxItem,
  TacticType,
  Task,
  TrackingEvent,
  TwelveWeekPlan,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalScoreboardWeek,
  UniversalWeeklyReview,
  UserData,
  VisionBoard,
  VisionBoardItem,
  WeeklyPlanEntry,
  WeeklyReview,
  WheelOfLifeRecord,
} from "./storage-types";

const STORAGE_KEY = "visionboard_user_data";
const CURRENT_STORAGE_VERSION = 5;

const DEFAULT_APP_PREFERENCES: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

const TWELVE_WEEK_FUNNEL_STEPS = [
  {
    id: "12_week_setup_started",
    label: "Bắt đầu setup",
    description: "Người dùng vào flow thiết lập 12 tuần.",
  },
  {
    id: "12_week_plan_created",
    label: "Tạo chu kỳ",
    description: "Người dùng hoàn tất setup và tạo chu kỳ.",
  },
  {
    id: "12_week_task_completed",
    label: "Hoàn thành việc",
    description: "Một việc trong today queue được đánh dấu xong.",
  },
  {
    id: "12_week_daily_checkin_submitted",
    label: "Gửi check-in",
    description: "Người dùng đóng check-in trong ngày.",
  },
  {
    id: "12_week_weekly_review_submitted",
    label: "Gửi review tuần",
    description: "Người dùng chốt review tuần và quyết định nhịp tuần sau.",
  },
] as const;

const TWELVE_WEEK_MONETIZATION_STEPS = [
  {
    id: "paywall_viewed",
    label: "Mở paywall",
    description: "Người dùng đã nhìn thấy paywall nâng cấp trong một ngữ cảnh cụ thể.",
  },
  {
    id: "paywall_cta_clicked",
    label: "Bấm CTA nâng cấp",
    description: "Người dùng bấm một CTA dẫn tới paywall hoặc bước nâng cấp tiếp theo.",
  },
  {
    id: "paywall_checkout_started",
    label: "Bắt đầu checkout",
    description: "Người dùng bắt đầu bước mở gói trên thiết bị hiện tại.",
  },
  {
    id: "paywall_checkout_completed",
    label: "Hoàn tất checkout",
    description: "Thiết bị đã mở gói thành công trong flow local-first hiện tại.",
  },
  {
    id: "premium_template_applied",
    label: "Áp dụng template",
    description: "Một template premium hoặc free đã được áp dụng vào setup.",
  },
  {
    id: "premium_insight_opened",
    label: "Mở insight premium",
    description: "Người dùng đã mở phần insight review premium trong tab tuần.",
  },
] as const;

export const APP_STORAGE_KEYS = {
  selectedFocusArea: "selected_focus_area",
  pendingSmartGoal: "pending_smart_goal",
  pendingFeasibilityResult: "pending_feasibility_result",
  pendingFeasibilityAnswers: "pending_feasibility_answers",
  pending12WeekSetupDraft: "pending_12_week_setup_draft",
  pending12WeekPlanDraft: "pending_12_week_plan_draft",
  latest12WeekGoalId: "latest_12_week_goal_id",
  latest12WeekSystemGoalId: "latest_12_week_system_goal_id",
  latest12WeekPlanGoalId: "latest_12_week_plan_goal_id",
  readinessLevel: "readiness_level",
  readinessScore: "readiness_score",
} as const;

export const LIFE_AREAS = [
  { name: "Career", color: "#8b5cf6" },
  { name: "Finance", color: "#10b981" },
  { name: "Health", color: "#ef4444" },
  { name: "Education", color: "#f59e0b" },
  { name: "Relationships", color: "#ec4899" },
  { name: "Family", color: "#3b82f6" },
  { name: "Personal Growth", color: "#14b8a6" },
  { name: "Leisure", color: "#a855f7" },
];

export const LIFE_AREA_LABELS: Record<string, string> = {
  Career: "Sự nghiệp",
  Finance: "Tài chính",
  Health: "Sức khỏe",
  Education: "Học tập",
  Relationships: "Mối quan hệ",
  Family: "Gia đình",
  "Personal Growth": "Phát triển bản thân",
  Leisure: "Giải trí",
};

export const REVIEW_DAY_LABELS: Record<string, string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ Nhật",
};

export const FEASIBILITY_RESULT_LABELS: Record<string, string> = {
  realistic: "Khả thi",
  challenging: "Thách thức nhưng làm được",
  too_ambitious: "Hơi quá sức lúc này",
  "This goal looks realistic for you right now.": "Mục tiêu này có vẻ khả thi với bạn lúc này.",
  "This goal is challenging but possible.": "Mục tiêu này đầy thách thức nhưng có thể thực hiện được.",
  "This goal may be too ambitious right now.": "Mục tiêu này có thể quá tham vọng lúc này.",
  "Mục tiêu này có vẻ khả thi với bạn lúc này.": "Khả thi",
  "Mục tiêu này đầy thách thức nhưng có thể thực hiện được.": "Thách thức nhưng làm được",
  "Mục tiêu này có thể quá tham vọng lúc này.": "Hơi quá sức lúc này",
};

export const MOTIVATIONAL_QUOTES = [
  "Tương lai thuộc về những người tin vào vẻ đẹp của ước mơ mình.",
  "Thành công không phải điểm kết, thất bại không phải dấu chấm hết: điều quan trọng là lòng can đảm để tiếp tục.",
  "Hãy tin rằng bạn có thể, và bạn đã đi được một nửa chặng đường.",
  "Cách duy nhất để làm nên điều tuyệt vời là yêu điều bạn đang làm.",
  "Giới hạn của bạn thường chỉ đến từ trí tưởng tượng của chính bạn.",
  "Hãy thúc đẩy chính mình, vì không ai có thể làm điều đó thay bạn.",
  "Những điều tuyệt vời không sinh ra từ vùng an toàn.",
  "Hãy mơ ước, mong cầu và bắt tay vào hành động.",
  "Thành công không tự tìm đến bạn. Bạn phải đứng dậy và đi tìm nó.",
  "Bạn càng nỗ lực cho điều gì đó, cảm giác khi đạt được nó sẽ càng ý nghĩa.",
];

function normalizeReflection(reflection: Reflection): Reflection {
  return {
    ...reflection,
    entryType: reflection.entryType === "weekly-review" ? "weekly-review" : "freeform",
    linkedGoalId: reflection.linkedGoalId,
    linkedWeekNumber: reflection.linkedWeekNumber,
  };
}

function normalizeUserData(data: UserData): UserData {
  const subscription = data.subscription ?? null;
  const entitlements = Array.isArray(data.entitlements) ? data.entitlements : [];
  const normalizedEntitlements =
    subscription?.status === "active" && entitlements.length === 0
      ? getEntitlementsForPlan(subscription.planCode, subscription.startedAt)
      : entitlements;

  return {
    ...data,
    storageVersion: data.storageVersion || CURRENT_STORAGE_VERSION,
    goals: Array.isArray(data.goals) ? data.goals.map((goal) => normalizeGoalFromModule(goal)) : [],
    reflections: sortReflectionsByDateDesc(
      Array.isArray(data.reflections) ? data.reflections.map((reflection) => normalizeReflection(reflection)) : [],
    ),
    eventLog: Array.isArray(data.eventLog) ? data.eventLog : [],
    syncOutbox: Array.isArray(data.syncOutbox) ? data.syncOutbox : [],
    appPreferences: {
      ...DEFAULT_APP_PREFERENCES,
      ...(data.appPreferences ?? {}),
    },
    subscription,
    entitlements: normalizedEntitlements,
  };
}

function parseStoredUserData(raw: string): UserData | null {
  try {
    return normalizeUserData(JSON.parse(raw) as UserData);
  } catch {
    return null;
  }
}

export function formatDateInputValue(date: Date): string {
  return formatDateInputValueFromModule(date);
}

export function parseCalendarDate(value: string): Date | null {
  return parseCalendarDateFromModule(value);
}

export function getCalendarDateKey(value: string): string | null {
  return getCalendarDateKeyFromModule(value);
}

export function formatCalendarDate(
  value: string,
  locale = "vi-VN",
  options?: Intl.DateTimeFormatOptions,
): string {
  return formatCalendarDateFromModule(value, locale, options);
}

export function getCalendarDayDifference(targetDate: string, referenceDate = new Date()): number | null {
  return getCalendarDayDifferenceFromModule(targetDate, referenceDate);
}

export function isTwelveWeekReviewDueToday(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): boolean {
  return isTwelveWeekReviewDueTodayFromModule(system, referenceDate);
}

export function getTwelveWeekCurrentWeek(system: TwelveWeekSystem, referenceDate = new Date()): number {
  return getTwelveWeekCurrentWeekFromModule(system, referenceDate);
}

export function getTwelveWeekWeekRange(
  system: TwelveWeekSystem,
  weekNumber: number,
): { start: string; end: string } {
  return getTwelveWeekWeekRangeFromModule(system, weekNumber);
}

export function getTwelveWeekTasksForWeek(system: TwelveWeekSystem, weekNumber: number): TwelveWeekTaskInstance[] {
  return getTwelveWeekTasksForWeekFromModule(system, weekNumber);
}

export function getTwelveWeekTodayTasks(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): TwelveWeekTaskInstance[] {
  return getTwelveWeekTodayTasksFromModule(system, referenceDate);
}

export function getTwelveWeekMissedTasks(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): TwelveWeekTaskInstance[] {
  return getTwelveWeekMissedTasksFromModule(system, referenceDate);
}

export function getTwelveWeekWeekCompletion(
  system: TwelveWeekSystem,
  weekNumber: number,
): { completed: number; total: number; percent: number } {
  return getTwelveWeekWeekCompletionFromModule(system, weekNumber);
}

export function getTwelveWeekTacticCount(system: TwelveWeekSystem): number {
  return getTwelveWeekTacticCountFromModule(system);
}

export function getGoalExecutionStats(goal: Goal, referenceDate = new Date()) {
  return getGoalExecutionStatsFromModule(goal, referenceDate);
}

export function getActiveTwelveWeekGoal(goals: Goal[], preferredGoalId?: string | null): Goal | null {
  return getActiveTwelveWeekGoalFromModule(goals, preferredGoalId);
}

export function sortReflectionsByDateDesc(reflections: Reflection[]): Reflection[] {
  return sortReflectionsByDateDescFromModule(reflections);
}

export function clearGoalPlanningDrafts(): void {
  [
    APP_STORAGE_KEYS.pendingSmartGoal,
    APP_STORAGE_KEYS.pendingFeasibilityResult,
    APP_STORAGE_KEYS.pendingFeasibilityAnswers,
    APP_STORAGE_KEYS.pending12WeekSetupDraft,
    APP_STORAGE_KEYS.pending12WeekPlanDraft,
    APP_STORAGE_KEYS.readinessLevel,
    APP_STORAGE_KEYS.readinessScore,
  ].forEach((key) => {
    localStorage.removeItem(key);
  });
}

function getPlanRank(planCode: PricingPlanCode): number {
  switch (normalizePlanCode(planCode)) {
    case "PLUS":
      return 1;
    default:
      return 0;
  }
}

export function getLifeAreaLabel(name: string): string {
  return LIFE_AREA_LABELS[name] ?? name;
}

export function getReviewDayLabel(day: string): string {
  return REVIEW_DAY_LABELS[day] ?? day;
}

export function getFeasibilityResultLabel(result: string): string {
  return FEASIBILITY_RESULT_LABELS[result] ?? result;
}

export function initializeUserData(): UserData {
  const existingData = localStorage.getItem(STORAGE_KEY);

  if (existingData) {
    const parsedData = parseStoredUserData(existingData);
    if (parsedData) {
      if (shouldHydrateDemoDataFromModule(parsedData)) {
        const demoData = createDemoUserDataFromModule({
          currentStorageVersion: CURRENT_STORAGE_VERSION,
          defaultAppPreferences: DEFAULT_APP_PREFERENCES,
          motivationalQuotes: MOTIVATIONAL_QUOTES,
        });
        saveUserData(demoData);
        return demoData;
      }

      return parsedData;
    }
  }

  const newUserData = createDemoUserDataFromModule({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });

  saveUserData(newUserData);
  return newUserData;
}

export function getUserData(): UserData {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return initializeUserData();

  const parsedData = parseStoredUserData(data);
  if (!parsedData) return initializeUserData();

  const migratedData = migrateLegacyUserDataFromModule(parsedData, CURRENT_STORAGE_VERSION);
  if (migratedData !== parsedData) {
    saveUserData(migratedData);
  }

  return migratedData;
}

export function saveUserData(data: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeUserData(data)));
}

export function upgradeLegacyGoalToSystem(goalId: string): boolean {
  const data = getUserData();
  const didUpgrade = upgradeLegacyGoalToSystemInData(data, goalId);
  if (!didUpgrade) return false;
  saveUserData(data);
  return true;
}

export function updateWheelOfLife(areas: LifeArea[]): void {
  const data = getUserData();
  updateWheelOfLifeInData(data, areas);
  saveUserData(data);
}

export function addGoal(goal: Omit<Goal, "id" | "createdAt">): string {
  const data = getUserData();
  const goalId = addGoalToData(data, goal);
  checkAchievementsInData(data);
  saveUserData(data);
  return goalId;
}

export function updateGoal(goalId: string, updates: Partial<Goal>): void {
  const data = getUserData();
  if (!updateGoalInData(data, goalId, updates)) return;
  checkAchievementsInData(data);
  saveUserData(data);
}

export function resetTwelveWeekGoalCycle(goalId: string, referenceDate = new Date()): boolean {
  const data = getUserData();
  const didReset = resetTwelveWeekGoalCycleInData(data, goalId, referenceDate);
  if (!didReset) return false;
  saveUserData(data);
  return true;
}

export function deleteGoal(goalId: string): void {
  const data = getUserData();
  deleteGoalFromData(data, goalId);
  saveUserData(data);
}

export function addVisionBoard(board: Omit<VisionBoard, "id" | "createdAt">): string {
  const data = getUserData();
  const newBoardId = addVisionBoardToData(data, board);
  checkAchievementsInData(data);
  saveUserData(data);
  return newBoardId;
}

export function updateVisionBoard(boardId: string, updates: Partial<VisionBoard>): void {
  const data = getUserData();
  if (!updateVisionBoardInData(data, boardId, updates)) return;
  saveUserData(data);
}

export function deleteVisionBoard(boardId: string): void {
  const data = getUserData();
  deleteVisionBoardFromData(data, boardId);
  saveUserData(data);
}

export function addReflection(reflection: Omit<Reflection, "id">): void {
  const data = getUserData();
  addReflectionToData(data, reflection);
  checkAchievementsInData(data);
  saveUserData(data);
}

export function upsertReflection(reflection: Omit<Reflection, "id">): void {
  const data = getUserData();
  upsertReflectionInData(data, reflection);
  checkAchievementsInData(data);
  saveUserData(data);
}

export function deleteReflection(reflectionId: string): void {
  const data = getUserData();
  deleteReflectionFromData(data, reflectionId);
  saveUserData(data);
}

export function trackAppEvent(type: string, goalId?: string, metadata?: Record<string, string>): void {
  const data = getUserData();
  trackAppEventInData(data, type, goalId, metadata);
  saveUserData(data);
}

export function updateAppPreferences(updates: Partial<AppPreferences>): void {
  const data = getUserData();
  updateAppPreferencesInData(data, DEFAULT_APP_PREFERENCES, updates);
  saveUserData(data);
}

export function archiveOutboxItem(outboxId: string): void {
  const data = getUserData();
  archiveOutboxItemInData(data, outboxId);
  saveUserData(data);
}

export function restoreOutboxItem(outboxId: string): void {
  const data = getUserData();
  restoreOutboxItemInData(data, outboxId);
  saveUserData(data);
}

export function restoreArchivedOutbox(): void {
  const data = getUserData();
  restoreArchivedOutboxInData(data);
  saveUserData(data);
}

export function clearArchivedOutbox(): void {
  const data = getUserData();
  clearArchivedOutboxInData(data);
  saveUserData(data);
}

export function clearEventLog(): void {
  const data = getUserData();
  clearEventLogInData(data);
  saveUserData(data);
}

export function clearLocalDeviceSignals(): void {
  const data = getUserData();
  clearLocalDeviceSignalsInData(data);
  saveUserData(data);
  localStorage.removeItem("last_reminder_date");
  localStorage.removeItem("visionboard_last_browser_notification");
  localStorage.removeItem("visionboard_last_outbox_sync");
}

export function exportUserDataSnapshot(): string {
  return JSON.stringify(getUserData(), null, 2);
}

export function getTwelveWeekFunnelSummary(goalId?: string): FunnelStepSummary[] {
  const data = getUserData();
  return getTwelveWeekFunnelSummaryFromData(data, TWELVE_WEEK_FUNNEL_STEPS, goalId);
}

export function getTwelveWeekMonetizationSummary(goalId?: string): FunnelStepSummary[] {
  const data = getUserData();
  return getTwelveWeekFunnelSummaryFromData(data, TWELVE_WEEK_MONETIZATION_STEPS, goalId);
}

export function addAchievement(achievement: Omit<Achievement, "id" | "earnedAt">): void {
  const data = getUserData();
  if (!addAchievementToData(data, achievement)) return;
  saveUserData(data);
}

export function checkAchievements(data: UserData): void {
  checkAchievementsInData(data);
}

export function getInAppReminders(referenceDate = new Date()): InAppReminder[] {
  const data = getUserData();
  return getInAppRemindersFromData(data, referenceDate);
}

export function getCurrentPlan(userData?: UserData): PricingPlanCode {
  const data = userData ?? getUserData();

  if (data.subscription?.status === "active") {
    return normalizePlanCode(data.subscription.planCode);
  }

  const highestEntitledPlan = (data.entitlements ?? []).reduce<PricingPlanCode>(
    (currentHighest, entitlement) =>
      getPlanRank(entitlement.sourcePlan) > getPlanRank(currentHighest)
        ? entitlement.sourcePlan
        : currentHighest,
    "FREE",
  );

  return normalizePlanCode(highestEntitledPlan);
}

export function hasEntitlement(key: EntitlementKey, userData?: UserData): boolean {
  const data = userData ?? getUserData();
  return (data.entitlements ?? []).some((entitlement) => entitlement.key === key);
}

export function getCurrentEntitlementKeys(userData?: UserData): EntitlementKey[] {
  const data = userData ?? getUserData();
  return Array.from(new Set((data.entitlements ?? []).map((entitlement) => entitlement.key)));
}

export function upgradePlanLocally(
  planCode: Exclude<PricingPlanCode, "FREE">,
  options?: {
    startedAt?: string;
    billingCycle?: "monthly" | "quarterly" | "season-pass";
  },
): PricingPlanCode {
  const data = getUserData();
  const startedAt = options?.startedAt ?? new Date().toISOString();
  const currentPlan = getCurrentPlan(data);
  const normalizedPlanCode = normalizePlanCode(planCode) as Exclude<PricingPlanCode, "FREE">;

  if (getPlanRank(currentPlan) >= getPlanRank(normalizedPlanCode)) {
    return currentPlan;
  }

  data.subscription = {
    planCode: normalizedPlanCode,
    status: "active",
    billingCycle: options?.billingCycle ?? "season-pass",
    startedAt,
    renewsAt: null,
    canceledAt: null,
    isLocalTestMode: true,
  };
  data.entitlements = getEntitlementsForPlan(normalizedPlanCode, startedAt);

  saveUserData(data);
  return normalizedPlanCode;
}

export function restorePlanAccessLocally(): PricingPlanCode {
  const data = getUserData();
  const currentPlan = getCurrentPlan(data);

  if (currentPlan === "FREE") {
    data.subscription = null;
    data.entitlements = [];
    saveUserData(data);
    return currentPlan;
  }

  const startedAt = data.subscription?.startedAt ?? new Date().toISOString();
  data.subscription = {
    planCode: currentPlan,
    status: "active",
    billingCycle: data.subscription?.billingCycle ?? "season-pass",
    startedAt,
    renewsAt: data.subscription?.renewsAt ?? null,
    canceledAt: null,
    isLocalTestMode: data.subscription?.isLocalTestMode ?? true,
  };
  data.entitlements = getEntitlementsForPlan(currentPlan, startedAt);

  saveUserData(data);
  return currentPlan;
}

export function getRandomMotivationalQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export function calculateGoalProgress(goal: Goal): number {
  const execution = getGoalExecutionStatsFromModule(goal);
  if (execution.total === 0) return 0;
  return Math.round((execution.completed / execution.total) * 100);
}
