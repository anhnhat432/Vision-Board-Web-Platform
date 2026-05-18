import mongoose, { type Model } from "mongoose";

import { connectMongo } from "../config/mongo";
import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { GoalModel } from "../models/GoalModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { PlanModel } from "../models/PlanModel";
import { TaskModel } from "../models/TaskModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";

const LEGACY_INDEXES: Array<{ model: Model<unknown>; names: string[] }> = [
  { model: GoalModel as unknown as Model<unknown>, names: ["userId_1_clientGoalId_1"] },
  { model: PlanModel as unknown as Model<unknown>, names: ["userId_1_clientPlanId_1", "userId_1_clientGoalId_1"] },
  { model: WeekModel as unknown as Model<unknown>, names: ["planId_1_weekNumber_1", "planId_1_clientWeekId_1", "planId_1_clientPlanId_1"] },
  { model: TaskModel as unknown as Model<unknown>, names: ["weekId_1_clientTaskId_1", "weekId_1_clientWeekId_1"] },
  {
    model: LeadMetricModel as unknown as Model<unknown>,
    names: [
      "userId_1_clientPlanId_1_clientWeekId_1_clientMetricId_1",
      "weekId_1_clientMetricId_1",
      "weekId_1_clientWeekId_1",
    ],
  },
  { model: DailyCheckInModel as unknown as Model<unknown>, names: ["userId_1_clientPlanId_1_localDate_1", "userId_1_clientCheckInId_1"] },
  { model: WeekReviewModel as unknown as Model<unknown>, names: ["weekId_1", "userId_1_clientPlanId_1_weekNumber_1", "userId_1_clientReviewId_1"] },
];

async function dropIndexIfExists(model: Model<unknown>, indexName: string): Promise<void> {
  const indexes = await model.collection.indexes();
  if (!indexes.some((index) => index.name === indexName)) return;
  await model.collection.dropIndex(indexName);
  console.info("[soft-delete-indexes] Dropped legacy index.", { collection: model.collection.name, indexName });
}

async function main(): Promise<void> {
  await connectMongo();

  for (const { model, names } of LEGACY_INDEXES) {
    for (const name of names) {
      await dropIndexIfExists(model, name);
    }
    await model.syncIndexes();
    console.info("[soft-delete-indexes] Synced model indexes.", { collection: model.collection.name });
  }
}

main()
  .catch((error) => {
    console.error("[soft-delete-indexes] Migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
