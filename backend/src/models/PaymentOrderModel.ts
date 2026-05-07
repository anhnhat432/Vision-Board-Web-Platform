import { Schema, model, type Document } from "mongoose";

/**
 * PaymentOrder — tracks a pending bank transfer checkout.
 *
 * Flow:
 * 1. User initiates checkout → order created with status "pending"
 * 2. User transfers money (scans VietQR)
 * 3. Casso webhook detects the transfer
 * 4. Backend matches transfer description → marks order "completed"
 * 5. BillingSubscription is upserted → entitlements granted
 *
 * The orderId doubles as the bank transfer description.
 * Format: "VB" + 8 uppercase alphanumeric chars (e.g. "VB3KF8M2NP").
 */

export type PaymentOrderStatus = "pending" | "completed" | "expired" | "failed";

export interface PaymentOrderEntity {
  id: string;
  orderId: string;
  userId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string;
  bankAccount: string;
  bankName: string;
  accountName: string;
  description: string;
  qrDataUrl: string;
  completedAt?: Date;
  cassoTransactionId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentOrderSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    planCode: {
      type: String,
      required: true,
      enum: ["PLUS"],
      default: "PLUS",
    },
    billingCycle: {
      type: String,
      required: true,
      enum: ["twelve_week"],
      default: "twelve_week",
    },
    amount: {
      type: Number,
      required: true,
      min: 1000,
    },
    currency: {
      type: String,
      required: true,
      default: "VND",
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "expired", "failed"],
      default: "pending",
    },
    provider: {
      type: String,
      required: true,
      default: "casso",
    },
    bankAccount: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    qrDataUrl: {
      type: String,
      required: true,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    cassoTransactionId: {
      type: String,
      required: false,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Quick lookup for webhook matching
paymentOrderSchema.index({ orderId: 1, status: 1 });
// User's order history
paymentOrderSchema.index({ userId: 1, createdAt: -1 });
// Idempotency: one Casso transaction only completes one order
paymentOrderSchema.index({ cassoTransactionId: 1 }, { sparse: true });

export const PaymentOrderModel = model("PaymentOrder", paymentOrderSchema);

export type PaymentOrderDocument = Document & {
  orderId: string;
  userId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string;
  bankAccount: string;
  bankName: string;
  accountName: string;
  description: string;
  qrDataUrl: string;
  completedAt?: Date;
  cassoTransactionId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
