import {
  classifyPayosPayerSource,
  type PaymentPayerSourceConfig,
  type PaymentPayerSourceSummary,
} from "./paymentPayerSource";

export interface PayosPayerReconciliationOrder {
  orderId: string;
  amount: number;
  provider: string;
  status: string;
  paymentLinkId?: string | null;
  orderCode?: number | null;
}

interface PayosHistoricalTransaction {
  reference?: string | null;
  amount: number;
  description?: string | null;
  transactionDateTime?: string | null;
  counterAccountBankName?: string | null;
  counterAccountName?: string | null;
  counterAccountNumber?: string | null;
}

interface PayosHistoricalPaymentLink {
  status: string;
  amount: number;
  transactions: PayosHistoricalTransaction[];
}

function transactionDescriptionContainsOrderId(description: string | null | undefined, orderId: string): boolean {
  const normalizedOrderId = orderId.trim().toUpperCase();
  return String(description ?? "")
    .trim()
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .includes(normalizedOrderId);
}

export interface PayosPaymentLinkClient {
  paymentRequests: {
    get(identifier: string | number): Promise<PayosHistoricalPaymentLink>;
  };
}

export interface ReconcilePayosPayerSourceInput {
  order: PayosPayerReconciliationOrder;
  client: PayosPaymentLinkClient;
  payerSourceConfig: PaymentPayerSourceConfig;
}

export interface PayosPayerReconciliationResult {
  payer: PaymentPayerSourceSummary;
  transactionReference?: string;
  transactionDateTime?: string;
}

function selectHistoricalTransaction(
  paymentLink: PayosHistoricalPaymentLink,
  order: PayosPayerReconciliationOrder,
): PayosHistoricalTransaction {
  if (paymentLink.status.trim().toUpperCase() !== "PAID") {
    throw new Error("PayOS payment link is not paid.");
  }

  const matchingTransactions = paymentLink.transactions.filter(
    (transaction) =>
      transaction.amount === order.amount && transactionDescriptionContainsOrderId(transaction.description, order.orderId),
  );
  if (matchingTransactions.length !== 1) {
    throw new Error("PayOS payment link does not have one unambiguous paid transaction.");
  }

  return matchingTransactions[0];
}

export async function reconcilePayosPayerSource(
  input: ReconcilePayosPayerSourceInput,
): Promise<PayosPayerReconciliationResult> {
  const { order } = input;
  if (order.provider !== "payos" || order.status !== "completed") {
    throw new Error("Payer source can only be reconciled for a completed PayOS order.");
  }

  const paymentLinkId = order.paymentLinkId?.trim();
  const orderCode = typeof order.orderCode === "number" && Number.isFinite(order.orderCode) ? order.orderCode : undefined;
  const identifier = paymentLinkId || orderCode;
  if (identifier === undefined) {
    throw new Error("The PayOS order has no payment link identifier.");
  }

  const paymentLink = await input.client.paymentRequests.get(identifier);
  const transaction = selectHistoricalTransaction(paymentLink, order);

  return {
    payer: classifyPayosPayerSource(
      {
        accountNumber: transaction.counterAccountNumber,
        accountName: transaction.counterAccountName,
        bankName: transaction.counterAccountBankName,
      },
      input.payerSourceConfig,
    ),
    transactionReference: transaction.reference?.trim() || undefined,
    transactionDateTime: transaction.transactionDateTime?.trim() || undefined,
  };
}
