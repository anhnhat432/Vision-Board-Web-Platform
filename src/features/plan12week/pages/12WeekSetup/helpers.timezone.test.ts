import { afterEach, describe, expect, it, vi } from "vitest";

import { getStartDateValidation } from "./helpers";

const PAST_DATE_ERROR = "Ngày bắt đầu không được ở quá khứ";

function makeLocalReferenceDate(year: number, monthIndex: number, day: number): Date {
  return {
    getFullYear: () => year,
    getMonth: () => monthIndex,
    getDate: () => day,
  } as Date;
}

describe("getStartDateValidation timezone handling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts local today at 23:00 in UTC+7", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 23, 0, 0));

    expect(getStartDateValidation("2026-05-15")).toEqual({ error: null, warning: null });
    expect(getStartDateValidation("2026-05-14")).toEqual({ error: PAST_DATE_ERROR, warning: null });
  });

  it("validates against local calendar fields for UTC+0 users", () => {
    const utcReference = makeLocalReferenceDate(2026, 4, 15);

    expect(getStartDateValidation("2026-05-15", utcReference)).toEqual({ error: null, warning: null });
    expect(getStartDateValidation("2026-05-14", utcReference)).toEqual({ error: PAST_DATE_ERROR, warning: null });
  });

  it("validates against local calendar fields for UTC-8 users", () => {
    const pacificReference = makeLocalReferenceDate(2026, 4, 15);

    expect(getStartDateValidation("2026-05-15", pacificReference)).toEqual({ error: null, warning: null });
    expect(getStartDateValidation("2026-05-14", pacificReference)).toEqual({ error: PAST_DATE_ERROR, warning: null });
  });
});
