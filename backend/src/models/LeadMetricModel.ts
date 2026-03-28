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
    logs: {
      type: [leadMetricLogSchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const LeadMetricModel = model("LeadMetric", leadMetricSchema);
