import type { UserData } from "./storage-types";

export interface LocalUserDataBackupDownloadOptions {
  data: UserData;
  filenamePrefix?: string;
  now?: Date;
}

function cloneUserData(data: UserData): UserData {
  return JSON.parse(JSON.stringify(data)) as UserData;
}

export function createSanitizedLocalUserDataBackup(data: UserData): UserData {
  const backup = cloneUserData(data);

  return {
    ...backup,
    eventLog: [],
    syncOutbox: [],
    subscription: null,
    entitlements: [],
    experimentAssignments: [],
    emailReminderSchedule: [],
    pushSubscription: null,
    privacyConsents: [],
  };
}

export function createLocalUserDataBackupJson(data: UserData): string {
  return JSON.stringify(createSanitizedLocalUserDataBackup(data), null, 2);
}

export interface DataExportPayload {
  exportVersion: string;
  exportedAt: string;
  goal?: UserData["goals"][number];
  twelveWeekSystem?: NonNullable<UserData["goals"][number]["twelveWeekSystem"]>;
  preferences: UserData["appPreferences"];
}

export function createDataExportJson(data: UserData, activeGoalId?: string | null): string {
  const activeGoal = activeGoalId ? (data.goals.find((g) => g.id === activeGoalId) ?? null) : (data.goals[0] ?? null);

  const payload: DataExportPayload = {
    exportVersion: "1.0",
    exportedAt: new Date().toISOString(),
    goal: activeGoal ?? undefined,
    twelveWeekSystem: activeGoal?.twelveWeekSystem ?? undefined,
    preferences: data.appPreferences,
  };

  return JSON.stringify(payload, null, 2);
}

export function getDataExportFilename(now = new Date()): string {
  return `vision-board-export-${now.toISOString().slice(0, 10)}.json`;
}

export function downloadDataExport(data: UserData, activeGoalId?: string | null): void {
  const blob = new Blob([createDataExportJson(data, activeGoalId)], { type: "application/json;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = getDataExportFilename();
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function getLocalUserDataBackupFilename(filenamePrefix = "vision-board-local-backup", now = new Date()): string {
  const safePrefix = filenamePrefix.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "vision-board-local-backup";
  return `${safePrefix}-${now.toISOString().slice(0, 10)}.json`;
}

export function downloadLocalUserDataBackup({ data, filenamePrefix, now }: LocalUserDataBackupDownloadOptions): void {
  const blob = new Blob([createLocalUserDataBackupJson(data)], { type: "application/json;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = getLocalUserDataBackupFilename(filenamePrefix, now);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
