import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WeekService } from "../services/weekService";
import { assertApiError, ids, otherUserId, ownerUserId } from "./testHelpers";

const now = new Date("2026-01-01T00:00:00.000Z");

function createWeekFixture() {
  const plans = new Map([
    [
      ids.plan,
      {
        id: ids.plan,
        userId: ownerUserId,
        vision: "Owner plan",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherPlan,
      {
        id: ids.otherPlan,
        userId: otherUserId,
        vision: "Other plan",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);
  const weeks = new Map([
    [
      ids.week,
      {
        id: ids.week,
        planId: ids.plan,
        weekNumber: 1,
        focus: "Original focus",
        expectedOutput: "Original output",
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherWeek,
      {
        id: ids.otherWeek,
        planId: ids.otherPlan,
        weekNumber: 2,
        focus: "Other focus",
        expectedOutput: "Other output",
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const planRepository = {
    async getPlanById(id: string) {
      return plans.get(id) ?? null;
    },
  };
  const weekRepository = {
    async getWeekById(id: string) {
      return weeks.get(id) ?? null;
    },
    async getWeeksByPlanId(planId: string) {
      return [...weeks.values()].filter((week) => week.planId === planId);
    },
    async updateWeek(id: string, updates: Record<string, unknown>) {
      const week = weeks.get(id);
      if (!week) return null;
      const updated = { ...week, ...updates, updatedAt: now };
      weeks.set(id, updated as never);
      return updated;
    },
    async submitWeeklyReview(id: string, review: Record<string, unknown>) {
      const week = weeks.get(id);
      if (!week) return null;
      const updated = { ...week, review, updatedAt: now };
      weeks.set(id, updated as never);
      return updated;
    },
  };

  return {
    service: new WeekService(planRepository as never, weekRepository as never),
  };
}

describe("week CRUD", () => {
  it("lists weeks for an owned plan", async () => {
    const { service } = createWeekFixture();

    const weeks = await service.getWeeksForPlan(ownerUserId, ids.plan);

    assert.equal(weeks.length, 1);
    assert.equal(weeks[0].id, ids.week);
  });

  it("updates an owned week", async () => {
    const { service } = createWeekFixture();

    const updated = await service.updateWeek(ownerUserId, ids.week, {
      focus: "  Build traction  ",
      expectedOutput: "  Three demos booked  ",
    });

    assert.equal(updated?.focus, "Build traction");
    assert.equal(updated?.expectedOutput, "Three demos booked");
  });

  it("submits a weekly review for an owned week", async () => {
    const { service } = createWeekFixture();

    const updated = await service.submitWeeklyReview(ownerUserId, ids.week, {
      executionScore: 82,
      reflection: "  Good week  ",
      adjustments: "  Reduce optional work  ",
    });

    assert.deepEqual(updated?.review, {
      weekNumber: 1,
      executionScore: 82,
      reflection: "Good week",
      adjustments: "Reduce optional work",
    });
  });

  it("rejects cross-user weeks, invalid ids, and invalid review payloads", async () => {
    const { service } = createWeekFixture();

    await assertApiError(service.getWeeksForPlan(ownerUserId, ids.otherPlan), 403, "access");
    await assertApiError(service.updateWeek(ownerUserId, "not-an-object-id", { focus: "Nope" }), 400, "ObjectId");
    await assertApiError(service.updateWeek(ownerUserId, ids.otherWeek, { focus: "Nope" }), 403, "access");
    await assertApiError(service.submitWeeklyReview(ownerUserId, ids.week, { executionScore: 101 }), 400, "between");
  });
});
