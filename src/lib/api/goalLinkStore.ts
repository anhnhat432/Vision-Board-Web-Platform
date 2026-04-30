import { readBackendLinkMap, writeBackendLinkMap } from "@/app/utils/backend-link-storage";

const GOAL_LINK_STORAGE_KEY = "backend_goal_links";

// Maps local (UUID) goal ID → backend (MongoDB ObjectId) goal ID
type GoalLinkMap = Record<string, string>;

function readLinkMap(): GoalLinkMap {
  return readBackendLinkMap<GoalLinkMap>(GOAL_LINK_STORAGE_KEY);
}

function writeLinkMap(nextMap: GoalLinkMap): void {
  writeBackendLinkMap(GOAL_LINK_STORAGE_KEY, nextMap);
}

export function saveGoalLink(localGoalId: string, backendGoalId: string): void {
  const nextMap = readLinkMap();
  nextMap[localGoalId] = backendGoalId;
  writeLinkMap(nextMap);
}

export function getBackendGoalId(localGoalId: string): string | null {
  return readLinkMap()[localGoalId] ?? null;
}
