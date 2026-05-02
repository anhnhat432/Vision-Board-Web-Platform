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

export function getLocalUserDataBackupFilename(
  filenamePrefix = "vision-board-local-backup",
  now = new Date(),
): string {
  const safePrefix = filenamePrefix.trim().replace(/[^a-zA-Z0-9._-]+/g, "-") || "vision-board-local-backup";
  return `${safePrefix}-${now.toISOString().slice(0, 10)}.json`;
}

export function downloadLocalUserDataBackup({
  data,
  filenamePrefix,
  now,
}: LocalUserDataBackupDownloadOptions): void {
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
