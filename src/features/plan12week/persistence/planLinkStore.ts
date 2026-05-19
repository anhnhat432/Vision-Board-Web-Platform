import { readBackendLinkMap, writeBackendLinkMap } from "@/app/utils/backend-link-storage";
import type { PlanDetails } from "@/types/plan";

const PLAN_LINK_STORAGE_KEY = "backend_plan_links";

interface PlanLinkRecord {
  planId: string;
  planRevision?: number;
  weekIdByNumber: Record<number, string>;
  weekRevisionById: Record<string, number>;
  metricIdByKey: Record<string, string>;
  taskIdByLocalTaskId: Record<string, string>;
  taskRevisionByRemoteId: Record<string, number>;
}

type PlanLinkMap = Record<string, PlanLinkRecord>;

function createMetricLookupKey(weekNumber: number, metricName: string): string {
  return `${weekNumber}::${metricName.trim().toLowerCase()}`;
}

function readLinkMap(): PlanLinkMap {
  return readBackendLinkMap<PlanLinkMap>(PLAN_LINK_STORAGE_KEY);
}

function writeLinkMap(nextMap: PlanLinkMap): void {
  writeBackendLinkMap(PLAN_LINK_STORAGE_KEY, nextMap);
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

    const weekRevisionById: Record<string, number> = {};
    details.weeks.forEach((week) => {
      if (week.revision !== undefined) {
        weekRevisionById[week.id] = week.revision;
      }
    });

    const taskRevisionByRemoteId: Record<string, number> = {};
    details.weeks.forEach((week) => {
      week.tasks.forEach((task) => {
        if (task.revision !== undefined) {
          taskRevisionByRemoteId[task.id] = task.revision;
        }
      });
    });

    const metricIdByKey = details.weeks.reduce<Record<string, string>>((accumulator, week) => {
      week.metrics.forEach((metric) => {
        accumulator[createMetricLookupKey(week.weekNumber, metric.name)] = metric.id;
      });
      return accumulator;
    }, {});

    return {
      planId: details.plan.id,
      planRevision: (details.plan as { revision?: number }).revision,
      weekIdByNumber,
      weekRevisionById: {
        ...(currentLink?.weekRevisionById ?? {}),
        ...weekRevisionById,
      },
      metricIdByKey: {
        ...(currentLink?.metricIdByKey ?? {}),
        ...metricIdByKey,
      },
      taskIdByLocalTaskId: currentLink?.taskIdByLocalTaskId ?? {},
      taskRevisionByRemoteId: {
        ...(currentLink?.taskRevisionByRemoteId ?? {}),
        ...taskRevisionByRemoteId,
      },
    };
  });
}

export function getWeekIdForGoal(goalId: string, weekNumber: number): string | null {
  const link = getPlanLink(goalId);
  return link?.weekIdByNumber[weekNumber] ?? null;
}

export function getMetricIdForGoal(goalId: string, weekNumber: number, metricName: string): string | null {
  const link = getPlanLink(goalId);
  if (!link) return null;

  return link.metricIdByKey[createMetricLookupKey(weekNumber, metricName)] ?? null;
}

export function setMetricIdForGoal(goalId: string, weekNumber: number, metricName: string, metricId: string): void {
  upsertPlanLink(goalId, (currentLink) => ({
    planId: currentLink?.planId ?? "",
    planRevision: currentLink?.planRevision,
    weekIdByNumber: currentLink?.weekIdByNumber ?? {},
    weekRevisionById: currentLink?.weekRevisionById ?? {},
    metricIdByKey: {
      ...(currentLink?.metricIdByKey ?? {}),
      [createMetricLookupKey(weekNumber, metricName)]: metricId,
    },
    taskIdByLocalTaskId: currentLink?.taskIdByLocalTaskId ?? {},
    taskRevisionByRemoteId: currentLink?.taskRevisionByRemoteId ?? {},
  }));
}

export function getRemoteTaskIdForGoal(goalId: string, localTaskId: string): string | null {
  const link = getPlanLink(goalId);
  if (!link) return null;
  return link.taskIdByLocalTaskId[localTaskId] ?? null;
}

export function setRemoteTaskIdForGoal(
  goalId: string,
  localTaskId: string,
  remoteTaskId: string,
  remoteRevision?: number,
): void {
  upsertPlanLink(goalId, (currentLink) => ({
    planId: currentLink?.planId ?? "",
    planRevision: currentLink?.planRevision,
    weekIdByNumber: currentLink?.weekIdByNumber ?? {},
    weekRevisionById: currentLink?.weekRevisionById ?? {},
    metricIdByKey: currentLink?.metricIdByKey ?? {},
    taskIdByLocalTaskId: {
      ...(currentLink?.taskIdByLocalTaskId ?? {}),
      [localTaskId]: remoteTaskId,
    },
    taskRevisionByRemoteId:
      remoteRevision !== undefined
        ? { ...(currentLink?.taskRevisionByRemoteId ?? {}), [remoteTaskId]: remoteRevision }
        : (currentLink?.taskRevisionByRemoteId ?? {}),
  }));
}

export function getTaskRemoteRevision(goalId: string, remoteTaskId: string): number | undefined {
  const link = getPlanLink(goalId);
  return link?.taskRevisionByRemoteId[remoteTaskId];
}

export function getWeekRemoteRevision(goalId: string, weekId: string): number | undefined {
  const link = getPlanLink(goalId);
  return link?.weekRevisionById[weekId];
}

export function updateWeekRevisionInLink(goalId: string, weekId: string, revision: number): void {
  upsertPlanLink(goalId, (currentLink) => ({
    planId: currentLink?.planId ?? "",
    planRevision: currentLink?.planRevision,
    weekIdByNumber: currentLink?.weekIdByNumber ?? {},
    weekRevisionById: { ...(currentLink?.weekRevisionById ?? {}), [weekId]: revision },
    metricIdByKey: currentLink?.metricIdByKey ?? {},
    taskIdByLocalTaskId: currentLink?.taskIdByLocalTaskId ?? {},
    taskRevisionByRemoteId: currentLink?.taskRevisionByRemoteId ?? {},
  }));
}

export function updateTaskRevisionInLink(
  goalId: string,
  localTaskId: string,
  remoteTaskId: string,
  revision: number,
): void {
  upsertPlanLink(goalId, (currentLink) => ({
    planId: currentLink?.planId ?? "",
    planRevision: currentLink?.planRevision,
    weekIdByNumber: currentLink?.weekIdByNumber ?? {},
    weekRevisionById: currentLink?.weekRevisionById ?? {},
    metricIdByKey: currentLink?.metricIdByKey ?? {},
    taskIdByLocalTaskId: {
      ...(currentLink?.taskIdByLocalTaskId ?? {}),
      [localTaskId]: remoteTaskId,
    },
    taskRevisionByRemoteId: { ...(currentLink?.taskRevisionByRemoteId ?? {}), [remoteTaskId]: revision },
  }));
}
