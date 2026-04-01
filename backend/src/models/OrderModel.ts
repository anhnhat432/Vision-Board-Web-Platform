import { Schema, model } from "mongoose";

const shippingAddressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, required: false, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const goalSnapshotSchema = new Schema(
  {
    goalId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    focusArea: { type: String, required: false, trim: true },
  },
  { _id: false },
);

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "printing", "shipping", "delivered", "cancelled"],
      required: true,
      default: "pending",
    },
    kitType: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    note: {
      type: String,
      required: false,
      trim: true,
    },
    goalSnapshot: {
      type: goalSnapshotSchema,
      required: false,
      default: undefined,
    },
    statusHistory: {
      type: [statusHistoryEntrySchema],
      required: false,
      default: [],
    },
    adminNote: {
      type: String,
      required: false,
      trim: true,
    },
    cancelledAt: {
      type: Date,
      required: false,
    },
    deliveredAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "printing"
  | "shipping"
  | "delivered"
  | "cancelled";

export const OrderModel = model("Order", orderSchema);
