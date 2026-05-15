import { Schema, model } from "mongoose";

export interface AuditLogEntity {
  actorUid: string;
  actorEmail?: string | null;
  action: string;
  target: string;
  targetId?: string | null;
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

export type AuditLogDocument = AuditLogEntity & { _id: string };

export const AuditLogModel = model<AuditLogEntity>("AuditLog", auditLogSchema);
