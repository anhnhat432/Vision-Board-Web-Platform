import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { Request, Response } from "express";

import { handlePayosWebhook } from "../controllers/payosWebhookController";
import { FailedReceiptQueueModel } from "../models/FailedReceiptQueueModel";
import { PaymentOrderModel, type PaymentOrderStatus } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import { billingService } from "../services/billingServiceInstance";
import {
  createPayosOrderCodeFromOrderId,
  createPayosSignatureFromData,
  type PayosWebhookData,
  type PayosWebhookPayload,
} from "../services/payosPaymentAdapter";
import { _resetAdapterCacheForTesting } from "../services/paymentProviderRegistry";
import * as receiptEmailService from "../services/receiptEmailService";

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(body: unknown): MockResponse;
}

interface MockPayosPaymentOrder {
  _id: string;
  orderId: string;
  userId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string;
  expiresAt: Date;
  completedAt?: Date;
  receiptEmail?: string;
  receiptName?: string;
  receiptSentAt?: Date;
  receiptLastError?: string;
  metadata?: {
    payos?: {
      orderCode?: number;
      paymentLinkId?: string;
      webhookReference?: string;
      webhookCode?: string;
      webhookDescription?: string;
      transactionDateTime?: string;
      payer?: {
        classification: "internal" | "external" | "unknown";
        accountLast4?: string;
        accountMasked?: string;
        accountNameMasked?: string;
        bankName?: string;
        source: "webhook" | "reconciliation";
        observedAt: Date;
      };
    };
  };
  saveCalls: number;
  save(): Promise<MockPayosPaymentOrder>;
}

type MockableModel = {
  findOne: unknown;
  findOneAndUpdate: unknown;
  updateOne: unknown;
};

type MockableBillingService = {
  upsertSubscriptionFromProviderEvent: unknown;
};

const originalEnv = {
  BILLING_PROVIDER: process.env.BILLING_PROVIDER,
  PAYOS_CLIENT_ID: process.env.PAYOS_CLIENT_ID,
  PAYOS_API_KEY: process.env.PAYOS_API_KEY,
  PAYOS_CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY,
  PAYMENT_PAYER_HASH_KEY: process.env.PAYMENT_PAYER_HASH_KEY,
  INTERNAL_PAYER_ACCOUNT_NUMBERS: process.env.INTERNAL_PAYER_ACCOUNT_NUMBERS,
  PLUS_PRICE_VND: process.env.PLUS_PRICE_VND,
};
const originalPaymentOrderFindOne = PaymentOrderModel.findOne;
const originalPaymentOrderFindOneAndUpdate = PaymentOrderModel.findOneAndUpdate;
const originalPaymentOrderUpdateOne = PaymentOrderModel.updateOne;
const originalFailedReceiptDeleteOne = FailedReceiptQueueModel.deleteOne;
const originalUserFindOne = UserModel.findOne;
const originalBillingUpsert = billingService.upsertSubscriptionFromProviderEvent;

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function configurePayosEnv(): void {
  process.env.BILLING_PROVIDER = "payos";
  process.env.PAYOS_CLIENT_ID = "payos_client_id_test";
  process.env.PAYOS_API_KEY = "payos_api_key_test";
  process.env.PAYOS_CHECKSUM_KEY = "payos_checksum_key_test";
  process.env.PAYMENT_PAYER_HASH_KEY = "payer_hash_key_test";
  process.env.INTERNAL_PAYER_ACCOUNT_NUMBERS = "0123456789";
  process.env.PLUS_PRICE_VND = "99000";
}

function createResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

function createRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return { body, headers } as Request;
}

function createOrder(overrides: Partial<MockPayosPaymentOrder> = {}): MockPayosPaymentOrder {
  const orderId = overrides.orderId ?? "VBABCDEFGH";
  const orderCode = createPayosOrderCodeFromOrderId(orderId);
  const order: MockPayosPaymentOrder = {
    _id: overrides._id ?? `mock_${orderId}`,
    orderId,
    userId: "user_payos_webhook",
    planCode: "PLUS",
    billingCycle: "twelve_week",
    amount: 99000,
    currency: "VND",
    status: "pending",
    provider: "payos",
    receiptEmail: "buyer@example.test",
    receiptName: "PayOS Buyer",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: {
      payos: {
        orderCode,
        paymentLinkId: "payos_link_123",
      },
    },
    saveCalls: 0,
    async save() {
      this.saveCalls++;
      return this;
    },
    ...overrides,
  };
  return order;
}

function createWebhookPayload(
  overrides: Partial<PayosWebhookData> = {},
  checksumKey = "payos_checksum_key_test",
): string {
  const data: PayosWebhookData = {
    orderCode: createPayosOrderCodeFromOrderId("VBABCDEFGH"),
    amount: 99000,
    description: "VBABCDEFGH",
    accountNumber: "123456789",
    reference: "TF_PAYOS_1",
    transactionDateTime: "2026-05-22 09:00:00",
    currency: "VND",
    paymentLinkId: "payos_link_123",
    code: "00",
    desc: "Thành công",
    ...overrides,
  };
  const payload: PayosWebhookPayload = {
    code: "00",
    desc: "success",
    success: true,
    data,
    signature: createPayosSignatureFromData(data as unknown as Record<string, unknown>, checksumKey),
  };
  return JSON.stringify(payload);
}

interface PersistenceHooks {
  /** Override behavior of the atomic claim for testing race conditions. */
  claim?: (filter: Record<string, unknown>) => MockPayosPaymentOrder | null;
}

function mockOrderPersistence(
  order: MockPayosPaymentOrder | null,
  hooks: PersistenceHooks = {},
): { findOneCalls: unknown[]; claimCalls: unknown[] } {
  const findOneCalls: unknown[] = [];
  const claimCalls: unknown[] = [];

  (PaymentOrderModel as unknown as MockableModel).findOne = async (query: unknown) => {
    findOneCalls.push(query);
    if (!order) return null;
    const filter = query as { provider?: string; $or?: Array<Record<string, unknown>>; orderId?: string };
    if (filter.orderId === order.orderId && !filter.$or) return order;
    if (filter.provider !== "payos" || !Array.isArray(filter.$or)) return null;
    const payos = order.metadata?.payos ?? {};
    return filter.$or.some((entry) => {
      if (entry.orderId === order.orderId) return true;
      if (entry["metadata.payos.orderCode"] === payos.orderCode) return true;
      if (entry["metadata.payos.paymentLinkId"] === payos.paymentLinkId) return true;
      return false;
    })
      ? order
      : null;
  };

  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = async (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) => {
    claimCalls.push({ filter, update });

    if (hooks.claim) return hooks.claim(filter);

    if (!order) return null;
    if (filter._id !== order._id) return null;
    if (filter.status && order.status !== filter.status) return null;

    const $set = (update.$set ?? {}) as Record<string, unknown>;
    if (typeof $set.status === "string") order.status = $set.status as PaymentOrderStatus;
    if ($set.completedAt instanceof Date) order.completedAt = $set.completedAt;
    const metadata = order.metadata ?? {};
    const payos = metadata.payos ?? {};
    order.metadata = {
      ...metadata,
      payos: {
        ...payos,
        orderCode: $set["metadata.payos.orderCode"] as number | undefined,
        paymentLinkId: $set["metadata.payos.paymentLinkId"] as string | undefined,
        webhookReference: $set["metadata.payos.webhookReference"] as string | undefined,
        webhookCode: $set["metadata.payos.webhookCode"] as string | undefined,
        webhookDescription: $set["metadata.payos.webhookDescription"] as string | undefined,
        transactionDateTime: $set["metadata.payos.transactionDateTime"] as string | undefined,
        payer: $set["metadata.payos.payer"] as
          | {
              classification: "internal" | "external" | "unknown";
              accountLast4?: string;
              accountMasked?: string;
              accountNameMasked?: string;
              bankName?: string;
              source: "webhook" | "reconciliation";
              observedAt: Date;
            }
          | undefined,
      },
    };
    return order;
  };

  (PaymentOrderModel as unknown as MockableModel).updateOne = async () => ({
    acknowledged: true,
    modifiedCount: 1,
  });
  (FailedReceiptQueueModel as unknown as { deleteOne: unknown }).deleteOne = async () => ({
    acknowledged: true,
    deletedCount: 0,
  });
  (UserModel as unknown as { findOne: unknown }).findOne = () => ({
    select() {
      return {
        async lean() {
          return { email: "buyer@example.test", displayName: "PayOS Buyer" };
        },
      };
    },
  });

  return { findOneCalls, claimCalls };
}

function stubGrantSuccess(): { events: Array<Record<string, unknown>> } {
  const events: Array<Record<string, unknown>> = [];
  (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = async (
    event: Record<string, unknown>,
  ) => {
    events.push(event);
    return {
      subscription: {
        id: "sub_payos_test",
        userId: event.userId,
        planCode: "PLUS",
        status: "active",
        provider: "payos",
        source: "provider",
        providerSubscriptionId: event.providerSubscriptionId,
        entitlements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      eventStatus: "processed" as const,
      eventId: "evt_payos_test",
    };
  };
  return { events };
}

function stubGrantForbidden(): { calls: { count: number } } {
  const calls = { count: 0 };
  (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = async () => {
    calls.count++;
    throw new Error("should not grant");
  };
  return { calls };
}

afterEach(() => {
  mock.restoreAll();
  restoreEnv();
  _resetAdapterCacheForTesting();
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = originalPaymentOrderFindOneAndUpdate;
  (PaymentOrderModel as unknown as MockableModel).updateOne = originalPaymentOrderUpdateOne;
  (FailedReceiptQueueModel as unknown as { deleteOne: unknown }).deleteOne = originalFailedReceiptDeleteOne;
  (UserModel as unknown as { findOne: unknown }).findOne = originalUserFindOne;
  (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = originalBillingUpsert;
});

describe("PayOS webhook controller", () => {
  it("rejects invalid signature without granting Plus", async () => {
    configurePayosEnv();
    const order = createOrder();
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantForbidden();
    const response = createResponse();

    await handlePayosWebhook(
      createRequest(JSON.parse(createWebhookPayload({}, "wrong_checksum_key"))),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 401);
    assert.equal(order.status, "pending");
    assert.equal(grant.calls.count, 0);
    assert.equal(persistence.claimCalls.length, 0);
  });

  it("persists only safe payer evidence when a valid success webhook completes an order", async () => {
    configurePayosEnv();
    const order = createOrder({ userId: `user_payos_success_${Date.now()}` });
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantSuccess();
    const infoStub = mock.method(console, "info", () => undefined);
    const receiptStub = mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));

    const response = createResponse();
    await handlePayosWebhook(
      createRequest(
        JSON.parse(
          createWebhookPayload({
            counterAccountBankName: "MB Bank",
            counterAccountName: "NGUYEN VAN A",
            counterAccountNumber: "0123456789",
          }),
        ),
      ),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "processed");
    assert.equal(order.status, "completed");
    assert.ok(order.completedAt instanceof Date);
    assert.equal(order.metadata?.payos?.webhookReference, "TF_PAYOS_1");
    const payer = order.metadata?.payos?.payer;
    assert.ok(payer?.observedAt instanceof Date);
    assert.deepEqual(payer, {
      classification: "internal",
      accountLast4: "6789",
      accountMasked: "012****6789",
      accountNameMasked: "N*** V*** A***",
      bankName: "MB Bank",
      source: "webhook",
      observedAt: payer.observedAt,
    });
    assert.equal(JSON.stringify(payer).includes("0123456789"), false);
    assert.equal("accountHash" in payer, false);
    assert.equal(persistence.claimCalls.length, 2);
    assert.equal(grant.events.length, 1);
    assert.equal(grant.events[0]?.provider, "payos");
    assert.equal(grant.events[0]?.providerSubscriptionId, order.orderId);
    assert.equal(receiptStub.mock.callCount(), 1);
    const loggedEvents = infoStub.mock.calls
      .map((call) => call.arguments[0])
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => entry.event);
    assert.ok(loggedEvents.includes("payos_webhook_subscription_order_success"));
    assert.equal(loggedEvents.includes("payos_webhook_physical_order_success"), false);
  });

  it("returns duplicate when webhook arrives for an already-completed order", async () => {
    configurePayosEnv();
    const order = createOrder({ status: "completed", completedAt: new Date("2026-05-21T00:00:00Z") });
    mockOrderPersistence(order);
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), response as unknown as Response);

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "duplicate");
    assert.equal(grant.calls.count, 0);
  });

  it("returns duplicate when atomic claim loses race to a concurrent webhook", async () => {
    configurePayosEnv();
    const order = createOrder();
    const persistence = mockOrderPersistence(order, { claim: () => null });
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), response as unknown as Response);

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "duplicate");
    assert.equal(persistence.claimCalls.length, 1);
    assert.equal(grant.calls.count, 0);
  });

  it("ignores webhook with mismatching amount without granting Plus", async () => {
    configurePayosEnv();
    const order = createOrder();
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(
      createRequest(JSON.parse(createWebhookPayload({ amount: 1000 }))),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "ignored");
    assert.equal(order.status, "pending");
    assert.equal(persistence.claimCalls.length, 0);
    assert.equal(grant.calls.count, 0);
  });

  it("ignores webhook with non-VND currency", async () => {
    configurePayosEnv();
    const order = createOrder();
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(
      createRequest(JSON.parse(createWebhookPayload({ currency: "USD" }))),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "ignored");
    assert.equal(order.status, "pending");
    assert.equal(persistence.claimCalls.length, 0);
    assert.equal(grant.calls.count, 0);
  });

  it("marks expired orders as expired and ignores webhook", async () => {
    configurePayosEnv();
    const order = createOrder({ expiresAt: new Date(Date.now() - 60 * 1000) });
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), response as unknown as Response);

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "ignored");
    assert.equal(order.status, "expired");
    assert.equal(persistence.claimCalls.length, 0);
    assert.equal(grant.calls.count, 0);
  });

  it("ignores webhook when stored orderCode does not match payload", async () => {
    configurePayosEnv();
    const order = createOrder();
    if (order.metadata?.payos) {
      order.metadata.payos.orderCode = (order.metadata.payos.orderCode ?? 0) + 1;
    }
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), response as unknown as Response);

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "ignored");
    assert.equal(order.status, "pending");
    assert.equal(persistence.claimCalls.length, 0);
    assert.equal(grant.calls.count, 0);
  });

  it("ignores webhook when payment is not successful (PayOS code != 00)", async () => {
    configurePayosEnv();
    const order = createOrder();
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(
      createRequest(JSON.parse(createWebhookPayload({ code: "01", desc: "failed" }))),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "ignored");
    assert.equal(order.status, "pending");
    assert.equal(persistence.claimCalls.length, 0);
    assert.equal(grant.calls.count, 0);
  });

  it("acknowledges unknown PayOS order without granting Plus", async () => {
    configurePayosEnv();
    mockOrderPersistence(null);
    const grant = stubGrantForbidden();

    const response = createResponse();
    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), response as unknown as Response);

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "ignored");
    assert.equal(grant.calls.count, 0);
  });

  it("returns 400 when webhook body is not valid JSON", async () => {
    configurePayosEnv();
    const grant = stubGrantForbidden();
    const response = createResponse();

    await handlePayosWebhook(
      { body: "{not-json", headers: {}, rawBody: Buffer.from("{not-json", "utf-8") } as unknown as Request,
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 401);
    assert.equal(grant.calls.count, 0);
  });

  it("ignores webhook when payload has no usable order identifier", async () => {
    configurePayosEnv();
    const persistence = mockOrderPersistence(null);
    const grant = stubGrantForbidden();
    const response = createResponse();

    // Build a payload whose description has no VB-prefix order id, no
    // valid orderCode (NaN serializes to null → !Number.isFinite), and
    // an empty paymentLinkId — buildPayosOrderLookup should return null
    // and short-circuit before findOne.
    const data = {
      orderCode: null,
      amount: 99000,
      description: "no-prefix-text",
      accountNumber: "123456789",
      reference: "TF_PAYOS_NOID",
      transactionDateTime: "2026-05-22 09:00:00",
      currency: "VND",
      paymentLinkId: "",
      code: "00",
      desc: "Thành công",
    };
    const payload = {
      code: "00",
      desc: "success",
      success: true,
      data,
      signature: createPayosSignatureFromData(
        data as unknown as Record<string, unknown>,
        "payos_checksum_key_test",
      ),
    };

    await handlePayosWebhook(
      createRequest(JSON.parse(JSON.stringify(payload))),
      response as unknown as Response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as Record<string, unknown>).status, "ignored");
    assert.equal(persistence.findOneCalls.length, 0);
    assert.equal(persistence.claimCalls.length, 0);
    assert.equal(grant.calls.count, 0);
  });

  it("ignores webhook when stored order is in a non-pending non-completed status (expired)", async () => {
    configurePayosEnv();
    const order = createOrder({ status: "expired" });
    const persistence = mockOrderPersistence(order);
    const grant = stubGrantForbidden();
    const response = createResponse();

    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), response as unknown as Response);

    assert.equal(response.statusCode, 200);
    const body = response.body as Record<string, unknown>;
    assert.equal(body.status, "ignored");
    assert.equal(body.orderStatus, "expired");
    assert.equal(persistence.claimCalls.length, 0);
    assert.equal(grant.calls.count, 0);
  });

  it("keeps the order retryable when billingService upsert throws before completion", async () => {
    configurePayosEnv();
    const order = createOrder();
    mockOrderPersistence(order);
    const calls = mock.fn();
    (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = async (
      event: Record<string, unknown>,
    ) => {
      calls(event);
      if (calls.mock.callCount() === 1) {
        throw new Error("downstream upsert exploded");
      }
      return {
        subscription: {
          id: "sub_payos_retry_after_failure",
          userId: event.userId,
          planCode: "PLUS",
          status: "active",
          provider: "payos",
          source: "provider",
          providerSubscriptionId: event.providerSubscriptionId,
          entitlements: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        eventStatus: "processed" as const,
        eventId: "evt_payos_retry_after_failure",
      };
    };
    mock.method(receiptEmailService, "sendPaymentReceipt", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));
    const response = createResponse();

    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), response as unknown as Response);

    assert.equal(response.statusCode, 500);
    const body = response.body as Record<string, unknown>;
    assert.equal(body.success, false);
    assert.match(String(body.message), /retried/i);
    assert.equal(order.status, "pending");
    assert.equal(order.completedAt, undefined);
    assert.equal(calls.mock.callCount(), 1);

    const retryResponse = createResponse();
    await handlePayosWebhook(createRequest(JSON.parse(createWebhookPayload())), retryResponse as unknown as Response);

    assert.equal(retryResponse.statusCode, 200);
    assert.equal((retryResponse.body as Record<string, unknown>).status, "processed");
    assert.equal(order.status, "completed");
    assert.ok(order.completedAt);
    assert.equal(calls.mock.callCount(), 2);
  });
});
