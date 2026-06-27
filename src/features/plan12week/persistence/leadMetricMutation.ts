import type { LeadIndicator, TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import {
  enqueueStoredMutation,
  type LeadMetricMutationReason,
  type LeadMetricUpsertedMutationPayload,
} from "./mutationQueue";
import { getPlanLink } from "./planLinkStore";
import {
  getTwelveWeekClientMetricId,
  getTwelveWeekClientPlanId,
  getTwelveWeekClientWeekId,
  getTwelveWeekLeadIndicatorId,
} from "./twelveWeekImportPayload";

interface LeadMetricMutationFilter {
  indicatorIds?: string[];
  indicatorNames?: string[];
  weekNumbers?: number[];
  now?: string | Date;
}

function toIso(value?: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (value) return new Date(value).toISOString();
  return new Date().toISOString();
}

function parseWeeklyTarget(value: string | undefined): number {
  const parsed = Number.parseFloat((value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function taskMatchesIndicator(
  task: TwelveWeekTaskInstance,
  indicator: LeadIndicator,
  leadIndicatorId: string,
): boolean {
  if (task.tacticId && (task.tacticId === indicator.id || task.tacticId === leadIndicatorId)) return true;
  return normalizeName(task.leadIndicatorName) === normalizeName(indicator.name);
}

function getCurrentValueForMetric(
  system: TwelveWeekSystem,
  weekNumber: number,
  indicator: LeadIndicator,
  leadIndicatorId: string,
): number {
  return system.taskInstances.filter(
    (task) =>
      task.weekNumber === weekNumber && task.completed && taskMatchesIndicator(task, indicator, leadIndicatorId),
  ).length;
}

function shouldIncludeIndicator(
  indicator: LeadIndicator,
  leadIndicatorId: string,
  filter: LeadMetricMutationFilter,
): boolean {
  const indicatorIds = new Set(filter.indicatorIds?.map((id) => id.trim()).filter(Boolean) ?? []);
  const indicatorNames = new Set(filter.indicatorNames?.map(normalizeName).filter(Boolean) ?? []);
  if (indicatorIds.size === 0 && indicatorNames.size === 0) return true;
  if (indicator.id && indicatorIds.has(indicator.id)) return true;
  if (indicatorIds.has(leadIndicatorId)) return true;
  return indicatorNames.has(normalizeName(indicator.name));
}

export function buildLeadMetricUpsertedPayloads(
  goalId: string,
  system: TwelveWeekSystem,
  reason: LeadMetricMutationReason,
  filter: LeadMetricMutationFilter = {},
): LeadMetricUpsertedMutationPayload[] {
  const changedAt = toIso(filter.now);
  const clientPlanId = getTwelveWeekClientPlanId(goalId);
  const weekNumbers = new Set(filter.weekNumbers ?? []);

  return system.weeklyPlans.flatMap((week) => {
    if (weekNumbers.size > 0 && !weekNumbers.has(week.weekNumber)) return [];

    const clientWeekId = getTwelveWeekClientWeekId(goalId, week.weekNumber);
    return system.leadIndicators.flatMap((indicator, indicatorIndex) => {
      const leadIndicatorId = getTwelveWeekLeadIndicatorId(indicator, indicatorIndex);
      if (!shouldIncludeIndicator(indicator, leadIndicatorId, filter)) return [];

      return {
        reason,
        clientPlanId,
        clientWeekId,
        clientMetricId: getTwelveWeekClientMetricId(clientWeekId, leadIndicatorId),
        leadIndicatorId,
        weekNumber: week.weekNumber,
        name: indicator.name,
        weeklyTarget: parseWeeklyTarget(indicator.target),
        target: indicator.target,
        unit: indicator.unit,
        type: indicator.type,
        priority: indicator.priority,
        schedule: indicator.schedule ? [...indicator.schedule] : undefined,
        currentValue: getCurrentValueForMetric(system, week.weekNumber, indicator, leadIndicatorId),
        changedAt,
        clientUpdatedAt: changedAt,
      };
    });
  });
}

export function enqueueLeadMetricUpsertedMutations(
  goalId: string,
  system: TwelveWeekSystem,
  reason: LeadMetricMutationReason,
  filter: LeadMetricMutationFilter = {},
): number {
  const planLink = getPlanLink(goalId);
  let enqueuedCount = 0;

  for (const payload of buildLeadMetricUpsertedPayloads(goalId, system, reason, filter)) {
    try {
      const backendPlanId = planLink?.planId ?? null;
      const backendWeekId = planLink?.weekIdByNumber[payload.weekNumber] ?? null;
      const result = enqueueStoredMutation({
        kind: "lead_metric_upserted",
        goalId,
        planId: backendPlanId,
        payload: {
          ...payload,
          backendPlanId,
          backendWeekId,
        },
      });
      if (result.ok) enqueuedCount += 1;
    } catch {
      // Queueing is a best-effort sidecar. The local-first metric save stays authoritative.
    }
  }

  return enqueuedCount;
}
