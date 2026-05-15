import { Schema, model, type Document } from "mongoose";

export type RefundRequestStatus = "pending" | "completed" | "rejected";

export interface RefundRequestEntity {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  contactEmail: string;
  reason: string;
  refundAccount: string;
  status: RefundRequestStatus;
  adminNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refundRequestSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    refundAccount: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: {
      type: String,
      required: false,
      trim: true,
      maxlength: 1000,
    },
    resolvedBy: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

refundRequestSchema.index({ orderId: 1, userId: 1, status: 1 });
refundRequestSchema.index({ createdAt: -1 });

export const RefundRequestModel = model("RefundRequest", refundRequestSchema);

export type RefundRequestDocument = Document & {
  orderId: string;
  userId: string;
  userEmail: string;
  contactEmail: string;
  reason: string;
  refundAccount: string;
  status: RefundRequestStatus;
  adminNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
