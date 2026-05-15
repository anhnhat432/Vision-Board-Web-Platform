import { Schema, model, type Document } from "mongoose";

export interface FailedReceiptQueueEntity {
  id: string;
  orderId: string;
  lastTriedAt?: Date;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const failedReceiptQueueSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    lastTriedAt: {
      type: Date,
      required: false,
    },
    retryCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastError: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

failedReceiptQueueSchema.index({ retryCount: 1, lastTriedAt: 1 });

export const FailedReceiptQueueModel = model("FailedReceiptQueue", failedReceiptQueueSchema);

export type FailedReceiptQueueDocument = Document & {
  orderId: string;
  lastTriedAt?: Date;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
};
