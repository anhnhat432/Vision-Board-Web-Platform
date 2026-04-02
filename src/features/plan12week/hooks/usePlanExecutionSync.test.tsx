import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createMetric,
  getMetrics,
  logMetric,
  updateMetricLog,
  getMetricIdForGoal,
  getRemoteTaskIdForGoal,
  getWeekIdForGoal,
  setMetricIdForGoal,
  setRemoteTaskIdForGoal,
} = vi.hoisted(() => ({
  createMetric: vi.fn(),
  getMetrics: vi.fn(),
  logMetric: vi.fn(),
  updateMetricLog: vi.fn(),
  getMetricIdForGoal: vi.fn(),
  getRemoteTaskIdForGoal: vi.fn(),
  getWeekIdForGoal: vi.fn(),
  setMetricIdForGoal: vi.fn(),
  setRemoteTaskIdForGoal: vi.fn(),
}));

vi.mock("@/services/metricService", () => ({
  createMetric,
  getMetrics,
  logMetric,
  updateMetricLog,
}));

vi.mock("../persistence/planLinkStore", () => ({
  getMetricIdForGoal,
  getRemoteTaskIdForGoal,
  getWeekIdForGoal,
  setMetricIdForGoal,
  setRemoteTaskIdForGoal,
}));

import { DAILY_CHECKIN_METRIC_NAME } from "../constants/progressMetrics";
import { usePlanExecutionSync } from "./usePlanExecutionSync";

function buildMetric(logs: Array<{ id: string; date: string; value: number; completed: boolean }> = []) {
  return {
    id: "metric_1",
    weekId: "week_1",
    name: DAILY_CHECKIN_METRIC_NAME,
    weeklyTarget: 0,
    logs,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };
}

describe("usePlanExecutionSync.syncDailyCheckIn", () => {
  beforeEach(() => {
    createMetric.mockReset();
    getMetrics.mockReset();
    logMetric.mockReset();
    updateMetricLog.mockReset();
    getMetricIdForGoal.mockReset();
    getRemoteTaskIdForGoal.mockReset();
    getWeekIdForGoal.mockReset();
    setMetricIdForGoal.mockReset();
    setRemoteTaskIdForGoal.mockReset();

    getWeekIdForGoal.mockReturnValue("week_1");
    getMetricIdForGoal.mockReturnValue("metric_1");
    getRemoteTaskIdForGoal.mockReturnValue(null);
    createMetric.mockResolvedValue(buildMetric());
    logMetric.mockResolvedValue(buildMetric());
    updateMetricLog.mockResolvedValue(buildMetric());
  });

  it("creates a metric log on first daily check-in", async () => {
    getMetrics.mockResolvedValueOnce([buildMetric([])]);
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1" }));

    let synced = false;
    await act(async () => {
      synced = await result.current.actions.syncDailyCheckIn({
        weekNumber: 1,
        date: "2026-04-01",
        didWorkToday: true,
      });
    });

    expect(synced).toBe(true);
    expect(logMetric).toHaveBeenCalledTimes(1);
    expect(logMetric).toHaveBeenCalledWith(
      "metric_1",
      expect.objectContaining({
        date: "2026-04-01T00:00:00.000Z",
        value: 1,
        completed: true,
      }),
    );
    expect(updateMetricLog).not.toHaveBeenCalled();
  });

  it("updates existing same-day metric log when check-in state changes", async () => {
    getMetrics.mockResolvedValueOnce([
      buildMetric([
        {
          id: "log_1",
          date: "2026-04-01T00:00:00.000Z",
          value: 1,
          completed: true,
        },
      ]),
    ]);
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1" }));

    let synced = false;
    await act(async () => {
      synced = await result.current.actions.syncDailyCheckIn({
        weekNumber: 1,
        date: "2026-04-01",
        didWorkToday: false,
      });
    });

    expect(synced).toBe(true);
    expect(updateMetricLog).toHaveBeenCalledTimes(1);
    expect(updateMetricLog).toHaveBeenCalledWith(
      "metric_1",
      "log_1",
      expect.objectContaining({
        date: "2026-04-01T00:00:00.000Z",
        value: 0,
        completed: false,
      }),
    );
    expect(logMetric).not.toHaveBeenCalled();
  });

  it("does nothing when same-day check-in state is unchanged", async () => {
    getMetrics.mockResolvedValueOnce([
      buildMetric([
        {
          id: "log_1",
          date: "2026-04-01T00:00:00.000Z",
          value: 0,
          completed: false,
        },
      ]),
    ]);
    const { result } = renderHook(() => usePlanExecutionSync({ goalId: "goal_1" }));

    let synced = false;
    await act(async () => {
      synced = await result.current.actions.syncDailyCheckIn({
        weekNumber: 1,
        date: "2026-04-01",
        didWorkToday: false,
      });
    });

    expect(synced).toBe(true);
    expect(updateMetricLog).not.toHaveBeenCalled();
    expect(logMetric).not.toHaveBeenCalled();
  });
});
