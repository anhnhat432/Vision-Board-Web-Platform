import { Schema, model, type Document } from "mongoose";

export interface CouponUsageEntity {
  id: string;
  discountId: string;
  code: string;
  userId: string;
  orderId: string;
  usedAt: Date;
}

const couponUsageSchema = new Schema(
  {
    discountId: {
      type: Schema.Types.ObjectId,
      ref: "Discount",
      required: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
    },
    usedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
  },
);

couponUsageSchema.index({ discountId: 1, userId: 1 }, { unique: true });
couponUsageSchema.index({ discountId: 1, orderId: 1 }, { unique: true, sparse: true });
couponUsageSchema.index({ discountId: 1, usedAt: -1 });

export const CouponUsageModel = model("CouponUsage", couponUsageSchema);

export type CouponUsageDocument = Document & {
  discountId: string;
  code: string;
  userId: string;
  orderId: string;
  usedAt: Date;
};
