import mongoose from "mongoose";

import { connectMongo } from "../config/mongo";
import { OrderCatalogModel } from "../models/OrderCatalogModel";

type SeedItem = {
  itemId: string;
  type: "frame" | "theme" | "sticker";
  label: string;
  description?: string;
  priceVnd: number;
  sortOrder: number;
  maxQty?: number;
};

const SEED_ITEMS: SeedItem[] = [
  { itemId: "frame:20x30", type: "frame", label: "Khung 20×30 cm", description: "Để bàn, nhỏ gọn", priceVnd: 79000, sortOrder: 1 },
  { itemId: "frame:30x40", type: "frame", label: "Khung 30×40 cm", description: "Phổ biến nhất", priceVnd: 119000, sortOrder: 2 },
  { itemId: "frame:40x60", type: "frame", label: "Khung 40×60 cm", description: "Treo tường ấn tượng", priceVnd: 189000, sortOrder: 3 },

  { itemId: "theme:text-1", type: "theme", label: "TEXT 1", priceVnd: 18000, sortOrder: 10 },
  { itemId: "theme:text-2", type: "theme", label: "TEXT 2", priceVnd: 18000, sortOrder: 11 },
  { itemId: "theme:text-3", type: "theme", label: "TEXT 3", priceVnd: 18000, sortOrder: 12 },
  { itemId: "theme:text-4", type: "theme", label: "TEXT 4", priceVnd: 18000, sortOrder: 13 },
  { itemId: "theme:text-5", type: "theme", label: "TEXT 5", priceVnd: 18000, sortOrder: 14 },
  { itemId: "theme:text-6", type: "theme", label: "TEXT 6", priceVnd: 18000, sortOrder: 15 },
  { itemId: "theme:books", type: "theme", label: "BOOKS", priceVnd: 18000, sortOrder: 20 },
  { itemId: "theme:body", type: "theme", label: "BODY", priceVnd: 18000, sortOrder: 21 },
  { itemId: "theme:money", type: "theme", label: "MONEY", priceVnd: 18000, sortOrder: 22 },
  { itemId: "theme:study", type: "theme", label: "STUDY", priceVnd: 18000, sortOrder: 23 },
  { itemId: "theme:followers", type: "theme", label: "FOLLOWERS", priceVnd: 18000, sortOrder: 24 },
  { itemId: "theme:cloth", type: "theme", label: "CLOTH", priceVnd: 18000, sortOrder: 25 },
  { itemId: "theme:friends", type: "theme", label: "FRIENDS", priceVnd: 18000, sortOrder: 26 },
  { itemId: "theme:desk-corner", type: "theme", label: "DESK CORNER", priceVnd: 18000, sortOrder: 27 },
  { itemId: "theme:coffee", type: "theme", label: "COFFEE", priceVnd: 18000, sortOrder: 28 },
  { itemId: "theme:cars", type: "theme", label: "CARS", priceVnd: 18000, sortOrder: 29 },
  { itemId: "theme:lose-weight", type: "theme", label: "LOSE WEIGHT", priceVnd: 18000, sortOrder: 30 },
  { itemId: "theme:travel", type: "theme", label: "TRAVEL", priceVnd: 18000, sortOrder: 31 },

  { itemId: "sticker:hynbee-round-v1", type: "sticker", label: "Sticker tròn HynBee", description: "Phụ kiện trang trí postcard", priceVnd: 15000, sortOrder: 50, maxQty: 10 },
];

export async function runSeed(): Promise<number> {
  for (const item of SEED_ITEMS) {
    await OrderCatalogModel.updateOne(
      { itemId: item.itemId },
      { $setOnInsert: item },
      { upsert: true },
    );
  }
  return SEED_ITEMS.length;
}

async function main(): Promise<void> {
  await connectMongo();
  const count = await runSeed();
  console.info(`[seed-order-catalog] Seeded ${count} catalog items`);
}

const isMain = require.main === module;
if (isMain) {
  main()
    .catch((error) => {
      console.error("[seed-order-catalog] Failed to seed catalog.", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
