import mongoose from "mongoose";

import { connectMongo } from "../config/mongo";
import { OrderModel } from "../models/OrderModel";

export async function runMigration(): Promise<number> {
  const cursor = OrderModel.find({
    $or: [{ schemaVersion: { $exists: false } }, { schemaVersion: { $lt: 2 } }],
  }).cursor();

  let migrated = 0;
  for await (const doc of cursor) {
    const kit = doc.get("kitType");
    const marker = kit ? `[Đơn cũ — kitType: ${kit}]` : "[Đơn cũ]";
    const note = doc.get("note") ?? "";

    doc.set("lines", [
      {
        itemId: "frame:30x40",
        label: "Khung 30×40 cm",
        type: "frame",
        qty: 1,
        unitPriceVnd: 0,
        lineTotalVnd: 0,
      },
    ]);
    doc.set("subtotalVnd", 0);
    doc.set("shippingVnd", 0);
    doc.set("totalVnd", 0);
    doc.set("schemaVersion", 2);
    doc.set("note", note ? `${note}\n\n${marker}` : marker);

    await doc.save();
    migrated += 1;
  }

  return migrated;
}

async function main(): Promise<void> {
  await connectMongo();
  const migrated = await runMigration();
  // eslint-disable-next-line no-console
  console.log(`Migrated ${migrated} orders to v2`);
}

const isMain = require.main === module;
if (isMain) {
  main()
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[migrate-orders-v1-v2] Failed.", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
