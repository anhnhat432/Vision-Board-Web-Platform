import { Schema, model } from "mongoose";

/**
 * Provider-agnostic billing event log for webhook idempotency.
 *
 * Each provider webhook delivery creates a BillingEvent. The combination of
 * (provider, providerEventId) is unique — duplicate events are safely ignored.
 *
 * Privacy: raw webhook payloads are NEVER stored. Only a SHA-256 payloadHash
 * is recorded. This prevents sensitive payment data (card numbers, bank info)
 * from being persisted in application storage.
 */

export type BillingEventStatus = "received" | "processed" | "ignored" | "failed";

const billingEventSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    providerEventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["received", "processed", "ignored", "failed"],
      default: "received",
    },
    payloadHash: {
      type: String,
      required: true,
      trim: true,
    },
    processedAt: {
      type: Date,
      required: false,
    },
    error: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Idempotency: one event per provider+providerEventId.
billingEventSchema.index(
  { provider: 1, providerEventId: 1 },
  { unique: true },
);

export const BillingEventModel = model("BillingEvent", billingEventSchema);
