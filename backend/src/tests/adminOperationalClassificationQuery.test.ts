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

type FixtureRow = Record<string, unknown>;

function readPath(row: FixtureRow, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => (
    value && typeof value === "object" ? (value as FixtureRow)[segment] : undefined
  ), row);
}

// This evaluates the generated Mongo expression subset, rather than re-implementing classification precedence.
function evaluateExpression(expression: unknown, row: FixtureRow): unknown {
  if (typeof expression === "string") return expression.startsWith("$") ? readPath(row, expression.slice(1)) : expression;
  if (Array.isArray(expression)) return expression.map((value) => evaluateExpression(value, row));
  if (!expression || typeof expression !== "object" || expression instanceof Date) return expression;

  const operator = expression as Record<string, unknown>;
  if ("$ifNull" in operator) {
    const [value, fallback] = operator.$ifNull as [unknown, unknown];
    const resolved = evaluateExpression(value, row);
    return resolved == null ? evaluateExpression(fallback, row) : resolved;
  }
  if ("$first" in operator) {
    const values = evaluateExpression(operator.$first, row);
    return Array.isArray(values) ? values[0] : undefined;
  }
  if ("$cond" in operator) {
    const [condition, truthy, falsy] = operator.$cond as [unknown, unknown, unknown];
    return evaluateExpression(condition, row) ? evaluateExpression(truthy, row) : evaluateExpression(falsy, row);
  }
  if ("$eq" in operator || "$ne" in operator) {
    const [left, right] = (operator.$eq ?? operator.$ne) as [unknown, unknown];
    const equal = evaluateExpression(left, row) === evaluateExpression(right, row);
    return "$eq" in operator ? equal : !equal;
  }
  if ("$in" in operator) {
    const [value, candidates] = operator.$in as [unknown, unknown];
    const resolvedCandidates = evaluateExpression(candidates, row);
    return Array.isArray(resolvedCandidates) && resolvedCandidates.includes(evaluateExpression(value, row));
  }
  if ("$or" in operator) return (operator.$or as unknown[]).some((value) => Boolean(evaluateExpression(value, row)));
  return Object.fromEntries(Object.entries(operator).map(([key, value]) => [key, evaluateExpression(value, row)]));
}

function matches(match: Record<string, unknown>, row: FixtureRow): boolean {
  return Object.entries(match).every(([path, expected]) => {
    const actual = readPath(row, path);
    if (expected && typeof expected === "object" && "$exists" in (expected as FixtureRow)) {
      return (actual !== undefined) === Boolean((expected as FixtureRow).$exists);
    }
    if (expected && typeof expected === "object" && "$in" in (expected as FixtureRow)) {
      return ((expected as FixtureRow).$in as unknown[]).includes(actual);
    }
    return actual === expected;
  });
}

function runClassificationPipeline(rows: FixtureRow[], users: FixtureRow[], requireLinkedUser = false): FixtureRow[] {
  const stages = buildEffectiveOperationalClassificationStages({
    userIdField: "userId",
    recordClassificationField: "operationalClassification",
    legacySalesReasonField: "reporting.exclusionReason",
    requireLinkedUser,
  });
  return stages.reduce<FixtureRow[]>((current, stage) => {
    const currentStage = stage as unknown as Record<string, unknown>;
    if ("$lookup" in currentStage) {
      const lookup = currentStage.$lookup as { localField: string; foreignField: string; as: string };
      return current.map((row) => ({
        ...row,
        [lookup.as]: users.filter((user) => readPath(user, lookup.foreignField) === readPath(row, lookup.localField)),
      }));
    }
    if ("$set" in currentStage) {
      return current.map((row) => Object.entries(currentStage.$set as FixtureRow).reduce<FixtureRow>(
        (next, [key, value]) => ({ ...next, [key]: evaluateExpression(value, next) }),
        { ...row },
      ));
    }
    if ("$match" in currentStage) return current.filter((row) => matches(currentStage.$match as FixtureRow, row));
    if ("$unset" in currentStage) {
      const fields = currentStage.$unset as string[];
      return current.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.includes(key))));
    }
    throw new Error(`Unsupported generated stage: ${Object.keys(currentStage).join(",")}`);
  }, rows);
}

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
    assert.deepEqual(buildOperationalScopeMatch("real"), { $match: { __effectiveOperationalCategory: "real" } });
    assert.deepEqual(buildOperationalScopeMatch("excluded"), { $match: { __effectiveOperationalCategory: { $in: ["test", "internal"] } } });
    assert.deepEqual(asOptionalStage(null), []);
  });

  it("executes the generated projection with Task 1 precedence and public serialization", () => {
    const at = new Date("2026-07-13T00:00:00.000Z");
    const users = [
      { _id: "u-test", firebaseUid: "user-test", operationalClassification: { category: "test", reason: "automated_qa", note: "qa", classifiedAt: at } },
      { _id: "u-internal", firebaseUid: "user-internal", operationalClassification: { category: "internal", reason: "internal_team", note: "team", classifiedAt: at } },
      { _id: "u-real", firebaseUid: "user-real", operationalClassification: { category: "real", reason: "confirmed_real", note: "verified", classifiedAt: at } },
    ];
    const rows = runClassificationPipeline([
      { orderId: "missing", userId: "missing" },
      { orderId: "user-test", userId: "user-test", operationalClassification: { category: "real", reason: "confirmed_real", classifiedAt: at } },
      { orderId: "user-internal", userId: "user-internal", operationalClassification: { category: "real", reason: "confirmed_real", classifiedAt: at } },
      { orderId: "record-real", userId: "missing", operationalClassification: { category: "real", reason: "confirmed_real", note: "direct", classifiedAt: at }, reporting: { exclusionReason: "test" } },
      { orderId: "record-test", userId: "missing", operationalClassification: { category: "test", reason: "test_account", note: "fixture", classifiedAt: at } },
      { orderId: "record-internal", userId: "missing", operationalClassification: { category: "internal", reason: "internal_team", note: "fixture", classifiedAt: at } },
      { orderId: "legacy-test", userId: "missing", reporting: { exclusionReason: "test" } },
      { orderId: "legacy-internal", userId: "missing", reporting: { exclusionReason: "internal_team" } },
      { orderId: "user-real", userId: "user-real" },
    ], users);
    const byId = new Map(rows.map((row) => [row.orderId, row]));

    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("missing")!), { effectiveCategory: "real", source: "default" });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("user-test")!), { effectiveCategory: "test", source: "user", reason: "automated_qa", note: "qa", classifiedAt: at.toISOString() });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("user-internal")!), { effectiveCategory: "internal", source: "user", reason: "internal_team", note: "team", classifiedAt: at.toISOString() });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("record-real")!), { effectiveCategory: "real", source: "record", reason: "confirmed_real", note: "direct", classifiedAt: at.toISOString() });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("record-test")!), { effectiveCategory: "test", source: "record", reason: "test_account", note: "fixture", classifiedAt: at.toISOString() });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("record-internal")!), { effectiveCategory: "internal", source: "record", reason: "internal_team", note: "fixture", classifiedAt: at.toISOString() });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("legacy-test")!), { effectiveCategory: "test", source: "legacy_sales_review", reason: "legacy_sales_test" });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("legacy-internal")!), { effectiveCategory: "internal", source: "legacy_sales_review", reason: "legacy_sales_internal" });
    assert.deepEqual(serializeProjectedOperationalClassification(byId.get("user-real")!), { effectiveCategory: "real", source: "user", reason: "confirmed_real", note: "verified", classifiedAt: at.toISOString() });
    assert.equal(Object.keys(byId.get("record-test")!).some((key) => key.startsWith("__effectiveOperational")), true);
    assert.equal(JSON.stringify(serializeProjectedOperationalClassification(byId.get("record-test")!)).includes("__effectiveOperational"), false);
  });

  it("drops orphan subscriptions when the generated pipeline requires a linked user", () => {
    const rows = runClassificationPipeline([{ userId: "linked" }, { userId: "orphan" }], [{ _id: "u", firebaseUid: "linked" }], true);
    assert.deepEqual(rows.map((row) => row.userId), ["linked"]);
  });
});
