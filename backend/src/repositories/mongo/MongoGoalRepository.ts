import type { Types } from "mongoose";

import { GoalModel, type GoalStatus } from "../../models/GoalModel";

export interface OnboardingTask {
  title: string;
  completed: boolean;
}

export interface GoalEntity {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string;
  deadline: Date;
  status: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalData {
  userId: string;
  title: string;
  category: string;
  description: string;
  deadline: Date;
  status?: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
}

export interface UpdateGoalData {
  title?: string;
  category?: string;
  description?: string;
  deadline?: Date;
  status?: GoalStatus;
  focusArea?: string;
  feasibilityResult?: unknown;
  readinessScore?: number;
  tasks?: OnboardingTask[];
  planId?: string;
}

function mapGoal(doc: {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  category: string;
  description: string;
  deadline: Date;
  status: GoalStatus;
  focusArea?: string | null;
  feasibilityResult?: unknown;
  readinessScore?: number | null;
  tasks?: OnboardingTask[] | null;
  planId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): GoalEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title,
    category: doc.category,
    description: doc.description,
    deadline: doc.deadline,
    status: doc.status,
    focusArea: doc.focusArea ?? undefined,
    feasibilityResult: doc.feasibilityResult ?? undefined,
    readinessScore: doc.readinessScore ?? undefined,
    tasks: doc.tasks ?? undefined,
    planId: doc.planId ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoGoalRepository {
  async createGoal(data: CreateGoalData): Promise<GoalEntity> {
    const doc = await GoalModel.create({
      userId: data.userId,
      title: data.title,
      category: data.category,
      description: data.description,
      deadline: data.deadline,
      status: data.status ?? "active",
      focusArea: data.focusArea,
      feasibilityResult: data.feasibilityResult,
      readinessScore: data.readinessScore,
      tasks: data.tasks,
      planId: data.planId,
    });

    return mapGoal(doc.toObject());
  }

  async getGoalById(id: string): Promise<GoalEntity | null> {
    const doc = await GoalModel.findById(id).lean();
    return doc ? mapGoal(doc) : null;
  }

  async getGoalsByUserId(userId: string): Promise<GoalEntity[]> {
    const docs = await GoalModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapGoal(doc));
  }

  async updateGoal(id: string, updates: UpdateGoalData): Promise<GoalEntity | null> {
    const doc = await GoalModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapGoal(doc) : null;
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await GoalModel.findByIdAndDelete(id).lean();
    return result !== null;
  }
}
