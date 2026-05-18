import { Schema, model } from "mongoose";

const leadMetricLogSchema = new Schema(
  {
    date: { type: Date, required: true },
    value: { type: Number, required: true, default: 0 },
    completed: { type: Boolean, required: true, default: false },
  },
  {
    _id: true,
    timestamps: false,
  },
);

const leadMetricSchema = new Schema(
  {
    userId: {
      type: String,
      required: false,
      index: true,
      trim: true,
    },
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    weeklyTarget: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    target: {
      type: String,
      required: false,
      trim: true,
    },
    currentValue: {
      type: Number,
      required: false,
      min: 0,
    },
    frequency: {
      type: String,
      required: false,
      trim: true,
    },
    logs: {
      type: [leadMetricLogSchema],
      required: true,
      default: [],
    },
    clientMetricId: {
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
    leadIndicatorId: {
      type: String,
      required: false,
      trim: true,
    },
    unit: {
      type: String,
      required: false,
      trim: true,
    },
    type: {
      type: String,
      required: false,
      trim: true,
    },
    priority: {
      type: Number,
      required: false,
      min: 0,
    },
    schedule: {
      type: [Number],
      required: false,
      default: undefined,
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

leadMetricSchema.index(
  { userId: 1, clientPlanId: 1, clientWeekId: 1, clientMetricId: 1 },
  {
    unique: true,
    name: "lead_metric_active_client_metric_unique",
    partialFilterExpression: {
      userId: { $type: "string" },
      clientPlanId: { $type: "string" },
      clientWeekId: { $type: "string" },
      clientMetricId: { $type: "string" },
      deletedAt: null,
    },
  },
);
leadMetricSchema.index(
  { weekId: 1, clientMetricId: 1 },
  {
    unique: true,
    name: "lead_metric_active_week_metric_unique",
    partialFilterExpression: { clientMetricId: { $type: "string" }, deletedAt: null },
  },
);
leadMetricSchema.index(
  { weekId: 1, clientWeekId: 1 },
  {
    name: "lead_metric_active_client_week_lookup",
    partialFilterExpression: { clientWeekId: { $type: "string" }, deletedAt: null },
  },
);
leadMetricSchema.index({ weekId: 1, deletedAt: 1 });
leadMetricSchema.index({ weekId: 1, syncUpdatedAt: 1, _id: 1 });

export const LeadMetricModel = model("LeadMetric", leadMetricSchema);
