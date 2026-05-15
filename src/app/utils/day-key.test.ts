import { describe, expect, it } from "vitest";

import { diffInDays, getDayKey, getPreviousDayKey } from "./day-key";

describe("getDayKey", () => {
  it("formats local YYYY-MM-DD", () => {
    expect(getDayKey(new Date(2026, 4, 15, 10, 30))).toBe("2026-05-15");
  });

  it("handles midnight boundary", () => {
    expect(getDayKey(new Date(2026, 4, 15, 0, 0, 0))).toBe("2026-05-15");
    expect(getDayKey(new Date(2026, 4, 14, 23, 59, 59))).toBe("2026-05-14");
  });
});

describe("getPreviousDayKey", () => {
  it("returns yesterday", () => {
    expect(getPreviousDayKey("2026-05-15")).toBe("2026-05-14");
  });

  it("crosses month boundary", () => {
    expect(getPreviousDayKey("2026-05-01")).toBe("2026-04-30");
  });

  it("crosses year boundary", () => {
    expect(getPreviousDayKey("2026-01-01")).toBe("2025-12-31");
  });
});

describe("diffInDays", () => {
  it("returns positive diff", () => {
    expect(diffInDays("2026-05-10", "2026-05-15")).toBe(5);
  });

  it("returns 0 for same day", () => {
    expect(diffInDays("2026-05-15", "2026-05-15")).toBe(0);
  });
});
