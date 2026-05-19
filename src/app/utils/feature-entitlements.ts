import type { UserData } from "./storage-types";
import { getCurrentEntitlementKeys, getCurrentPlan } from "./storage";

export const FREE_TIER_LIMITS = {
  maxActiveGoals: 3,
  max12WeekCycles: 1,
  maxVisionBoards: 1,
  maxReflectionsPerWeek: Number.POSITIVE_INFINITY,
  canExportPDF: false,
  canUseAdvancedMetrics: false,
  cloudSync: false,
} as const;

export type FreeTierLimitName = "maxActiveGoals" | "max12WeekCycles" | "maxVisionBoards" | "maxReflectionsPerWeek";
export type FeatureName = "canExportPDF" | "canUseAdvancedMetrics" | "cloudSync";

function hasPlusAccess(userData: UserData): boolean {
  const planCode = getCurrentPlan(userData);
  if (planCode === "PLUS") return true;

  const entitlementKeys = getCurrentEntitlementKeys(userData);
  return entitlementKeys.includes("advanced_analytics") || entitlementKeys.includes("premium_templates");
}

function countActiveGoals(userData: UserData): number {
  return userData.goals.length;
}

function countActive12WeekCycles(userData: UserData): number {
  return userData.goals.filter((goal) => {
    const status = goal.twelveWeekSystem?.status;
    return status === "active" || (status === undefined && Boolean(goal.twelveWeekSystem));
  }).length;
}

function getLimitUsage(userData: UserData, limitName: FreeTierLimitName): number {
  switch (limitName) {
    case "maxActiveGoals":
      return countActiveGoals(userData);
    case "max12WeekCycles":
      return countActive12WeekCycles(userData);
    case "maxVisionBoards":
      return userData.visionBoards.length;
    case "maxReflectionsPerWeek":
      return 0;
  }
}

export function getFreeTierUsage(
  userData: UserData,
  limitName: FreeTierLimitName,
): { current: number; limit: number; reached: boolean } {
  const limit = FREE_TIER_LIMITS[limitName];
  const current = getLimitUsage(userData, limitName);
  return {
    current,
    limit,
    reached: Number.isFinite(limit) && current >= limit,
  };
}

export function hasReachedLimit(userData: UserData, limitName: FreeTierLimitName): boolean {
  if (hasPlusAccess(userData)) return false;
  return getFreeTierUsage(userData, limitName).reached;
}

export function canAccess(userData: UserData, featureName: FeatureName): boolean {
  if (hasPlusAccess(userData)) return true;
  return FREE_TIER_LIMITS[featureName];
}
