import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  asOptionalStage,
  buildEffectiveOperationalClassificationStages,
  buildOperationalScopeMatch,
  buildUserOperationalCategoryFilter,
  parseOperationalCategoryQuery,
  parseOperationalScopeQuery,
  serializeProjectedOperationalClassification,
} from "../services/adminOperationalClassificationQuery";

describe("admin operational classification query stages", () => {
  it("normalizes missing user classification to real", () => {
    assert.deepEqual(buildUserOperationalCategoryFilter("real"), {
      $or: [
        { operationalClassification: { $exists: false } },
        { operationalClassification: null },
        { "operationalClassification.category": "real" },
      ],
    });
  });

  it("rejects invalid operational filters instead of silently widening results", () => {
    assert.throws(() => parseOperationalCategoryQuery("typo"), { errorCode: "invalid_operational_category" });
    assert.throws(() => parseOperationalScopeQuery("typo"), { errorCode: "invalid_operational_scope" });
  });

  it("defaults account filters to real-only and exposes explicit all scopes", () => {
    assert.equal(parseOperationalCategoryQuery(undefined), "real");
    assert.equal(parseOperationalCategoryQuery("all"), "all");
    assert.equal(parseOperationalScopeQuery(undefined), "real");
    assert.equal(parseOperationalScopeQuery("excluded"), "excluded");
    assert.deepEqual(buildOperationalScopeMatch("real"), {
      $match: { __effectiveOperationalCategory: "real" },
    });
    assert.deepEqual(buildOperationalScopeMatch("excluded"), {
      $match: { __effectiveOperationalCategory: { $in: ["test", "internal"] } },
    });
    assert.deepEqual(asOptionalStage(null), []);
  });

  it("builds a linked-user lookup before effective scope matching", () => {
    const stages = buildEffectiveOperationalClassificationStages({
      userIdField: "userId",
      recordClassificationField: "operationalClassification",
      legacySalesReasonField: "reporting.exclusionReason",
      requireLinkedUser: true,
    });

    assert.equal((stages[0] as { $lookup?: { localField?: string } })?.$lookup?.localField, "userId");
    assert.deepEqual(stages[2], { $match: { "__operationalUser._id": { $exists: true } } });
    assert.deepEqual(stages.at(-1), { $unset: ["__operationalUsers", "__operationalUser"] });
  });

  it("serializes only the public effective classification fields", () => {
    assert.deepEqual(
      serializeProjectedOperationalClassification({
        __effectiveOperationalCategory: "real",
        __effectiveOperationalSource: "record",
        __effectiveOperationalReason: "confirmed_real",
        __effectiveOperationalNote: "confirmed by support",
        __effectiveOperationalClassifiedAt: new Date("2026-07-13T00:00:00.000Z"),
        unrelatedInternalField: "must not leak",
      }),
      {
        effectiveCategory: "real",
        source: "record",
        reason: "confirmed_real",
        note: "confirmed by support",
        classifiedAt: "2026-07-13T00:00:00.000Z",
      },
    );
  });
});
