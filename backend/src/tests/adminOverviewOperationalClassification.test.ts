import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { getAdminOverview } from "../controllers/adminController";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { OrderModel } from "../models/OrderModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";

type Row = Record<string, unknown>;
type ModelMethods = Record<string, unknown>;

interface MockResponse {
  statusCode: number;
  payload?: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

const original = {
  userCount: UserModel.countDocuments, userFind: UserModel.find, userAggregate: UserModel.aggregate,
  subscriptionFind: BillingSubscriptionModel.find, subscriptionAggregate: BillingSubscriptionModel.aggregate,
  paymentAggregate: PaymentOrderModel.aggregate, orderAggregate: OrderModel.aggregate,
};

afterEach(() => {
  mock.restoreAll();
  (UserModel as unknown as ModelMethods).countDocuments = original.userCount;
  (UserModel as unknown as ModelMethods).find = original.userFind;
  (UserModel as unknown as ModelMethods).aggregate = original.userAggregate;
  (BillingSubscriptionModel as unknown as ModelMethods).find = original.subscriptionFind;
  (BillingSubscriptionModel as unknown as ModelMethods).aggregate = original.subscriptionAggregate;
  (PaymentOrderModel as unknown as ModelMethods).aggregate = original.paymentAggregate;
  (OrderModel as unknown as ModelMethods).aggregate = original.orderAggregate;
});

function response(): MockResponse {
  return { statusCode: 200, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };
}

function chain<T>(value: T) {
  const query = { select() { return query; }, sort() { return query; }, limit() { return query; }, async lean() { return value; } };
  return query;
}

function valueAt(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Row)[key] : undefined, row);
}

function expression(value: unknown, row: Row): unknown {
  if (typeof value === "string") return value.startsWith("$") ? valueAt(row, value.slice(1)) : value;
  if (Array.isArray(value)) return value.map((item) => expression(item, row));
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  const operator = value as Row;
  if ("$ifNull" in operator) { const [first, fallback] = operator.$ifNull as [unknown, unknown]; const resolved = expression(first, row); return resolved == null ? expression(fallback, row) : resolved; }
  if ("$first" in operator) { const values = expression(operator.$first, row); return Array.isArray(values) ? values[0] : undefined; }
  if ("$cond" in operator) { const [condition, yes, no] = operator.$cond as [unknown, unknown, unknown]; return expression(condition, row) ? expression(yes, row) : expression(no, row); }
  if ("$eq" in operator || "$ne" in operator) { const [left, right] = (operator.$eq ?? operator.$ne) as [unknown, unknown]; const equal = expression(left, row) === expression(right, row); return "$eq" in operator ? equal : !equal; }
  if ("$in" in operator) { const [needle, haystack] = operator.$in as [unknown, unknown]; const values = expression(haystack, row); return Array.isArray(values) && values.includes(expression(needle, row)); }
  if ("$or" in operator) return (operator.$or as unknown[]).some((item) => Boolean(expression(item, row)));
  return Object.fromEntries(Object.entries(operator).map(([key, item]) => [key, expression(item, row)]));
}

function matches(row: Row, filter: Row): boolean {
  return Object.entries(filter).every(([path, expected]) => {
    if (path === "$or") return (expected as Row[]).some((clause) => matches(row, clause));
    const actual = valueAt(row, path);
    if (!expected || typeof expected !== "object" || expected instanceof Date) return actual === expected;
    const operator = expected as Row;
    if ("$exists" in operator) return (actual !== undefined) === Boolean(operator.$exists);
    if ("$in" in operator) return (operator.$in as unknown[]).includes(actual);
    if ("$gte" in operator && !(actual instanceof Date && actual >= (operator.$gte as Date))) return false;
    if ("$lte" in operator && !(actual instanceof Date && actual <= (operator.$lte as Date))) return false;
    return Object.entries(operator).every(([key, value]) => key === "$gte" || key === "$lte" ? true : valueAt(actual as Row, key) === value);
  });
}

// Runs the generated lookup/$set/$match stages supplied to each model mock; it has no classification rules of its own.
function runFixturePipeline(rows: Row[], users: Row[], pipeline: Row[]): Row[] {
  return pipeline.reduce<Row[]>((current, stage) => {
    if ("$match" in stage) return current.filter((row) => matches(row, stage.$match as Row));
    if ("$lookup" in stage) {
      const lookup = stage.$lookup as { localField: string; foreignField: string; as: string };
      return current.map((row) => ({ ...row, [lookup.as]: users.filter((user) => valueAt(user, lookup.foreignField) === valueAt(row, lookup.localField)) }));
    }
    if ("$set" in stage) return current.map((row) => Object.entries(stage.$set as Row).reduce<Row>((next, [key, value]) => ({ ...next, [key]: expression(value, next) }), { ...row }));
    if ("$unset" in stage) return current.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !(stage.$unset as string[]).includes(key))));
    if ("$sort" in stage) return [...current].sort((left, right) => Number(valueAt(right, "createdAt")) - Number(valueAt(left, "createdAt")));
    if ("$limit" in stage) return current.slice(0, stage.$limit as number);
    return current;
  }, rows);
}

describe("admin overview operational classification", () => {
  it("runs real/test/internal/orphan fixtures through generated stages for every overview card and recent list", async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const users: Row[] = [
      { _id: "real", firebaseUid: "real", email: "real@example.test", displayName: "Real", role: "user", createdAt: now },
      { _id: "admin", firebaseUid: "admin", email: "admin@example.test", displayName: "Admin", role: "admin", createdAt: now },
      { _id: "test", firebaseUid: "test", email: "test@example.test", displayName: "Test", role: "user", createdAt: now, operationalClassification: { category: "test", reason: "test_account", classifiedAt: now } },
      { _id: "internal", firebaseUid: "internal", email: "internal@example.test", displayName: "Internal", role: "user", createdAt: now, operationalClassification: { category: "internal", reason: "internal_team", classifiedAt: now } },
    ];
    const subscriptions: Row[] = [
      { _id: "sub-real", userId: "real", planCode: "PLUS", status: "active", currentPeriodEnd: tomorrow, createdAt: now },
      { _id: "sub-far", userId: "real", planCode: "PLUS", status: "active", currentPeriodEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), createdAt: now },
      { _id: "sub-free", userId: "real", planCode: "FREE", status: "active", currentPeriodEnd: tomorrow, createdAt: now },
      { _id: "sub-inactive", userId: "real", planCode: "PLUS", status: "canceled", currentPeriodEnd: tomorrow, createdAt: now },
      { _id: "sub-expired", userId: "real", planCode: "PLUS", status: "active", currentPeriodEnd: earlier, createdAt: now },
      { _id: "sub-test", userId: "test", planCode: "PLUS", status: "active", currentPeriodEnd: tomorrow, createdAt: now },
      { _id: "sub-internal", userId: "internal", planCode: "PLUS", status: "active", currentPeriodEnd: tomorrow, createdAt: now },
      { _id: "sub-orphan", userId: "orphan", planCode: "PLUS", status: "active", currentPeriodEnd: tomorrow, createdAt: now },
    ];
    const payments: Row[] = [
      { orderId: "pending-real", userId: "real", status: "pending", purpose: "plus_subscription", amount: 0, currency: "VND", createdAt: now },
      { orderId: "pending-test", userId: "test", status: "pending", purpose: "physical_order", amount: 0, currency: "VND", createdAt: now },
      { orderId: "completed-real", userId: "real", status: "completed", purpose: "plus_subscription", amount: 100, currency: "VND", completedAt: now, createdAt: now },
      { orderId: "completed-old", userId: "real", status: "completed", purpose: "plus_subscription", amount: 25, currency: "VND", completedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000), createdAt: earlier },
      { orderId: "record-real", userId: "orphan", status: "completed", purpose: "physical_order", amount: 50, currency: "VND", completedAt: now, createdAt: now, operationalClassification: { category: "real", reason: "confirmed_real", classifiedAt: now }, reporting: { exclusionReason: "test" } },
      { orderId: "completed-test", userId: "test", status: "completed", purpose: "plus_subscription", amount: 200, currency: "VND", completedAt: now, createdAt: now },
      { orderId: "completed-usd", userId: "real", status: "completed", purpose: "plus_subscription", amount: 300, currency: "USD", completedAt: now, createdAt: earlier },
    ];
    const orders: Row[] = [
      { _id: "order-real", userId: "real", createdAt: now },
      { _id: "order-test", userId: "test", createdAt: now },
      { _id: "order-orphan", userId: "orphan", createdAt: now, operationalClassification: { category: "real", reason: "confirmed_real", classifiedAt: now } },
    ];

    (UserModel as unknown as ModelMethods).countDocuments = async (filter: Row) => users.filter((user) => matches(user, filter)).length;
    (UserModel as unknown as ModelMethods).find = (filter: Row) => chain(users.filter((user) => matches(user, filter)));
    (UserModel as unknown as ModelMethods).aggregate = async () => ["test", "internal"].map((category) => ({ _id: category, count: users.filter((user) => valueAt(user, "operationalClassification.category") === category).length }));
    (BillingSubscriptionModel as unknown as ModelMethods).find = (filter: Row) => chain(subscriptions.filter((subscription) => matches(subscription, filter)));
    (BillingSubscriptionModel as unknown as ModelMethods).aggregate = async (pipeline: Row[]) => {
      const rows = runFixturePipeline(subscriptions, users, pipeline);
      return [{ total: rows.length }];
    };
    (PaymentOrderModel as unknown as ModelMethods).aggregate = async (pipeline: Row[]) => {
      const rows = runFixturePipeline(payments, users, pipeline);
      if (pipeline.some((stage) => "$count" in stage)) return [{ total: rows.length }];
      if (pipeline.some((stage) => "$group" in stage)) return [{ total: rows.reduce((sum, row) => sum + Number(row.amount), 0) }];
      return rows;
    };
    (OrderModel as unknown as ModelMethods).aggregate = async (pipeline: Row[]) => [{ total: runFixturePipeline(orders, users, pipeline).length }];

    const res = response();
    let forwarded: unknown;
    await getAdminOverview({} as Request, res as unknown as Response, ((error?: unknown) => { forwarded = error; }) as NextFunction);

    assert.equal(forwarded, undefined);
    const data = (res.payload as { data: { summary: Record<string, unknown>; recentUsers: Row[]; recentPayments: Row[] } }).data;
    assert.deepEqual(data.summary, {
      totalUsers: 2, adminUsers: 1, excludedUsers: { test: 1, internal: 1 }, activePlusSubscriptions: 2,
      expiringSoonSubscriptions: 1, pendingPaymentOrders: 1, completedPaymentOrders: 4, physicalOrders: 2,
      revenueTotalVnd: 175, revenueLast30DaysVnd: 150,
    });
    assert.deepEqual(data.recentUsers.map((user) => user.firebaseUid).sort(), ["admin", "real"]);
    assert.deepEqual(data.recentPayments.map((payment) => payment.orderId).sort(), ["completed-old", "completed-real", "completed-usd", "pending-real", "record-real"]);
    assert.equal(data.recentPayments.some((payment) => Object.keys(payment).some((key) => key.startsWith("__effectiveOperational"))), false);
  });
});
