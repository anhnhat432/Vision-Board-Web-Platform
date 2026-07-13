import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { OrderModel } from "../models/OrderModel";
import { MongoOrderRepository } from "../repositories/mongo/MongoOrderRepository";
import { ApiError } from "../utils/apiError";

type Row = Record<string, unknown>;
type Aggregate = (pipeline: Row[]) => Promise<Row[]>;

const originalAggregate = OrderModel.aggregate;

afterEach(() => {
  (OrderModel as unknown as { aggregate: unknown }).aggregate = originalAggregate;
});

function valueAt(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (
    value && typeof value === "object" ? (value as Row)[key] : undefined
  ), row);
}

// This executes only the Mongo stage/expression subset emitted by the production pipeline.
function expression(value: unknown, row: Row): unknown {
  if (typeof value === "string") return value.startsWith("$") ? valueAt(row, value.slice(1)) : value;
  if (Array.isArray(value)) return value.map((item) => expression(item, row));
  if (!value || typeof value !== "object" || value instanceof Date || value instanceof RegExp) return value;
  const operator = value as Row;
  if ("$ifNull" in operator) { const [first, fallback] = operator.$ifNull as [unknown, unknown]; const resolved = expression(first, row); return resolved == null ? expression(fallback, row) : resolved; }
  if ("$first" in operator) { const values = expression(operator.$first, row); return Array.isArray(values) ? values[0] : undefined; }
  if ("$cond" in operator) { const [condition, yes, no] = operator.$cond as [unknown, unknown, unknown]; return expression(condition, row) ? expression(yes, row) : expression(no, row); }
  if ("$eq" in operator || "$ne" in operator) { const [left, right] = (operator.$eq ?? operator.$ne) as [unknown, unknown]; const equal = expression(left, row) === expression(right, row); return "$eq" in operator ? equal : !equal; }
  if ("$in" in operator) { const [needle, haystack] = operator.$in as [unknown, unknown]; const values = expression(haystack, row); return Array.isArray(values) && values.includes(expression(needle, row)); }
  if ("$or" in operator) return (operator.$or as unknown[]).some((item) => Boolean(expression(item, row)));
  if ("$toString" in operator) { const value = expression(operator.$toString, row); return value == null ? "" : String(value); }
  if ("$regexMatch" in operator) { const spec = operator.$regexMatch as Row; return new RegExp(String(spec.regex), String(spec.options ?? "")).test(String(expression(spec.input, row))); }
  return Object.fromEntries(Object.entries(operator).map(([key, item]) => [key, expression(item, row)]));
}

function matches(row: Row, filter: Row): boolean {
  return Object.entries(filter).every(([path, expected]) => {
    if (path === "$or") return (expected as Row[]).some((clause) => matches(row, clause));
    if (path === "$expr") return Boolean(expression(expected, row));
    const actual = valueAt(row, path);
    if (!expected || typeof expected !== "object" || expected instanceof Date || expected instanceof RegExp) return actual === expected;
    const operator = expected as Row;
    if ("$exists" in operator) return (actual !== undefined) === Boolean(operator.$exists);
    if ("$in" in operator) return (operator.$in as unknown[]).includes(actual);
    if ("$regex" in operator) return new RegExp(String(operator.$regex), String(operator.$options ?? "")).test(String(actual ?? ""));
    if ("$elemMatch" in operator) return Array.isArray(actual) && actual.some((item) => matches(item as Row, operator.$elemMatch as Row));
    if ("$gte" in operator && !(actual instanceof Date && actual >= (operator.$gte as Date))) return false;
    if ("$lt" in operator && !(actual instanceof Date && actual < (operator.$lt as Date))) return false;
    return "$gte" in operator || "$lt" in operator;
  });
}

function runPipeline(rows: Row[], users: Row[], pipeline: Row[]): Row[] {
  return pipeline.reduce<Row[]>((current, stage) => {
    if ("$match" in stage) return current.filter((row) => matches(row, stage.$match as Row));
    if ("$lookup" in stage) {
      const lookup = stage.$lookup as { localField: string; foreignField: string; as: string };
      return current.map((row) => ({ ...row, [lookup.as]: users.filter((user) => valueAt(user, lookup.foreignField) === valueAt(row, lookup.localField)) }));
    }
    if ("$set" in stage) return current.map((row) => Object.entries(stage.$set as Row).reduce<Row>((next, [key, value]) => ({ ...next, [key]: expression(value, next) }), { ...row }));
    if ("$unset" in stage) return current.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !(stage.$unset as string[]).includes(key))));
    if ("$unwind" in stage) { const path = String(stage.$unwind).replace(/^\$/, ""); return current.flatMap((row) => (Array.isArray(valueAt(row, path)) ? valueAt(row, path) as unknown[] : []).map((item) => ({ ...row, [path]: item }))); }
    if ("$sort" in stage) {
      const [field, direction] = Object.entries(stage.$sort as Row)[0] ?? [];
      return [...current].sort((left, right) => {
        const leftValue = valueAt(left, field);
        const rightValue = valueAt(right, field);
        const comparable = (value: unknown) => value instanceof Date ? value.getTime() : String(value);
        return (comparable(leftValue) < comparable(rightValue) ? -1 : comparable(leftValue) > comparable(rightValue) ? 1 : 0) * Number(direction);
      });
    }
    if ("$skip" in stage) return current.slice(stage.$skip as number);
    if ("$limit" in stage) return current.slice(0, stage.$limit as number);
    if ("$count" in stage) return current.length ? [{ [stage.$count as string]: current.length }] : [];
    if ("$group" in stage) {
      const spec = stage.$group as Row;
      const groups = new Map<string, Row>();
      for (const row of current) {
        const id = expression(spec._id, row);
        const key = JSON.stringify(id);
        const group = groups.get(key) ?? { _id: id, count: 0 };
        if (spec.count) group.count = Number(group.count) + 1;
        groups.set(key, group);
      }
      return [...groups.values()];
    }
    if ("$facet" in stage) {
      const facets = Object.fromEntries(Object.entries(stage.$facet as Record<string, Row[]>).map(([key, subPipeline]) => [key, runPipeline(current, users, subPipeline)]));
      return [facets];
    }
    throw new Error(`Unsupported stage: ${Object.keys(stage).join(",")}`);
  }, rows);
}

function fixtureOrder(id: string, overrides: Partial<Row> = {}): Row {
  return {
    _id: { toString: () => id }, userId: "real-user", status: "pending", fullName: "Real Customer", email: "real@example.com", phone: "0900000000",
    lines: [{ itemId: "frame", label: "Bright Frame", type: "frame", qty: 1, unitPriceVnd: 1, lineTotalVnd: 1 }],
    shippingAddress: { line1: "x" }, createdAt: new Date("2026-07-10T00:00:00.000Z"), updatedAt: new Date("2026-07-10T00:00:00.000Z"),
    ...overrides,
  };
}

describe("admin operational physical-order lists", () => {
  it("executes generated scope stages and all row filters before pagination while retaining full-scope metadata", async () => {
    const users: Row[] = [
      { firebaseUid: "test-user", operationalClassification: { category: "test", reason: "automated_qa" } },
      { firebaseUid: "internal-user", operationalClassification: { category: "internal", reason: "internal_team" } },
    ];
    const orders: Row[] = [
      fixtureOrder("000000000000000000000001", { userId: "test-user", email: "excluded@example.com", operationalClassification: { category: "real", reason: "confirmed_real" } }),
      fixtureOrder("000000000000000000000002", { userId: "orphan-record", email: "record@example.com", operationalClassification: { category: "test", reason: "test_account" } }),
      fixtureOrder("000000000000000000000003", { userId: "orphan-legacy", email: "legacy@example.com", reporting: { exclusionReason: "internal_team" } }),
      fixtureOrder("000000000000000000000004", { userId: "orphan-direct-real", email: "direct@example.com", reporting: { exclusionReason: "test" }, operationalClassification: { category: "real", reason: "confirmed_real" } }),
      fixtureOrder("000000000000000000000005", { fullName: "Needle Name", email: "needle@example.com", phone: "0912345678", createdAt: new Date("2026-07-01T00:00:00.000Z") }),
      fixtureOrder("000000000000000000000006", { status: "confirmed", lines: [{ itemId: "f", label: "Walnut", type: "frame", qty: 1, unitPriceVnd: 1, lineTotalVnd: 1 }] }),
      fixtureOrder("000000000000000000000007", { status: "shipping", lines: [], kitType: "Legacy Walnut" }),
      fixtureOrder("000000000000000000000008", { createdAt: new Date("2026-07-31T17:00:00.000Z") }),
      fixtureOrder("000000000000000000000009", { createdAt: new Date("2026-07-31T17:00:00.001Z") }),
    ];
    (OrderModel as unknown as { aggregate: unknown }).aggregate = (async (pipeline: Row[]) => runPipeline(orders, users, pipeline)) as Aggregate;
    const repository = new MongoOrderRepository();
    const base = { q: "", status: "all" as const, frame: "all" as const, page: 1, limit: 20 };

    const real = await repository.getAdminOrders({ ...base, operationalScope: "real" });
    const excluded = await repository.getAdminOrders({ ...base, operationalScope: "excluded" });
    const all = await repository.getAdminOrders({ ...base, operationalScope: "all" });
    assert.deepEqual(real.items.map((item) => item.id).sort(), ["000000000000000000000003", "000000000000000000000004", "000000000000000000000005", "000000000000000000000006", "000000000000000000000007", "000000000000000000000008", "000000000000000000000009"]);
    assert.deepEqual(excluded.items.map((item) => item.operationalClassification.source).sort(), ["record", "user"]);
    assert.equal(all.total, 9);
    assert.equal(real.items.find((item) => item.id === "000000000000000000000004")?.operationalClassification.source, "record");

    for (const q of ["NEEDLE@EXAMPLE.COM", "needle name", "0912345678", "000000000000000000000005"]) {
      const result = await repository.getAdminOrders({ ...base, q, operationalScope: "real" });
      assert.deepEqual(result.items.map((item) => item.id), ["000000000000000000000005"]);
    }
    assert.deepEqual((await repository.getAdminOrders({ ...base, status: "confirmed", operationalScope: "real" })).items.map((item) => item.id), ["000000000000000000000006"]);
    assert.deepEqual((await repository.getAdminOrders({ ...base, frame: "walnut", operationalScope: "real" })).items.map((item) => item.id), ["000000000000000000000006"]);
    assert.deepEqual((await repository.getAdminOrders({ ...base, frame: "legacy walnut", operationalScope: "real" })).items.map((item) => item.id), ["000000000000000000000007"]);
    const dateBounded = await repository.getAdminOrders({
      ...base,
      operationalScope: "real",
      dateFrom: new Date("2026-06-30T17:00:00.000Z"),
      dateToExclusive: new Date("2026-07-31T17:00:00.000Z"),
    });
    assert.deepEqual(dateBounded.items.map((item) => item.id).sort(), ["000000000000000000000003", "000000000000000000000004", "000000000000000000000005", "000000000000000000000006", "000000000000000000000007"]);
    assert.equal(real.items.find((item) => item.id === "000000000000000000000003")?.operationalClassification.source, "default");

    const paged = await repository.getAdminOrders({ ...base, status: "pending", operationalScope: "real", page: 2, limit: 2 });
    assert.equal(paged.total, 5);
    assert.deepEqual(paged.items.map((item) => item.id), ["000000000000000000000003", "000000000000000000000004"]);
    assert.equal(paged.statusCounts.pending, 5);
    assert.deepEqual(paged.frameOptions, ["Bright Frame", "Walnut"]);
  });

  it("uses the same generated scope and row filters for export and rejects 5,001 rows without a partial result", async () => {
    const rows = [fixtureOrder("000000000000000000000010", { email: "export@example.com" }), fixtureOrder("000000000000000000000011", { email: "other@example.com" })];
    (OrderModel as unknown as { aggregate: unknown }).aggregate = (async (pipeline: Row[]) => runPipeline(rows, [], pipeline)) as Aggregate;
    const repository = new MongoOrderRepository();
    const input = { q: "export", status: "pending" as const, frame: "Bright Frame", operationalScope: "real" as const };
    const list = await repository.getAdminOrders({ ...input, page: 1, limit: 20 });
    const exported = await repository.getAdminOrdersForExport(input);
    assert.deepEqual(exported.map((item) => item.id), list.items.map((item) => item.id));

    const oversized = Array.from({ length: 5001 }, (_, index) => fixtureOrder(String(index).padStart(24, "0")));
    (OrderModel as unknown as { aggregate: unknown }).aggregate = (async (pipeline: Row[]) => runPipeline(oversized, [], pipeline)) as Aggregate;
    await assert.rejects(
      () => repository.getAdminOrdersForExport({ q: "", status: "all", frame: "all", operationalScope: "real" }),
      (error: unknown) => error instanceof ApiError && error.errorCode === "admin_order_export_too_large",
    );
  });
});
