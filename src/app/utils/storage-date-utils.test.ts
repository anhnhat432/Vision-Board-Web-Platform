import { describe, expect, it } from "vitest";

import { compareCalendarDateKeys, getCalendarDayDifference, parseCalendarDate } from "./storage-date-utils";

describe("storage date utilities", () => {
  it("compares date keys through local calendar dates", () => {
    expect(compareCalendarDateKeys("2026-05-15", "2026-05-15")).toBe(0);
    expect(compareCalendarDateKeys("2026-05-16", "2026-05-15")).toBe(1);
    expect(compareCalendarDateKeys("2026-05-14", "2026-05-15")).toBe(-1);
  });

  it("calculates local day difference without UTC string parsing", () => {
    const reference = parseCalendarDate("2026-05-15");

    expect(reference).not.toBeNull();
    expect(getCalendarDayDifference("2026-05-15", reference ?? new Date())).toBe(0);
    expect(getCalendarDayDifference("2026-05-16", reference ?? new Date())).toBe(1);
    expect(getCalendarDayDifference("2026-05-14", reference ?? new Date())).toBe(-1);
  });
});
