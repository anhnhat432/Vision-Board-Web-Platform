const CYCLE_CELEBRATION_STORAGE_PREFIX = "vbwp.celebratedCycle.";

interface CelebrationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserStorage(): CelebrationStorage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function hasNewCelebrationIds(previousIds: ReadonlySet<string> | null, currentIds: ReadonlySet<string>): boolean {
  if (!previousIds) return false;
  for (const id of currentIds) {
    if (!previousIds.has(id)) return true;
  }
  return false;
}

export function getCycleCelebrationStorageKey(cycleId: string): string {
  return `${CYCLE_CELEBRATION_STORAGE_PREFIX}${cycleId}`;
}

export function claimCelebrationOnce(key: string, storage: CelebrationStorage | null = getBrowserStorage()): boolean {
  if (!storage) return false;

  try {
    if (storage.getItem(key) === "true") return false;
    storage.setItem(key, "true");
    return true;
  } catch {
    return false;
  }
}
