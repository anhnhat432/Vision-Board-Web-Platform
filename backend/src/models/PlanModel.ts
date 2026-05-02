import { Schema, model } from "mongoose";

const planSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    vision: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },
    smartGoalId: {
      type: String,
      required: false,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    clientPlanId: {
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

planSchema.index(
  { userId: 1, clientPlanId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientPlanId: { $type: "string" } },
  },
);
planSchema.index(
  { userId: 1, clientGoalId: 1 },
  {
    partialFilterExpression: { clientGoalId: { $type: "string" } },
  },
);
planSchema.index({ userId: 1, syncUpdatedAt: 1, _id: 1 });

export type PlanDocument = {
  _id: string;
  userId: string;
  vision: string;
  smartGoalId?: string;
  startDate: Date;
  clientPlanId?: string;
  clientGoalId?: string;
  revision?: number;
  deletedAt?: Date;
  lastMutationId?: string;
  syncUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const PlanModel = model("Plan", planSchema);
