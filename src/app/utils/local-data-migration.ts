import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  AUTH_OWNER_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX,
  LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY,
  MOTIVATIONAL_QUOTES,
  STORAGE_KEY,
  USER_DATA_UPDATED_EVENT_NAME,
} from "./storage-constants";
import { createDemoUserData } from "./storage-demo-data";
import { getScopedUserDataStorageKey, readActiveAuthOwnerUid } from "./storage-auth-scope";
import type {
  Goal,
  Reflection,
  TwelveWeekSystem,
  UserData,
  VisionBoard,
  WheelOfLifeRecord,
} from "./storage-types";

type ComparableValue = Record<string, unknown>;
type LocalDataMigrationPromptState = Record<string, string[]>;

export interface LocalDataMigrationSummary {
  goalCount: number;
  twelveWeekSystemCount: number;
  taskCount: number;
  dailyCheckInCount: number;
  weeklyReviewCount: number;
  wheelRecordCount: number;
  reflectionCount: number;
  visionBoardCount: number;
}

export interface LocalDataMigrationCandidate {
  data: UserData;
  fingerprint: string;
  summary: LocalDataMigrationSummary;
}

export type LocalDataAccountImportStatus =
  | "imported"
  | "blocked_existing_account_data"
  | "inactive_auth_scope"
  | "missing_candidate"
  | "fingerprint_mismatch"
  | "write_failed";

export interface LocalDataAccountImportResult {
  status: LocalDataAccountImportStatus;
  summary?: LocalDataMigrationSummary;
  accountSummary?: LocalDataMigrationSummary;
  backupKey?: string;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUserDataForMigration(rawData: string | null): UserData | null {
  if (!rawData) return null;

  try {
    const parsed = JSON.parse(rawData);
    if (!isRecord(parsed)) return null;

    if (
      !Array.isArray(parsed.goals) ||
      !Array.isArray(parsed.visionBoards) ||
      !Array.isArray(parsed.reflections) ||
      !Array.isArray(parsed.wheelOfLifeHistory) ||
      !Array.isArray(parsed.currentWheelOfLife)
    ) {
      return null;
    }

    return parsed as unknown as UserData;
  } catch {
    return null;
  }
}

function createSnapshotFingerprint(rawData: string): string {
  let hash = 2_166_136_261;

  for (let index = 0; index < rawData.length; index += 1) {
    hash ^= rawData.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return `${rawData.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

function createLocalDataMigrationSummary(data: UserData): LocalDataMigrationSummary {
  const twelveWeekSystems = data.goals
    .map((goal) => goal.twelveWeekSystem)
    .filter((system): system is TwelveWeekSystem => Boolean(system));

  return {
    goalCount: data.goals.length,
    twelveWeekSystemCount: twelveWeekSystems.length,
    taskCount:
      data.goals.reduce((total, goal) => total + goal.tasks.length, 0) +
      twelveWeekSystems.reduce((total, system) => total + system.taskInstances.length, 0),
    dailyCheckInCount: twelveWeekSystems.reduce((total, system) => total + system.dailyCheckIns.length, 0),
    weeklyReviewCount: twelveWeekSystems.reduce((total, system) => total + system.weeklyReviews.length, 0),
    wheelRecordCount:
      data.wheelOfLifeHistory.length + (data.currentWheelOfLife.some((area) => area.score > 0) ? 1 : 0),
    reflectionCount: data.reflections.length,
    visionBoardCount: data.visionBoards.length,
  };
}

function readPromptState(): LocalDataMigrationPromptState {
  if (typeof window === "undefined") return {};

  try {
    const rawState = window.localStorage.getItem(LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY);
    if (!rawState) return {};

    const parsed = JSON.parse(rawState);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string[]] => {
        const [, fingerprints] = entry;
        return Array.isArray(fingerprints) && fingerprints.every((fingerprint) => typeof fingerprint === "string");
      }),
    );
  } catch {
    return {};
  }
}

function writePromptState(state: LocalDataMigrationPromptState): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LOCAL_DATA_MIGRATION_PROMPT_STATE_KEY, JSON.stringify(state));
}

function notifyUserDataUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_DATA_UPDATED_EVENT_NAME));
}

function restoreStorageItem(key: string, value: string | null): void {
  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

function createImportBackupKey(authUid: string, fingerprint: string): string {
  return `${LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX}auth:${encodeURIComponent(authUid)}:${Date.now().toString(36)}:${fingerprint}`;
}

function findMeaningfulAccountData(rawSnapshots: Array<string | null>): UserData | null {
  for (const rawSnapshot of rawSnapshots) {
    const data = parseUserDataForMigration(rawSnapshot);
    if (data && hasMeaningfulLocalWork(data)) return data;
  }

  return null;
}

export function getAnonymousLocalDataMigrationCandidate(): LocalDataMigrationCandidate | null {
  if (typeof window === "undefined") return null;

  const rawData = window.localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
  const data = parseUserDataForMigration(rawData);
  if (!data || !rawData || !hasMeaningfulLocalWork(data)) return null;

  return {
    data,
    fingerprint: createSnapshotFingerprint(rawData),
    summary: createLocalDataMigrationSummary(data),
  };
}

export function importAnonymousLocalDataToAccountScope(
  authUid: string | null | undefined,
  expectedSnapshotFingerprint: string | null | undefined,
): LocalDataAccountImportResult {
  if (typeof window === "undefined") return { status: "missing_candidate" };

  const normalizedAuthUid = authUid?.trim() ?? "";
  if (!normalizedAuthUid || readActiveAuthOwnerUid() !== normalizedAuthUid) {
    return { status: "inactive_auth_scope" };
  }

  const anonymousRaw = window.localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
  const anonymousData = parseUserDataForMigration(anonymousRaw);
  if (!anonymousRaw || !anonymousData || !hasMeaningfulLocalWork(anonymousData)) {
    return { status: "missing_candidate" };
  }

  const actualFingerprint = createSnapshotFingerprint(anonymousRaw);
  if (expectedSnapshotFingerprint && actualFingerprint !== expectedSnapshotFingerprint) {
    return { status: "fingerprint_mismatch", summary: createLocalDataMigrationSummary(anonymousData) };
  }

  const scopedKey = getScopedUserDataStorageKey(normalizedAuthUid);
  const activeRaw = window.localStorage.getItem(STORAGE_KEY);
  const scopedRaw = window.localStorage.getItem(scopedKey);
  const existingAccountData = findMeaningfulAccountData([activeRaw, scopedRaw]);
  if (existingAccountData) {
    return {
      status: "blocked_existing_account_data",
      summary: createLocalDataMigrationSummary(anonymousData),
      accountSummary: createLocalDataMigrationSummary(existingAccountData),
    };
  }

  const backupKey = createImportBackupKey(normalizedAuthUid, actualFingerprint);
  const backupPayload = {
    authUid: normalizedAuthUid,
    createdAt: new Date().toISOString(),
    source: "anonymous_local_import_phase_1",
    snapshotFingerprint: actualFingerprint,
    activeOwnerUid: window.localStorage.getItem(AUTH_OWNER_STORAGE_KEY),
    activeBeforeImportRaw: activeRaw,
    scopedBeforeImportRaw: scopedRaw,
  };

  try {
    window.localStorage.setItem(backupKey, JSON.stringify(backupPayload));
    window.localStorage.setItem(scopedKey, anonymousRaw);
    window.localStorage.setItem(STORAGE_KEY, anonymousRaw);
    notifyUserDataUpdated();

    return {
      status: "imported",
      summary: createLocalDataMigrationSummary(anonymousData),
      backupKey,
    };
  } catch {
    try {
      restoreStorageItem(scopedKey, scopedRaw);
      restoreStorageItem(STORAGE_KEY, activeRaw);
    } catch {
      // Best-effort rollback only. The anonymous source snapshot is never removed.
    }

    return {
      status: "write_failed",
      summary: createLocalDataMigrationSummary(anonymousData),
      backupKey,
    };
  }
}

export function hasSkippedLocalDataMigrationPrompt(
  authUid: string | null | undefined,
  snapshotFingerprint: string | null | undefined,
): boolean {
  if (!authUid || !snapshotFingerprint) return false;

  return readPromptState()[authUid]?.includes(snapshotFingerprint) ?? false;
}

export function markLocalDataMigrationPromptSkipped(authUid: string, snapshotFingerprint: string): void {
  if (!authUid || !snapshotFingerprint) return;

  const state = readPromptState();
  const fingerprints = new Set(state[authUid] ?? []);
  fingerprints.add(snapshotFingerprint);
  writePromptState({ ...state, [authUid]: [...fingerprints] });
}
