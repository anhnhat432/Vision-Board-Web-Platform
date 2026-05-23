import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "../utils/apiError";
import {
  getExecutionScore,
  getRecords,
  getRequiredTextOrFallback,
  isRecord,
  normalizeGoalStatus,
  normalizeMood,
  normalizeSchedule,
  normalizeTaskStatus,
  normalizeWeekNumber,
  normalizeWorkloadDecision,
  optionalBoolean,
  optionalDate,
  optionalNumber,
  optionalNumberRange,
  optionalString,
  parseOptionalNumericText,
  requiredDateKey,
  requiredRecord,
  requiredString,
  toOptionalString,
} from "../services/twelve-week-import/validators";

function assertApiError400(action: () => unknown): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 400);
    return true;
  });
}

describe("twelve-week-import/validators", () => {
  describe("toOptionalString / requiredString / optionalString", () => {
    it("toOptionalString trims and treats empty as undefined", () => {
      assert.equal(toOptionalString("  hi  "), "hi");
      assert.equal(toOptionalString("   "), undefined);
      assert.equal(toOptionalString(123), undefined);
    });

    it("requiredString throws when value is missing or non-string", () => {
      assertApiError400(() => requiredString(undefined, "f"));
      assertApiError400(() => requiredString("", "f"));
      assertApiError400(() => requiredString(123, "f"));
      assert.equal(requiredString("a", "f"), "a");
    });

    it("optionalString returns undefined for null/undefined and trims", () => {
      assert.equal(optionalString(undefined, "f"), undefined);
      assert.equal(optionalString(null, "f"), undefined);
      assert.equal(optionalString("  ok ", "f"), "ok");
      assertApiError400(() => optionalString(123, "f"));
    });
  });

  describe("isRecord / requiredRecord", () => {
    it("isRecord ignores arrays and primitives", () => {
      assert.equal(isRecord({}), true);
      assert.equal(isRecord({ a: 1 }), true);
      assert.equal(isRecord([]), false);
      assert.equal(isRecord(null), false);
      assert.equal(isRecord("x"), false);
    });

    it("requiredRecord throws for non-object", () => {
      assertApiError400(() => requiredRecord([], "f"));
      assertApiError400(() => requiredRecord(null, "f"));
      assert.deepEqual(requiredRecord({ a: 1 }, "f"), { a: 1 });
    });
  });

  describe("optional number / number range", () => {
    it("optionalNumber accepts undefined / null / empty string and finite numbers", () => {
      assert.equal(optionalNumber(undefined, "f"), undefined);
      assert.equal(optionalNumber(null, "f"), undefined);
      assert.equal(optionalNumber("", "f"), undefined);
      assert.equal(optionalNumber(0, "f"), 0);
      assert.equal(optionalNumber(3.14, "f"), 3.14);
      assertApiError400(() => optionalNumber("3", "f"));
      assertApiError400(() => optionalNumber(Number.NaN, "f"));
      assertApiError400(() => optionalNumber(Number.POSITIVE_INFINITY, "f"));
    });

    it("optionalNumberRange enforces min/max", () => {
      assert.equal(optionalNumberRange(50, "f", 0, 100), 50);
      assert.equal(optionalNumberRange(undefined, "f", 0, 100), undefined);
      assertApiError400(() => optionalNumberRange(-1, "f", 0, 100));
      assertApiError400(() => optionalNumberRange(101, "f", 0, 100));
    });
  });

  describe("optionalBoolean", () => {
    it("rejects non-boolean values", () => {
      assert.equal(optionalBoolean(undefined, "f"), undefined);
      assert.equal(optionalBoolean(null, "f"), undefined);
      assert.equal(optionalBoolean(true, "f"), true);
      assert.equal(optionalBoolean(false, "f"), false);
      assertApiError400(() => optionalBoolean("true", "f"));
      assertApiError400(() => optionalBoolean(1, "f"));
    });
  });

  describe("dates", () => {
    it("optionalDate returns Date for valid ISO and rejects invalid", () => {
      assert.deepEqual(optionalDate("2026-05-23", "f"), new Date("2026-05-23"));
      assert.equal(optionalDate(undefined, "f"), undefined);
      assert.equal(optionalDate(null, "f"), undefined);
      assertApiError400(() => optionalDate("not-a-date", "f"));
      assertApiError400(() => optionalDate("", "f"));
    });

    it("requiredDateKey returns yyyy-MM-dd portion", () => {
      assert.equal(requiredDateKey("2026-05-23", "f"), "2026-05-23");
      assert.equal(requiredDateKey("2026-05-23T15:30:00Z", "f"), "2026-05-23");
      assertApiError400(() => requiredDateKey("", "f"));
      assertApiError400(() => requiredDateKey("nope", "f"));
    });
  });

  describe("getRecords", () => {
    it("returns empty array for undefined and validates each item", () => {
      assert.deepEqual(getRecords(undefined, "list"), []);
      assert.deepEqual(getRecords([{ a: 1 }, { b: 2 }], "list"), [{ a: 1 }, { b: 2 }]);
      assertApiError400(() => getRecords("nope", "list"));
      assertApiError400(() => getRecords([{ a: 1 }, "bad"], "list"));
    });
  });

  describe("normalizers", () => {
    it("normalizeGoalStatus accepts active/completed/archived (default active)", () => {
      assert.equal(normalizeGoalStatus(undefined), "active");
      assert.equal(normalizeGoalStatus("active"), "active");
      assert.equal(normalizeGoalStatus("completed"), "completed");
      assert.equal(normalizeGoalStatus("archived"), "archived");
      assertApiError400(() => normalizeGoalStatus("paused"));
    });

    it("normalizeTaskStatus defaults to todo", () => {
      assert.equal(normalizeTaskStatus(undefined, "f"), "todo");
      assert.equal(normalizeTaskStatus("doing", "f"), "doing");
      assert.equal(normalizeTaskStatus("done", "f"), "done");
      assertApiError400(() => normalizeTaskStatus("blocked", "f"));
    });

    it("normalizeWeekNumber expects integer 1..12", () => {
      assert.equal(normalizeWeekNumber(1, "f"), 1);
      assert.equal(normalizeWeekNumber(12, "f"), 12);
      assertApiError400(() => normalizeWeekNumber(0, "f"));
      assertApiError400(() => normalizeWeekNumber(13, "f"));
      assertApiError400(() => normalizeWeekNumber(1.5, "f"));
      assertApiError400(() => normalizeWeekNumber("1", "f"));
    });

    it("normalizeMood accepts low/steady/high or empty", () => {
      assert.equal(normalizeMood(undefined, "f"), undefined);
      assert.equal(normalizeMood("", "f"), undefined);
      assert.equal(normalizeMood("low", "f"), "low");
      assert.equal(normalizeMood("steady", "f"), "steady");
      assert.equal(normalizeMood("high", "f"), "high");
      assertApiError400(() => normalizeMood("ecstatic", "f"));
    });

    it("normalizeWorkloadDecision accepts known set + empty", () => {
      assert.equal(normalizeWorkloadDecision(undefined, "f"), undefined);
      assert.equal(normalizeWorkloadDecision("", "f"), "");
      assert.equal(normalizeWorkloadDecision("keep same", "f"), "keep same");
      assert.equal(normalizeWorkloadDecision("reduce slightly", "f"), "reduce slightly");
      assert.equal(normalizeWorkloadDecision("increase slightly", "f"), "increase slightly");
      assertApiError400(() => normalizeWorkloadDecision("rest", "f"));
    });

    it("normalizeSchedule requires integer items", () => {
      assert.deepEqual(normalizeSchedule([1, 3, 5], "f"), [1, 3, 5]);
      assert.equal(normalizeSchedule(undefined, "f"), undefined);
      assert.equal(normalizeSchedule(null, "f"), undefined);
      assertApiError400(() => normalizeSchedule("nope", "f"));
      assertApiError400(() => normalizeSchedule([1, 1.5], "f"));
    });
  });

  describe("getRequiredTextOrFallback / parseOptionalNumericText", () => {
    it("returns value when present, fallback otherwise", () => {
      assert.equal(getRequiredTextOrFallback("hi", "fb", "f"), "hi");
      assert.equal(getRequiredTextOrFallback(undefined, "fb", "f"), "fb");
      assert.equal(getRequiredTextOrFallback("   ", "fb", "f"), "fb");
    });

    it("parseOptionalNumericText handles comma decimal and rejects negatives", () => {
      assert.equal(parseOptionalNumericText("3,5"), 3.5);
      assert.equal(parseOptionalNumericText("12"), 12);
      assert.equal(parseOptionalNumericText("-1"), undefined);
      assert.equal(parseOptionalNumericText("abc"), undefined);
      assert.equal(parseOptionalNumericText(undefined), undefined);
    });
  });

  describe("getExecutionScore", () => {
    it("uses explicit executionScore when within range", () => {
      assert.equal(getExecutionScore({ executionScore: 75 }), 75);
    });

    it("falls back to leadCompletionPercent when no executionScore", () => {
      assert.equal(getExecutionScore({ leadCompletionPercent: 60 }), 60);
    });

    it("averages component scores scaled to 0-100 when no other inputs", () => {
      const review = {
        progressScore: 5,
        disciplineScore: 7,
        focusScore: 8,
        improvementScore: 6,
        outputQualityScore: 9,
      };
      // average = (5+7+8+6+9)/5 = 7; (7/10)*100 = 70
      assert.equal(getExecutionScore(review), 70);
    });

    it("returns 0 when no component scores provided", () => {
      assert.equal(getExecutionScore({}), 0);
    });
  });
});
