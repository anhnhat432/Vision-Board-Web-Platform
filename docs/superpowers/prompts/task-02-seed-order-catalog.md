# Task 2 — Seed script `seedOrderCatalog.ts`

> Copy toàn bộ phần dưới `---` để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**. Stack: Express + Mongoose 8 + MongoDB cho backend.

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Plan đầy đủ: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
- Tiền đề: Task 1 đã xong (`OrderCatalogModel` đã có).

Hãy thực hiện **Task 2: Seed script `seedOrderCatalog.ts`**.

## Mục tiêu

Viết script idempotent chèn 22 catalog items (3 frame + 18 theme + 1 sticker) vào MongoDB. Chạy nhiều lần không tạo duplicate.

**File cần tạo:**
- `backend/src/scripts/seedOrderCatalog.ts`

## Code

```ts
// backend/src/scripts/seedOrderCatalog.ts
import mongoose from "mongoose";
import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { connectDb } from "../config/db"; // điều chỉnh import path nếu repo dùng tên khác — hãy tìm hàm connect Mongoose trong backend/src/config/

const SEED_ITEMS = [
  // Frames
  { itemId: "frame:20x30", type: "frame", label: "Khung 20×30 cm", description: "Để bàn, nhỏ gọn", priceVnd: 79000, sortOrder: 1 },
  { itemId: "frame:30x40", type: "frame", label: "Khung 30×40 cm", description: "Phổ biến nhất", priceVnd: 119000, sortOrder: 2 },
  { itemId: "frame:40x60", type: "frame", label: "Khung 40×60 cm", description: "Treo tường ấn tượng", priceVnd: 189000, sortOrder: 3 },

  // Themes (18 mục)
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

  // Stickers
  { itemId: "sticker:hynbee-round-v1", type: "sticker", label: "Sticker tròn HynBee", description: "Phụ kiện trang trí postcard", priceVnd: 15000, sortOrder: 50, maxQty: 10 },
];

export async function runSeed() {
  for (const item of SEED_ITEMS) {
    await OrderCatalogModel.updateOne(
      { itemId: item.itemId },
      { $setOnInsert: item },
      { upsert: true },
    );
  }
}

if (require.main === module) {
  (async () => {
    await connectDb();
    await runSeed();
    // eslint-disable-next-line no-console
    console.log(`Seeded ${SEED_ITEMS.length} catalog items`);
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

## Steps

1. Tìm hàm connect Mongoose trong `backend/src/config/` (có thể tên là `connectDb`, `connectMongo`, `connect`, v.v.). Điều chỉnh import cho đúng.
2. Tạo file `backend/src/scripts/seedOrderCatalog.ts` với nội dung trên.
3. Smoke test idempotent (chạy 2 lần, lần 2 không lỗi):

```bash
npm --prefix backend exec -- tsx src/scripts/seedOrderCatalog.ts
npm --prefix backend exec -- tsx src/scripts/seedOrderCatalog.ts
```
Expected: log `Seeded 22 catalog items` 2 lần, không có lỗi duplicate.

4. Commit:

```bash
git add backend/src/scripts/seedOrderCatalog.ts
git commit -m "feat(backend): seed 22 catalog items (3 frame + 18 theme + 1 sticker)"
```

## Quy tắc

- Nếu `connectDb` không tồn tại, đọc các script khác trong `backend/src/scripts/` xem chúng connect kiểu gì rồi follow pattern.
- Nếu môi trường dev chưa có MongoDB local, skip step 3 và báo lại tôi.
- Báo cáo cuối: hash commit + output 2 lần chạy script (hoặc lý do skip).

Bắt đầu làm.
