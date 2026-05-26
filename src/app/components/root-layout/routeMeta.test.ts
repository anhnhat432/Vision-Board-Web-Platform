import { describe, expect, it } from "vitest";

import { getBreadcrumbTrail, getRouteMeta } from "./routeMeta";

describe("route metadata", () => {
  it.each([
    ["/onboarding", "Bắt đầu"],
    ["/life-insight", "Góc nhìn cuộc sống"],
    ["/smart-goal-setup", "Mục tiêu SMART"],
    ["/feasibility", "Kiểm tra tính khả thi"],
    ["/12-week-setup", "Thiết lập 12 tuần"],
  ])("uses core-flow metadata for %s", (path, expectedTitle) => {
    const meta = getRouteMeta(path);

    expect(meta.title).toContain(expectedTitle);
    expect(meta.title).not.toContain("Bảng điều khiển");
  });
});

describe("getBreadcrumbTrail", () => {
  it("returns empty for shallow routes (depth < 3)", () => {
    expect(getBreadcrumbTrail("/")).toEqual([]);
    expect(getBreadcrumbTrail("/billing")).toEqual([]);
    expect(getBreadcrumbTrail("/billing/plan")).toEqual([]);
  });

  it("builds trail for /billing/checkout/:orderId", () => {
    const trail = getBreadcrumbTrail("/billing/checkout/abc123");
    expect(trail.length).toBeGreaterThanOrEqual(1);
    expect(trail[trail.length - 1].isCurrent).toBe(true);
    expect(trail.some((c) => c.label === "Thanh toán")).toBe(true);
  });

  it("builds trail for /admin/orders", () => {
    expect(getBreadcrumbTrail("/admin/orders")).toEqual([]);
  });
});
