import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { getAdminOverview } from "../controllers/adminController";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { OrderModel } from "../models/OrderModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";

interface MockResponse {
  statusCode: number;
  payload?: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

type ModelMethods = Record<string, unknown>;

const original = {
  userCount: UserModel.countDocuments,
  userFind: UserModel.find,
  userAggregate: UserModel.aggregate,
  subscriptionCount: BillingSubscriptionModel.countDocuments,
  subscriptionFind: BillingSubscriptionModel.find,
  subscriptionAggregate: BillingSubscriptionModel.aggregate,
  paymentCount: PaymentOrderModel.countDocuments,
  paymentFind: PaymentOrderModel.find,
  paymentAggregate: PaymentOrderModel.aggregate,
  orderCount: OrderModel.countDocuments,
  orderAggregate: OrderModel.aggregate,
};

afterEach(() => {
  mock.restoreAll();
  (UserModel as unknown as ModelMethods).countDocuments = original.userCount;
  (UserModel as unknown as ModelMethods).find = original.userFind;
  (UserModel as unknown as ModelMethods).aggregate = original.userAggregate;
  (BillingSubscriptionModel as unknown as ModelMethods).countDocuments = original.subscriptionCount;
  (BillingSubscriptionModel as unknown as ModelMethods).find = original.subscriptionFind;
  (BillingSubscriptionModel as unknown as ModelMethods).aggregate = original.subscriptionAggregate;
  (PaymentOrderModel as unknown as ModelMethods).countDocuments = original.paymentCount;
  (PaymentOrderModel as unknown as ModelMethods).find = original.paymentFind;
  (PaymentOrderModel as unknown as ModelMethods).aggregate = original.paymentAggregate;
  (OrderModel as unknown as ModelMethods).countDocuments = original.orderCount;
  (OrderModel as unknown as ModelMethods).aggregate = original.orderAggregate;
});

function response(): MockResponse {
  return {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.payload = payload; return this; },
  };
}

function chain<T>(value: T) {
  const query = {
    select() { return query; },
    sort() { return query; },
    limit() { return query; },
    async lean() { return value; },
  };
  return query;
}

describe("admin overview operational classification", () => {
  it("uses real-only data for every customer and financial overview card", async () => {
    (UserModel as unknown as ModelMethods).countDocuments = async (filter: Record<string, unknown>) => filter.role === "admin" ? 1 : 1;
    (UserModel as unknown as ModelMethods).aggregate = async () => [{ _id: "test", count: 1 }];
    (UserModel as unknown as ModelMethods).find = (filter: Record<string, unknown>) => chain(
      "$or" in filter
        ? [{ firebaseUid: "real", email: "real@example.test", displayName: "Real", role: "user" }]
        : [],
    );
    (BillingSubscriptionModel as unknown as ModelMethods).aggregate = async () => [{ total: 1 }];
    (BillingSubscriptionModel as unknown as ModelMethods).find = () => chain([]);
    (PaymentOrderModel as unknown as ModelMethods).aggregate = async (pipeline: Array<Record<string, unknown>>) => {
      if (pipeline.some((stage) => "$count" in stage)) return [{ total: 1 }];
      if (pipeline.some((stage) => "$group" in stage)) {
        const initialMatch = pipeline.find((stage) => "$match" in stage)?.$match as Record<string, unknown>;
        return [{ total: "completedAt" in initialMatch ? 250_000 : 500_000 }];
      }
      return [];
    };
    (OrderModel as unknown as ModelMethods).aggregate = async () => [{ total: 1 }];

    const res = response();
    let forwarded: unknown;
    await getAdminOverview({} as Request, res as unknown as Response, ((error?: unknown) => { forwarded = error; }) as NextFunction);

    assert.equal(forwarded, undefined);
    const summary = (res.payload as { data: { summary: Record<string, unknown> } }).data.summary;
    assert.equal(summary.totalUsers, 1);
    assert.equal(summary.adminUsers, 1, "adminUsers remains a raw informational count");
    assert.equal(summary.activePlusSubscriptions, 1);
    assert.equal(summary.expiringSoonSubscriptions, 1);
    assert.equal(summary.pendingPaymentOrders, 1);
    assert.equal(summary.completedPaymentOrders, 1);
    assert.equal(summary.physicalOrders, 1);
    assert.equal(summary.revenueTotalVnd, 500_000);
    assert.equal(summary.revenueLast30DaysVnd, 250_000);
    assert.deepEqual(summary.excludedUsers, { test: 1, internal: 0 });
  });
});
