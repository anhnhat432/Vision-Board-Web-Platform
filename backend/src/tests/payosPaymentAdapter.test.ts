import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { FailedReceiptQueueModel } from "../models/FailedReceiptQueueModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import { billingService } from "../services/billingServiceInstance";
import { PaymentProviderNotConfiguredError } from "../services/paymentProviderAdapter";
import {
  createPayosPaymentAdapter,
  createPayosOrderCodeFromOrderId,
  createPayosSignatureFromData,
  type PayosClientLike,
  type PayosWebhookData,
  type PayosWebhookPayload,
} from "../services/payosPaymentAdapter";
import { getPaymentProviderAdapter, _resetAdapterCacheForTesting } from "../services/paymentProviderRegistry";

type MockableModel = {
  create: unknown;
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
  PLUS_PRICE_VND: process.env.PLUS_PRICE_VND,
};
const originalPaymentOrderCreate = PaymentOrderModel.create;
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
  process.env.PLUS_PRICE_VND = "99000";
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

afterEach(() => {
  mock.restoreAll();
  restoreEnv();
  _resetAdapterCacheForTesting();
  (PaymentOrderModel as unknown as MockableModel).create = originalPaymentOrderCreate;
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = originalPaymentOrderFindOneAndUpdate;
  (PaymentOrderModel as unknown as MockableModel).updateOne = originalPaymentOrderUpdateOne;
  (FailedReceiptQueueModel as unknown as { deleteOne: unknown }).deleteOne = originalFailedReceiptDeleteOne;
  (UserModel as unknown as { findOne: unknown }).findOne = originalUserFindOne;
  (billingService as unknown as MockableBillingService).upsertSubscriptionFromProviderEvent = originalBillingUpsert;
});

describe("PayOS payment provider registry", () => {
  it("returns the real PayOS adapter instead of a placeholder", () => {
    configurePayosEnv();
    const adapter = getPaymentProviderAdapter();

    assert.equal(adapter.providerId, "payos");
    assert.equal(adapter.isConfigured, true);
    assert.equal(adapter.mapSubscriptionStatus("PAID"), "active");
  });
});

describe("PayOS payment adapter", () => {
  it("fails closed when required env is missing", async () => {
    delete process.env.PAYOS_CLIENT_ID;
    delete process.env.PAYOS_API_KEY;
    delete process.env.PAYOS_CHECKSUM_KEY;
    delete process.env.PLUS_PRICE_VND;
    const adapter = createPayosPaymentAdapter();

    assert.equal(adapter.providerId, "payos");
    assert.equal(adapter.isConfigured, false);
    await assert.rejects(
      () =>
        adapter.createCheckoutSession({
          userId: "user_payos_missing_env",
          planCode: "PLUS",
          billingCycle: "twelve_week",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        }),
      PaymentProviderNotConfiguredError,
    );
  });

  it("creates a PayOS payment link and local pending PaymentOrder without granting entitlement", async () => {
    configurePayosEnv();
    const createdOrders: Array<Record<string, unknown>> = [];
    (PaymentOrderModel as unknown as MockableModel).create = async (payload: Record<string, unknown>) => {
      createdOrders.push(payload);
      return payload;
    };
    const paymentRequests: Array<Record<string, unknown>> = [];
    const client: PayosClientLike = {
      paymentRequests: {
        async create(input) {
          paymentRequests.push(input as unknown as Record<string, unknown>);
          return {
            bin: "970422",
            accountNumber: "123456789",
            accountName: "VISION BOARD",
            amount: input.amount,
            description: input.description,
            orderCode: input.orderCode,
            currency: "VND",
            paymentLinkId: "payos_link_created",
            status: "PENDING",
            expiredAt: input.expiredAt,
            checkoutUrl: "https://pay.payos.vn/web/pay/payos_link_created",
            qrCode: "000201payos-qr",
          };
        },
      },
    };
    const adapter = createPayosPaymentAdapter({
      client,
      orderIdGenerator: () => "VBABCDEFGH",
      now: () => new Date("2026-05-22T02:00:00.000Z"),
    });

    const session = await adapter.createCheckoutSession({
      userId: "user_payos_create",
      planCode: "PLUS",
      billingCycle: "twelve_week",
      successUrl: "https://example.com/billing/checkout/__session_id__?from=payos",
      cancelUrl: "https://example.com/order-status/__session_id__?status=cancel",
      customerEmail: "buyer@example.test",
      receiptName: "Buyer",
    });

    assert.equal(paymentRequests.length, 1);
    assert.equal(createdOrders.length, 1);
    assert.equal(session.sessionId, "VBABCDEFGH");
    assert.equal(session.checkoutUrl, "https://pay.payos.vn/web/pay/payos_link_created");
    assert.equal(paymentRequests[0]?.returnUrl, "https://example.com/billing/checkout/VBABCDEFGH?from=payos");
    assert.equal(paymentRequests[0]?.cancelUrl, "https://example.com/order-status/VBABCDEFGH?status=cancel");

    const createdOrder = createdOrders[0];
    assert.ok(createdOrder);
    assert.equal(createdOrder.userId, "user_payos_create");
    assert.equal(createdOrder.planCode, "PLUS");
    assert.equal(createdOrder.billingCycle, "twelve_week");
    assert.equal(createdOrder.amount, 99000);
    assert.equal(createdOrder.currency, "VND");
    assert.equal(createdOrder.provider, "payos");
    assert.equal(createdOrder.status, "pending");
    assert.equal(createdOrder.orderId, "VBABCDEFGH");
    assert.equal((createdOrder.metadata as { payos: { paymentLinkId: string } }).payos.paymentLinkId, "payos_link_created");

    const snapshot = await billingService.getCurrentEntitlementForUser("user_payos_create");
    assert.equal(snapshot.planCode, "FREE");
    assert.deepEqual(snapshot.activeKeys, []);
  });

  it("verifies PayOS webhook checksum", () => {
    configurePayosEnv();
    const adapter = createPayosPaymentAdapter();
    const validBody = createWebhookPayload();
    const invalidBody = createWebhookPayload({ reference: "TF_PAYOS_INVALID" }, "wrong_checksum_key");

    assert.equal(adapter.verifyWebhookSignature({ rawBody: validBody, headers: {} }).valid, true);
    assert.equal(adapter.verifyWebhookSignature({ rawBody: invalidBody, headers: {} }).valid, false);
  });
});
