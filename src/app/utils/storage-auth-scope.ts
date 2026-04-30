import {
  ANONYMOUS_USER_DATA_STORAGE_KEY,
  AUTH_OWNER_STORAGE_KEY,
  AUXILIARY_USER_DATA_STORAGE_KEYS,
  AUXILIARY_USER_DATA_STORAGE_PREFIXES,
  STORAGE_KEY,
  USER_DATA_STORAGE_KEY,
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
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    if (currentRaw) mirrorUserDataToActiveAuthScope(currentRaw);
    localStorage.removeItem(AUTH_OWNER_STORAGE_KEY);
  } catch {
    // ignore storage errors during auth teardown
  }
}
