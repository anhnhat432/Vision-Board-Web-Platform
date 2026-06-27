import mongoose, { type Model } from "mongoose";

import { connectMongo } from "../config/mongo";
import { SyncMutationLogModel } from "../models/SyncMutationLogModel";

// Index cũ `userId_1_idempotencyKey_1` được tạo dạng non-sparse/sparse, coi nhiều
// bản ghi idempotencyKey=null là trùng nhau và ném E11000 ở mutation thứ 2 của
// cùng user. Drop index cũ rồi syncIndexes để tạo lại partial unique index mới.
const LEGACY_INDEX_NAMES = ["userId_1_idempotencyKey_1"];

async function dropIndexIfExists(model: Model<unknown>, indexName: string): Promise<void> {
  const indexes = await model.collection.indexes();
  if (!indexes.some((index) => index.name === indexName)) return;
  await model.collection.dropIndex(indexName);
  console.info("[sync-mutation-indexes] Dropped legacy index.", {
    collection: model.collection.name,
    indexName,
  });
}

async function main(): Promise<void> {
  await connectMongo();

  const model = SyncMutationLogModel as unknown as Model<unknown>;
  for (const name of LEGACY_INDEX_NAMES) {
    await dropIndexIfExists(model, name);
  }
  await model.syncIndexes();
  console.info("[sync-mutation-indexes] Synced model indexes.", { collection: model.collection.name });
}

main()
  .catch((error) => {
    console.error("[sync-mutation-indexes] Migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
