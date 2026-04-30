import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MetricService } from "../services/metricService";
import { assertApiError, ids, otherUserId, ownerUserId } from "./testHelpers";

const now = new Date("2026-01-01T00:00:00.000Z");

function createMetricFixture() {
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
        focus: "Owner week",
        expectedOutput: "Output",
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherWeek,
      {
        id: ids.otherWeek,
        planId: ids.otherPlan,
        weekNumber: 1,
        focus: "Other week",
        expectedOutput: "Other output",
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);
  const metrics = new Map([
    [
      ids.metric,
      {
        id: ids.metric,
        weekId: ids.week,
        name: "Deep work",
        weeklyTarget: 3,
        logs: [
          {
            id: ids.metricLog,
            date: now,
            value: 1,
            completed: true,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherMetric,
      {
        id: ids.otherMetric,
        weekId: ids.otherWeek,
        name: "Private metric",
        weeklyTarget: 1,
        logs: [],
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
  };
  const metricRepository = {
    async createMetric(data: Record<string, unknown>) {
      const metric = {
        id: `507f1f77bcf86cd7994390${metrics.size + 80}`,
        logs: [],
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      metrics.set(metric.id, metric as never);
      return metric;
    },
    async getMetricById(id: string) {
      return metrics.get(id) ?? null;
    },
    async getMetricsByWeekId(weekId: string) {
      return [...metrics.values()].filter((metric) => metric.weekId === weekId);
    },
    async logMetric(metricId: string, log: Record<string, unknown>) {
      const metric = metrics.get(metricId);
      if (!metric) return null;

      const updated = {
        ...metric,
        logs: [
          ...metric.logs,
          {
            id: "507f1f77bcf86cd799439099",
            ...log,
          },
        ],
        updatedAt: now,
      };
      metrics.set(metricId, updated as never);
      return updated;
    },
    async updateMetricLog(metricId: string, logId: string, updates: Record<string, unknown>) {
      const metric = metrics.get(metricId);
      if (!metric) return null;

      const logIndex = metric.logs.findIndex((log) => log.id === logId);
      if (logIndex === -1) return null;

      const logs = metric.logs.map((log) => (log.id === logId ? { ...log, ...updates } : log));
      const updated = {
        ...metric,
        logs,
        updatedAt: now,
      };
      metrics.set(metricId, updated as never);
      return updated;
    },
  };

  return {
    service: new MetricService(planRepository as never, weekRepository as never, metricRepository as never),
    metrics,
  };
}

describe("metric CRUD", () => {
  it("creates and lists metrics for an owned week", async () => {
    const { service } = createMetricFixture();

    const metric = await service.createWeekMetric(ownerUserId, ids.week, {
      name: "  Outreach  ",
      weeklyTarget: 5,
    });
    const metrics = await service.getWeekMetrics(ownerUserId, ids.week);

    assert.equal(metric.weekId, ids.week);
    assert.equal(metric.name, "Outreach");
    assert.equal(metric.weeklyTarget, 5);
    assert.equal(metrics.length, 2);
  });

  it("logs and updates metric progress for an owned metric", async () => {
    const { service } = createMetricFixture();

    const logged = await service.logLeadMetric(ownerUserId, ids.metric, {
      date: "2026-01-02T00:00:00.000Z",
      value: 2,
      completed: false,
    });
    const updated = await service.updateLeadMetricLog(ownerUserId, ids.metric, ids.metricLog, {
      value: 3,
      completed: true,
    });

    assert.equal(logged.logs.length, 2);
    assert.equal(updated.logs[0].value, 3);
    assert.equal(updated.logs[0].completed, true);
  });

  it("rejects invalid ids, cross-user metric access, and bad payloads", async () => {
    const { service } = createMetricFixture();

    await assertApiError(service.getWeekMetrics(ownerUserId, "not-an-object-id"), 400, "ObjectId");
    await assertApiError(service.createWeekMetric(ownerUserId, ids.otherWeek, { name: "Nope" }), 403, "access");
    await assertApiError(service.createWeekMetric(ownerUserId, ids.week, { name: "   " }), 400, "Metric name");
    await assertApiError(service.logLeadMetric(ownerUserId, "not-an-object-id", { value: 1 }), 400, "ObjectId");
    await assertApiError(service.logLeadMetric(ownerUserId, ids.otherMetric, { value: 1 }), 403, "access");
    await assertApiError(service.logLeadMetric(ownerUserId, ids.metric, { value: "1" } as never), 400, "value");
    await assertApiError(
      service.updateLeadMetricLog(ownerUserId, ids.metric, "not-an-object-id", { value: 1 }),
      400,
      "ObjectId",
    );
    await assertApiError(
      service.updateLeadMetricLog(ownerUserId, ids.metric, ids.otherMetric, { value: 1 }),
      404,
      "not found",
    );
  });
});
