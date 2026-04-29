import { describe, expect, it } from "vitest";

import { getSmartGoalStarter, getSmartGoalStarterPreview } from "./smart-goal-starters";

describe("smart goal starters", () => {
  it("returns a practical area-specific starter", () => {
    const starter = getSmartGoalStarter("Health");

    expect(starter.specificGoalStatement).toContain("Duy trì");
    expect(starter.metricName).toBe("Số buổi vận động mỗi tuần");
    expect(starter.targetWeeks).toBe("12");
  });

  it("falls back to a usable generic starter", () => {
    const starter = getSmartGoalStarter("Unknown area");

    expect(starter.specificGoalStatement).toContain("Hoàn thành");
    expect(starter.weeklyHours).toBe("4");
  });

  it("builds a short preview for the active step", () => {
    const starter = getSmartGoalStarter("Career");

    expect(getSmartGoalStarterPreview("measurable", starter)).toContain("Số tuần review công việc hoàn thành");
    expect(getSmartGoalStarterPreview("timeBound", starter)).toContain("12 tuần");
  });
});
