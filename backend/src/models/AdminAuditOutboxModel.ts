import { Schema, model } from "mongoose";

export type AdminAuditOutboxErrorCode =
  | "mongo_unavailable"
  | "audit_validation_failed"
  | "lease_lost"
  | "unknown_safe";

export interface AdminSalesReviewAuditPayload {
  previousStatus: "pending" | "included" | "excluded";
  newStatus: "included" | "excluded";
  exclusionReason?: "internal_team" | "test" | "duplicate" | "other";
  noteProvided: boolean;
  reviewedAt: string;
}

export interface AdminAuditOutboxEntity {
  eventId: string;
  reviewRequestId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
  eventType: "admin_sales_reviewed";
  actorUid: string;
  target: "payment_order_sales_reporting";
  targetId: string;
  payload: AdminSalesReviewAuditPayload;
  occurredAt: Date;
  status: "pending" | "processing" | "completed";
  attempts: number;
  availableAt: Date;
  leaseToken?: string | null;
  lockedUntil?: Date | null;
  lastErrorCode?: AdminAuditOutboxErrorCode | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminAuditOutboxInsert = Omit<AdminAuditOutboxEntity, "createdAt" | "updatedAt">;

const adminSalesReviewAuditPayloadSchema = new Schema<AdminSalesReviewAuditPayload>(
  {
    previousStatus: { type: String, required: true, enum: ["pending", "included", "excluded"] },
    newStatus: { type: String, required: true, enum: ["included", "excluded"] },
    exclusionReason: {
      type: String,
      required: false,
      enum: ["internal_team", "test", "duplicate", "other"],
    },
    noteProvided: { type: Boolean, required: true },
    reviewedAt: { type: String, required: true },
  },
  { _id: false, strict: "throw" },
);

const adminAuditOutboxSchema = new Schema<AdminAuditOutboxEntity>(
  {
    eventId: { type: String, required: true, trim: true },
    reviewRequestId: { type: String, required: true, trim: true },
    commandFingerprint: { type: String, required: true, match: /^[0-9a-f]{64}$/ },
    commandFingerprintVersion: { type: String, required: true, enum: ["v1"] },
    eventType: { type: String, required: true, enum: ["admin_sales_reviewed"] },
    actorUid: { type: String, required: true, trim: true },
    target: { type: String, required: true, enum: ["payment_order_sales_reporting"] },
    targetId: { type: String, required: true, trim: true },
    payload: { type: adminSalesReviewAuditPayloadSchema, required: true },
    occurredAt: { type: Date, required: true },
    status: { type: String, required: true, enum: ["pending", "processing", "completed"] },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    availableAt: { type: Date, required: true },
    leaseToken: { type: String, required: false, default: null },
    lockedUntil: { type: Date, required: false, default: null },
    lastErrorCode: {
      type: String,
      required: false,
      enum: ["mongo_unavailable", "audit_validation_failed", "lease_lost", "unknown_safe"],
      default: null,
    },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true, versionKey: false, strict: "throw" },
);

adminAuditOutboxSchema.index({ eventId: 1 }, { unique: true });
adminAuditOutboxSchema.index({ status: 1, availableAt: 1, lockedUntil: 1 });
adminAuditOutboxSchema.index({ completedAt: 1 }, { expireAfterSeconds: 2_592_000 });

export const AdminAuditOutboxModel = model<AdminAuditOutboxEntity>("AdminAuditOutbox", adminAuditOutboxSchema);
