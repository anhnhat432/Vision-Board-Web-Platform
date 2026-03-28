import { Schema, model } from "mongoose";

const weekReviewSchema = new Schema(
  {
    weekNumber: { type: Number, required: true, min: 1 },
    executionScore: { type: Number, required: true, min: 0, max: 100 },
    reflection: { type: String, required: false, trim: true },
    adjustments: { type: String, required: false, trim: true },
  },
  { _id: false },
);

const weekSchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    focus: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },
    expectedOutput: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },
    review: {
      type: weekReviewSchema,
      required: false,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

weekSchema.index({ planId: 1, weekNumber: 1 }, { unique: true });

export const WeekModel = model("Week", weekSchema);
