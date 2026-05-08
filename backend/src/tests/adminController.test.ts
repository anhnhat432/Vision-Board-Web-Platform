import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";

import {
  completePaymentOrderManually,
  getAdminPaymentOrders,
} from "../controllers/adminController";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import { billingService } from "../services/billingServiceInstance";

type MockableModel = {
  find: unknown;
  findOne: unknown;
  countDocuments: unknown;
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
  completedAt?: Date;
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
const originalUserFind = UserModel.find;
const originalBillingUpsert = billingService.upsertSubscriptionFromProviderEvent;

afterEach(() => {
  (PaymentOrderModel as unknown as MockableModel).find = originalPaymentOrderFind;
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).countDocuments = originalPaymentOrderCountDocuments;
  (UserModel as unknown as MockableModel).find = originalUserFind;
  (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = originalBillingUpsert;
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

  it("lists payment orders with status/search filters and user summaries", async () => {
    const order = createMockPaymentOrder({
      bankName: "MB",
      createdAt: new Date("2026-05-08T00:00:00Z"),
      expiresAt: new Date("2026-05-08T00:30:00Z"),
    } as Partial<MockPaymentOrder>);
    let capturedCountFilter: unknown;
    let capturedFindFilter: unknown;
    let capturedLimit = 0;

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

    (PaymentOrderModel as unknown as MockableModel).countDocuments = async (filter: unknown) => {
      capturedCountFilter = filter;
      return 1;
    };
    (PaymentOrderModel as unknown as MockableModel).find = (filter: unknown) => {
      capturedFindFilter = filter;
      const chain = {
        select() {
          return chain;
        },
        sort() {
          return chain;
        },
        limit(limit: number) {
          capturedLimit = limit;
          return chain;
        },
        async lean() {
          return [order];
        },
      };
      return chain;
    };

    const req = {
      query: { status: "pending", q: "paid@example.com", limit: "500" },
    } as unknown as Request;
    const res = createMockResponse();
    const recorder = createNextRecorder();

    await getAdminPaymentOrders(req, res as unknown as Response, recorder.next);

    assert.equal(recorder.getError(), undefined);
    assert.deepEqual(capturedCountFilter, capturedFindFilter);
    assert.equal((capturedFindFilter as Record<string, unknown>).status, "pending");
    assert.equal(capturedLimit, 100);

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
