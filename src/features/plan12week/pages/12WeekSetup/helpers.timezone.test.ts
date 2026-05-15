import { describe, expect, it } from "vitest";

import { getStartDateValidation } from "./helpers";

const PAST_DATE_ERROR = "Ngày bắt đầu không được ở quá khứ";

function makeLocalReferenceDate(year: number, monthIndex: number, day: number): Date {
  return {
    getFullYear: () => year,
    getMonth: () => monthIndex,
    getDate: () => day,
  } as Date;
}

function makeReferenceDateInOffset(utcIso: string, offsetMinutes: number): Date {
  const shifted = new Date(new Date(utcIso).getTime() + offsetMinutes * 60_000);
  return makeLocalReferenceDate(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

describe("getStartDateValidation timezone handling", () => {
  it("accepts local today at 23:00 in UTC+7", () => {
    const vietnamReference = makeReferenceDateInOffset("2026-05-15T16:00:00.000Z", 7 * 60);

    expect(getStartDateValidation("2026-05-15", vietnamReference)).toEqual({ error: null, warning: null });
    expect(getStartDateValidation("2026-05-14", vietnamReference)).toEqual({ error: PAST_DATE_ERROR, warning: null });
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
