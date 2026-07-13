import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { OrderModel } from "../models/OrderModel";
import { MongoOrderRepository } from "../repositories/mongo/MongoOrderRepository";
import { ApiError } from "../utils/apiError";

type AdminOrderMethods = {
  getAdminOrders(input: Record<string, unknown>): Promise<{
    total: number;
    items: Array<{ email: string; operationalClassification: { effectiveCategory: string } }>;
    statusCounts: Record<string, number>;
    frameOptions: string[];
  }>;
  getAdminOrdersForExport(input: Record<string, unknown>): Promise<unknown[]>;
};

const originalAggregate = OrderModel.aggregate;

afterEach(() => {
  (OrderModel as unknown as { aggregate: unknown }).aggregate = originalAggregate;
});

describe("admin operational physical-order lists", () => {
  it("filters rows before pagination while preserving whole-scope metadata", async () => {
    let capturedPipeline: Array<Record<string, unknown>> | undefined;
    (OrderModel as unknown as { aggregate: unknown }).aggregate = async (pipeline: Array<Record<string, unknown>>) => {
      capturedPipeline = pipeline;
      return [{
        metadata: [{ total: 5 }],
        items: [{
          _id: { toString: () => "507f1f77bcf86cd799439011" },
          userId: "orphan",
          email: "customer@example.com",
          status: "pending",
          lines: [{ itemId: "frame", label: "Khung go sang", type: "frame", qty: 1, unitPriceVnd: 1, lineTotalVnd: 1 }],
          fullName: "Customer",
          phone: "1",
          shippingAddress: { line1: "x" },
          createdAt: new Date("2026-07-10T00:00:00.000Z"),
          updatedAt: new Date("2026-07-10T00:00:00.000Z"),
          __effectiveOperationalCategory: "real",
          __effectiveOperationalSource: "default",
        }],
        statusCounts: [{ _id: "pending", count: 7 }],
        frameOptions: [{ _id: "Khung go sang" }],
      }];
    };

    const repository = new MongoOrderRepository() as MongoOrderRepository & AdminOrderMethods;
    const result = await repository.getAdminOrders({
      q: "customer@example.com",
      status: "pending",
      frame: "Khung go sang",
      dateFrom: new Date("2026-07-01T00:00:00.000Z"),
      dateToExclusive: new Date("2026-08-01T00:00:00.000Z"),
      operationalScope: "real",
      page: 2,
      limit: 2,
    });

    assert.equal(result.total, 5);
    assert.equal(result.items.every((item) => item.email === "customer@example.com"), true);
    assert.equal(result.items[0]?.operationalClassification.effectiveCategory, "real");
    assert.equal(result.statusCounts.pending, 7);
    assert.deepEqual(result.frameOptions, ["Khung go sang"]);
    const facet = capturedPipeline?.find((stage) => "$facet" in stage)?.$facet as Record<string, Array<Record<string, unknown>>> | undefined;
    assert.deepEqual(facet?.items.slice(-3), [{ $sort: { createdAt: -1 } }, { $skip: 2 }, { $limit: 2 }]);
  });

  it("rejects an oversized physical-order export instead of returning a partial CSV", async () => {
    (OrderModel as unknown as { aggregate: unknown }).aggregate = async () => Array.from({ length: 5001 }, () => ({}));
    const repository = new MongoOrderRepository() as MongoOrderRepository & AdminOrderMethods;

    await assert.rejects(
      () => repository.getAdminOrdersForExport({ q: "", status: "all", frame: "all", operationalScope: "real" }),
      (error: unknown) => error instanceof ApiError && error.errorCode === "admin_order_export_too_large",
    );
  });
});
