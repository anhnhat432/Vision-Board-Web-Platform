import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
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
