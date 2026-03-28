import { Schema, model } from "mongoose";

const planSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    vision: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },
    smartGoalId: {
      type: String,
      required: false,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export type PlanDocument = {
  _id: string;
  userId: string;
  vision: string;
  smartGoalId?: string;
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const PlanModel = model("Plan", planSchema);
