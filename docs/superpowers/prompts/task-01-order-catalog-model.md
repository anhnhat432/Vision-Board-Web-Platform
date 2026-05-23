# Task 1 — `OrderCatalogModel`

> Copy toàn bộ block dưới đây để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**. Stack:
- Frontend: React 18, Vite, Tailwind, shadcn/ui, Vitest, React Testing Library
- Backend: Express, Mongoose 8, MongoDB, Vitest, supertest
- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Vietnamese-first communication, English chỉ dùng cho code/commit/identifiers

Plan đầy đủ ở: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
Spec đầy đủ ở: `docs/superpowers/specs/2026-05-23-tach-vision-board-khoi-kit-order-design.md`

Hãy đọc 2 file trên để hiểu bối cảnh, sau đó thực hiện **Task 1: `OrderCatalogModel`** theo đúng TDD trong plan.

## Tóm tắt Task 1
Tạo Mongoose model `OrderCatalogModel` và viết test cho nó.

**Files cần tạo:**
- `backend/src/models/OrderCatalogModel.ts`
- `backend/src/tests/orderCatalogModel.test.ts`

## TDD steps (làm đúng thứ tự)

### 1. Viết test trước (failing)

```ts
// backend/src/tests/orderCatalogModel.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { OrderCatalogModel } from "../models/OrderCatalogModel";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("OrderCatalogModel", () => {
  it("rejects priceVnd < 0", async () => {
    const item = new OrderCatalogModel({
      itemId: "frame:20x30",
      type: "frame",
      label: "20×30",
      priceVnd: -1,
    });
    await expect(item.validate()).rejects.toThrow();
  });

  it("requires itemId unique", async () => {
    await OrderCatalogModel.create({
      itemId: "frame:20x30",
      type: "frame",
      label: "20×30",
      priceVnd: 79000,
    });
    await expect(
      OrderCatalogModel.create({
        itemId: "frame:20x30",
        type: "frame",
        label: "Dup",
        priceVnd: 1000,
      }),
    ).rejects.toThrow();
  });

  it("enums type to frame|theme|sticker", async () => {
    const item = new OrderCatalogModel({
      itemId: "bad:x",
      type: "bogus" as never,
      label: "X",
      priceVnd: 1000,
    });
    await expect(item.validate()).rejects.toThrow();
  });
});
```

### 2. Chạy test để xác nhận FAIL (module chưa tồn tại)

```bash
npm --prefix backend test -- orderCatalogModel.test
```
Expected: FAIL với lỗi `Cannot find module '../models/OrderCatalogModel'`.

### 3. Implement model

```ts
// backend/src/models/OrderCatalogModel.ts
import { Schema, model } from "mongoose";

const orderCatalogSchema = new Schema(
  {
    itemId: { type: String, required: true, unique: true, index: true, trim: true },
    type: { type: String, required: true, enum: ["frame", "theme", "sticker"] },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priceVnd: { type: Number, required: true, min: 0 },
    thumbnail: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    maxQty: { type: Number, default: 10, min: 1 },
  },
  { timestamps: true },
);

export const OrderCatalogModel = model("OrderCatalog", orderCatalogSchema);
export type OrderCatalogItemDocument = ReturnType<typeof OrderCatalogModel.hydrate>;
```

### 4. Chạy test để xác nhận PASS

```bash
npm --prefix backend test -- orderCatalogModel.test
```
Expected: 3 tests PASS.

### 5. Nếu `mongodb-memory-server` chưa cài

Kiểm tra `backend/package.json`. Nếu chưa có:

```bash
npm --prefix backend install --save-dev mongodb-memory-server
```

### 6. Commit

```bash
git add backend/src/models/OrderCatalogModel.ts backend/src/tests/orderCatalogModel.test.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): add OrderCatalogModel với validation cơ bản"
```

## Quy tắc khi làm

- Tuân thủ `CLAUDE.md` trong repo (đặc biệt: không tự ý refactor file khác, không thêm dependency thừa).
- Nếu pattern test hiện tại của backend dùng helper khác cho mongoose-memory (vd `setupTestDb.ts`), hãy follow pattern đó thay vì code lại trong test. Đọc `backend/src/tests/` để xem.
- Báo cáo cuối: hash commit + output `npm --prefix backend test -- orderCatalogModel.test` để tôi verify.

Bắt đầu làm.
