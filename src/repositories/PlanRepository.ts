import type { Plan } from "@/domain";

import { createEntityId, nowIsoString, planStore } from "./inMemoryStore";

type CreatePlanInput = Omit<Plan, "id" | "createdAt" | "updatedAt">;
type UpdatePlanInput = Partial<Omit<Plan, "id" | "createdAt" | "updatedAt">>;

export class PlanRepository {
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    const timestamp = nowIsoString();
    const plan: Plan = {
      id: createEntityId("plan"),
      userId: input.userId,
      vision: input.vision,
      smartGoalId: input.smartGoalId,
      startDate: input.startDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    planStore.set(plan.id, plan);
    return plan;
  }

  async getPlanById(planId: string): Promise<Plan | null> {
    return planStore.get(planId) ?? null;
  }

  async getPlansByUserId(userId: string): Promise<Plan[]> {
    return [...planStore.values()].filter((plan) => plan.userId === userId);
  }

  async updatePlan(planId: string, patch: UpdatePlanInput): Promise<Plan | null> {
    const currentPlan = planStore.get(planId);
    if (!currentPlan) return null;

    const updatedPlan: Plan = {
      ...currentPlan,
      ...patch,
      updatedAt: nowIsoString(),
    };

    planStore.set(planId, updatedPlan);
    return updatedPlan;
  }

  async deletePlan(planId: string): Promise<boolean> {
    return planStore.delete(planId);
  }
}
