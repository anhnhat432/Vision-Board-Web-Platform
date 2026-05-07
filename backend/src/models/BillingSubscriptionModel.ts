import { Schema, model } from "mongoose";

/**
 * Provider-agnostic subscription model.
 *
 * This model stores the backend source of truth for a user's billing
 * subscription. It is designed to work with any future provider (Stripe,
 * Paddle, VNPay, MoMo, PayOS, etc.) without hardcoding provider-specific
 * fields.
 *
 * For MVP demo mode, subscriptions can be created with source "mock" or
 * "manual". Real provider subscriptions will use source "provider".
 *
 * Privacy: this model never stores payment card numbers, bank accounts,
 * or raw webhook payloads.
 */

export type BillingPlanCode = "FREE" | "PLUS";

export type BillingSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid";

export type BillingCycle = "monthly" | "quarterly" | "yearly" | "lifetime" | "twelve_week";

export type BillingSource = "mock" | "manual" | "provider";

const entitlementGrantSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "premium_templates",
        "premium_review_insights",
        "priority_reminders",
        "advanced_analytics",
      ],
    },
    grantedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    expiresAt: {
      type: Date,
      required: false,
    },
    revokedAt: {
      type: Date,
      required: false,
    },
  },
  { _id: false },
);

const billingSubscriptionSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    planCode: {
      type: String,
      required: true,
      enum: ["FREE", "PLUS"],
      default: "FREE",
    },
    status: {
      type: String,
      required: true,
      enum: ["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"],
      default: "active",
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      default: "none",
    },
    source: {
      type: String,
      required: true,
      enum: ["mock", "manual", "provider"],
      default: "mock",
    },
    providerCustomerId: {
      type: String,
      required: false,
      trim: true,
    },
    providerSubscriptionId: {
      type: String,
      required: false,
      trim: true,
    },
    billingCycle: {
      type: String,
      required: false,
      enum: ["monthly", "quarterly", "yearly", "lifetime", "twelve_week"],
    },
    currentPeriodStart: {
      type: Date,
      required: false,
    },
    currentPeriodEnd: {
      type: Date,
      required: false,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      required: false,
      default: false,
    },
    canceledAt: {
      type: Date,
      required: false,
    },
    entitlements: {
      type: [entitlementGrantSchema],
      required: false,
      default: [],
    },
    lastSyncedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// One active subscription per user (latest wins in queries).
billingSubscriptionSchema.index({ userId: 1, createdAt: -1 });

// Provider lookup for webhook reconciliation.
billingSubscriptionSchema.index(
  { provider: 1, providerSubscriptionId: 1 },
  { unique: true, sparse: true },
);

export const BillingSubscriptionModel = model(
  "BillingSubscription",
  billingSubscriptionSchema,
);
