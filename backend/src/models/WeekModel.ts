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
    clientWeekId: {
      type: String,
      required: false,
      trim: true,
    },
    clientPlanId: {
      type: String,
      required: false,
      trim: true,
    },
    revision: {
      type: Number,
      required: false,
      default: 1,
      min: 0,
    },
    deletedAt: {
      type: Date,
      required: false,
    },
    lastMutationId: {
      type: String,
      required: false,
      trim: true,
    },
    syncUpdatedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

weekSchema.index({ planId: 1, weekNumber: 1 }, { unique: true });
weekSchema.index(
  { planId: 1, clientWeekId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientWeekId: { $type: "string" } },
  },
);
weekSchema.index(
  { planId: 1, clientPlanId: 1 },
  {
    partialFilterExpression: { clientPlanId: { $type: "string" } },
  },
);
weekSchema.index({ planId: 1, syncUpdatedAt: 1, _id: 1 });

export const WeekModel = model("Week", weekSchema);
