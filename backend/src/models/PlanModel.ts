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

planSchema.index(
  { userId: 1, clientPlanId: 1 },
  {
    unique: true,
    name: "plan_active_client_plan_unique",
    partialFilterExpression: { clientPlanId: { $type: "string" }, deletedAt: null },
  },
);
planSchema.index(
  { userId: 1, clientGoalId: 1 },
  {
    name: "plan_active_client_goal_lookup",
    partialFilterExpression: { clientGoalId: { $type: "string" }, deletedAt: null },
  },
);
planSchema.index({ userId: 1, deletedAt: 1 });
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
  deletedAt?: Date | null;
  lastMutationId?: string;
  syncUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const PlanModel = model("Plan", planSchema);
