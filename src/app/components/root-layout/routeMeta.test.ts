import { describe, expect, it } from "vitest";

import { getRouteMeta } from "./routeMeta";

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
