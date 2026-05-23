# Task 3 — Public `GET /api/order-catalog`

> Copy toàn bộ phần dưới `---` để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**. Stack: Express + Mongoose 8 + MongoDB.

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Plan: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
- Tiền đề: Tasks 1-2 đã xong (`OrderCatalogModel` + seed script).

Hãy thực hiện **Task 3: Public endpoint `GET /api/order-catalog`** theo TDD.

## Mục tiêu

Tạo endpoint public trả về các catalog item `isActive: true`, sort theo `sortOrder`, kèm cache header `Cache-Control: public, max-age=60`.

**Files cần tạo:**
- `backend/src/controllers/orderCatalogController.ts`
- `backend/src/routes/orderCatalogRoutes.ts`
- `backend/src/tests/orderCatalogRoutes.test.ts`

**File cần sửa:**
- `backend/src/routes/index.ts` — mount route mới

## TDD steps

### 1. Viết test trước

```ts
// backend/src/tests/orderCatalogRoutes.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app"; // điều chỉnh nếu repo export Express app từ file khác
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
beforeEach(async () => {
  await OrderCatalogModel.deleteMany({});
});

describe("GET /api/order-catalog", () => {
  it("returns only isActive items sorted by sortOrder", async () => {
    await OrderCatalogModel.create([
      { itemId: "frame:b", type: "frame", label: "B", priceVnd: 100, sortOrder: 2, isActive: true },
      { itemId: "frame:a", type: "frame", label: "A", priceVnd: 100, sortOrder: 1, isActive: true },
      { itemId: "frame:c", type: "frame", label: "C", priceVnd: 100, sortOrder: 3, isActive: false },
    ]);
    const res = await request(app).get("/api/order-catalog");
    expect(res.status).toBe(200);
    expect(res.body.data.map((i: { itemId: string }) => i.itemId)).toEqual(["frame:a", "frame:b"]);
  });

  it("sets Cache-Control header", async () => {
    const res = await request(app).get("/api/order-catalog");
    expect(res.headers["cache-control"]).toMatch(/max-age=60/);
  });
});
```

### 2. Chạy test → fail

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```
Expected: FAIL (route 404).

### 3. Implement controller

```ts
// backend/src/controllers/orderCatalogController.ts
import type { Request, Response } from "express";
import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { successResponse } from "../utils/apiResponse";

export async function listActiveCatalog(_req: Request, res: Response) {
  const items = await OrderCatalogModel.find({ isActive: true })
    .sort({ sortOrder: 1, itemId: 1 })
    .lean();
  res.set("Cache-Control", "public, max-age=60");
  successResponse(res, { data: items });
}
```

Lưu ý: nếu `successResponse` trong repo có signature khác (kiểm tra `backend/src/utils/apiResponse.ts`), hãy dùng đúng signature đó. Test assert `res.body.data` là mảng items.

### 4. Implement route

```ts
// backend/src/routes/orderCatalogRoutes.ts
import { Router } from "express";
import { listActiveCatalog } from "../controllers/orderCatalogController";
import { asyncHandler } from "../utils/asyncHandler";

const orderCatalogRoutes = Router();
orderCatalogRoutes.get("/", asyncHandler(listActiveCatalog));
export default orderCatalogRoutes;
```

### 5. Mount route trong `backend/src/routes/index.ts`

Thêm vào đúng chỗ các mount khác:
```ts
import orderCatalogRoutes from "./orderCatalogRoutes";
// ... gần các router.use khác
router.use("/order-catalog", orderCatalogRoutes);
```

### 6. Chạy test → pass

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```
Expected: 2 tests PASS.

### 7. Commit

```bash
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/orderCatalogRoutes.ts backend/src/routes/index.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): public GET /api/order-catalog endpoint"
```

## Quy tắc

- Follow pattern controller/route hiện có trong `backend/src/routes/` (vd `goalRoutes.ts`, `orderRoutes.ts`).
- Nếu `app` export khác (vd `createApp()`), import đúng cách.
- Báo cáo cuối: hash commit + output test PASS.

Bắt đầu làm.
