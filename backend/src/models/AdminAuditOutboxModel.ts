import { Schema, model } from "mongoose";

import {
  isOperationalClassificationReasonAllowed,
  type OperationalCategory,
  type OperationalClassificationReason,
} from "./OperationalClassification";

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

export interface AdminOperationalClassificationAuditPayload {
  previousCategory: OperationalCategory;
  newCategory: OperationalCategory;
  reason: OperationalClassificationReason;
  note?: string;
  changedAt: string;
}

export type AdminOperationalClassificationAuditTarget =
  | "user_operational_classification"
  | "payment_order_operational_classification"
  | "physical_order_operational_classification";

export interface AdminAuditOutboxCommon {
  eventId: string;
  commandFingerprint: string;
  commandFingerprintVersion: "v1";
  actorUid: string;
  targetId: string;
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

export type AdminAuditOutboxEntity = AdminAuditOutboxCommon & (
  | {
      eventType: "admin_sales_reviewed";
      reviewRequestId: string;
      target: "payment_order_sales_reporting";
      payload: AdminSalesReviewAuditPayload;
    }
  | {
      eventType: "admin_operational_classification_changed";
      requestId: string;
      target: AdminOperationalClassificationAuditTarget;
      payload: AdminOperationalClassificationAuditPayload;
    }
);

type WithoutAuditOutboxTimestamps<Event> = Event extends unknown
  ? Omit<Event, "createdAt" | "updatedAt">
  : never;

export type AdminAuditOutboxInsert = WithoutAuditOutboxTimestamps<AdminAuditOutboxEntity>;

const forbiddenPayloadKeys = new Set([
  "email",
  "displayName",
  "bankAccount",
  "providerPayload",
  "entitlement",
  "ADMIN_AUDIT_FINGERPRINT_SECRET",
]);

const salesPayloadKeys = new Set(["previousStatus", "newStatus", "exclusionReason", "noteProvided", "reviewedAt"]);
const classificationPayloadKeys = new Set(["previousCategory", "newCategory", "reason", "note", "changedAt"]);

function hasOnlyAllowedKeys(payload: Record<string, unknown>, allowedKeys: Set<string>): boolean {
  return Object.keys(payload).every((key) => allowedKeys.has(key) && !forbiddenPayloadKeys.has(key));
}

function isValidSalesPayload(payload: Record<string, unknown>): boolean {
  return hasOnlyAllowedKeys(payload, salesPayloadKeys) &&
    (payload.previousStatus === "pending" || payload.previousStatus === "included" || payload.previousStatus === "excluded") &&
    (payload.newStatus === "included" || payload.newStatus === "excluded") &&
    (payload.exclusionReason === undefined ||
      payload.exclusionReason === "internal_team" ||
      payload.exclusionReason === "test" ||
      payload.exclusionReason === "duplicate" ||
      payload.exclusionReason === "other") &&
    typeof payload.noteProvided === "boolean" &&
    typeof payload.reviewedAt === "string";
}

function isValidClassificationPayload(payload: Record<string, unknown>): boolean {
  if (!hasOnlyAllowedKeys(payload, classificationPayloadKeys)) return false;
  if (payload.previousCategory !== "real" && payload.previousCategory !== "test" && payload.previousCategory !== "internal") return false;
  if (payload.newCategory !== "real" && payload.newCategory !== "test" && payload.newCategory !== "internal") return false;
  if (
    payload.reason !== "confirmed_real" &&
    payload.reason !== "test_account" &&
    payload.reason !== "internal_team" &&
    payload.reason !== "automated_qa" &&
    payload.reason !== "other"
  ) return false;
  if (typeof payload.changedAt !== "string") return false;
  if (payload.note !== undefined && (typeof payload.note !== "string" || payload.note !== payload.note.trim() || payload.note.length > 200)) {
    return false;
  }
  const category = payload.newCategory as OperationalCategory;
  const reason = payload.reason as OperationalClassificationReason;
  return isOperationalClassificationReasonAllowed(category, reason) && (reason !== "other" || Boolean(payload.note));
}

const adminAuditOutboxSchema = new Schema<AdminAuditOutboxEntity>(
  {
    eventId: { type: String, required: true, trim: true },
    reviewRequestId: {
      type: String,
      required(this: AdminAuditOutboxEntity) { return this.eventType === "admin_sales_reviewed"; },
      trim: true,
    },
    requestId: {
      type: String,
      required(this: AdminAuditOutboxEntity) { return this.eventType === "admin_operational_classification_changed"; },
      trim: true,
    },
    commandFingerprint: { type: String, required: true, match: /^[0-9a-f]{64}$/ },
    commandFingerprintVersion: { type: String, required: true, enum: ["v1"] },
    eventType: { type: String, required: true, enum: ["admin_sales_reviewed", "admin_operational_classification_changed"] },
    actorUid: { type: String, required: true, trim: true },
    target: {
      type: String,
      required: true,
      enum: [
        "payment_order_sales_reporting",
        "user_operational_classification",
        "payment_order_operational_classification",
        "physical_order_operational_classification",
      ],
    },
    targetId: { type: String, required: true, trim: true },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator(this: AdminAuditOutboxEntity, payload: unknown) {
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
          return this.eventType === "admin_sales_reviewed"
            ? isValidSalesPayload(payload as Record<string, unknown>)
            : isValidClassificationPayload(payload as Record<string, unknown>);
        },
        message: "Admin audit outbox payload is invalid for its event type.",
      },
    },
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

adminAuditOutboxSchema.pre("validate", function validateEventDiscriminator(next) {
  const event = this as unknown as {
    eventType?: string;
    target?: string;
    reviewRequestId?: string;
    requestId?: string;
  };
  const classificationTargets = new Set<AdminOperationalClassificationAuditTarget>([
    "user_operational_classification",
    "payment_order_operational_classification",
    "physical_order_operational_classification",
  ]);

  if (event.eventType === "admin_sales_reviewed") {
    if (event.target !== "payment_order_sales_reporting") this.invalidate("target", "Sales audit target is invalid.");
    if (event.requestId !== undefined) this.invalidate("requestId", "Sales audit cannot include a classification request id.");
  } else if (event.eventType === "admin_operational_classification_changed") {
    if (!event.target || !classificationTargets.has(event.target as AdminOperationalClassificationAuditTarget)) {
      this.invalidate("target", "Classification audit target is invalid.");
    }
    if (event.reviewRequestId !== undefined) this.invalidate("reviewRequestId", "Classification audit cannot include a sales review request id.");
  }
  next();
});

adminAuditOutboxSchema.index({ eventId: 1 }, { unique: true });
adminAuditOutboxSchema.index({ status: 1, availableAt: 1, lockedUntil: 1 });
adminAuditOutboxSchema.index({ completedAt: 1 }, { expireAfterSeconds: 2_592_000 });

export const AdminAuditOutboxModel = model<AdminAuditOutboxEntity>("AdminAuditOutbox", adminAuditOutboxSchema);
