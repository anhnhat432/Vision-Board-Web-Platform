import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "../utils/apiError";
import {
  resolveEffectiveOperationalClassification,
  validateOperationalClassificationInput,
} from "../services/adminOperationalClassificationService";

function hasErrorCode(errorCode: string) {
  return (error: unknown): boolean => error instanceof ApiError && error.errorCode === errorCode;
}

describe("operational classification resolver", () => {
  it("applies non-real user, record, legacy, real user, then default precedence", () => {
    const classifiedAt = new Date("2026-07-13T00:00:00.000Z");

    assert.equal(resolveEffectiveOperationalClassification({}).effectiveCategory, "real");
    assert.equal(
      resolveEffectiveOperationalClassification({ legacySalesReason: "test" }).source,
      "legacy_sales_review",
    );
    assert.equal(
      resolveEffectiveOperationalClassification({
        recordClassification: {
          category: "internal",
          reason: "internal_team",
          classifiedBy: "a",
          classifiedAt,
        },
      }).effectiveCategory,
      "internal",
    );
    assert.equal(
      resolveEffectiveOperationalClassification({
        userClassification: {
          category: "test",
          reason: "test_account",
          classifiedBy: "a",
          classifiedAt,
        },
        recordClassification: {
          category: "real",
          reason: "confirmed_real",
          classifiedBy: "a",
          classifiedAt,
        },
      }).effectiveCategory,
      "test",
    );
    assert.equal(
      resolveEffectiveOperationalClassification({
        userClassification: {
          category: "real",
          reason: "confirmed_real",
          classifiedBy: "a",
          classifiedAt,
        },
      }).source,
      "user",
    );
  });

  it("rejects invalid category and reason pairs with bounded notes", () => {
    assert.throws(
      () => validateOperationalClassificationInput({ category: "unknown", reason: "confirmed_real" }),
      hasErrorCode("invalid_operational_category"),
    );
    assert.throws(
      () => validateOperationalClassificationInput({ category: "real", reason: "unknown" }),
      hasErrorCode("invalid_operational_reason"),
    );
    assert.throws(
      () => validateOperationalClassificationInput({ category: "real", reason: "test_account" }),
      hasErrorCode("classification_reason_mismatch"),
    );
    assert.throws(
      () => validateOperationalClassificationInput({ category: "test", reason: "other", note: "" }),
      hasErrorCode("classification_note_required"),
    );
    assert.throws(
      () =>
        validateOperationalClassificationInput({
          category: "internal",
          reason: "internal_team",
          note: "x".repeat(201),
        }),
      hasErrorCode("classification_note_too_long"),
    );
  });

  it("normalizes an allowed bounded note", () => {
    assert.deepEqual(
      validateOperationalClassificationInput({
        category: "test",
        reason: "other",
        note: "  scripted regression  ",
      }),
      { category: "test", reason: "other", note: "scripted regression" },
    );
  });
});
