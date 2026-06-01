import type { UserProfile } from "@/types/api";

const CACHE_KEY_PREFIX = "auth:profile-cache";
const DEFAULT_TTL_MS = 60 * 60 * 1000;

interface CachedProfileEnvelope {
  profile: UserProfile;
  cachedAt: number;
  expiresAt: number;
  version: 1;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buildKey(uid: string): string {
  return `${CACHE_KEY_PREFIX}:${uid}`;
}

export function readCachedUserProfile(uid: string, now: number = Date.now()): UserProfile | null {
  const storage = getStorage();
  if (!storage || !uid) return null;

  const raw = storage.getItem(buildKey(uid));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CachedProfileEnvelope>;
    if (!parsed || parsed.version !== 1 || !parsed.profile || typeof parsed.expiresAt !== "number") {
      return null;
    }
    if (parsed.expiresAt < now) {
      storage.removeItem(buildKey(uid));
      return null;
    }
    if (parsed.profile.firebaseUid !== uid) {
      return null;
    }
    return parsed.profile;
  } catch {
    return null;
  }
}

export function writeCachedUserProfile(profile: UserProfile, options: { ttlMs?: number; now?: number } = {}): void {
  const storage = getStorage();
  if (!storage) return;
  if (!profile?.firebaseUid) return;

  const now = options.now ?? Date.now();
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const envelope: CachedProfileEnvelope = {
    profile,
    cachedAt: now,
    expiresAt: now + ttl,
    version: 1,
  };

  try {
    storage.setItem(buildKey(profile.firebaseUid), JSON.stringify(envelope));
  } catch {
    /* ignore storage errors (quota, private mode) */
  }
}

export function clearCachedUserProfile(uid: string): void {
  const storage = getStorage();
  if (!storage || !uid) return;
  try {
    storage.removeItem(buildKey(uid));
  } catch {
    /* ignore */
  }
}
