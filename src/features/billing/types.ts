export type CheckoutReturnStatus = "idle" | "pending" | "confirmed" | "failed";
export type PaymentOrderStatus = "pending" | "completed" | "expired" | "failed";
export type RefundRequestStatus = "pending" | "completed" | "rejected";

export interface PaymentHistoryRefundRequest {
  status: RefundRequestStatus;
  createdAt: string | null;
  resolvedAt: string | null;
}

export interface PaymentHistoryOrder {
  orderId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string;
  createdAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  invoiceUrl?: string | null;
  receiptSentAt?: string | null;
  refundRequest?: PaymentHistoryRefundRequest | null;
}

export interface RefundRequestResponse {
  request: PaymentHistoryRefundRequest & {
    id: string;
    orderId: string;
    contactEmail: string;
  };
}

export interface RefundFormState {
  orderId: string;
  contactEmail: string;
  reason: string;
  refundAccount: string;
}

export interface ResendReceiptResponse {
  orderId: string;
  receiptSentAt: string | null;
}

export interface PaymentHistoryResponse {
  orders: PaymentHistoryOrder[];
}
