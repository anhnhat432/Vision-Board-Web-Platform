import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "../utils/apiError";
import {
  hashPayload,
  isDuplicateKeyError,
  requireImportId,
  stableStringify,
} from "../services/twelve-week-import/idempotency";
import type { TwelveWeekImportValidationReport } from "../services/twelveWeekImportValidationService";

function makeReport(overrides: Partial<TwelveWeekImportValidationReport> = {}): TwelveWeekImportValidationReport {
  return {
    requestId: "req_default",
    mode: "validate_only",
    dryRun: true,
    status: "valid",
    acceptedEntityCounts: {
      goals: 0,
      plans: 0,
      weeks: 0,
      tasks: 0,
      leadIndicators: 0,
      leadMetrics: 0,
      dailyCheckIns: 0,
      weeklyReviews: 0,
    },
    warnings: [],
    errors: [],
    normalizedClientIdsCount: 0,
    ...overrides,
  } as TwelveWeekImportValidationReport;
}

describe("twelve-week-import/idempotency", () => {
  describe("stableStringify", () => {
    it("sorts object keys deterministically", () => {
      assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
      assert.equal(
        stableStringify({ b: 1, a: 2 }),
        stableStringify({ a: 2, b: 1 }),
      );
    });

    it("preserves array order", () => {
      assert.equal(stableStringify([3, 1, 2]), "[3,1,2]");
    });

    it("recursively sorts nested objects", () => {
      const a = { outer: { z: 1, a: 2 }, top: "x" };
      const b = { top: "x", outer: { a: 2, z: 1 } };
      assert.equal(stableStringify(a), stableStringify(b));
    });
  });

  describe("hashPayload", () => {
    it("produces 64-char hex sha256", () => {
      const hash = hashPayload({ a: 1 });
      assert.match(hash, /^[a-f0-9]{64}$/);
    });

    it("returns same hash for keys in different order", () => {
      assert.equal(hashPayload({ a: 1, b: 2 }), hashPayload({ b: 2, a: 1 }));
    });

    it("differs when payload differs", () => {
      assert.notEqual(hashPayload({ a: 1 }), hashPayload({ a: 2 }));
    });
  });

  describe("isDuplicateKeyError", () => {
    it("matches Mongo duplicate key code 11000", () => {
      assert.equal(isDuplicateKeyError({ code: 11000 }), true);
      assert.equal(isDuplicateKeyError({ code: 11000, msg: "dup" }), true);
    });

    it("rejects other shapes", () => {
      assert.equal(isDuplicateKeyError(null), false);
      assert.equal(isDuplicateKeyError({ code: 16500 }), false);
      assert.equal(isDuplicateKeyError(new Error("dup")), false);
    });
  });

  describe("requireImportId", () => {
    it("uses body.importId when present", () => {
      const id = requireImportId({ importId: "abc" }, makeReport());
      assert.equal(id, "abc");
    });

    it("falls back to report.idempotencyKey", () => {
      const id = requireImportId({}, makeReport({ idempotencyKey: "key_1" }));
      assert.equal(id, "key_1");
    });

    it("falls back to report.requestId when both above missing", () => {
      const id = requireImportId({}, makeReport({ requestId: "req_2" }));
      assert.equal(id, "req_2");
    });

    it("throws 400 when no source provides an id", () => {
      assert.throws(
        () => requireImportId({}, makeReport({ requestId: undefined })),
        (error: unknown) => error instanceof ApiError && error.statusCode === 400,
      );
    });

    it("throws 400 when payload is not a record", () => {
      assert.throws(
        () => requireImportId(null, makeReport()),
        (error: unknown) => error instanceof ApiError && error.statusCode === 400,
      );
    });

    it("throws 400 when importId exceeds 240 chars", () => {
      const long = "x".repeat(241);
      assert.throws(
        () => requireImportId({ importId: long }, makeReport()),
        (error: unknown) => error instanceof ApiError && error.statusCode === 400,
      );
    });
  });
});
