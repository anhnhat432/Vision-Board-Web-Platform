import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoUri = process.env.MONGODB_URI?.trim();
const collectionName = "paymentorders";
const indexName = "cassoTransactionId_1";

if (!mongoUri) {
  console.error("Missing required environment variable: MONGODB_URI");
  process.exit(1);
}

async function dropDuplicateCassoTransactions(collection) {
  const duplicateGroups = await collection
    .aggregate([
      {
        $match: {
          cassoTransactionId: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $addFields: {
          keepPriority: {
            $cond: [{ $eq: ["$status", "completed"] }, 0, 1],
          },
        },
      },
      {
        $sort: {
          keepPriority: 1,
          completedAt: 1,
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $group: {
          _id: "$cassoTransactionId",
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  let removedCount = 0;
  for (const group of duplicateGroups) {
    const [, ...duplicateIds] = group.ids;
    if (duplicateIds.length === 0) continue;

    const result = await collection.deleteMany({ _id: { $in: duplicateIds } });
    removedCount += result.deletedCount ?? 0;
    console.info("Removed duplicate Casso transaction orders", {
      cassoTransactionId: group._id,
      removed: result.deletedCount ?? 0,
    });
  }

  return removedCount;
}

async function ensureUniqueIndex(collection) {
  const indexes = await collection.indexes();
  const existingIndex = indexes.find((index) => index.name === indexName);

  if (existingIndex && !existingIndex.unique) {
    console.info("Dropping non-unique cassoTransactionId index", { indexName });
    await collection.dropIndex(indexName);
  }

  await collection.createIndex(
    { cassoTransactionId: 1 },
    {
      name: indexName,
      unique: true,
      sparse: true,
    },
  );
}

async function main() {
  await mongoose.connect(mongoUri);
  const collection = mongoose.connection.collection(collectionName);

  const removedCount = await dropDuplicateCassoTransactions(collection);
  await ensureUniqueIndex(collection);

  console.info("Casso transaction unique index migration complete", {
    collection: collectionName,
    indexName,
    removedCount,
  });
}

main()
  .catch((error) => {
    console.error("Casso transaction unique index migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
