import { Schema, model, type Document } from "mongoose";

export type DiscountType = "coupon" | "sale_event";
export type DiscountValueType = "percentage" | "fixed";
export type DiscountAppliesTo = "PLUS" | "physical_order";

export interface DiscountEntity {
  id: string;
  type: DiscountType;
  code: string;
  name: string;
  discountType: DiscountValueType;
  discountValue: number;
  minAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt?: Date | null;
  appliesTo: DiscountAppliesTo[];
  active: boolean;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const discountSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["coupon", "sale_event"],
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    discountType: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    maxUses: {
      type: Number,
      required: false,
      min: 1,
    },
    usedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: false,
    },
    appliesTo: {
      type: [String],
      required: true,
      enum: ["PLUS", "physical_order"],
      default: ["PLUS", "physical_order"],
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdBy: {
      type: String,
      required: false,
      trim: true,
      maxlength: 254,
    },
  },
  {
    timestamps: true,
  },
);

discountSchema.index({ type: 1, active: 1 });
discountSchema.index({ code: 1 }, { unique: true });
discountSchema.index({ startsAt: 1, endsAt: 1 });
discountSchema.index({ type: 1, startsAt: 1, endsAt: 1, active: 1 });

export const DiscountModel = model("Discount", discountSchema);

export type DiscountDocument = Document & {
  type: DiscountType;
  code: string;
  name: string;
  discountType: DiscountValueType;
  discountValue: number;
  minAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt?: Date | null;
  appliesTo: DiscountAppliesTo[];
  active: boolean;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
