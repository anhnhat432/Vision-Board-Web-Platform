import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { Metric } from "@/types/plan";
import { getCachedMetrics, invalidateMetricsCache, setCachedMetrics } from "./metricCache";

function createMetric(id: string): Metric {
  return {
    id,
    weekId: "week-1",
    name: `Metric ${id}`,
    weeklyTarget: 1,
    logs: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("metricCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    invalidateMetricsCache();
  });

  afterEach(() => {
    invalidateMetricsCache();
    vi.useRealTimers();
  });

  it("returns null on cache miss", () => {
    expect(getCachedMetrics("week-1")).toBeNull();
  });

  it("returns cached metrics within TTL", () => {
    const metrics = [createMetric("metric-1")];

    setCachedMetrics("week-1", metrics);

    expect(getCachedMetrics("week-1")).toBe(metrics);
  });

  it("expires metrics after TTL", () => {
    const metrics = [createMetric("metric-1")];

    setCachedMetrics("week-1", metrics);
    vi.advanceTimersByTime(30_001);

    expect(getCachedMetrics("week-1")).toBeNull();
  });

  it("invalidates one week cache entry", () => {
    const weekOneMetrics = [createMetric("metric-1")];
    const weekTwoMetrics = [createMetric("metric-2")];

    setCachedMetrics("week-1", weekOneMetrics);
    setCachedMetrics("week-2", weekTwoMetrics);
    invalidateMetricsCache("week-1");

    expect(getCachedMetrics("week-1")).toBeNull();
    expect(getCachedMetrics("week-2")).toBe(weekTwoMetrics);
  });

  it("invalidates all cache entries", () => {
    setCachedMetrics("week-1", [createMetric("metric-1")]);
    setCachedMetrics("week-2", [createMetric("metric-2")]);

    invalidateMetricsCache();

    expect(getCachedMetrics("week-1")).toBeNull();
    expect(getCachedMetrics("week-2")).toBeNull();
  });
});