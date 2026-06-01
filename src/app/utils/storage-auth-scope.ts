import { hasMeaningfulLocalWork } from "./local-data-migration";
import { LAST_ENTITLEMENT_SYNC_KEY, LAST_RESTORE_ACCESS_KEY, MOCK_BILLING_ACCOUNT_KEY } from "./production/env";
import { resetBillingAccessInData } from "./storage-billing-ops";
import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  AUTH_OWNER_STORAGE_KEY,
  AUXILIARY_USER_DATA_STORAGE_KEYS,
  AUXILIARY_USER_DATA_STORAGE_PREFIXES,
  BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY,
  BACKEND_LINK_STORAGE_KEYS,
  LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX,
  STORAGE_KEY,
  USER_DATA_STORAGE_KEY,
  USER_DATA_UPDATED_EVENT_NAME,
} from "./storage-constants";
import type { UserData } from "./storage-types";

interface AuthScopedStorageDependencies {
  createFreshUserData: () => UserData;
  normalizeUserData: (data: UserData) => UserData;
  parseStoredUserData: (raw: string) => UserData | null;
  resetUserDataCache: () => void;
  setUserDataCache: (data: UserData, rawHash: string) => void;
  notifyUserDataUpdated: () => void;
}

export function readActiveAuthOwnerUid(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(AUTH_OWNER_STORAGE_KEY)?.trim() ?? "";
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getScopedUserDataStorageKey(authUid: string): string {
  return `${USER_DATA_STORAGE_KEY}:auth:${encodeURIComponent(authUid)}`;
}

const PREVIOUS_ANONYMOUS_ARCHIVE_PREFIX = "previousAnonymousArchive_";

function notifyUserDataUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_DATA_UPDATED_EVENT_NAME));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseUserDataSnapshot(raw: string | null): UserData | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
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

function resetBillingAccessAtKey(storageKey: string): void {
  const data = parseUserDataSnapshot(localStorage.getItem(storageKey));
  if (!data) return;

  const changed = resetBillingAccessInData(data);
  if (!changed) return;

  localStorage.setItem(storageKey, JSON.stringify(data));
}

function getAnonymousArchiveKeys(): string[] {
  const archiveKeys: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(PREVIOUS_ANONYMOUS_ARCHIVE_PREFIX)) {
      archiveKeys.push(key);
    }
  }

  return archiveKeys;
}

function createPreviousAnonymousArchiveKey(): string {
  let timestamp = Date.now();
  let archiveKey = `${PREVIOUS_ANONYMOUS_ARCHIVE_PREFIX}${timestamp}`;

  while (localStorage.getItem(archiveKey) !== null) {
    timestamp += 1;
    archiveKey = `${PREVIOUS_ANONYMOUS_ARCHIVE_PREFIX}${timestamp}`;
  }

  return archiveKey;
}

function getArchiveTimestamp(archiveKey: string): number {
  const rawTimestamp = archiveKey.slice(PREVIOUS_ANONYMOUS_ARCHIVE_PREFIX.length);
  const timestamp = Number.parseInt(rawTimestamp, 10);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function prunePreviousAnonymousArchives(): void {
  const archiveKeys = getAnonymousArchiveKeys().sort((left, right) => {
    const timestampDelta = getArchiveTimestamp(right) - getArchiveTimestamp(left);
    return timestampDelta === 0 ? right.localeCompare(left) : timestampDelta;
  });

  archiveKeys.slice(3).forEach((archiveKey) => {
    localStorage.removeItem(archiveKey);
  });
}

function archiveAndClearAnonymousUserData(): void {
  const anonymousRaw = localStorage.getItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
  if (!anonymousRaw) {
    prunePreviousAnonymousArchives();
    return;
  }

  const anonymousData = parseUserDataSnapshot(anonymousRaw);
  if (anonymousData && hasMeaningfulLocalWork(anonymousData)) {
    localStorage.setItem(createPreviousAnonymousArchiveKey(), anonymousRaw);
  }

  localStorage.removeItem(ANONYMOUS_USER_DATA_STORAGE_KEY);
  prunePreviousAnonymousArchives();
}

function keyContainsAuthUidScope(key: string, authUid: string): boolean {
  const encodedUid = encodeURIComponent(authUid);
  return (
    key.includes(`auth:${encodedUid}`) ||
    key.includes(`auth:${authUid}`) ||
    key.includes(`:${encodedUid}`) ||
    key.includes(`:${authUid}`) ||
    key.includes(`_${encodedUid}`) ||
    key.includes(`_${authUid}`)
  );
}

function removeAuthScopedAuxiliaryData(authUid: string): void {
  const encodedUid = encodeURIComponent(authUid);

  BACKEND_LINK_STORAGE_KEYS.forEach((legacyKey) => {
    localStorage.removeItem(`${legacyKey}:auth:${encodedUid}`);
  });

  if (localStorage.getItem(BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY)?.trim() === authUid) {
    BACKEND_LINK_STORAGE_KEYS.forEach((legacyKey) => {
      localStorage.removeItem(legacyKey);
    });
    localStorage.removeItem(BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY);
  }

  localStorage.removeItem(`visionboard_data_mutation_queue:auth:${encodedUid}`);

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    if (
      (key.startsWith("pendingMigration") && keyContainsAuthUidScope(key, authUid)) ||
      key.startsWith(`${LOCAL_DATA_IMPORT_BACKUP_STORAGE_PREFIX}auth:${encodedUid}:`)
    ) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Clears sensitive browser data that is scoped to a signed-in Firebase UID.
 *
 * Call this on every logout before Firebase sign-out and before persisting the
 * active authenticated snapshot so billing, entitlement sync markers, restore
 * snapshots, backend link stores, import backups, and UID-scoped mutation queue
 * entries cannot leak to the next account using the same device.
 */
export function clearAuthScopedSensitiveData(authUid: string): void {
  if (typeof window === "undefined") return;

  const normalizedAuthUid = authUid.trim();
  if (!normalizedAuthUid) return;

  resetBillingAccessAtKey(STORAGE_KEY);
  resetBillingAccessAtKey(getScopedUserDataStorageKey(normalizedAuthUid));

  localStorage.removeItem(MOCK_BILLING_ACCOUNT_KEY);
  localStorage.removeItem(LAST_ENTITLEMENT_SYNC_KEY);
  localStorage.removeItem(LAST_RESTORE_ACCESS_KEY);

  removeAuthScopedAuxiliaryData(normalizedAuthUid);
  archiveAndClearAnonymousUserData();
}

export function mirrorUserDataToActiveAuthScope(serialized: string): void {
  const authUid = readActiveAuthOwnerUid();
  if (!authUid) return;

  try {
    localStorage.setItem(getScopedUserDataStorageKey(authUid), serialized);
  } catch {
    // The main local snapshot has already been saved. Scoped mirroring is best-effort.
  }
}

export function removeKnownAuxiliaryUserData(): void {
  AUXILIARY_USER_DATA_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    if (AUXILIARY_USER_DATA_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

export function activateAuthenticatedUserDataInStorage(
  authUid: string,
  dependencies: AuthScopedStorageDependencies,
): void {
  if (typeof window === "undefined") return;

  const nextAuthUid = authUid.trim();
  if (!nextAuthUid) return;

  try {
    const currentOwnerUid = readActiveAuthOwnerUid();
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const nextScopedKey = getScopedUserDataStorageKey(nextAuthUid);

    if (currentOwnerUid === nextAuthUid) {
      if (currentRaw) mirrorUserDataToActiveAuthScope(currentRaw);
      return;
    }

    if (currentRaw) {
      const archiveKey = currentOwnerUid
        ? getScopedUserDataStorageKey(currentOwnerUid)
        : ANONYMOUS_USER_DATA_STORAGE_KEY;
      localStorage.setItem(archiveKey, currentRaw);
    }

    const scopedRaw = localStorage.getItem(nextScopedKey);
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, nextAuthUid);

    if (scopedRaw && dependencies.parseStoredUserData(scopedRaw)) {
      localStorage.setItem(STORAGE_KEY, scopedRaw);
      dependencies.resetUserDataCache();
      dependencies.notifyUserDataUpdated();
      return;
    }

    const freshUserData = dependencies.normalizeUserData(dependencies.createFreshUserData());
    const serialized = JSON.stringify(freshUserData);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(nextScopedKey, serialized);
    dependencies.setUserDataCache(freshUserData, serialized);
    dependencies.notifyUserDataUpdated();
  } catch {
    dependencies.resetUserDataCache();
  }
}

export function persistActiveAuthenticatedUserDataInStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const currentOwnerUid = readActiveAuthOwnerUid();
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    if (currentRaw) mirrorUserDataToActiveAuthScope(currentRaw);

    if (currentOwnerUid) {
      clearAuthScopedSensitiveData(currentOwnerUid);
      localStorage.removeItem(STORAGE_KEY);
      notifyUserDataUpdated();
    }

    localStorage.removeItem(AUTH_OWNER_STORAGE_KEY);
  } catch {
    // ignore storage errors during auth teardown
  }
}
