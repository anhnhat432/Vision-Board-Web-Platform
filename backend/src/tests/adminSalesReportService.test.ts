import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import * as adminSalesReportService from "../services/adminSalesReportService";
import {
  buildAdminSalesReportCsv,
  buildAdminSalesReportPipeline,
  buildQualifyingSalesFilter,
  getAdminSalesReport,
  getAdminSalesReportExport,
  parseAdminSalesReportFilters,
} from "../services/adminSalesReportService";
import { ApiError } from "../utils/apiError";

const originalAggregate = PaymentOrderModel.aggregate;
const originalFindOne = PaymentOrderModel.findOne;
const originalFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalRefundFindOne = RefundRequestModel.findOne;
const originalUserFindOne = UserModel.findOne;

type ReviewResult = {
  item: Record<string, unknown>;
  audit: Record<string, unknown>;
};

function reviewAdminSalesOrder(input: unknown): Promise<ReviewResult> {
  const review = (adminSalesReportService as unknown as {
    reviewAdminSalesOrder?: (reviewInput: unknown) => Promise<ReviewResult>;
  }).reviewAdminSalesOrder;
  if (typeof review !== "function") {
    assert.fail("reviewAdminSalesOrder must be exported");
  }
  return review(input);
}

function createLeanResult<T>(value: T) {
  const chain = {
    select() {
      return chain;
    },
    sort() {
      return chain;
    },
    async lean() {
      return value;
    },
  };
  return chain;
}

afterEach(() => {
  (PaymentOrderModel as unknown as { aggregate: unknown }).aggregate = originalAggregate;
  (PaymentOrderModel as unknown as { findOne: unknown }).findOne = originalFindOne;
  (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = originalFindOneAndUpdate;
  (RefundRequestModel as unknown as { findOne: unknown }).findOne = originalRefundFindOne;
  (UserModel as unknown as { findOne: unknown }).findOne = originalUserFindOne;
});

describe("admin sales report filters", () => {
  it("defaults to the last 30 Vietnam calendar days", () => {
    const filters = parseAdminSalesReportFilters({}, new Date("2026-07-11T05:00:00.000Z"));
    assert.equal(filters.fromDate, "2026-06-12");
    assert.equal(filters.toDate, "2026-07-11");
    assert.equal(filters.from.toISOString(), "2026-06-11T17:00:00.000Z");
    assert.equal(filters.toExclusive.toISOString(), "2026-07-11T17:00:00.000Z");
    assert.equal(filters.provider, "all");
    assert.equal(filters.kpiStatus, "pending");
    assert.equal(filters.page, 1);
    assert.equal(filters.limit, 20);
  });

  it("rejects invalid providers, statuses, reversed dates, and ranges over 366 days", () => {
    const invalidInputs = [
      { provider: "mock" },
      { kpiStatus: "all" },
      { from: "2026-07-11", to: "2026-07-10" },
      { from: "2025-01-01", to: "2026-07-11" },
    ];

    for (const input of invalidInputs) {
      assert.throws(() => parseAdminSalesReportFilters(input), ApiError);
    }
  });

  it("builds one qualifying filter for completed real-provider VND Plus orders", () => {
    const filters = parseAdminSalesReportFilters({
      from: "2026-07-01",
      to: "2026-07-11",
      provider: "payos",
      kpiStatus: "included",
    });
    assert.deepEqual(buildQualifyingSalesFilter(filters), {
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: "payos",
      completedAt: { $gte: filters.from, $lt: filters.toExclusive },
    });
  });
});

describe("admin sales report aggregation", () => {
  it("locks the KPI, distinct-user, refund-dedupe, and export-cap stages in the generated pipeline", () => {
    const filters = parseAdminSalesReportFilters({
      from: "2026-07-01",
      to: "2026-07-11",
      provider: "all",
      kpiStatus: "included",
    });
    const pipeline = buildAdminSalesReportPipeline(filters, { exportAll: true }) as unknown as Array<Record<string, unknown>>;
    assert.deepEqual(pipeline[0], { $match: buildQualifyingSalesFilter(filters) });

    const refundLookup = pipeline.find((stage) => {
      const lookup = stage.$lookup as { from?: string } | undefined;
      return lookup?.from === RefundRequestModel.collection.name;
    })?.$lookup as { pipeline: Array<Record<string, unknown>> };
    assert.deepEqual(refundLookup.pipeline.at(-2), { $limit: 1 });

    const facet = pipeline.find((stage) => "$facet" in stage)?.$facet as Record<string, Array<Record<string, unknown>>>;
    const summaryGroup = facet.summary.find((stage) => "$group" in stage)?.$group as Record<string, unknown>;
    assert.deepEqual(summaryGroup.paidUsers, { $addToSet: "$userId" });
    assert.deepEqual(summaryGroup.grossRevenueVnd, { $sum: "$amount" });
    assert.deepEqual(summaryGroup.refundedAmountVnd, { $sum: { $cond: ["$isRefunded", "$amount", 0] } });
    assert.deepEqual(summaryGroup.netRevenueVnd, { $sum: { $cond: ["$isRefunded", 0, "$amount"] } });
    assert.deepEqual(facet.rows.at(-1), { $limit: 10_001 });
    const safeProject = pipeline.find((stage) => {
      const project = stage.$project as Record<string, unknown> | undefined;
      return project?.effectiveKpiStatus === 1 && project?.payer === 1;
    })?.$project as Record<string, unknown>;
    assert.equal(safeProject.qrDataUrl, undefined);
    assert.equal(safeProject.metadata, undefined);
    assert.equal(safeProject.bankAccount, undefined);
    assert.equal(JSON.stringify(safeProject.reporting).includes("reviewNote"), false);
    assert.equal(JSON.stringify(safeProject.reporting).includes("reviewedBy"), false);
  });

  it("normalizes legacy reviews, counts distinct users, and subtracts one completed refund", async () => {
    let capturedPipeline: unknown[] = [];
    (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<unknown[]> }).aggregate = async (pipeline) => {
      capturedPipeline = pipeline;
      return [{
        summary: [{
          successfulTransactions: 2,
          uniquePaidUsers: 1,
          grossRevenueVnd: 198000,
          refundedAmountVnd: 99000,
          netRevenueVnd: 99000,
        }],
        tabCounts: [{ _id: "included", count: 2 }, { _id: "pending", count: 1 }],
        dailyBuckets: [{
          _id: "2026-07-10",
          transactions: 2,
          grossRevenueVnd: 198000,
          refundedAmountVnd: 99000,
          netRevenueVnd: 99000,
        }],
        rowCount: [{ count: 1 }],
        rows: [{
          orderId: "VBREPORT01",
          amount: 99000,
          currency: "VND",
          provider: "payos",
          completedAt: new Date("2026-07-10T03:00:00.000Z"),
          user: { email: "nguyenvana@example.com", displayName: "Nguyen Van A" },
          payer: {
            classification: "external",
            accountMasked: "123****6789",
            accountNameMasked: "N*** V*** A***",
            bankName: "MB Bank",
            transactionReference: "PAYOS-REF-1",
            transactionDateTime: "2026-07-10 10:00:00",
            source: "reconciliation",
            observedAt: new Date("2026-07-10T03:01:00.000Z"),
          },
          refund: { resolvedAt: new Date("2026-07-11T03:00:00.000Z") },
          isRefunded: true,
          reporting: { kpiStatus: "included", reviewedAt: new Date("2026-07-11T02:00:00.000Z") },
          manualCompletedAt: null,
          cassoTransactionId: null,
        }],
      }];
    };

    const report = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "included",
    });

    assert.equal(report.summary.uniquePaidUsers, 1);
    assert.equal(report.summary.refundedAmountVnd, 99000);
    assert.equal(report.summary.netRevenueVnd, 99000);
    assert.equal(report.summary.pendingReviews, 1);
    assert.equal(report.items[0]?.customerEmailMasked, "ng***@example.com");
    assert.equal(report.items[0]?.customerLabelMasked, "N*** V*** A***");
    assert.equal(report.items[0]?.refund.status, "completed");
    assert.equal(JSON.stringify(report).includes("nguyenvana@example.com"), false);
    assert.equal(JSON.stringify(report).includes("userId"), false);
    assert.equal(JSON.stringify(capturedPipeline).includes("plus_subscription"), true);
    assert.equal(JSON.stringify(capturedPipeline).includes("Asia/Ho_Chi_Minh"), true);
  });

  it("serializes a completed refund marker when resolvedAt is null or missing", async () => {
    (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<unknown[]> }).aggregate = async () => [{
      rowCount: [{ count: 2 }],
      rows: [
        {
          orderId: "VBREFUNDNULL",
          amount: 99000,
          currency: "VND",
          provider: "payos",
          completedAt: new Date("2026-07-10T03:00:00.000Z"),
          payer: null,
          refund: { resolvedAt: null },
          isRefunded: true,
          reporting: null,
          manualCompletedAt: null,
          cassoTransactionId: null,
        },
        {
          orderId: "VBREFUNDMISSING",
          amount: 199000,
          currency: "VND",
          provider: "casso",
          completedAt: new Date("2026-07-10T03:00:00.000Z"),
          payer: null,
          refund: {},
          isRefunded: true,
          reporting: null,
          manualCompletedAt: null,
          cassoTransactionId: null,
        },
      ],
    }];

    const report = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "included",
    });

    assert.deepEqual(report.items.map((item) => item.refund), [
      { status: "completed", amountVnd: 99000, completedAt: null },
      { status: "completed", amountVnd: 199000, completedAt: null },
    ]);
  });

  it("exports all filtered rows and neutralizes spreadsheet formulas", async () => {
    (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<unknown[]> }).aggregate = async () => [{
      rows: [{
        orderId: "=CMD",
        amount: 99000,
        currency: "VND",
        provider: "payos",
        completedAt: new Date("2026-07-10T03:00:00.000Z"),
        user: { email: "a@example.com", displayName: "+Formula User" },
        payer: null,
        refund: null,
        reporting: null,
        manualCompletedAt: null,
        cassoTransactionId: null,
      }],
      rowCount: [{ count: 1 }],
    }];

    const exported = await getAdminSalesReportExport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "pending",
    });
    const csv = buildAdminSalesReportCsv(exported);
    assert.match(csv, /^\uFEFF/);
    assert.match(csv, /'\=CMD/);
    assert.match(csv, /"Generated at"/);
    assert.match(csv, /"Order ID"/);
    assert.equal(csv.includes("a@example.com"), false);
  });

  it("rejects oversized exports instead of returning a partial CSV", async () => {
    (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<unknown[]> }).aggregate = async () => [{
      rows: [],
      rowCount: [{ count: 10_001 }],
    }];
    await assert.rejects(
      getAdminSalesReportExport({ from: "2026-07-01", to: "2026-07-11", kpiStatus: "included" }),
      (error: unknown) => error instanceof ApiError && error.errorCode === "sales_export_too_large",
    );
  });
});

describe("admin sales KPI review", () => {
  it("requires reasons and notes, then atomically includes a manual completion without changing billing fields", async () => {
    const original = {
      _id: "order_doc_1",
      orderId: "VBREVIEW01",
      userId: "customer_uid",
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: "payos",
      amount: 99000,
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      manualCompletedAt: new Date("2026-07-10T03:05:00.000Z"),
      reporting: undefined,
      updatedAt: new Date("2026-07-10T03:06:00.000Z"),
    };

    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(original);

    await assert.rejects(
      reviewAdminSalesOrder({
        orderId: original.orderId,
        reviewerUid: "admin_uid",
        kpiStatus: "included",
      }),
      (error: unknown) => error instanceof ApiError && error.errorCode === "manual_sales_review_note_required",
    );

    let update: Record<string, unknown> | undefined;
    let filter: Record<string, unknown> | undefined;
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = (
      nextFilter: Record<string, unknown>,
      nextUpdate: Record<string, unknown>,
    ) => {
      filter = nextFilter;
      update = nextUpdate;
      return createLeanResult({
        ...original,
        reporting: {
          kpiStatus: "included",
          reviewNote: "Da doi chieu anh chuyen khoan va PayOS.",
          reviewedBy: "admin_uid",
          reviewedAt: new Date("2026-07-11T02:00:00.000Z"),
        },
      });
    };
    (UserModel as unknown as { findOne: unknown }).findOne = () => createLeanResult({
      email: "customer@example.com",
      displayName: "Customer Example",
    });
    (RefundRequestModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);

    const result = await reviewAdminSalesOrder({
      orderId: original.orderId,
      reviewerUid: "admin_uid",
      kpiStatus: "included",
      reviewNote: "Da doi chieu anh chuyen khoan va PayOS.",
    });

    assert.equal(result.audit.previousStatus, "pending");
    assert.equal(result.audit.newStatus, "included");
    assert.equal(result.audit.noteProvided, true);
    assert.equal((update?.$set as Record<string, unknown>)["reporting.kpiStatus"], "included");
    assert.equal((filter?.updatedAt as Date).toISOString(), original.updatedAt.toISOString());
    assert.deepEqual(filter?.$or, [
      { reporting: { $exists: false } },
      { "reporting.kpiStatus": { $exists: false } },
    ]);
    assert.equal(JSON.stringify(update).includes("amount"), false);
    assert.equal(JSON.stringify(update).includes("provider"), false);
    assert.equal(JSON.stringify(update).includes("receipt"), false);
    assert.equal(JSON.stringify(result.item).includes("reviewNote"), false);
    assert.equal(JSON.stringify(result.item).includes("customer@example.com"), false);
  });

  it("rejects excluded reviews without a reason, other exclusions without a note, and client pending status", async () => {
    const invalidInputs = [
      { kpiStatus: "excluded" },
      { kpiStatus: "excluded", exclusionReason: "other" },
      { kpiStatus: "pending" },
    ];

    for (const input of invalidInputs) {
      await assert.rejects(
        reviewAdminSalesOrder({ orderId: "VBREVIEW01", reviewerUid: "admin_uid", ...input }),
        (error: unknown) => error instanceof ApiError && error.statusCode === 400,
      );
    }
  });

  it("clears the exclusion reason when an existing review is included", async () => {
    const existing = {
      _id: "order_doc_2",
      orderId: "VBREVIEW02",
      userId: "customer_uid",
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: "casso",
      amount: 99000,
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      reporting: { kpiStatus: "excluded" as const, exclusionReason: "test" as const },
      updatedAt: new Date("2026-07-10T03:06:00.000Z"),
    };
    let update: Record<string, unknown> | undefined;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(existing);
    let filter: Record<string, unknown> | undefined;
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = (
      nextFilter: Record<string, unknown>,
      nextUpdate: Record<string, unknown>,
    ) => {
      filter = nextFilter;
      update = nextUpdate;
      return createLeanResult({
        ...existing,
        reporting: { kpiStatus: "included", reviewedAt: new Date("2026-07-11T02:00:00.000Z") },
      });
    };
    (UserModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);
    (RefundRequestModel as unknown as { findOne: unknown }).findOne = () => createLeanResult({ resolvedAt: null });

    const result = await reviewAdminSalesOrder({
      orderId: existing.orderId,
      reviewerUid: "admin_uid",
      kpiStatus: "included",
    });

    assert.deepEqual(update?.$unset, { "reporting.exclusionReason": "" });
    assert.equal(filter?.["reporting.kpiStatus"], "excluded");
    assert.equal((filter?.updatedAt as Date).toISOString(), existing.updatedAt.toISOString());
    assert.equal(result.item.reporting instanceof Object, true);
    assert.equal((result.item.refund as { status?: string }).status, "completed");
  });

  it("returns a conflict when the optimistic match is stale", async () => {
    const existing = {
      _id: "order_doc_3",
      orderId: "VBREVIEW03",
      userId: "customer_uid",
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: "payos",
      amount: 99000,
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      reporting: undefined,
      updatedAt: new Date("2026-07-10T03:06:00.000Z"),
    };
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(existing);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => createLeanResult(null);

    await assert.rejects(
      reviewAdminSalesOrder({
        orderId: existing.orderId,
        reviewerUid: "admin_uid",
        kpiStatus: "excluded",
        exclusionReason: "test",
      }),
      (error: unknown) => error instanceof ApiError && error.errorCode === "sales_review_conflict" && error.statusCode === 409,
    );
  });
});
