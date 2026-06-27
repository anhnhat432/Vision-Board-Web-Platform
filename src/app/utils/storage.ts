// Local Storage Management Utility

import { toast } from "sonner";
import { shouldSeedDemoData } from "./app-mode";
import { postUserDataMutation, subscribeUserDataMutation, userDataMutationSource } from "./cross-tab-sync";
import { createLocalUserDataBackupJson } from "./local-data-backup";
import { cleanupExpiredMigrationBackups, registerOnImportComplete } from "./local-data-migration";
import { addAchievementToData, checkAchievementsInData } from "./storage-achievement-ops";
import {
  activateAuthenticatedUserDataInStorage,
  mirrorUserDataToActiveAuthScope,
  persistActiveAuthenticatedUserDataInStorage,
  removeKnownAuxiliaryUserData,
} from "./storage-auth-scope";
import {
  getCurrentEntitlementKeysFromData,
  getCurrentPlanFromData,
  hasEntitlementInData,
  restorePlanAccessLocallyInData,
  startTrialLocallyInData,
  upgradePlanLocallyInData,
} from "./storage-billing-ops";
import {
  APP_STORAGE_KEYS,
  AUTH_OWNER_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  FEASIBILITY_RESULT_LABELS,
  LIFE_AREA_LABELS,
  MOTIVATIONAL_QUOTES,
  REVIEW_DAY_LABELS,
  STORAGE_KEY,
  TWELVE_WEEK_FUNNEL_STEPS,
  TWELVE_WEEK_MONETIZATION_STEPS,
  USER_DATA_UPDATED_EVENT_NAME,
} from "./storage-constants";
import {
  compareCalendarDateKeys as compareCalendarDateKeysFromModule,
  formatCalendarDate as formatCalendarDateFromModule,
  formatDateInputValue as formatDateInputValueFromModule,
  getCalendarDateKey as getCalendarDateKeyFromModule,
  getCalendarDayDifference as getCalendarDayDifferenceFromModule,
  isCalendarDateKeyAfter as isCalendarDateKeyAfterFromModule,
  isCalendarDateKeyBefore as isCalendarDateKeyBeforeFromModule,
  isCalendarDateKeyOnOrAfter as isCalendarDateKeyOnOrAfterFromModule,
  isCalendarDateKeyOnOrBefore as isCalendarDateKeyOnOrBeforeFromModule,
  parseCalendarDate as parseCalendarDateFromModule,
  sortReflectionsByDateDesc as sortReflectionsByDateDescFromModule,
} from "./storage-date-utils";
import {
  createDemoUserData as createDemoUserDataFromModule,
  createEmptyUserData as createEmptyUserDataFromModule,
  shouldHydrateDemoData as shouldHydrateDemoDataFromModule,
} from "./storage-demo-data";
import {
  addGoalToData,
  deleteGoalFromData,
  recomputeGoalProgressFromWeeksInData,
  resetTwelveWeekGoalCycleInData,
  toggleTwelveWeekTaskInData,
  updateGoalInData,
  updateWheelOfLifeInData,
  upgradeLegacyGoalToSystemInData,
} from "./storage-goal-ops";
import {
  archiveOutboxItemInData,
  autoScheduleEmailRemindersInData,
  cancelEmailReminderInData,
  clearArchivedOutboxInData,
  clearEventLogInData,
  clearLocalDeviceSignalsInData,
  clearPushSubscriptionInData,
  getDueEmailRemindersInData,
  getInAppRemindersFromData,
  getOrAssignExperimentVariantInData,
  getTwelveWeekFunnelSummaryFromData,
  markEmailReminderSentInData,
  markExperimentExposedInData,
  restoreArchivedOutboxInData,
  restoreOutboxItemInData,
  savePushSubscriptionInData,
  scheduleEmailReminderInData,
  trackAppEventInData,
  updateAppPreferencesInData,
} from "./storage-local-ops";
import { addReflectionToData, deleteReflectionFromData, upsertReflectionInData } from "./storage-reflection-ops";
import {
  getActiveTwelveWeekGoal as getActiveTwelveWeekGoalFromModule,
  getGoalExecutionStats as getGoalExecutionStatsFromModule,
  getTwelveWeekCurrentWeek as getTwelveWeekCurrentWeekFromModule,
  getTwelveWeekCycleWeekNumber as getTwelveWeekCycleWeekNumberFromModule,
  getTwelveWeekMissedTasks as getTwelveWeekMissedTasksFromModule,
  getTwelveWeekTacticCount as getTwelveWeekTacticCountFromModule,
  getTwelveWeekTasksForWeek as getTwelveWeekTasksForWeekFromModule,
  getTwelveWeekTodayTasks as getTwelveWeekTodayTasksFromModule,
  getTwelveWeekWeekCompletion as getTwelveWeekWeekCompletionFromModule,
  getTwelveWeekWeekRange as getTwelveWeekWeekRangeFromModule,
  isTwelveWeekCycleReviewPhase as isTwelveWeekCycleReviewPhaseFromModule,
  isTwelveWeekReviewDueToday as isTwelveWeekReviewDueTodayFromModule,
  migrateLegacyUserData as migrateLegacyUserDataFromModule,
  normalizeGoal as normalizeGoalFromModule,
  sortTwelveWeekGoalsForSelection as sortTwelveWeekGoalsForSelectionFromModule,
} from "./storage-twelve-week";
import type {
  Achievement,
  AppPreferences,
  AspirationalVision,
  AspirationalVisionArea,
  EntitlementKey,
  ExperimentVariantId,
  FunnelStepSummary,
  Goal,
  InAppReminder,
  LifeArea,
  PricingPlanCode,
  PrivacyConsentCategory,
  Reflection,
  Task,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalWeeklyReview,
  UserData,
  VisionBoard,
} from "./storage-types";
import {
  addVisionBoardToData,
  deleteVisionBoardFromData,
  normalizeVisionBoard,
  updateVisionBoardInData,
} from "./storage-vision-board-ops";
import { getEntitlementsForPlan } from "./twelve-week-premium";

export {
  APP_STORAGE_KEYS,
  FEASIBILITY_RESULT_LABELS,
  LIFE_AREA_LABELS,
  LIFE_AREAS,
  MOTIVATIONAL_QUOTES,
  REVIEW_DAY_LABELS,
  USER_DATA_STORAGE_KEY,
  USER_DATA_UPDATED_EVENT_NAME,
} from "./storage-constants";
export type {
  Achievement,
  AppPreferences,
  AspirationalVision,
  AspirationalVisionArea,
  AspirationalVisionLifeArea,
  BillingCycle,
  DailyUpdate,
  Entitlement,
  EntitlementKey,
  FunnelStepSummary,
  Goal,
  InAppReminder,
  LagMetric,
  LeadIndicator,
  LeadIndicatorCommitment,
  LifeArea,
  Milestones,
  PricingPlanCode,
  Reflection,
  ScoreboardWeek,
  Subscription,
  SubscriptionStatus,
  SyncOutboxItem,
  TacticType,
  Task,
  TimeBlock,
  TimeBlockDayOfWeek,
  TimeBlockType,
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
  VisionBoardItemStyle,
  VisionBoardItemType,
  VisionBoardSizePreset,
  VisionBoardThemeId,
  WeeklyPlanEntry,
  WeeklyReview,
  WheelOfLifeRecord,
} from "./storage-types";

const LEGACY_TRUST_BADGE_DISMISSED_KEY = "trust_badge_dismissed_v1";

let _cachedUserData: UserData | null = null;
let _cachedRawHash: string | null = null;

// Invalidate in-memory cache when another browser context saves user data.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      hydrateUserDataCacheFromStorage();
    }
  });

  subscribeUserDataMutation((payload) => {
    if (payload.source === userDataMutationSource) return;

    try {
      hydrateUserDataCacheFromStorage();
      notifyUserDataUpdated();
    } catch {
      // Ignore late BroadcastChannel messages after the test/browser context is gone.
    }
  });
}

registerOnImportComplete(() => {
  resetUserDataCache();
  hydrateUserDataCacheFromStorage();
});

function notifyUserDataUpdated(): void {
  if (typeof window === "undefined") return;

  const emit = () => {
    window.dispatchEvent(new CustomEvent(USER_DATA_UPDATED_EVENT_NAME));
  };

  if (typeof queueMicrotask === "function") {
    queueMicrotask(emit);
    return;
  }

  window.setTimeout(emit, 0);
}

export function resetUserDataCache(): void {
  _cachedUserData = null;
  _cachedRawHash = null;
}

function removeLegacyTrustBadgeDismissal(): void {
  localStorage.removeItem(LEGACY_TRUST_BADGE_DISMISSED_KEY);
}

function setUserDataCache(data: UserData, rawHash: string): void {
  _cachedUserData = data;
  _cachedRawHash = rawHash;
}

function hydrateUserDataCacheFromStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    resetUserDataCache();
    return;
  }

  const parsed = parseStoredUserData(raw);
  if (!parsed) {
    resetUserDataCache();
    return;
  }

  setUserDataCache(parsed, raw);
}

function createFreshUserData(): UserData {
  return createEmptyUserDataFromModule({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });
}

function normalizeReflection(reflection: Reflection): Reflection {
  const entryType =
    reflection.entryType === "weekly-review" || reflection.entryType === "cycleReview"
      ? reflection.entryType
      : "freeform";

  return {
    ...reflection,
    entryType,
    linkedGoalId: reflection.linkedGoalId,
    linkedWeekNumber: reflection.linkedWeekNumber,
    cycleId: reflection.cycleId,
    finalLagPercent: reflection.finalLagPercent,
  };
}

const ASPIRATIONAL_VISION_AREAS = new Set<AspirationalVisionArea>([
  "health",
  "career",
  "relationships",
  "finance",
  "personal",
  "family",
  "other",
]);

function normalizeAspirationalVision(value: unknown): AspirationalVision | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const record = value as Partial<AspirationalVision>;
  if (
    typeof record.id !== "string" ||
    record.id.trim().length === 0 ||
    (record.horizonYears !== 3 && record.horizonYears !== 5) ||
    typeof record.summary !== "string" ||
    record.summary.trim().length === 0 ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string"
  ) {
    return undefined;
  }

  const lifeAreas = Array.isArray(record.lifeAreas)
    ? record.lifeAreas
        .map((area) => {
          if (!area || typeof area !== "object" || Array.isArray(area)) return null;
          const areaRecord = area as { area?: unknown; statement?: unknown };
          if (
            typeof areaRecord.area !== "string" ||
            !ASPIRATIONAL_VISION_AREAS.has(areaRecord.area as AspirationalVisionArea)
          ) {
            return null;
          }
          if (typeof areaRecord.statement !== "string") return null;
          const statement = areaRecord.statement.trim();
          if (!statement) return null;
          return {
            area: areaRecord.area as AspirationalVisionArea,
            statement,
          };
        })
        .filter((area): area is AspirationalVision["lifeAreas"][number] => area !== null)
    : [];

  return {
    id: record.id.trim(),
    horizonYears: record.horizonYears,
    summary: record.summary.trim(),
    lifeAreas,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    lastModifiedAt: Number.isFinite(task.lastModifiedAt) ? task.lastModifiedAt : 0,
  };
}

function normalizeGoalTasks(goal: Goal): Goal {
  return {
    ...goal,
    tasks: Array.isArray(goal.tasks) ? goal.tasks.map(normalizeTask) : [],
  };
}

function normalizeUserData(data: UserData): UserData {
  const subscription = data.subscription ?? null;
  const entitlements = Array.isArray(data.entitlements) ? data.entitlements : [];
  const subscriptionIsActive = subscription?.status === "active" || subscription?.status === "trialing";
  const subscriptionExpired = Boolean(
    subscription?.renewsAt &&
      Number.isFinite(new Date(subscription.renewsAt).valueOf()) &&
      new Date(subscription.renewsAt) < new Date(),
  );
  const normalizedEntitlements =
    subscriptionIsActive && !subscriptionExpired && entitlements.length === 0
      ? getEntitlementsForPlan(subscription.planCode, subscription.startedAt)
      : subscription && (!subscriptionIsActive || subscriptionExpired)
        ? []
        : entitlements;

  return {
    ...data,
    storageVersion: data.storageVersion || CURRENT_STORAGE_VERSION,
    goals: Array.isArray(data.goals) ? data.goals.map((goal) => normalizeGoalFromModule(normalizeGoalTasks(goal))) : [],
    reflections: sortReflectionsByDateDesc(
      Array.isArray(data.reflections) ? data.reflections.map((reflection) => normalizeReflection(reflection)) : [],
    ),
    eventLog: Array.isArray(data.eventLog) ? data.eventLog : [],
    syncOutbox: Array.isArray(data.syncOutbox) ? data.syncOutbox : [],
    visionBoards: Array.isArray(data.visionBoards)
      ? data.visionBoards.map(normalizeVisionBoard).filter((board): board is VisionBoard => board !== null)
      : [],
    appPreferences: {
      ...DEFAULT_APP_PREFERENCES,
      ...(data.appPreferences ?? {}),
    },
    aspirationalVision: normalizeAspirationalVision(data.aspirationalVision),
    subscription,
    entitlements: normalizedEntitlements,
  };
}

function getComparableLastModifiedAt(value: { lastModifiedAt?: number }): number {
  return Number.isFinite(value.lastModifiedAt) ? (value.lastModifiedAt ?? 0) : 0;
}

function isSameTwelveWeekCycle(localSystem: TwelveWeekSystem, incomingSystem: TwelveWeekSystem): boolean {
  return (
    localSystem.startDate === incomingSystem.startDate &&
    localSystem.endDate === incomingSystem.endDate &&
    localSystem.totalWeeks === incomingSystem.totalWeeks &&
    (localSystem.cycleNumber ?? 1) === (incomingSystem.cycleNumber ?? 1)
  );
}

function getDailyCheckInMergeKey(checkIn: UniversalDailyCheckIn): string {
  const dateKey = getCalendarDateKeyFromModule(checkIn.date) ?? checkIn.date;
  return [
    dateKey,
    String(checkIn.updatedCount ?? 1),
    String(checkIn.didWorkToday),
    checkIn.mood ?? "",
    checkIn.optionalNote,
    checkIn.amountDone,
    checkIn.outputCreated,
  ].join("\u0001");
}

function getDailyCheckInSortDate(checkIn: UniversalDailyCheckIn): string {
  return getCalendarDateKeyFromModule(checkIn.date) ?? checkIn.date;
}

function mergeDailyCheckIns(
  localCheckIns: UniversalDailyCheckIn[],
  incomingCheckIns: UniversalDailyCheckIn[],
): UniversalDailyCheckIn[] {
  const incomingKeys = new Set(incomingCheckIns.map(getDailyCheckInMergeKey));
  const mergedCheckIns = [
    ...incomingCheckIns,
    ...localCheckIns.filter((checkIn) => !incomingKeys.has(getDailyCheckInMergeKey(checkIn))),
  ];

  return mergedCheckIns
    .sort((left, right) => {
      const dateDelta = getDailyCheckInSortDate(right).localeCompare(getDailyCheckInSortDate(left));
      if (dateDelta !== 0) return dateDelta;
      return (right.updatedCount ?? 1) - (left.updatedCount ?? 1);
    })
    .slice(0, 120);
}

function mergeWeeklyReviews(
  localReviews: UniversalWeeklyReview[],
  incomingReviews: UniversalWeeklyReview[],
): UniversalWeeklyReview[] {
  const incomingWeeks = new Set(incomingReviews.map((review) => review.weekNumber));
  return [
    ...incomingReviews,
    ...localReviews.filter((review) => !incomingWeeks.has(review.weekNumber)),
  ].sort((left, right) => left.weekNumber - right.weekNumber);
}

function mergeGoalTaskMutations(localGoal: Goal, incomingGoal: Goal): Goal {
  const localTasksById = new Map(localGoal.tasks.map((task) => [task.id, task]));
  const mergedTasks = incomingGoal.tasks.map((incomingTask) => {
    const localTask = localTasksById.get(incomingTask.id);
    if (!localTask) return incomingTask;
    return getComparableLastModifiedAt(incomingTask) >= getComparableLastModifiedAt(localTask)
      ? incomingTask
      : localTask;
  });

  const localTaskInstancesById = new Map(
    (localGoal.twelveWeekSystem?.taskInstances ?? []).map((task) => [task.id, task]),
  );
  const incomingSystem = incomingGoal.twelveWeekSystem;
  const mergedTaskInstances = incomingSystem?.taskInstances.map((incomingTask) => {
    const localTask = localTaskInstancesById.get(incomingTask.id);
    if (!localTask) return incomingTask;
    return getComparableLastModifiedAt(incomingTask) >= getComparableLastModifiedAt(localTask)
      ? incomingTask
      : localTask;
  });
  const localSystem = localGoal.twelveWeekSystem;
  const shouldMergeExecutionRecords = Boolean(
    localSystem && incomingSystem && isSameTwelveWeekCycle(localSystem, incomingSystem),
  );

  return {
    ...incomingGoal,
    tasks: mergedTasks,
    twelveWeekSystem:
      incomingSystem && mergedTaskInstances
        ? {
            ...incomingSystem,
            taskInstances: mergedTaskInstances,
            dailyCheckIns:
              shouldMergeExecutionRecords && localSystem
                ? mergeDailyCheckIns(localSystem.dailyCheckIns, incomingSystem.dailyCheckIns)
                : incomingSystem.dailyCheckIns,
            weeklyReviews:
              shouldMergeExecutionRecords && localSystem
                ? mergeWeeklyReviews(localSystem.weeklyReviews, incomingSystem.weeklyReviews)
                : incomingSystem.weeklyReviews,
          }
        : incomingSystem,
  };
}

function mergeUserDataTaskMutations(localData: UserData | null, incomingData: UserData): UserData {
  if (!localData) return incomingData;

  const localGoalsById = new Map(localData.goals.map((goal) => [goal.id, goal]));
  return {
    ...incomingData,
    goals: incomingData.goals.map((incomingGoal) => {
      const localGoal = localGoalsById.get(incomingGoal.id);
      return localGoal ? mergeGoalTaskMutations(localGoal, incomingGoal) : incomingGoal;
    }),
  };
}

function getLatestStoredUserDataForMerge(): UserData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return parseStoredUserData(raw);
}

function isValidUserDataShape(data: unknown): data is UserData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.storageVersion === "number" &&
    typeof obj.userId === "string" &&
    Array.isArray(obj.goals) &&
    Array.isArray(obj.currentWheelOfLife) &&
    Array.isArray(obj.wheelOfLifeHistory) &&
    Array.isArray(obj.visionBoards) &&
    Array.isArray(obj.achievements) &&
    Array.isArray(obj.reflections) &&
    typeof obj.onboardingCompleted === "boolean"
  );
}

export function parseStoredUserData(raw: string): UserData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidUserDataShape(parsed)) return null;
    return normalizeUserData(parsed);
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

export function compareCalendarDateKeys(left: string, right: string): number | null {
  return compareCalendarDateKeysFromModule(left, right);
}

export function isCalendarDateKeyBefore(left: string, right: string): boolean {
  return isCalendarDateKeyBeforeFromModule(left, right);
}

export function isCalendarDateKeyAfter(left: string, right: string): boolean {
  return isCalendarDateKeyAfterFromModule(left, right);
}

export function isCalendarDateKeyOnOrBefore(left: string, right: string): boolean {
  return isCalendarDateKeyOnOrBeforeFromModule(left, right);
}

export function isCalendarDateKeyOnOrAfter(left: string, right: string): boolean {
  return isCalendarDateKeyOnOrAfterFromModule(left, right);
}

export function formatCalendarDate(value: string, locale = "vi-VN", options?: Intl.DateTimeFormatOptions): string {
  return formatCalendarDateFromModule(value, locale, options);
}

export function getCalendarDayDifference(targetDate: string, referenceDate = new Date()): number | null {
  return getCalendarDayDifferenceFromModule(targetDate, referenceDate);
}

export function isTwelveWeekReviewDueToday(system: TwelveWeekSystem, referenceDate = new Date()): boolean {
  return isTwelveWeekReviewDueTodayFromModule(system, referenceDate);
}

export function getTwelveWeekCurrentWeek(system: TwelveWeekSystem, referenceDate = new Date()): number {
  return getTwelveWeekCurrentWeekFromModule(system, referenceDate);
}

export function getTwelveWeekCycleWeekNumber(system: TwelveWeekSystem, referenceDate = new Date()): number {
  return getTwelveWeekCycleWeekNumberFromModule(system, referenceDate);
}

export function isTwelveWeekCycleReviewPhase(system: TwelveWeekSystem, referenceDate = new Date()): boolean {
  return isTwelveWeekCycleReviewPhaseFromModule(system, referenceDate);
}

export function getTwelveWeekWeekRange(system: TwelveWeekSystem, weekNumber: number): { start: string; end: string } {
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

export function sortTwelveWeekGoalsForSelection(goals: Goal[]): Goal[] {
  return sortTwelveWeekGoalsForSelectionFromModule(goals);
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
  removeLegacyTrustBadgeDismissal();
  const demoMode = shouldSeedDemoData();
  const existingData = localStorage.getItem(STORAGE_KEY);

  if (existingData) {
    const parsedData = parseStoredUserData(existingData);
    if (parsedData) {
      if (demoMode && shouldHydrateDemoDataFromModule(parsedData)) {
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

  const newUserData = demoMode
    ? createDemoUserDataFromModule({
        currentStorageVersion: CURRENT_STORAGE_VERSION,
        defaultAppPreferences: DEFAULT_APP_PREFERENCES,
        motivationalQuotes: MOTIVATIONAL_QUOTES,
      })
    : createEmptyUserDataFromModule({
        currentStorageVersion: CURRENT_STORAGE_VERSION,
        defaultAppPreferences: DEFAULT_APP_PREFERENCES,
        motivationalQuotes: MOTIVATIONAL_QUOTES,
      });

  saveUserData(newUserData);
  return newUserData;
}

export function activateAuthenticatedUserData(authUid: string): void {
  activateAuthenticatedUserDataInStorage(authUid, {
    createFreshUserData,
    normalizeUserData,
    parseStoredUserData,
    resetUserDataCache,
    setUserDataCache,
    notifyUserDataUpdated,
  });
}

export function persistActiveAuthenticatedUserData(): void {
  persistActiveAuthenticatedUserDataInStorage();
}

let _migrationBackupsCleaned = false;

function ensureMigrationBackupsCleaned(): void {
  if (_migrationBackupsCleaned) return;
  _migrationBackupsCleaned = true;
  cleanupExpiredMigrationBackups();
}

export function getUserData(): UserData {
  ensureMigrationBackupsCleaned();
  if (_cachedUserData) {
    return _cachedUserData;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initializeUserData();

  const parsedData = parseStoredUserData(raw);
  if (!parsedData) return initializeUserData();

  const migratedData = migrateLegacyUserDataFromModule(parsedData, CURRENT_STORAGE_VERSION);
  if (migratedData !== parsedData) {
    saveUserData(migratedData);
  }

  _cachedUserData = migratedData;
  _cachedRawHash = raw;
  return migratedData;
}

export function saveUserData(data: UserData): boolean {
  const normalizedLatest = normalizeUserData(mergeUserDataTaskMutations(getLatestStoredUserDataForMerge(), data));
  const serialized = JSON.stringify(normalizedLatest);

  // Keep previous cache for rollback in case of quota failure
  const prevCachedData = _cachedUserData;
  const prevCachedHash = _cachedRawHash;

  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    mirrorUserDataToActiveAuthScope(serialized);
    _cachedUserData = normalizedLatest;
    _cachedRawHash = serialized;
    postUserDataMutation({ at: Date.now(), source: userDataMutationSource });
    notifyUserDataUpdated();
    return true;
  } catch (err: unknown) {
    // Restore in-memory cache so subsequent getUserData() reads stay consistent
    _cachedUserData = prevCachedData;
    _cachedRawHash = prevCachedHash;

    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      toast.error("Bộ nhớ trên thiết bị này đã đầy. Dữ liệu chưa được lưu.", {
        description: "Hãy xóa bớt board hoặc ảnh đã tải lên để giải phóng dung lượng, sau đó thử lại.",
        duration: 8000,
      });
      return false;
    }

    // Re-throw non-quota errors so they surface normally
    throw err;
  }
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

export function toggleTwelveWeekTask(goalId: string, taskId: string, completed: boolean, now = Date.now()): boolean {
  const data = getUserData();
  if (!toggleTwelveWeekTaskInData(data, goalId, taskId, completed, now)) return false;
  checkAchievementsInData(data);
  return saveUserData(data);
}

export function recomputeGoalProgressFromWeeks(goalId: string): number | null {
  return recomputeGoalProgressFromWeeksInData(getUserData(), goalId);
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

export function addVisionBoard(board: Omit<VisionBoard, "id" | "createdAt">): string | null {
  const data = getUserData();
  const newBoardId = addVisionBoardToData(data, board);
  checkAchievementsInData(data);
  if (!saveUserData(data)) return null;
  return newBoardId;
}

export function updateVisionBoard(boardId: string, updates: Partial<VisionBoard>): boolean {
  const data = getUserData();
  if (!updateVisionBoardInData(data, boardId, updates)) return false;
  return saveUserData(data);
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
  ["last_reminder_date", "visionboard_last_browser_notification", "visionboard_last_outbox_sync"].forEach((key) => {
    localStorage.removeItem(key);
  });
}

export function exportUserDataSnapshot(): string {
  return createLocalUserDataBackupJson(getUserData());
}

export function updatePrivacyConsent(category: PrivacyConsentCategory, granted: boolean): void {
  const data = getUserData();
  const consents = data.privacyConsents ?? [];
  const existing = consents.find((c) => c.category === category);
  if (existing) {
    existing.granted = granted;
    existing.updatedAt = new Date().toISOString();
  } else {
    consents.push({ category, granted, updatedAt: new Date().toISOString() });
  }
  data.privacyConsents = consents;
  saveUserData(data);
}

export function getPrivacyConsents(): Record<PrivacyConsentCategory, boolean> {
  const data = getUserData();
  const defaults: Record<PrivacyConsentCategory, boolean> = {
    local_analytics: data.appPreferences.allowLocalAnalytics,
    push_notifications: data.appPreferences.enableBrowserNotifications,
    experiment_tracking: true,
  };
  for (const record of data.privacyConsents ?? []) {
    defaults[record.category] = record.granted;
  }
  return defaults;
}

export function deleteAllUserData(): void {
  // Remove main data key first
  localStorage.removeItem(STORAGE_KEY);
  resetUserDataCache();
  localStorage.removeItem(AUTH_OWNER_STORAGE_KEY);

  const keys = Object.values(APP_STORAGE_KEYS);
  for (const key of keys) {
    localStorage.removeItem(key);
  }
  removeKnownAuxiliaryUserData();
  postUserDataMutation({ at: Date.now(), source: userDataMutationSource });
  notifyUserDataUpdated();
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
  return getCurrentPlanFromData(data, () => {
    saveUserData(data);
  });
}

export function hasEntitlement(key: EntitlementKey, userData?: UserData): boolean {
  const data = userData ?? getUserData();
  return hasEntitlementInData(key, data, () => {
    saveUserData(data);
  });
}

export function getCurrentEntitlementKeys(userData?: UserData): EntitlementKey[] {
  const data = userData ?? getUserData();
  return getCurrentEntitlementKeysFromData(data);
}

export function upgradePlanLocally(
  planCode: Exclude<PricingPlanCode, "FREE">,
  options?: {
    startedAt?: string;
    billingCycle?: "monthly" | "quarterly" | "season-pass";
  },
): PricingPlanCode {
  const data = getUserData();
  const beforePlanState = JSON.stringify({ subscription: data.subscription, entitlements: data.entitlements });
  const nextPlan = upgradePlanLocallyInData(data, planCode, options, () => {
    saveUserData(data);
  });
  const afterPlanState = JSON.stringify({ subscription: data.subscription, entitlements: data.entitlements });
  if (afterPlanState !== beforePlanState) {
    saveUserData(data);
  }
  return nextPlan;
}

/** Start a local free trial for the given plan (default: PLUS, 7 days). */
export function startTrialLocally(planCode: Exclude<PricingPlanCode, "FREE"> = "PLUS", trialDays = 7): PricingPlanCode {
  const data = getUserData();
  const beforePlanState = JSON.stringify({ subscription: data.subscription, entitlements: data.entitlements });
  const nextPlan = startTrialLocallyInData(data, planCode, trialDays, () => {
    saveUserData(data);
  });
  const afterPlanState = JSON.stringify({ subscription: data.subscription, entitlements: data.entitlements });
  if (afterPlanState !== beforePlanState) {
    saveUserData(data);
  }
  return nextPlan;
}

export function restorePlanAccessLocally(): PricingPlanCode {
  const data = getUserData();
  const currentPlan = restorePlanAccessLocallyInData(data, () => {
    saveUserData(data);
  });
  saveUserData(data);
  return currentPlan;
}

export function getRandomMotivationalQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

// ─── C3: Experiment framework ─────────────────────────────────────────────────

export function getOrAssignExperimentVariant(
  experimentId: string,
  variants: ExperimentVariantId[],
  weights?: number[],
): ExperimentVariantId {
  const data = getUserData();
  const variantId = getOrAssignExperimentVariantInData(data, experimentId, variants, weights);
  saveUserData(data);
  return variantId;
}

export function markExperimentExposed(experimentId: string): void {
  const data = getUserData();
  markExperimentExposedInData(data, experimentId);
  saveUserData(data);
}

// ─── D3: Email reminder schedule ─────────────────────────────────────────────

export function scheduleEmailReminder(
  item: Omit<import("./storage-types").EmailReminderScheduleItem, "id" | "status">,
): void {
  const data = getUserData();
  scheduleEmailReminderInData(data, item);
  saveUserData(data);
}

export function cancelEmailReminder(id: string): void {
  const data = getUserData();
  cancelEmailReminderInData(data, id);
  saveUserData(data);
}

export function markEmailReminderSent(id: string): void {
  const data = getUserData();
  markEmailReminderSentInData(data, id);
  saveUserData(data);
}

export function getDueEmailReminders(
  referenceDate = new Date(),
): import("./storage-types").EmailReminderScheduleItem[] {
  return getDueEmailRemindersInData(getUserData(), referenceDate);
}

export function autoScheduleEmailReminders(
  event: {
    kind: import("./storage-types").EmailReminderKind;
    goalId?: string;
    weekNumber?: number;
    metadata?: Record<string, string>;
  },
  referenceDate = new Date(),
): void {
  const data = getUserData();
  autoScheduleEmailRemindersInData(data, event, referenceDate);
  saveUserData(data);
}

// ─── D2: Push subscription ────────────────────────────────────────────────────

export function savePushSubscription(record: import("./storage-types").PushSubscriptionRecord): void {
  const data = getUserData();
  savePushSubscriptionInData(data, record);
  saveUserData(data);
}

export function clearPushSubscription(): void {
  const data = getUserData();
  clearPushSubscriptionInData(data);
  saveUserData(data);
}

export function getPushSubscription(): import("./storage-types").PushSubscriptionRecord | null {
  return getUserData().pushSubscription ?? null;
}

export function calculateGoalProgress(goal: Goal): number {
  const execution = getGoalExecutionStatsFromModule(goal);
  if (execution.total === 0) return 0;
  return Math.round((execution.completed / execution.total) * 100);
}
