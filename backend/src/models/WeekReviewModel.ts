import { Schema, model } from "mongoose";

const weekReviewSchema = new Schema(
  {
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: true,
      unique: true,
      index: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    executionScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    reflection: {
      type: String,
      required: false,
      trim: true,
    },
    adjustments: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const WeekReviewModel = model("WeekReview", weekReviewSchema);
