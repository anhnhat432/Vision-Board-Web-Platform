import type { PlanDetails } from "@/types/plan";

const PLAN_LINK_STORAGE_KEY = "backend_plan_links";

interface PlanLinkRecord {
  planId: string;
  weekIdByNumber: Record<number, string>;
  metricIdByKey: Record<string, string>;
  taskIdByLocalTaskId: Record<string, string>;
}

type PlanLinkMap = Record<string, PlanLinkRecord>;

function createMetricLookupKey(weekNumber: number, metricName: string): string {
  return `${weekNumber}::${metricName.trim().toLowerCase()}`;
}

function readLinkMap(): PlanLinkMap {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = localStorage.getItem(PLAN_LINK_STORAGE_KEY);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!parsedValue || typeof parsedValue !== "object") return {};

    return parsedValue as PlanLinkMap;
  } catch {
    return {};
  }
}

function writeLinkMap(nextMap: PlanLinkMap): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PLAN_LINK_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // ignore storage errors
  }
}

function upsertPlanLink(
  goalId: string,
  updater: (currentLink: PlanLinkRecord | null) => PlanLinkRecord,
): PlanLinkRecord {
  const currentMap = readLinkMap();
  const currentLink = currentMap[goalId] ?? null;
  const nextLink = updater(currentLink);

  currentMap[goalId] = nextLink;
  writeLinkMap(currentMap);
  return nextLink;
}

export function getPlanLink(goalId: string): PlanLinkRecord | null {
  return readLinkMap()[goalId] ?? null;
}

export function savePlanDetailsLink(goalId: string, details: PlanDetails): PlanLinkRecord {
  return upsertPlanLink(goalId, (currentLink) => {
    const weekIdByNumber = details.weeks.reduce<Record<number, string>>((accumulator, week) => {
      accumulator[week.weekNumber] = week.id;
      return accumulator;
    }, {});

    const metricIdByKey = details.weeks.reduce<Record<string, string>>((accumulator, week) => {
      week.metrics.forEach((metric) => {
        accumulator[createMetricLookupKey(week.weekNumber, metric.name)] = metric.id;
      });
      return accumulator;
    }, {});

    return {
      planId: details.plan.id,
      weekIdByNumber,
      metricIdByKey: {
        ...(currentLink?.metricIdByKey ?? {}),
        ...metricIdByKey,
      },
      taskIdByLocalTaskId: currentLink?.taskIdByLocalTaskId ?? {},
    };
  });
}

export function getWeekIdForGoal(
  goalId: string,
  weekNumber: number,
): string | null {
  const link = getPlanLink(goalId);
  return link?.weekIdByNumber[weekNumber] ?? null;
}

export function getMetricIdForGoal(
  goalId: string,
  weekNumber: number,
  metricName: string,
): string | null {
  const link = getPlanLink(goalId);
  if (!link) return null;

  return link.metricIdByKey[createMetricLookupKey(weekNumber, metricName)] ?? null;
}

export function setMetricIdForGoal(
  goalId: string,
  weekNumber: number,
  metricName: string,
  metricId: string,
): void {
  upsertPlanLink(goalId, (currentLink) => ({
    planId: currentLink?.planId ?? "",
    weekIdByNumber: currentLink?.weekIdByNumber ?? {},
    metricIdByKey: {
      ...(currentLink?.metricIdByKey ?? {}),
      [createMetricLookupKey(weekNumber, metricName)]: metricId,
    },
    taskIdByLocalTaskId: currentLink?.taskIdByLocalTaskId ?? {},
  }));
}

export function getRemoteTaskIdForGoal(
  goalId: string,
  localTaskId: string,
): string | null {
  const link = getPlanLink(goalId);
  if (!link) return null;
  return link.taskIdByLocalTaskId[localTaskId] ?? null;
}

export function setRemoteTaskIdForGoal(
  goalId: string,
  localTaskId: string,
  remoteTaskId: string,
): void {
  upsertPlanLink(goalId, (currentLink) => ({
    planId: currentLink?.planId ?? "",
    weekIdByNumber: currentLink?.weekIdByNumber ?? {},
    metricIdByKey: currentLink?.metricIdByKey ?? {},
    taskIdByLocalTaskId: {
      ...(currentLink?.taskIdByLocalTaskId ?? {}),
      [localTaskId]: remoteTaskId,
    },
  }));
}
