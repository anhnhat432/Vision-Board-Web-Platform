import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { NextFunction, Request, Response } from "express";

import {
  completePaymentOrderManually,
  getAdminSubscriptions,
  getAdminPaymentOrders,
  getAdminUsers,
  reconcileAdminPaymentOrderPayerSource,
  updateAdminUserRole,
} from "../controllers/adminController";
import { clearAdminRoleCache, requireAdmin } from "../middleware/requireAdmin";
import { BillingSubscriptionModel } from "../models/BillingSubscriptionModel";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import { billingService } from "../services/billingServiceInstance";
import * as payosPaymentAdapter from "../services/payosPaymentAdapter";
import * as payosPayerReconciliation from "../services/payosPayerReconciliation";

type MockableModel = {
  find: unknown;
  findOne: unknown;
  countDocuments: unknown;
  aggregate: unknown;
};

type MockableBillingService = {
  upsertSubscriptionFromProviderEvent: unknown;
};

interface MockResponse {
  statusCode: number;
  payload?: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

interface MockPaymentOrder {
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentOrderStatus;
  provider?: string;
  metadata?: Record<string, unknown>;
  purpose?: "plus_subscription" | "physical_order";
  completedAt?: Date;
  receiptSentAt?: Date;
  receiptLastError?: string;
  cassoTransactionId?: string;
  manualCompletedBy?: string;
  manualCompletedAt?: Date;
  manualCompletionNote?: string;
  saveCalls: number;
  save(): Promise<MockPaymentOrder>;
}

const originalPaymentOrderFind = PaymentOrderModel.find;
const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalPaymentOrderCountDocuments = PaymentOrderModel.countDocuments;
const originalPaymentOrderAggregate = PaymentOrderModel.aggregate;
const originalUserFind = UserModel.find;
const originalUserFindOne = UserModel.findOne;
const originalUserCountDocuments = UserModel.countDocuments;
const originalBillingSubscriptionAggregate = BillingSubscriptionModel.aggregate;
const originalBillingUpsert = billingService.upsertSubscriptionFromProviderEvent;

afterEach(() => {
  mock.restoreAll();
  (PaymentOrderModel as unknown as MockableModel).find = originalPaymentOrderFind;
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).countDocuments = originalPaymentOrderCountDocuments;
  (PaymentOrderModel as unknown as MockableModel).aggregate = originalPaymentOrderAggregate;
  (UserModel as unknown as MockableModel).find = originalUserFind;
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  (UserModel as unknown as MockableModel).countDocuments = originalUserCountDocuments;
  (BillingSubscriptionModel as unknown as MockableModel).aggregate = originalBillingSubscriptionAggregate;
  (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = originalBillingUpsert;
  clearAdminRoleCache();
});

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
}

function createNextRecorder(): { next: NextFunction; getError(): unknown } {
  let nextError: unknown;
  return {
    next(error?: unknown) {
      nextError = error;
    },
    getError() {
      return nextError;
    },
  };
}

function createMockPaymentOrder(overrides: Partial<MockPaymentOrder> = {}): MockPaymentOrder {
  return {
    orderId: "VBQA000001",
    userId: "user_paid",
    amount: 2000,
    status: "pending",
    saveCalls: 0,
    async save() {
      this.saveCalls++;
      return this;
    },
    ...overrides,
  };
}

describe("admin payment recovery", () => {
  it("reconciles a completed PayOS order without changing its payment or entitlement state", async () => {
    const order = createMockPaymentOrder({
      status: "completed",
      provider: "payos",
      amount: 2000,
      receiptSentAt: new Date("2026-07-10T09:30:00.000Z"),
      receiptLastError: "previous receipt error",
      metadata: { payos: { paymentLinkId: "payos_link_123", orderCode: 10_000_000_001 } },
    });
    const originalStatus = order.status;
    const originalAmount = order.amount;
    const originalProvider = order.provider;
    const originalReceiptSentAt = order.receiptSentAt;
    const originalReceiptLastError = order.receiptLastError;
    const originalSaveCalls = order.saveCalls;

    (PaymentOrderModel as unknown as MockableModel).findOne = async () => order;
    mock.method(payosPaymentAdapter, "getPayosPaymentLinkClient", () => ({ paymentRequests: { get: async () => { throw new Error("not used"); } } }));
    mock.method(payosPayerReconciliation, "reconcilePayosPayerSource", async () => ({
      payer: {
        classification: "external" as const,
        accountHash: "a".repeat(64),
        accountLast4: "6789",
        accountMasked: "012****6789",
        accountNameMasked: "N*** V*** A***",
        bankName: "MB Bank",
      },
      transactionReference: "TF_PAYOS_1",
      transactionDateTime: "2026-07-10 10:00:00",
    }));

    const response = createMockResponse();
    const recorder = createNextRecorder();
    await reconcileAdminPaymentOrderPayerSource(
      { params: { orderId: "vbqa000001" }, user: { uid: "admin_uid" } } as unknown as Request,
      response as unknown as Response,
      recorder.next,
    );

    assert.equal(recorder.getError(), undefined);
    assert.equal(response.statusCode, 200);
    assert.equal(order.status, originalStatus);
    assert.equal(order.amount, originalAmount);
    assert.equal(order.provider, originalProvider);
    assert.equal(order.receiptSentAt, originalReceiptSentAt);
    assert.equal(order.receiptLastError, originalReceiptLastError);
    assert.equal(order.saveCalls, originalSaveCalls + 1);
    const savedPayer = (order.metadata?.payos as { payer: { observedAt: Date } }).payer;
    assert.ok(savedPayer.observedAt instanceof Date);
    assert.deepEqual(savedPayer, {
      classification: "external",
      accountLast4: "6789",
      accountMasked: "012****6789",
      accountNameMasked: "N*** V*** A***",
      bankName: "MB Bank",
      transactionReference: "TF_PAYOS_1",
      transactionDateTime: "2026-07-10 10:00:00",
      source: "reconciliation",
      observedAt: savedPayer.observedAt,
    });
    assert.equal(JSON.stringify(order.metadata).includes("0123456789"), false);
    assert.equal(JSON.stringify(order.metadata).includes("a".repeat(64)), false);

    assert.deepEqual((response.payload as { data: { payer: unknown } }).data.payer, {
      classification: "external",
      accountLast4: "6789",
      accountMasked: "012****6789",
      accountNameMasked: "N*** V*** A***",
      bankName: "MB Bank",
      transactionReference: "TF_PAYOS_1",
      transactionDateTime: "2026-07-10 10:00:00",
      source: "reconciliation",
      observedAt: savedPayer.observedAt,
    });
  });

  it("completes a payment order manually and stores audit metadata", async () => {
    const order = createMockPaymentOrder();
    let capturedEvent: Record<string, unknown> | undefined;

    (PaymentOrderModel as unknown as MockableModel).findOne = async () => order;
    (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = async (
      event: Record<string, unknown>,
    ) => {
      capturedEvent = event;
      return {
        subscription: { id: "sub_manual_1" },
        eventStatus: "processed",
        eventId: "evt_manual_1",
      };
    };

    const req = {
      params: { orderId: "vbqa000001" },
      body: { manualCompletionNote: "Matched Casso transfer manually." },
      user: { uid: "admin_uid" },
    } as unknown as Request;
    const res = createMockResponse();
    const recorder = createNextRecorder();

    await completePaymentOrderManually(req, res as unknown as Response, recorder.next);

    assert.equal(recorder.getError(), undefined);
    assert.equal(res.statusCode, 200);
    assert.equal(order.status, "completed");
    assert.equal(order.saveCalls, 1);
    assert.equal(order.manualCompletedBy, "admin_uid");
    assert.equal(order.manualCompletionNote, "Matched Casso transfer manually.");
    assert.ok(order.manualCompletedAt instanceof Date);
    assert.ok(order.completedAt instanceof Date);
    assert.equal(capturedEvent?.provider, "manual");
    assert.equal(capturedEvent?.providerEventId, "manual_payment_VBQA000001");
    assert.equal(capturedEvent?.userId, "user_paid");

    const body = res.payload as { success: boolean; data: Record<string, unknown> };
    assert.equal(body.success, true);
    assert.equal(body.data.manualCompletedBy, "admin_uid");
    assert.equal(body.data.manualCompletionNote, "Matched Casso transfer manually.");
  });

  it("does not manually grant Plus for physical orders", async () => {
    const order = createMockPaymentOrder({ purpose: "physical_order" });
    let upsertCount = 0;

    (PaymentOrderModel as unknown as MockableModel).findOne = async () => order;
    (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = async () => {
      upsertCount += 1;
      throw new Error("Physical order manual completion should not grant Plus.");
    };

    const req = {
      params: { orderId: "vbqa000001" },
      body: { manualCompletionNote: "Physical order transfer matched manually." },
      user: { uid: "admin_uid" },
    } as unknown as Request;
    const res = createMockResponse();
    const recorder = createNextRecorder();

    await completePaymentOrderManually(req, res as unknown as Response, recorder.next);

    const error = recorder.getError() as { statusCode?: number; errorCode?: string };
    assert.equal(error?.statusCode, 400);
    assert.equal(error?.errorCode, "physical_order_not_claimable");
    assert.equal(order.status, "pending");
    assert.equal(order.saveCalls, 0);
    assert.equal(upsertCount, 0);
  });

  it("lists payment orders with status/search filters and user summaries", async () => {
    const order = createMockPaymentOrder({
      bankName: "MB",
      createdAt: new Date("2026-05-08T00:00:00Z"),
      expiresAt: new Date("2026-05-08T00:30:00Z"),
    } as Partial<MockPaymentOrder>);
    let capturedPipeline: Array<Record<string, unknown>> | undefined;

    (UserModel as unknown as MockableModel).find = (query: unknown) => {
      const chain = {
        select() {
          return chain;
        },
        limit() {
          return chain;
        },
        async lean() {
          const queryRecord = query as Record<string, unknown>;
          if ("$or" in queryRecord) {
            return [{ firebaseUid: "user_paid" }];
          }

          return [
            {
              firebaseUid: "user_paid",
              email: "paid@example.com",
              displayName: "Paid User",
              role: "user",
              createdAt: new Date("2026-05-01T00:00:00Z"),
            },
          ];
        },
      };
      return chain;
    };

    (PaymentOrderModel as unknown as MockableModel).aggregate = async (pipeline: Array<Record<string, unknown>>) => {
      capturedPipeline = pipeline;
      return [{ metadata: [{ total: 1 }], items: [order] }];
    };

    const req = {
      query: { status: "pending", q: "paid@example.com", limit: "500" },
    } as unknown as Request;
    const res = createMockResponse();
    const recorder = createNextRecorder();

    await getAdminPaymentOrders(req, res as unknown as Response, recorder.next);

    assert.equal(recorder.getError(), undefined);
    assert.equal((capturedPipeline?.[0]?.$match as Record<string, unknown>).status, "pending");
    const facet = capturedPipeline?.find((stage) => "$facet" in stage)?.$facet as Record<string, Array<Record<string, unknown>>> | undefined;
    assert.deepEqual(facet?.items.at(-1), { $limit: 100 });

    const body = res.payload as { success: boolean; data: Record<string, unknown> };
    const items = body.data.items as Array<Record<string, unknown>>;
    assert.equal(body.success, true);
    assert.equal(body.data.total, 1);
    assert.equal(body.data.limit, 100);
    assert.equal(items[0]?.orderId, "VBQA000001");
    assert.deepEqual(items[0]?.user, {
      firebaseUid: "user_paid",
      email: "paid@example.com",
      displayName: "Paid User",
      role: "user",
      createdAt: new Date("2026-05-01T00:00:00Z"),
    });
  });
});

describe("admin user role management", () => {
  it("invalidates the target user's cached admin role after a role change", async () => {
    const targetUid = "demoted_admin_uid";
    let dbRole: "admin" | "user" = "admin";
    const findOneCalls: unknown[] = [];
    const userDoc = {
      firebaseUid: targetUid,
      email: "demoted-admin@example.test",
      displayName: "Demoted Admin",
      role: dbRole,
      saveCalls: 0,
      async save() {
        this.saveCalls++;
        dbRole = this.role;
        return this;
      },
    };

    (UserModel as unknown as MockableModel).findOne = (query: unknown) => {
      findOneCalls.push(query);
      if (findOneCalls.length === 2) {
        return Promise.resolve(userDoc);
      }

      const chain = {
        select() {
          return chain;
        },
        maxTimeMS() {
          return chain;
        },
        async lean() {
          return { role: dbRole };
        },
      };
      return chain;
    };

    const firstAdminCheck = createNextRecorder();
    await requireAdmin(
      {
        user: { uid: targetUid, email: "demoted-admin@example.test", role: "admin" },
        firebaseToken: { uid: targetUid, email: "demoted-admin@example.test", role: "admin" },
      } as unknown as Request,
      {} as Response,
      firstAdminCheck.next,
    );
    assert.equal(firstAdminCheck.getError(), undefined);
    assert.equal(findOneCalls.length, 1);

    const updateResponse = createMockResponse();
    const updateRecorder = createNextRecorder();
    await updateAdminUserRole(
      {
        params: { uid: targetUid },
        body: { role: "user" },
        user: { uid: "different_admin_uid" },
      } as unknown as Request,
      updateResponse as unknown as Response,
      updateRecorder.next,
    );
    assert.equal(updateRecorder.getError(), undefined);
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(userDoc.saveCalls, 1);
    assert.equal(dbRole, "user");

    const secondAdminCheck = createNextRecorder();
    await requireAdmin(
      {
        user: { uid: targetUid, email: "demoted-admin@example.test", role: "admin" },
        firebaseToken: { uid: targetUid, email: "demoted-admin@example.test", role: "admin" },
      } as unknown as Request,
      {} as Response,
      secondAdminCheck.next,
    );

    const error = secondAdminCheck.getError() as { statusCode?: number };
    assert.equal(error?.statusCode, 403);
    assert.equal(findOneCalls.length, 3);
  });
});

describe("admin operational list filters", () => {
  it("defaults the user list to the persisted real category without role heuristics", async () => {
    let capturedFilter: Record<string, unknown> | undefined;
    (UserModel as unknown as MockableModel).countDocuments = async (filter: Record<string, unknown>) => {
      capturedFilter = filter;
      return 0;
    };
    (UserModel as unknown as MockableModel).find = (filter: Record<string, unknown>) => {
      capturedFilter = filter;
      const chain = {
        select() { return chain; }, sort() { return chain; }, skip() { return chain; }, limit() { return chain; }, async lean() { return []; },
      };
      return chain;
    };

    const res = createMockResponse();
    const recorder = createNextRecorder();
    await getAdminUsers({ query: {} } as unknown as Request, res as unknown as Response, recorder.next);

    assert.equal(recorder.getError(), undefined);
    assert.deepEqual(capturedFilter, {
      $and: [{
        $or: [
          { operationalClassification: { $exists: false } },
          { operationalClassification: null },
          { "operationalClassification.category": "real" },
        ],
      }],
    });
  });

  it("defaults the subscription list to effective real scope before its facet pagination", async () => {
    let capturedPipeline: Array<Record<string, unknown>> | undefined;
    (BillingSubscriptionModel as unknown as MockableModel).aggregate = async (pipeline: Array<Record<string, unknown>>) => {
      capturedPipeline = pipeline;
      return [{ metadata: [], items: [] }];
    };

    const res = createMockResponse();
    const recorder = createNextRecorder();
    await getAdminSubscriptions({ query: {} } as unknown as Request, res as unknown as Response, recorder.next);

    assert.equal(recorder.getError(), undefined);
    assert.deepEqual(capturedPipeline?.find((stage) => "$match" in stage && (stage.$match as Record<string, unknown>).__effectiveOperationalCategory === "real"), {
      $match: { __effectiveOperationalCategory: "real" },
    });
    assert.deepEqual(capturedPipeline?.find((stage) => "$match" in stage && "__operationalUser._id" in (stage.$match as Record<string, unknown>)), {
      $match: { "__operationalUser._id": { $exists: true } },
    });
    assert.equal(capturedPipeline?.at(-1) && "$facet" in capturedPipeline.at(-1)!, true);
  });

  it("rejects an invalid user category before querying users", async () => {
    const res = createMockResponse();
    const recorder = createNextRecorder();

    await getAdminUsers(
      { query: { operationalCategory: "not-a-category" } } as unknown as Request,
      res as unknown as Response,
      recorder.next,
    );

    const error = recorder.getError() as { statusCode?: number; errorCode?: string };
    assert.equal(error?.statusCode, 400);
    assert.equal(error?.errorCode, "invalid_operational_category");
  });

  it("rejects an invalid subscription scope before querying subscriptions", async () => {
    const res = createMockResponse();
    const recorder = createNextRecorder();

    await getAdminSubscriptions(
      { query: { operationalScope: "not-a-scope" } } as unknown as Request,
      res as unknown as Response,
      recorder.next,
    );

    const error = recorder.getError() as { statusCode?: number; errorCode?: string };
    assert.equal(error?.statusCode, 400);
    assert.equal(error?.errorCode, "invalid_operational_scope");
  });

  it("defaults payment list to real and paginates after effective filtering", async () => {
    let capturedPipeline: Array<Record<string, unknown>> | undefined;
    const order = createMockPaymentOrder({
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
      __effectiveOperationalCategory: "real",
      __effectiveOperationalSource: "default",
    } as Partial<MockPaymentOrder>);

    (PaymentOrderModel as unknown as MockableModel).aggregate = async (pipeline: Array<Record<string, unknown>>) => {
      capturedPipeline = pipeline;
      return [{ metadata: [{ total: 3 }], items: [order] }];
    };
    (PaymentOrderModel as unknown as MockableModel).countDocuments = async () => 3;
    (PaymentOrderModel as unknown as MockableModel).find = () => ({
      select() { return this; },
      sort() { return this; },
      limit() { return this; },
      async lean() { return [order]; },
    });
    (UserModel as unknown as MockableModel).find = () => ({
      select() { return this; },
      async lean() { return []; },
    });

    const res = createMockResponse();
    const recorder = createNextRecorder();
    await getAdminPaymentOrders(
      { query: { page: "2", limit: "2" } } as unknown as Request,
      res as unknown as Response,
      recorder.next,
    );

    assert.equal(recorder.getError(), undefined);
    assert.deepEqual(capturedPipeline?.find((stage) => "$match" in stage && (stage.$match as Record<string, unknown>).__effectiveOperationalCategory === "real"), {
      $match: { __effectiveOperationalCategory: "real" },
    });
    const facet = capturedPipeline?.find((stage) => "$facet" in stage)?.$facet as Record<string, Array<Record<string, unknown>>> | undefined;
    assert.deepEqual(facet?.items.slice(-3), [{ $sort: { createdAt: -1 } }, { $skip: 2 }, { $limit: 2 }]);
    const body = res.payload as { data: { page: number; totalPages: number; operationalScope: string; items: Array<{ operationalClassification: { effectiveCategory: string } }> } };
    assert.equal(body.data.page, 2);
    assert.equal(body.data.totalPages, 2);
    assert.equal(body.data.operationalScope, "real");
    assert.equal(body.data.items[0]?.operationalClassification.effectiveCategory, "real");
  });

  it("rejects invalid payment pagination before querying", async () => {
    const res = createMockResponse();
    const recorder = createNextRecorder();
    await getAdminPaymentOrders(
      { query: { page: "0" } } as unknown as Request,
      res as unknown as Response,
      recorder.next,
    );

    const error = recorder.getError() as { statusCode?: number; errorCode?: string };
    assert.equal(error?.statusCode, 400);
    assert.equal(error?.errorCode, "invalid_payment_order_page");
  });
});
