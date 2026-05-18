import mongoose from "mongoose";

import { connectMongo } from "../config/mongo";
import { cleanupExpiredTombstones } from "../jobs/cleanupTombstones";

async function main(): Promise<void> {
  await connectMongo();
  const counts = await cleanupExpiredTombstones();
  console.info("[tombstone-cleanup] Manual cleanup completed.", counts);
}

main()
  .catch((error) => {
    console.error("[tombstone-cleanup] Manual cleanup failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
