import { Schema, model } from "mongoose";

const onboardingTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false },
);

const goalSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      required: true,
      default: "active",
    },
    focusArea: {
      type: String,
      required: false,
      trim: true,
    },
    feasibilityResult: {
      type: Schema.Types.Mixed,
      required: false,
    },
    readinessScore: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    tasks: {
      type: [onboardingTaskSchema],
      required: false,
      default: undefined,
    },
    planId: {
      type: String,
      required: false,
      trim: true,
    },
    clientGoalId: {
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
      default: null,
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

goalSchema.index(
  { userId: 1, clientGoalId: 1 },
  {
    unique: true,
    name: "goal_active_client_goal_unique",
    partialFilterExpression: { clientGoalId: { $type: "string" }, deletedAt: null },
  },
);
goalSchema.index({ userId: 1, deletedAt: 1 });
goalSchema.index({ userId: 1, syncUpdatedAt: 1, _id: 1 });

export type GoalStatus = "active" | "completed" | "archived";

export const GoalModel = model("Goal", goalSchema);
