const GOAL_LINK_STORAGE_KEY = "backend_goal_links";

// Maps local (UUID) goal ID → backend (MongoDB ObjectId) goal ID
type GoalLinkMap = Record<string, string>;

function readLinkMap(): GoalLinkMap {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = localStorage.getItem(GOAL_LINK_STORAGE_KEY);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!parsedValue || typeof parsedValue !== "object") return {};

    return parsedValue as GoalLinkMap;
  } catch {
    return {};
  }
}

function writeLinkMap(nextMap: GoalLinkMap): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(GOAL_LINK_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // ignore storage errors
  }
}

export function saveGoalLink(localGoalId: string, backendGoalId: string): void {
  const nextMap = readLinkMap();
  nextMap[localGoalId] = backendGoalId;
  writeLinkMap(nextMap);
}

export function getBackendGoalId(localGoalId: string): string | null {
  return readLinkMap()[localGoalId] ?? null;
}
