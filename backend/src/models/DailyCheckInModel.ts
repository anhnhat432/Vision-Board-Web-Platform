import { Schema, model } from "mongoose";

const dailyCheckInSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: true,
      index: true,
    },
    clientGoalId: {
      type: String,
      required: false,
      trim: true,
    },
    clientPlanId: {
      type: String,
      required: true,
      trim: true,
    },
    clientWeekId: {
      type: String,
      required: false,
      trim: true,
    },
    clientCheckInId: {
      type: String,
      required: false,
      trim: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    localDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    didWorkToday: {
      type: Boolean,
      required: true,
      default: false,
    },
    whichLeadIndicatorWorkedOn: {
      type: String,
      required: false,
      trim: true,
    },
    amountDone: {
      type: String,
      required: false,
      trim: true,
    },
    outputCreated: {
      type: String,
      required: false,
      trim: true,
    },
    obstacleOrIssue: {
      type: String,
      required: false,
      trim: true,
    },
    dailySelfRating: {
      type: Number,
      required: false,
      min: 0,
      max: 5,
    },
    optionalNote: {
      type: String,
      required: false,
      trim: true,
    },
    mood: {
      type: String,
      required: false,
      enum: ["low", "steady", "high"],
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

dailyCheckInSchema.index({ userId: 1, clientPlanId: 1, localDate: 1 }, { unique: true });
dailyCheckInSchema.index(
  { userId: 1, clientCheckInId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientCheckInId: { $type: "string" } },
  },
);
dailyCheckInSchema.index({ userId: 1, syncUpdatedAt: 1, _id: 1 });

export const DailyCheckInModel = model("DailyCheckIn", dailyCheckInSchema);
