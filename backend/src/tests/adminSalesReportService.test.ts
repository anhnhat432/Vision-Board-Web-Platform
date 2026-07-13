import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import mongoose, { type ClientSession } from "mongoose";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/admin-sales-report-service-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-sales-report-service-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import { AuditLogModel } from "../models/auditLogModel";
import { env } from "../config/env";
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
import { buildAdminSalesReviewAuditIdentity } from "../services/adminAuditOutboxService";

const originalAggregate = PaymentOrderModel.aggregate;
const originalFindOne = PaymentOrderModel.findOne;
const originalFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalRefundFindOne = RefundRequestModel.findOne;
const originalUserFindOne = UserModel.findOne;
const originalOutboxCreate = AdminAuditOutboxModel.create;
const originalOutboxFindOne = AdminAuditOutboxModel.findOne;
const originalAuditFindOne = AuditLogModel.findOne;
const originalStartSession = mongoose.startSession;

type ReviewResult = {
  item: Record<string, unknown>;
};

function reviewAdminSalesOrder(input: unknown, dependencies?: unknown): Promise<ReviewResult> {
  const review = (adminSalesReportService as unknown as {
    reviewAdminSalesOrder?: (reviewInput: unknown, dependencies?: unknown) => Promise<ReviewResult>;
  }).reviewAdminSalesOrder;
  if (typeof review !== "function") {
    assert.fail("reviewAdminSalesOrder must be exported");
  }
  return review(input, dependencies ?? { triggerAuditDispatch() {} });
}

function createSessionMock(): ClientSession {
  return {
    async withTransaction(callback: () => Promise<void>) {
      await callback();
    },
    async endSession() {},
  } as unknown as ClientSession;
}

function createReviewOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: "order_doc_1",
    orderId: "VBREVIEW01",
    userId: "customer_uid",
    status: "completed" as const,
    purpose: "plus_subscription" as const,
    currency: "VND" as const,
    provider: "payos" as const,
    amount: 99000,
    completedAt: new Date("2026-07-10T03:00:00.000Z"),
    reporting: undefined,
    updatedAt: new Date("2026-07-10T03:06:00.000Z"),
    ...overrides,
  };
}

type SalesFacetFixture = {
  summary: Array<{
    successfulTransactions: number;
    uniquePaidUsers: number;
    grossRevenueVnd: number;
    refundedAmountVnd: number;
    netRevenueVnd: number;
  }>;
  tabCounts: Array<{ _id: "pending" | "included" | "excluded"; count: number }>;
  dailyBuckets: unknown[];
  rowCount: Array<{ count: number }>;
  rows: Array<Record<string, unknown>>;
};

function buildSalesFacetFixture(options: {
  storedStatus?: "pending" | "included" | "excluded";
  userCategory?: "real" | "test" | "internal";
  recordCategory?: "real" | "test" | "internal";
  legacyExclusionReason?: "test" | "internal_team";
  isRefunded?: boolean;
} = {}): SalesFacetFixture {
  const storedStatus = options.storedStatus ?? "pending";
  const isUserExcluded = options.userCategory === "test" || options.userCategory === "internal";
  const effectiveCategory = isUserExcluded
    ? options.userCategory
    : options.recordCategory ??
      (options.legacyExclusionReason === "test" ? "test" :
        options.legacyExclusionReason === "internal_team" ? "internal" : "real");
  const source = isUserExcluded
    ? "user"
    : options.recordCategory
      ? "record"
      : options.legacyExclusionReason
        ? "legacy_sales_review"
        : options.userCategory
          ? "user"
          : "default";
  const effectiveKpiStatus = effectiveCategory === "real" ? storedStatus : "excluded";
  const isIncluded = effectiveKpiStatus === "included";
  const amount = 99000;

  return {
    summary: isIncluded ? [{
      successfulTransactions: 1,
      uniquePaidUsers: 1,
      grossRevenueVnd: amount,
      refundedAmountVnd: options.isRefunded ? amount : 0,
      netRevenueVnd: options.isRefunded ? 0 : amount,
    }] : [],
    tabCounts: [{ _id: effectiveKpiStatus, count: 1 }],
    dailyBuckets: isIncluded ? [{
      _id: "2026-07-10",
      transactions: 1,
      grossRevenueVnd: amount,
      refundedAmountVnd: options.isRefunded ? amount : 0,
      netRevenueVnd: options.isRefunded ? 0 : amount,
    }] : [],
    rowCount: [{ count: 1 }],
    rows: [{
      orderId: "VBCLASS01",
      userId: "private-user-id",
      amount,
      currency: "VND",
      provider: "payos",
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      user: { email: "customer@example.com", displayName: "Customer Name" },
      payer: null,
      refund: options.isRefunded ? { resolvedAt: new Date("2026-07-11T03:00:00.000Z") } : null,
      isRefunded: Boolean(options.isRefunded),
      reporting: {
        kpiStatus: storedStatus,
        exclusionReason: options.legacyExclusionReason ?? null,
        reviewedAt: new Date("2026-07-11T02:00:00.000Z"),
        reviewNote: "private review note",
      },
      __effectiveOperationalCategory: effectiveCategory,
      __effectiveOperationalSource: source,
      __effectiveOperationalReason: options.recordCategory === "real"
        ? "confirmed_real"
        : options.legacyExclusionReason === "test"
          ? "legacy_sales_test"
          : options.legacyExclusionReason === "internal_team"
            ? "legacy_sales_internal"
            : undefined,
      effectiveKpiStatus,
      metadata: { providerPayload: "private provider payload" },
      bankAccount: "private bank account",
      manualCompletedAt: null,
      cassoTransactionId: null,
    }],
  };
}

function installSalesFacetFixture(facet: SalesFacetFixture): void {
  (PaymentOrderModel as unknown as { aggregate: (pipeline: unknown[]) => Promise<SalesFacetFixture[]> }).aggregate = async () => [facet];
}

function readEffectiveSalesRow(row: unknown): {
  effectiveKpiStatus?: unknown;
  operationalClassification?: { effectiveCategory?: unknown; source?: unknown };
} {
  return row as {
    effectiveKpiStatus?: unknown;
    operationalClassification?: { effectiveCategory?: unknown; source?: unknown };
  };
}

const reviewInput = {
  orderId: "VBREVIEW01",
  reviewerUid: "admin_uid",
  reviewRequestId: "11111111-1111-4111-8111-111111111111",
  kpiStatus: "excluded" as const,
  exclusionReason: "test" as const,
  reviewNote: "private note",
};

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

beforeEach(() => {
  (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);
  (AuditLogModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);
  (AdminAuditOutboxModel as unknown as { create: unknown }).create = async (events: unknown[]) => events;
  (mongoose as unknown as { startSession: unknown }).startSession = async () => createSessionMock();
  (UserModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);
  (RefundRequestModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);
});

afterEach(() => {
  (PaymentOrderModel as unknown as { aggregate: unknown }).aggregate = originalAggregate;
  (PaymentOrderModel as unknown as { findOne: unknown }).findOne = originalFindOne;
  (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = originalFindOneAndUpdate;
  (RefundRequestModel as unknown as { findOne: unknown }).findOne = originalRefundFindOne;
  (UserModel as unknown as { findOne: unknown }).findOne = originalUserFindOne;
  (AdminAuditOutboxModel as unknown as { create: unknown }).create = originalOutboxCreate;
  (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = originalOutboxFindOne;
  (AuditLogModel as unknown as { findOne: unknown }).findOne = originalAuditFindOne;
  (mongoose as unknown as { startSession: unknown }).startSession = originalStartSession;
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
      return project?.effectiveKpiStatus === "$__effectiveKpiStatus" && project?.payer === 1;
    })?.$project as Record<string, unknown>;
    assert.equal(safeProject.qrDataUrl, undefined);
    assert.equal(safeProject.metadata, undefined);
    assert.equal(safeProject.bankAccount, undefined);
    assert.equal(JSON.stringify(safeProject.reporting).includes("reviewNote"), false);
    assert.equal(JSON.stringify(safeProject.reporting).includes("reviewedBy"), false);
  });

  it("places Task 5 effective classification stages before the effective KPI status", () => {
    const filters = parseAdminSalesReportFilters({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "included",
    });
    const pipeline = buildAdminSalesReportPipeline(filters) as unknown as Array<Record<string, unknown>>;
    const classificationLookupIndex = pipeline.findIndex((stage) =>
      (stage.$lookup as { as?: unknown } | undefined)?.as === "__operationalUsers",
    );
    const effectiveClassificationIndex = pipeline.findIndex((stage) =>
      "__effectiveOperationalCategory" in (stage.$set as Record<string, unknown> ?? {}),
    );
    const effectiveKpiIndex = pipeline.findIndex((stage) =>
      "__effectiveKpiStatus" in (stage.$set as Record<string, unknown> ?? {}),
    );

    assert.ok(classificationLookupIndex >= 0);
    assert.ok(effectiveClassificationIndex > classificationLookupIndex);
    assert.ok(effectiveKpiIndex > effectiveClassificationIndex);
  });

  it("excludes a stored included sale when its user is test", async () => {
    installSalesFacetFixture(buildSalesFacetFixture({ storedStatus: "included", userCategory: "test" }));

    const report = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "excluded",
    });

    assert.equal(report.summary.successfulTransactions, 0);
    assert.equal(report.tabCounts.excluded, 1);
    assert.equal(report.items[0]?.reporting.kpiStatus, "included");
    assert.equal(readEffectiveSalesRow(report.items[0]).effectiveKpiStatus, "excluded");
    assert.equal(readEffectiveSalesRow(report.items[0]).operationalClassification?.source, "user");
  });

  it("restores the stored review decision when classification becomes real", async () => {
    installSalesFacetFixture(buildSalesFacetFixture({ storedStatus: "included", userCategory: "real" }));

    const report = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "included",
    });

    assert.equal(report.summary.successfulTransactions, 1);
    assert.equal(report.items[0]?.reporting.kpiStatus, "included");
    assert.equal(readEffectiveSalesRow(report.items[0]).effectiveKpiStatus, "included");
    assert.equal(readEffectiveSalesRow(report.items[0]).operationalClassification?.effectiveCategory, "real");
  });

  it("uses direct record real over legacy sales exclusion but keeps a non-real user authoritative", async () => {
    installSalesFacetFixture(buildSalesFacetFixture({
      storedStatus: "included",
      recordCategory: "real",
      legacyExclusionReason: "test",
    }));
    const recordReal = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "included",
    });
    assert.equal(readEffectiveSalesRow(recordReal.items[0]).effectiveKpiStatus, "included");
    assert.equal(readEffectiveSalesRow(recordReal.items[0]).operationalClassification?.source, "record");

    installSalesFacetFixture(buildSalesFacetFixture({
      storedStatus: "included",
      userCategory: "internal",
      recordCategory: "real",
      legacyExclusionReason: "test",
    }));
    const nonRealUser = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "excluded",
    });
    assert.equal(readEffectiveSalesRow(nonRealUser.items[0]).effectiveKpiStatus, "excluded");
    assert.equal(readEffectiveSalesRow(nonRealUser.items[0]).operationalClassification?.source, "user");
    assert.equal(readEffectiveSalesRow(nonRealUser.items[0]).operationalClassification?.effectiveCategory, "internal");
  });

  it("keeps a real pending sale pending and counts refunds only for effectively included sales", async () => {
    installSalesFacetFixture(buildSalesFacetFixture({ storedStatus: "pending", userCategory: "real" }));
    const pending = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "pending",
    });
    assert.equal(readEffectiveSalesRow(pending.items[0]).effectiveKpiStatus, "pending");
    assert.equal(pending.summary.successfulTransactions, 0);
    assert.equal(pending.tabCounts.pending, 1);

    installSalesFacetFixture(buildSalesFacetFixture({
      storedStatus: "included",
      userCategory: "real",
      isRefunded: true,
    }));
    const includedRefund = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "included",
    });
    assert.equal(includedRefund.summary.refundedAmountVnd, 99000);
    assert.equal(includedRefund.summary.netRevenueVnd, 0);
    assert.equal(includedRefund.dailyBuckets[0]?.netRevenueVnd, 0);

    installSalesFacetFixture(buildSalesFacetFixture({
      storedStatus: "included",
      userCategory: "test",
      isRefunded: true,
    }));
    const excludedRefund = await getAdminSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "excluded",
    });
    assert.equal(excludedRefund.summary.refundedAmountVnd, 0);
    assert.equal(excludedRefund.summary.netRevenueVnd, 0);
    assert.deepEqual(excludedRefund.dailyBuckets, []);
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

  it("exports effective KPI and classification summaries without private identifiers or payloads", async () => {
    installSalesFacetFixture(buildSalesFacetFixture({ storedStatus: "included", userCategory: "test" }));

    const exported = await getAdminSalesReportExport({
      from: "2026-07-01",
      to: "2026-07-11",
      kpiStatus: "excluded",
    });
    const csv = buildAdminSalesReportCsv(exported);

    assert.match(csv, /"Stored KPI status"/);
    assert.match(csv, /"Effective KPI status"/);
    assert.match(csv, /"Operational category"/);
    assert.match(csv, /"user"/);
    assert.match(csv, /"test"/);
    assert.equal(csv.includes("private-user-id"), false);
    assert.equal(csv.includes("private review note"), false);
    assert.equal(csv.includes("private provider payload"), false);
    assert.equal(csv.includes("private bank account"), false);
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
  it("commits review and outbox in the same session", async () => {
    const original = {
      _id: "order_doc_1",
      orderId: "VBREVIEW01",
      userId: "customer_uid",
      status: "completed" as const,
      purpose: "plus_subscription" as const,
      currency: "VND" as const,
      provider: "payos" as const,
      amount: 99000,
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      reporting: undefined,
      updatedAt: new Date("2026-07-10T03:06:00.000Z"),
    };
    const session = createSessionMock();
    let capturedPaymentOptions: Record<string, unknown> = {};
    let capturedFrozenReadOptions: Record<string, unknown> = {};
    let capturedOutboxOptions: Record<string, unknown> = {};
    let capturedOutbox: Record<string, unknown> = {};
    (mongoose as unknown as { startSession(): Promise<ClientSession> }).startSession = async () => session;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = (
      _filter: unknown,
      _projection?: unknown,
      options?: Record<string, unknown>,
    ) => {
      if (options) capturedFrozenReadOptions = options;
      return createLeanResult(original);
    };
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = (
      _filter: unknown,
      _update: unknown,
      options: Record<string, unknown>,
    ) => {
      capturedPaymentOptions = options;
      return createLeanResult({
        ...original,
        reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
      });
    };
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = (
      events: Array<Record<string, unknown>>,
      options: Record<string, unknown>,
    ) => {
      capturedOutbox = events[0] ?? {};
      capturedOutboxOptions = options;
      return Promise.resolve(events);
    };
    (UserModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);
    (RefundRequestModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(null);

    await reviewAdminSalesOrder({
      orderId: "VBREVIEW01",
      reviewerUid: "admin_uid",
      reviewRequestId: "11111111-1111-4111-8111-111111111111",
      kpiStatus: "excluded",
      exclusionReason: "test",
      reviewNote: "private note",
    }, { triggerAuditDispatch() {} });

    assert.equal(capturedPaymentOptions.session, session);
    assert.equal(capturedFrozenReadOptions.session, session);
    assert.equal(capturedOutboxOptions.session, session);
    assert.equal((capturedOutbox.payload as Record<string, unknown>).noteProvided, true);
    assert.equal(JSON.stringify(capturedOutbox).includes("private note"), false);
  });

  it("rolls back when the outbox insert fails", async () => {
    const persistedOrder = createReviewOrder();
    let persistedReporting: unknown = persistedOrder.reporting;
    let persistedOutboxRows = 0;
    let stagedReporting: unknown;
    let stagedOutboxRows = 0;
    let ended = false;
    const session = {
      async withTransaction(callback: () => Promise<void>) {
        try {
          await callback();
          persistedReporting = stagedReporting;
          persistedOutboxRows += stagedOutboxRows;
        } catch (error) {
          stagedReporting = undefined;
          stagedOutboxRows = 0;
          throw error;
        }
      },
      async endSession() {
        ended = true;
      },
    } as unknown as ClientSession;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => session;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(persistedOrder);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => {
      stagedReporting = { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() };
      return createLeanResult({ ...persistedOrder, reporting: stagedReporting });
    };
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async (events: unknown[]) => {
      stagedOutboxRows += events.length;
      throw new Error("outbox unavailable");
    };

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.errorCode === "admin_audit_unavailable",
    );
    assert.equal(ended, true);
    assert.equal(persistedReporting, undefined);
    assert.equal(persistedOutboxRows, 0);
  });

  it("keeps stale review conflict semantics", async () => {
    const order = createReviewOrder();
    let outboxCreates = 0;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => createLeanResult(null);
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => {
      outboxCreates += 1;
      return [];
    };

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.statusCode === 409 && error.errorCode === "sales_review_conflict",
    );
    assert.equal(outboxCreates, 0);
  });

  it("does not adopt a newer baseline during a driver transaction retry", async () => {
    const order = createReviewOrder();
    let readCount = 0;
    const session = {
      async withTransaction(callback: () => Promise<void>) {
        await callback();
        await callback();
      },
      async endSession() {},
    } as unknown as ClientSession;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => session;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => {
      readCount += 1;
      return createLeanResult(readCount === 3 ? null : order);
    };
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => createLeanResult({
      ...order,
      reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
    });

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.statusCode === 409 && error.errorCode === "sales_review_conflict",
    );
  });

  it("returns a matching idempotent replay without mutation", async () => {
    const order = createReviewOrder();
    const identity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: reviewInput.orderId,
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: reviewInput.reviewNote,
    });
    let updates = 0;
    let outboxCreates = 0;
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(identity);
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => {
      updates += 1;
      return createLeanResult(order);
    };
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => {
      outboxCreates += 1;
      return [];
    };

    const result = await reviewAdminSalesOrder(reviewInput);
    assert.equal(result.item.orderId, order.orderId);
    assert.equal(updates, 0);
    assert.equal(outboxCreates, 0);
  });

  it("replays a matching concurrent request after the frozen optimistic conflict", async () => {
    const baseline = createReviewOrder();
    const current = createReviewOrder({
      reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
    });
    const identity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: reviewInput.orderId,
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: reviewInput.reviewNote,
    });
    let paymentReads = 0;
    let idempotencyReads = 0;
    let updates = 0;
    let outboxCreates = 0;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => {
      paymentReads += 1;
      return createLeanResult(paymentReads === 1 ? baseline : paymentReads === 2 ? null : current);
    };
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => {
      idempotencyReads += 1;
      return createLeanResult(idempotencyReads === 1 ? null : identity);
    };
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => {
      updates += 1;
      return createLeanResult(null);
    };
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => {
      outboxCreates += 1;
      return [];
    };

    const result = await reviewAdminSalesOrder(reviewInput);
    assert.equal((result.item.reporting as { kpiStatus?: string }).kpiStatus, "excluded");
    assert.equal(updates, 0);
    assert.equal(outboxCreates, 0);
  });

  it("reports idempotency conflict after a frozen optimistic conflict for another command", async () => {
    const baseline = createReviewOrder();
    const conflictingIdentity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: "VBOTHER01",
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: reviewInput.reviewNote,
    });
    let paymentReads = 0;
    let idempotencyReads = 0;
    let updates = 0;
    let outboxCreates = 0;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => {
      paymentReads += 1;
      return createLeanResult(paymentReads === 1 ? baseline : null);
    };
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => {
      idempotencyReads += 1;
      return createLeanResult(idempotencyReads === 1 ? null : conflictingIdentity);
    };
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => {
      updates += 1;
      return createLeanResult(null);
    };
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => {
      outboxCreates += 1;
      return [];
    };

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.errorCode === "sales_review_idempotency_conflict",
    );
    assert.equal(updates, 0);
    assert.equal(outboxCreates, 0);
  });

  it("replays a concurrent duplicate after the frozen optimistic check loses", async () => {
    const order = createReviewOrder();
    const identity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: reviewInput.orderId,
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: reviewInput.reviewNote,
    });
    let idempotencyReads = 0;
    let updates = 0;
    let outboxCreates = 0;
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => {
      idempotencyReads += 1;
      return createLeanResult(idempotencyReads === 1 ? null : identity);
    };
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => {
      updates += 1;
      return createLeanResult({
        ...order,
        reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
      });
    };
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => {
      outboxCreates += 1;
      throw { code: 11000, keyPattern: { eventId: 1 } };
    };

    const result = await reviewAdminSalesOrder(reviewInput);
    assert.equal(result.item.orderId, order.orderId);
    assert.equal(updates, 1);
    assert.equal(outboxCreates, 1);
  });

  it("rejects a reused request id for another target or decision", async () => {
    const identity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: "VBOTHER01",
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: reviewInput.reviewNote,
    });
    let updates = 0;
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(identity);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => {
      updates += 1;
      return createLeanResult(null);
    };

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.statusCode === 409 && error.errorCode === "sales_review_idempotency_conflict",
    );
    assert.equal(updates, 0);
  });

  it("rejects a concurrent request-id reuse for another command", async () => {
    const order = createReviewOrder();
    const conflictingIdentity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: "VBOTHER01",
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: reviewInput.reviewNote,
    });
    let idempotencyReads = 0;
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => {
      idempotencyReads += 1;
      return createLeanResult(idempotencyReads === 1 ? null : conflictingIdentity);
    };
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => createLeanResult({
      ...order,
      reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
    });
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => {
      throw { code: 11000, keyPattern: { eventId: 1 } };
    };

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.errorCode === "sales_review_idempotency_conflict",
    );
  });

  it("treats a note-only change as idempotency conflict", async () => {
    const identity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: reviewInput.orderId,
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: "different private note",
    });
    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(identity);

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.statusCode === 409 && error.errorCode === "sales_review_idempotency_conflict",
    );
  });

  it("fails closed when the HMAC secret is absent or short", async () => {
    const originalSecret = env.ADMIN_AUDIT_FINGERPRINT_SECRET;
    const originalStartSessionForSecretTest = mongoose.startSession;
    let startSessionCount = 0;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => {
      startSessionCount += 1;
      return createSessionMock();
    };
    try {
      for (const invalidSecret of ["", "too-short"]) {
        env.ADMIN_AUDIT_FINGERPRINT_SECRET = invalidSecret;
        await assert.rejects(
          reviewAdminSalesOrder({ ...reviewInput, reviewRequestId: "22222222-2222-4222-8222-222222222222" }),
          (error: unknown) => error instanceof ApiError && error.errorCode === "admin_audit_unavailable",
        );
        assert.equal(startSessionCount, 0);
      }
    } finally {
      env.ADMIN_AUDIT_FINGERPRINT_SECRET = originalSecret;
      (mongoose as unknown as { startSession: unknown }).startSession = originalStartSessionForSecretTest;
    }
  });

  it("reports an unknown final commit result", async () => {
    const order = createReviewOrder();
    const session = {
      async withTransaction() {
        throw { errorLabels: ["UnknownTransactionCommitResult"] };
      },
      async endSession() {},
    } as unknown as ClientSession;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => session;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.errorCode === "admin_audit_commit_unknown",
    );
  });

  it("resolves the unknown commit retry with the same request id", async () => {
    const order = createReviewOrder();
    const current = createReviewOrder({
      reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
    });
    const identity = buildAdminSalesReviewAuditIdentity({
      reviewRequestId: reviewInput.reviewRequestId,
      actorUid: reviewInput.reviewerUid,
      targetId: reviewInput.orderId,
      newStatus: reviewInput.kpiStatus,
      exclusionReason: reviewInput.exclusionReason,
      reviewNote: reviewInput.reviewNote,
    });
    let startSessions = 0;
    let updates = 0;
    let outboxCreates = 0;
    const unknownSession = {
      async withTransaction() {
        throw { errorLabels: ["UnknownTransactionCommitResult"] };
      },
      async endSession() {},
    } as unknown as ClientSession;
    (mongoose as unknown as { startSession: unknown }).startSession = async () => {
      startSessions += 1;
      return unknownSession;
    };
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => {
      updates += 1;
      return createLeanResult(null);
    };
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async () => {
      outboxCreates += 1;
      return [];
    };

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.errorCode === "admin_audit_commit_unknown",
    );

    (AdminAuditOutboxModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(identity);
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(current);
    const result = await reviewAdminSalesOrder(reviewInput);
    assert.equal((result.item.reporting as { kpiStatus?: string }).kpiStatus, "excluded");
    assert.equal(startSessions, 1);
    assert.equal(updates, 0);
    assert.equal(outboxCreates, 0);
  });

  it("rejects missing or malformed review request ids and normalizes a valid id", async () => {
    for (const reviewRequestId of [undefined, "not-a-uuid"]) {
      await assert.rejects(
        reviewAdminSalesOrder({ ...reviewInput, reviewRequestId }),
        (error: unknown) => error instanceof ApiError && error.errorCode === "invalid_sales_review_request_id",
      );
    }

    const order = createReviewOrder();
    let eventId = "";
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => createLeanResult({
      ...order,
      reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
    });
    (AdminAuditOutboxModel as unknown as { create: unknown }).create = async (events: Array<{ eventId: string }>) => {
      eventId = events[0]?.eventId ?? "";
      return events;
    };
    await reviewAdminSalesOrder({
      ...reviewInput,
      reviewRequestId: " AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA ",
    });
    assert.equal(eventId, "admin_sales_reviewed:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("fails closed when transactions are unsupported", async () => {
    const order = createReviewOrder();
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (mongoose as unknown as { startSession: unknown }).startSession = async () => {
      throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
    };

    await assert.rejects(
      reviewAdminSalesOrder(reviewInput),
      (error: unknown) => error instanceof ApiError && error.errorCode === "admin_audit_unavailable",
    );
  });

  it("performs no required query after confirmed commit", async () => {
    const order = createReviewOrder();
    let userQueries = 0;
    let refundQueries = 0;
    (PaymentOrderModel as unknown as { findOne: unknown }).findOne = () => createLeanResult(order);
    (PaymentOrderModel as unknown as { findOneAndUpdate: unknown }).findOneAndUpdate = () => createLeanResult({
      ...order,
      reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date() },
    });
    (UserModel as unknown as { findOne: unknown }).findOne = () => {
      userQueries += 1;
      if (userQueries > 1) throw new Error("User query after commit");
      return createLeanResult(null);
    };
    (RefundRequestModel as unknown as { findOne: unknown }).findOne = () => {
      refundQueries += 1;
      if (refundQueries > 1) throw new Error("Refund query after commit");
      return createLeanResult(null);
    };

    const result = await reviewAdminSalesOrder(reviewInput);
    assert.equal(result.item.orderId, order.orderId);
    assert.equal(userQueries, 1);
    assert.equal(refundQueries, 1);
  });

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
        reviewRequestId: "22222222-2222-4222-8222-222222222222",
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
      reviewRequestId: "33333333-3333-4333-8333-333333333333",
      kpiStatus: "included",
      reviewNote: "Da doi chieu anh chuyen khoan va PayOS.",
    });

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
        reviewAdminSalesOrder({
          orderId: "VBREVIEW01",
          reviewerUid: "admin_uid",
          reviewRequestId: "44444444-4444-4444-8444-444444444444",
          ...input,
        }),
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
      reviewRequestId: "55555555-5555-4555-8555-555555555555",
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
        reviewRequestId: "66666666-6666-4666-8666-666666666666",
        kpiStatus: "excluded",
        exclusionReason: "test",
      }),
      (error: unknown) => error instanceof ApiError && error.errorCode === "sales_review_conflict" && error.statusCode === 409,
    );
  });
});
