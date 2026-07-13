import { Schema, model } from "mongoose";

export interface AuditLogEntity {
  actorUid: string;
  actorEmail?: string | null;
  action: string;
  target: string;
  targetId?: string | null;
  eventId?: string | null;
  commandFingerprint?: string | null;
  commandFingerprintVersion?: "v1" | null;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  timestamp: Date;
  success: boolean;
}

const auditLogSchema = new Schema<AuditLogEntity>(
  {
    actorUid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    eventId: {
      type: String,
      required: false,
      trim: true,
    },
    commandFingerprint: {
      type: String,
      required: false,
      trim: true,
    },
    commandFingerprintVersion: {
      type: String,
      required: false,
      enum: ["v1"],
    },
    payload: {
      type: Schema.Types.Mixed,
      required: false,
      default: null,
    },
    ip: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

auditLogSchema.index({ actorUid: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ eventId: 1 }, { unique: true, sparse: true });

export type AuditLogDocument = AuditLogEntity & { _id: string };

export const AuditLogModel = model<AuditLogEntity>("AuditLog", auditLogSchema);
