import { readActiveAuthOwnerUid } from "./storage-auth-scope";
import { BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY, BACKEND_LINK_STORAGE_KEYS } from "./storage-constants";

type BackendLinkMap = Record<string, unknown>;

function isRecord(value: unknown): value is BackendLinkMap {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readMapFromStorage<T extends BackendLinkMap>(storageKey: string): T | null {
  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsedValue)) return null;

    return parsedValue as T;
  } catch {
    return null;
  }
}

function writeMapToStorage<T extends BackendLinkMap>(storageKey: string, nextMap: T): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextMap));
  } catch {
    // Link stores are best-effort caches for backend IDs. Local app data remains the source of truth.
  }
}

export function getScopedBackendLinkStorageKey(legacyKey: string, authUid: string): string {
  return `${legacyKey}:auth:${encodeURIComponent(authUid)}`;
}

function getKnownScopedBackendLinkPrefixes(): string[] {
  return BACKEND_LINK_STORAGE_KEYS.map((legacyKey) => `${legacyKey}:auth:`);
}

function hasAnyScopedBackendLinkMap(): boolean {
  const prefixes = getKnownScopedBackendLinkPrefixes();

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) return true;
  }

  return false;
}

function hasScopedBackendLinkMapForUid(authUid: string): boolean {
  const encodedUid = encodeURIComponent(authUid);
  return BACKEND_LINK_STORAGE_KEYS.some(
    (legacyKey) => localStorage.getItem(`${legacyKey}:auth:${encodedUid}`) !== null,
  );
}

function canReadLegacyLinksForAuthUser(authUid: string): boolean {
  const legacyOwnerUid = localStorage.getItem(BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY)?.trim() ?? "";
  if (legacyOwnerUid) return legacyOwnerUid === authUid;

  return !hasAnyScopedBackendLinkMap() || hasScopedBackendLinkMapForUid(authUid);
}

function claimLegacyLinksForAuthUser(authUid: string): void {
  try {
    const legacyOwnerUid = localStorage.getItem(BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY)?.trim() ?? "";
    if (!legacyOwnerUid) localStorage.setItem(BACKEND_LINK_LEGACY_OWNER_STORAGE_KEY, authUid);
  } catch {
    // Ignore storage errors. The scoped copy still keeps the active session isolated when possible.
  }
}

export function readBackendLinkMap<T extends BackendLinkMap>(legacyKey: string): T {
  if (typeof window === "undefined") return {} as T;

  const authUid = readActiveAuthOwnerUid();
  if (!authUid) return readMapFromStorage<T>(legacyKey) ?? ({} as T);

  const scopedKey = getScopedBackendLinkStorageKey(legacyKey, authUid);
  const scopedMap = readMapFromStorage<T>(scopedKey);
  if (scopedMap) return scopedMap;

  const legacyMap = readMapFromStorage<T>(legacyKey);
  if (!legacyMap || Object.keys(legacyMap).length === 0) return {} as T;
  if (!canReadLegacyLinksForAuthUser(authUid)) return {} as T;

  claimLegacyLinksForAuthUser(authUid);
  writeMapToStorage(scopedKey, legacyMap);
  return legacyMap;
}

export function writeBackendLinkMap<T extends BackendLinkMap>(legacyKey: string, nextMap: T): void {
  if (typeof window === "undefined") return;

  const authUid = readActiveAuthOwnerUid();
  const storageKey = authUid ? getScopedBackendLinkStorageKey(legacyKey, authUid) : legacyKey;
  writeMapToStorage(storageKey, nextMap);
}
