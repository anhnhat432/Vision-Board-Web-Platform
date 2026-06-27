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
    endDate: {
      type: Date,
      required: false,
    },
    timezone: {
      type: String,
      required: false,
      trim: true,
    },
    weekStartsOn: {
      type: String,
      required: false,
      trim: true,
    },
    totalWeeks: {
      type: Number,
      required: false,
      min: 1,
    },
    status: {
      type: String,
      required: false,
      trim: true,
    },
    goalType: {
      type: String,
      required: false,
      trim: true,
    },
    templateId: {
      type: String,
      required: false,
      trim: true,
    },
    templateName: {
      type: String,
      required: false,
      trim: true,
    },
    lagMetric: {
      type: Schema.Types.Mixed,
      required: false,
    },
    milestones: {
      type: Schema.Types.Mixed,
      required: false,
    },
    successEvidence: {
      type: String,
      required: false,
      trim: true,
    },
    reviewDay: {
      type: String,
      required: false,
      trim: true,
    },
    week12Outcome: {
      type: String,
      required: false,
      trim: true,
    },
    weeklyActions: {
      type: [String],
      required: false,
      default: undefined,
    },
    successMetric: {
      type: String,
      required: false,
      trim: true,
    },
    dailyReminderTime: {
      type: String,
      required: false,
      trim: true,
    },
    tacticLoadPreference: {
      type: String,
      required: false,
      trim: true,
    },
    preferredDays: {
      type: [Number],
      required: false,
      default: undefined,
    },
    personalConstraint: {
      type: String,
      required: false,
      trim: true,
    },
    reentryCount: {
      type: Number,
      required: false,
      min: 0,
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
  endDate?: Date;
  timezone?: string;
  weekStartsOn?: string;
  totalWeeks?: number;
  status?: string;
  goalType?: string;
  templateId?: string;
  templateName?: string;
  lagMetric?: unknown;
  milestones?: unknown;
  successEvidence?: string;
  reviewDay?: string;
  week12Outcome?: string;
  weeklyActions?: string[];
  successMetric?: string;
  dailyReminderTime?: string;
  tacticLoadPreference?: string;
  preferredDays?: number[];
  personalConstraint?: string;
  reentryCount?: number;
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
