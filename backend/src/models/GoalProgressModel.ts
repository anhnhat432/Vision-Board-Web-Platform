import { Schema, model } from "mongoose";

const goalProgressSchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      unique: true,
      index: true,
    },
    baseline: {
      type: Number,
      required: true,
      default: 0,
    },
    current: {
      type: Number,
      required: true,
      default: 0,
    },
    target: {
      type: Number,
      required: true,
      default: 100,
    },
  },
  {
    timestamps: true,
  },
);

export const GoalProgressModel = model("GoalProgress", goalProgressSchema);
