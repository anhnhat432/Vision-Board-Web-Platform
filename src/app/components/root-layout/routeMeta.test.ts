import { describe, expect, it } from "vitest";

import { getRouteMeta } from "./routeMeta";

describe("route metadata", () => {
  it.each([
    ["/onboarding", "Onboarding"],
    ["/life-insight", "Life Insight"],
    ["/smart-goal-setup", "SMART Goal"],
    ["/feasibility", "Kiểm tra tính khả thi"],
    ["/12-week-setup", "Thiết lập 12 tuần"],
  ])("uses core-flow metadata for %s", (path, expectedTitle) => {
    const meta = getRouteMeta(path);

    expect(meta.title).toContain(expectedTitle);
    expect(meta.title).not.toContain("Bảng điều khiển");
  });
});
