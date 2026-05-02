import { Schema, model } from "mongoose";

const weekReviewSchema = new Schema(
  {
    userId: {
      type: String,
      required: false,
      index: true,
      trim: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: false,
      index: true,
    },
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
    clientPlanId: {
      type: String,
      required: false,
      trim: true,
    },
    clientWeekId: {
      type: String,
      required: false,
      trim: true,
    },
    clientReviewId: {
      type: String,
      required: false,
      trim: true,
    },
    leadCompletionPercent: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    lagProgressValue: {
      type: String,
      required: false,
      trim: true,
    },
    biggestOutputThisWeek: {
      type: String,
      required: false,
      trim: true,
    },
    mainObstacle: {
      type: String,
      required: false,
      trim: true,
    },
    nextWeekPriority: {
      type: String,
      required: false,
      trim: true,
    },
    workloadDecision: {
      type: String,
      required: false,
      enum: ["keep same", "reduce slightly", "increase slightly", ""],
    },
    reviewCompleted: {
      type: Boolean,
      required: false,
    },
    progressScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    disciplineScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    focusScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    improvementScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    outputQualityScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    completedLeadIndicators: {
      type: Number,
      required: false,
      min: 0,
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

weekReviewSchema.index(
  { userId: 1, clientPlanId: 1, weekNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "string" }, clientPlanId: { $type: "string" } },
  },
);
weekReviewSchema.index(
  { userId: 1, clientReviewId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "string" }, clientReviewId: { $type: "string" } },
  },
);
weekReviewSchema.index({ userId: 1, syncUpdatedAt: 1, _id: 1 });

export const WeekReviewModel = model("WeekReview", weekReviewSchema);
