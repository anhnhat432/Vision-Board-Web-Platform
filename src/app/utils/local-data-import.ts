import { createSanitizedLocalUserDataBackup } from "./local-data-backup";
import { parseStoredUserData } from "./storage";
import type { TwelveWeekSystem, UserData } from "./storage-types";

export const MAX_LOCAL_DATA_IMPORT_BYTES = 10 * 1024 * 1024;
export const LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME = "visionboard:local-file-import-state-changed";

export interface LocalDataImportSummary {
  goalCount: number;
  twelveWeekSystemCount: number;
  taskCount: number;
  dailyCheckInCount: number;
  weeklyReviewCount: number;
  wheelRecordCount: number;
  reflectionCount: number;
  visionBoardCount: number;
}

export interface LocalDataImportCandidate {
  fileName: string;
  data: UserData;
  fingerprint: string;
  currentFingerprint: string;
  currentSummary: LocalDataImportSummary;
  importedSummary: LocalDataImportSummary;
}

export type LocalDataImportCandidateResult =
  | { status: "ready"; candidate: LocalDataImportCandidate }
  | { status: "invalid"; reason: "file_too_large" | "invalid_backup" };

function getSystems(data: UserData): TwelveWeekSystem[] {
  return data.goals
    .map((goal) => goal.twelveWeekSystem)
    .filter((system): system is TwelveWeekSystem => Boolean(system));
}

export function summarizeLocalDataImport(data: UserData): LocalDataImportSummary {
  const systems = getSystems(data);
  return {
    goalCount: data.goals.length,
    twelveWeekSystemCount: systems.length,
    taskCount:
      data.goals.reduce((total, goal) => total + goal.tasks.length, 0) +
      systems.reduce((total, system) => total + system.taskInstances.length, 0),
    dailyCheckInCount: systems.reduce((total, system) => total + system.dailyCheckIns.length, 0),
    weeklyReviewCount: systems.reduce((total, system) => total + system.weeklyReviews.length, 0),
    wheelRecordCount: data.wheelOfLifeHistory.length + (data.currentWheelOfLife.some((area) => area.score > 0) ? 1 : 0),
    reflectionCount: data.reflections.length,
    visionBoardCount: data.visionBoards.length,
  };
}

export function fingerprintLocalDataImport(data: UserData): string {
  const raw = JSON.stringify(data);
  let hash = 2_166_136_261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${raw.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

export function prepareLocalDataImportCandidate(input: {
  fileName: string;
  sizeBytes: number;
  text: string;
  currentData: UserData;
}): LocalDataImportCandidateResult {
  if (input.sizeBytes > MAX_LOCAL_DATA_IMPORT_BYTES) {
    return { status: "invalid", reason: "file_too_large" };
  }

  const parsed = parseStoredUserData(input.text);
  if (!parsed) return { status: "invalid", reason: "invalid_backup" };

  const sanitized = createSanitizedLocalUserDataBackup(parsed);
  const data: UserData = {
    ...sanitized,
    userId: input.currentData.userId,
    isHydratedFromDemo: undefined,
  };

  return {
    status: "ready",
    candidate: {
      fileName: input.fileName,
      data,
      fingerprint: fingerprintLocalDataImport(data),
      currentFingerprint: fingerprintLocalDataImport(input.currentData),
      currentSummary: summarizeLocalDataImport(input.currentData),
      importedSummary: summarizeLocalDataImport(data),
    },
  };
}
