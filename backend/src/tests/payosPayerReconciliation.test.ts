import assert from "node:assert/strict";
import test from "node:test";

import { reconcilePayosPayerSource } from "../services/payosPayerReconciliation";

test("retrieves a completed historical PayOS link and returns only safe payer metadata", async () => {
  const identifiers: Array<string | number> = [];

  const result = await reconcilePayosPayerSource({
    order: {
      orderId: "VBABCDEFGH",
      amount: 99000,
      provider: "payos",
      status: "completed",
      paymentLinkId: "payos_link_123",
      orderCode: 10_000_000_001,
    },
    client: {
      paymentRequests: {
        async get(identifier: string | number) {
          identifiers.push(identifier);
          return {
            status: "PAID",
            amount: 99000,
            transactions: [
              {
                reference: "TF_PAYOS_1",
                amount: 99000,
                description: "VBABCDEFGH",
                transactionDateTime: "2026-07-10 10:00:00",
                counterAccountBankName: "MB Bank",
                counterAccountName: "NGUYEN VAN A",
                counterAccountNumber: "0123456789",
              },
            ],
          };
        },
      },
    },
    payerSourceConfig: {
      hashKey: "test-hash-key",
      internalAccountNumbers: "0123456789",
    },
  });

  assert.deepEqual(identifiers, ["payos_link_123"]);
  assert.equal(result.payer.classification, "internal");
  assert.equal(result.payer.accountLast4, "6789");
  assert.equal(result.payer.accountNameMasked, "N*** V*** A***");
  assert.equal(result.transactionReference, "TF_PAYOS_1");
  assert.equal(result.transactionDateTime, "2026-07-10 10:00:00");
  assert.equal(JSON.stringify(result).includes("0123456789"), false);
});

test("rejects incomplete, non-PayOS, or ambiguous historical orders without inferring a payer", async () => {
  const client = {
    paymentRequests: {
      async get() {
        throw new Error("The client must not be called for invalid orders.");
      },
    },
  };

  await assert.rejects(
    reconcilePayosPayerSource({
      order: { orderId: "VBABCDEFGH", amount: 99000, provider: "payos", status: "pending", orderCode: 10_000_000_001 },
      client,
      payerSourceConfig: { hashKey: "test-hash-key", internalAccountNumbers: "0123456789" },
    }),
    /completed PayOS order/,
  );

  await assert.rejects(
    reconcilePayosPayerSource({
      order: { orderId: "VBABCDEFGH", amount: 99000, provider: "payos", status: "completed", orderCode: 10_000_000_001 },
      client: {
        paymentRequests: {
          async get() {
            return {
              status: "PAID",
              amount: 99000,
              transactions: [
                { amount: 99000, description: "VBABCDEFGH" },
                { amount: 99000, description: "VBABCDEFGH" },
              ],
            };
          },
        },
      },
      payerSourceConfig: { hashKey: "test-hash-key", internalAccountNumbers: "0123456789" },
    }),
    /unambiguous paid transaction/,
  );
});
