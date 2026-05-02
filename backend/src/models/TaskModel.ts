import { Schema, model } from "mongoose";

const taskSchema = new Schema(
  {
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["todo", "doing", "done"],
      required: true,
      default: "todo",
    },
    scheduledDate: {
      type: Date,
      required: false,
    },
    clientTaskId: {
      type: String,
      required: false,
      trim: true,
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
    weekNumber: {
      type: Number,
      required: false,
      min: 1,
      max: 12,
    },
    leadIndicatorName: {
      type: String,
      required: false,
      trim: true,
    },
    isCore: {
      type: Boolean,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    tacticId: {
      type: String,
      required: false,
      trim: true,
    },
    rescheduledFrom: {
      type: Date,
      required: false,
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

taskSchema.index(
  { weekId: 1, clientTaskId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientTaskId: { $type: "string" } },
  },
);
taskSchema.index(
  { weekId: 1, clientWeekId: 1 },
  {
    partialFilterExpression: { clientWeekId: { $type: "string" } },
  },
);
taskSchema.index({ weekId: 1, syncUpdatedAt: 1, _id: 1 });

export const TaskModel = model("Task", taskSchema);
