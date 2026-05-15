import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  reconcilePendingCassoPaymentOrders,
  type CassoReconciliationTransaction,
} from "../services/billingReconciliation";
import type { PaymentOrderDocument, PaymentOrderStatus } from "../models/PaymentOrderModel";

interface MockPaymentOrder {
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentOrderStatus;
  createdAt: Date;
  completedAt?: Date | null;
  cassoTransactionId?: string | null;
  reconciliationStatus?: string | null;
  reconciliationLastCheckedAt?: Date | null;
  reconciliationLastError?: string | null;
  saveCalls: number;
  save(): Promise<MockPaymentOrder>;
}

function createOrder(overrides: Partial<MockPaymentOrder> = {}): MockPaymentOrder {
  return {
    orderId: "VBRECON001",
    userId: "user_reconciliation",
    amount: 99000,
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    saveCalls: 0,
    async save() {
      this.saveCalls++;
      return this;
    },
    ...overrides,
  };
}

function createPaymentOrderModel(orders: MockPaymentOrder[], duplicate: MockPaymentOrder | null = null) {
  return {
    find(query: unknown) {
      const filter = query as { status?: string; createdAt?: { $gt?: Date } };
      const matched = orders.filter((order) => {
        if (filter.status && order.status !== filter.status) return false;
        if (filter.createdAt?.$gt && order.createdAt <= filter.createdAt.$gt) return false;
        return true;
      });
      return {
        sort() {
          return {
            limit() {
              return {
                async exec() {
                  return matched as unknown as PaymentOrderDocument[];
                },
              };
            },
          };
        },
      };
    },
    async findOne(query: unknown) {
      const filter = query as { cassoTransactionId?: string };
      if (duplicate && filter.cassoTransactionId === duplicate.cassoTransactionId) {
        return duplicate as unknown as PaymentOrderDocument;
      }
      return null;
    },
  };
}

function createTransaction(id: string, orderId: string, amount = 99000): CassoReconciliationTransaction {
  return {
    id,
    tid: id,
    description: `Thanh toan ${orderId}`,
    amount,
    when: "2026-05-15 10:00:00",
  };
}

describe("Casso payment reconciliation", () => {
  it("completes a pending order and sends a receipt when Casso transaction matches", async () => {
    const order = createOrder();
    let grantCalls = 0;
    let receiptCalls = 0;

    const summary = await reconcilePendingCassoPaymentOrders({
      paymentOrderModel: createPaymentOrderModel([order]),
      transactionClient: {
        async listTransactions() {
          return [createTransaction("tx_recon_1", order.orderId)];
        },
      },
      billing: {
        async upsertSubscriptionFromProviderEvent(event) {
          grantCalls++;
          assert.equal(event.providerEventId, "casso_tx_recon_1");
          return {
            subscription: {
              id: "sub_recon_1",
              userId: event.userId,
              planCode: event.planCode,
              status: event.status,
              provider: event.provider,
              source: "provider" as const,
              entitlements: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            eventStatus: "processed" as const,
            eventId: "evt_recon_1",
          };
        },
      },
      async receiptDelivery(orderId) {
        receiptCalls++;
        assert.equal(orderId, order.orderId);
        return { sent: true };
      },
      captureException: () => undefined,
      sleepMs: 0,
    });

    assert.equal(summary.ordersChecked, 1);
    assert.equal(summary.ordersMatched, 1);
    assert.equal(summary.errors, 0);
    assert.equal(order.status, "completed");
    assert.equal(order.cassoTransactionId, "tx_recon_1");
    assert.equal(order.reconciliationStatus, "matched");
    assert.equal(grantCalls, 1);
    assert.equal(receiptCalls, 1);
  });

  it("keeps a pending order unchanged when no Casso transaction matches", async () => {
    const order = createOrder();

    const summary = await reconcilePendingCassoPaymentOrders({
      paymentOrderModel: createPaymentOrderModel([order]),
      transactionClient: {
        async listTransactions() {
          return [{ id: "tx_other", description: "Thanh toan VBOTHER001", amount: 99000 }];
        },
      },
      billing: {
        async upsertSubscriptionFromProviderEvent() {
          throw new Error("should_not_grant");
        },
      },
      receiptDelivery: async () => ({ sent: true }),
      captureException: () => undefined,
      sleepMs: 0,
    });

    assert.equal(summary.ordersChecked, 1);
    assert.equal(summary.ordersMatched, 0);
    assert.equal(summary.errors, 0);
    assert.equal(order.status, "pending");
    assert.equal(order.saveCalls, 0);
  });

  it("does not double-grant when webhook already completed the same Casso transaction", async () => {
    const order = createOrder();
    const completedDuplicate = createOrder({
      orderId: order.orderId,
      status: "completed",
      cassoTransactionId: "tx_recon_dup",
    });
    let grantCalls = 0;

    const summary = await reconcilePendingCassoPaymentOrders({
      paymentOrderModel: createPaymentOrderModel([order], completedDuplicate),
      transactionClient: {
        async listTransactions() {
          return [createTransaction("tx_recon_dup", order.orderId)];
        },
      },
      billing: {
        async upsertSubscriptionFromProviderEvent() {
          grantCalls++;
          throw new Error("should_not_grant");
        },
      },
      receiptDelivery: async () => ({ sent: true }),
      captureException: () => undefined,
      sleepMs: 0,
    });

    assert.equal(summary.ordersChecked, 1);
    assert.equal(summary.ordersMatched, 1);
    assert.equal(summary.errors, 0);
    assert.equal(order.status, "pending");
    assert.equal(order.saveCalls, 0);
    assert.equal(grantCalls, 0);
  });
});
