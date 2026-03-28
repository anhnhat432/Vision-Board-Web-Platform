import type { Week } from "@/domain";

import { createEntityId, nowIsoString, weekStore } from "./inMemoryStore";

type CreateWeekInput = Omit<Week, "id" | "createdAt" | "updatedAt">;
type UpdateWeekInput = Partial<Omit<Week, "id" | "planId" | "weekNumber" | "createdAt" | "updatedAt">>;

export class WeekRepository {
  async createWeek(input: CreateWeekInput): Promise<Week> {
    const timestamp = nowIsoString();
    const week: Week = {
      id: createEntityId("week"),
      planId: input.planId,
      weekNumber: input.weekNumber,
      focus: input.focus,
      expectedOutput: input.expectedOutput,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    weekStore.set(week.id, week);
    return week;
  }

  async getWeekById(weekId: string): Promise<Week | null> {
    return weekStore.get(weekId) ?? null;
  }

  async getWeeksByPlanId(planId: string): Promise<Week[]> {
    return [...weekStore.values()].filter((week) => week.planId === planId);
  }

  async updateWeek(weekId: string, patch: UpdateWeekInput): Promise<Week | null> {
    const currentWeek = weekStore.get(weekId);
    if (!currentWeek) return null;

    const updatedWeek: Week = {
      ...currentWeek,
      ...patch,
      updatedAt: nowIsoString(),
    };

    weekStore.set(weekId, updatedWeek);
    return updatedWeek;
  }

  async deleteWeek(weekId: string): Promise<boolean> {
    return weekStore.delete(weekId);
  }
}
