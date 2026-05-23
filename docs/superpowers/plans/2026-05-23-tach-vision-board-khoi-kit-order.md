# Tách Vision Board khỏi Kit Order — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách Vision Board (editor) khỏi luồng đặt đơn Kit, đồng thời thiết kế lại trang `/order` thành combo (khung gỗ + set ảnh theme + sticker) với giá quản lý qua backend catalog + Admin UI.

**Architecture:** Frontend tạo module mới `src/features/order/` (catalog + lib + components + pages + storage). Backend thêm `OrderCatalogModel` + routes public/admin. Server tính giá authoritative khi `POST /api/orders`. Migration v1→v2 cho localStorage và DB orders cũ.

**Tech Stack:** React 18, Vite, Tailwind, shadcn/ui, Vitest, RTL, Express, Mongoose, MongoDB, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-23-tach-vision-board-khoi-kit-order-design.md`

---

## File map

### Backend (mới)
- `backend/src/models/OrderCatalogModel.ts`
- `backend/src/controllers/orderCatalogController.ts`
- `backend/src/routes/orderCatalogRoutes.ts`
- `backend/src/scripts/seedOrderCatalog.ts`
- `backend/src/scripts/migrateOrdersV1ToV2.ts`
- `backend/src/tests/orderCatalogModel.test.ts`
- `backend/src/tests/orderCatalogRoutes.test.ts`

### Backend (sửa)
- `backend/src/models/OrderModel.ts` — thêm `lines[]`, `subtotalVnd`, `totalVnd`, deprecate `kitType`.
- `backend/src/routes/index.ts` — mount `orderCatalogRoutes`.
- `backend/src/routes/adminRoutes.ts` — admin endpoints catalog.
- `backend/src/controllers/orderController.ts` — POST /api/orders dùng schema mới.
- `backend/src/tests/orderRoutes.test.ts` — cập nhật assert.

### Frontend (mới)
- `src/features/order/catalog/types.ts`
- `src/features/order/catalog/defaults.ts`
- `src/features/order/catalog/included.ts`
- `src/features/order/lib/pricing.ts`
- `src/features/order/lib/validators.ts`
- `src/features/order/lib/pricing.test.ts`
- `src/features/order/lib/validators.test.ts`
- `src/features/order/storage/order.ts`
- `src/features/order/storage/migration.ts`
- `src/features/order/storage/order.test.ts`
- `src/features/order/storage/migration.test.ts`
- `src/features/order/hooks/useOrderCatalog.ts`
- `src/features/order/components/FrameSizePicker.tsx`
- `src/features/order/components/ThemePicker.tsx`
- `src/features/order/components/StickerAddon.tsx`
- `src/features/order/components/IncludedItemsCard.tsx`
- `src/features/order/components/ShippingForm.tsx`
- `src/features/order/components/NotesField.tsx`
- `src/features/order/components/OrderSummary.tsx`
- `src/features/order/components/*.test.tsx` (RTL tests)
- `src/features/order/pages/OrderPage.tsx`
- `src/features/order/pages/OrderPage.test.tsx`
- `src/services/orderCatalogService.ts`
- `src/services/orderCatalogService.test.ts`
- `src/app/pages/AdminCatalogPage.tsx`

### Frontend (sửa)
- `src/app/utils/order-storage.ts` — chuyển thành shim re-export.
- `src/app/routes.tsx` — đổi lazy OrderPage, thêm `/admin/catalog`.
- `src/app/pages/OrderStatusPage.tsx` — render `lines[]`.
- `src/app/pages/AdminOrdersPage.tsx` — cột mới + filter.
- `src/app/pages/Dashboard.tsx`, `Achievements.tsx` — grep kitType, sửa.
- `src/app/components/root-layout/AppSidebar.tsx`, `navConfig.ts` — add nav admin.
- `src/test/fixtures/coreFunnelScenarios.ts` — fixture v2.
- `src/app/pages/VisionBoardEditor.tsx`, `VisionBoardGallery.tsx` — gỡ CTA → /order.

---

## Phase 0 — Backend Catalog Foundation

### Task 1: `OrderCatalogModel`

**Files:**
- Create: `backend/src/models/OrderCatalogModel.ts`
- Test: `backend/src/tests/orderCatalogModel.test.ts`

- [ ] **Step 1: Write failing test**

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

- [ ] **Step 2: Run test → fail**

```bash
npm --prefix backend test -- orderCatalogModel.test
```
Expected: FAIL (`Cannot find module '../models/OrderCatalogModel'`).

- [ ] **Step 3: Implement model**

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

- [ ] **Step 4: Run test → pass**

```bash
npm --prefix backend test -- orderCatalogModel.test
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/OrderCatalogModel.ts backend/src/tests/orderCatalogModel.test.ts
git commit -m "feat(backend): add OrderCatalogModel với validation cơ bản"
```

---

### Task 2: Seed script `seedOrderCatalog.ts`

**Files:**
- Create: `backend/src/scripts/seedOrderCatalog.ts`

- [ ] **Step 1: Implement seed**

```ts
// backend/src/scripts/seedOrderCatalog.ts
import mongoose from "mongoose";
import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { connectDb } from "../config/db"; // adjust import nếu khác

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

- [ ] **Step 2: Smoke test seed idempotent**

```bash
npm --prefix backend exec -- tsx src/scripts/seedOrderCatalog.ts
npm --prefix backend exec -- tsx src/scripts/seedOrderCatalog.ts
```
Expected: log `Seeded 22 catalog items` 2 lần, không lỗi duplicate.

- [ ] **Step 3: Commit**

```bash
git add backend/src/scripts/seedOrderCatalog.ts
git commit -m "feat(backend): seed 22 catalog items (3 frame + 18 theme + 1 sticker)"
```

---

### Task 3: Public route `GET /api/order-catalog`

**Files:**
- Create: `backend/src/controllers/orderCatalogController.ts`
- Create: `backend/src/routes/orderCatalogRoutes.ts`
- Create: `backend/src/tests/orderCatalogRoutes.test.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 1: Test failing**

```ts
// backend/src/tests/orderCatalogRoutes.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app"; // adjust if different
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
});
```

- [ ] **Step 2: Run → fail (route 404)**

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

- [ ] **Step 3: Implement controller + route**

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

```ts
// backend/src/routes/orderCatalogRoutes.ts
import { Router } from "express";
import { listActiveCatalog } from "../controllers/orderCatalogController";
import { asyncHandler } from "../utils/asyncHandler";

const orderCatalogRoutes = Router();
orderCatalogRoutes.get("/", asyncHandler(listActiveCatalog));
export default orderCatalogRoutes;
```

```ts
// backend/src/routes/index.ts — thêm dòng mount
import orderCatalogRoutes from "./orderCatalogRoutes";
// ... existing mounts
router.use("/order-catalog", orderCatalogRoutes);
```

- [ ] **Step 4: Run → pass**

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/orderCatalogRoutes.ts backend/src/routes/index.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): public GET /api/order-catalog endpoint"
```

---

### Task 4: Admin endpoint `GET /api/admin/order-catalog`

**Files:**
- Modify: `backend/src/controllers/orderCatalogController.ts`
- Modify: `backend/src/routes/adminRoutes.ts`
- Modify: `backend/src/tests/orderCatalogRoutes.test.ts`

- [ ] **Step 1: Add test**

```ts
// append to orderCatalogRoutes.test.ts
describe("GET /api/admin/order-catalog", () => {
  it("returns all items including inactive (with admin auth)", async () => {
    await OrderCatalogModel.create([
      { itemId: "x:a", type: "frame", label: "A", priceVnd: 1, isActive: true },
      { itemId: "x:b", type: "frame", label: "B", priceVnd: 1, isActive: false },
    ]);
    const res = await request(app)
      .get("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN}`); // dùng pattern test hiện có
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("rejects without admin", async () => {
    const res = await request(app).get("/api/admin/order-catalog");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Add controller**

```ts
// orderCatalogController.ts — thêm
export async function listAllCatalog(_req: Request, res: Response) {
  const items = await OrderCatalogModel.find({}).sort({ sortOrder: 1, itemId: 1 }).lean();
  successResponse(res, { data: items });
}
```

- [ ] **Step 3: Mount in adminRoutes**

```ts
// backend/src/routes/adminRoutes.ts — sau các import
import { listAllCatalog } from "../controllers/orderCatalogController";
// ... gần cuối file, trước export
adminRoutes.get("/order-catalog", requireAdmin, asyncHandler(listAllCatalog));
```

- [ ] **Step 4: Run tests → pass; commit**

```bash
npm --prefix backend test -- orderCatalogRoutes.test
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin GET /api/admin/order-catalog"
```

---

### Task 5: Admin `POST /api/admin/order-catalog` (create)

**Files:**
- Modify: `orderCatalogController.ts`, `adminRoutes.ts`, `orderCatalogRoutes.test.ts`

- [ ] **Step 1: Test**

```ts
describe("POST /api/admin/order-catalog", () => {
  it("creates item with audit log", async () => {
    const res = await request(app)
      .post("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN}`)
      .send({ itemId: "sticker:new-x", type: "sticker", label: "New X", priceVnd: 20000, maxQty: 5 });
    expect(res.status).toBe(201);
    const created = await OrderCatalogModel.findOne({ itemId: "sticker:new-x" });
    expect(created).toBeTruthy();
  });

  it("rejects invalid itemId format", async () => {
    const res = await request(app)
      .post("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN}`)
      .send({ itemId: "bogus", type: "frame", label: "X", priceVnd: 100 });
    expect(res.status).toBe(400);
  });

  it("rejects priceVnd negative", async () => {
    const res = await request(app)
      .post("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN}`)
      .send({ itemId: "frame:bad", type: "frame", label: "Bad", priceVnd: -1 });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement validator + controller**

```ts
// orderCatalogController.ts — thêm
const ITEM_ID_RE = /^(frame|theme|sticker):[a-z0-9-]+$/;

export async function createCatalogItem(req: Request, res: Response) {
  const { itemId, type, label, description, priceVnd, thumbnail, sortOrder, isActive, maxQty } = req.body ?? {};
  if (typeof itemId !== "string" || !ITEM_ID_RE.test(itemId)) {
    return res.status(400).json({ error: "Invalid itemId format" });
  }
  if (!["frame", "theme", "sticker"].includes(type)) {
    return res.status(400).json({ error: "Invalid type" });
  }
  if (typeof priceVnd !== "number" || priceVnd < 0) {
    return res.status(400).json({ error: "priceVnd must be >= 0" });
  }
  const exists = await OrderCatalogModel.findOne({ itemId });
  if (exists) return res.status(409).json({ error: "itemId already exists" });

  const created = await OrderCatalogModel.create({
    itemId, type, label, description, priceVnd, thumbnail, sortOrder, isActive, maxQty,
  });
  res.status(201).json({ data: created });
}
```

- [ ] **Step 3: Wire route + audit log**

```ts
// adminRoutes.ts — dùng pattern auditedAdminAction sẵn có
adminRoutes.post(
  "/order-catalog",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await createCatalogItem(req, res);
    if (res.statusCode === 201) {
      await logAdminAction({ action: "order_catalog.create", target: req.body?.itemId ?? "" });
    }
  }),
);
```

- [ ] **Step 4: Tests pass; commit**

```bash
npm --prefix backend test -- orderCatalogRoutes.test
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin POST /api/admin/order-catalog với audit log"
```

---

### Task 6: Admin `PUT /api/admin/order-catalog/:itemId` (update)

**Files:** same controller/routes/test files.

- [ ] **Step 1: Test**

```ts
describe("PUT /api/admin/order-catalog/:itemId", () => {
  it("updates price and label", async () => {
    await OrderCatalogModel.create({ itemId: "frame:20x30", type: "frame", label: "Old", priceVnd: 50000 });
    const res = await request(app)
      .put("/api/admin/order-catalog/frame:20x30")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN}`)
      .send({ label: "New", priceVnd: 60000 });
    expect(res.status).toBe(200);
    const updated = await OrderCatalogModel.findOne({ itemId: "frame:20x30" });
    expect(updated?.label).toBe("New");
    expect(updated?.priceVnd).toBe(60000);
  });

  it("404 when itemId not found", async () => {
    const res = await request(app)
      .put("/api/admin/order-catalog/frame:nope")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN}`)
      .send({ priceVnd: 999 });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Implement controller**

```ts
export async function updateCatalogItem(req: Request, res: Response) {
  const { itemId } = req.params;
  const allowed = ["label", "description", "priceVnd", "thumbnail", "sortOrder", "maxQty"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in (req.body ?? {})) update[key] = req.body[key];
  }
  if ("priceVnd" in update && (typeof update.priceVnd !== "number" || update.priceVnd < 0)) {
    return res.status(400).json({ error: "priceVnd must be >= 0" });
  }
  const updated = await OrderCatalogModel.findOneAndUpdate({ itemId }, update, { new: true });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ data: updated });
}
```

- [ ] **Step 3: Wire route + audit**

```ts
adminRoutes.put(
  "/order-catalog/:itemId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await updateCatalogItem(req, res);
    if (res.statusCode === 200) {
      await logAdminAction({ action: "order_catalog.update", target: req.params.itemId });
    }
  }),
);
```

- [ ] **Step 4: Test pass; commit**

```bash
npm --prefix backend test -- orderCatalogRoutes.test
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin PUT /api/admin/order-catalog/:itemId"
```

---

### Task 7: Admin `PATCH /api/admin/order-catalog/:itemId/active` (toggle)

- [ ] **Step 1: Test**

```ts
describe("PATCH /:itemId/active", () => {
  it("toggles isActive", async () => {
    await OrderCatalogModel.create({ itemId: "x:a", type: "frame", label: "A", priceVnd: 1, isActive: true });
    const res = await request(app)
      .patch("/api/admin/order-catalog/x:a/active")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN}`)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    const updated = await OrderCatalogModel.findOne({ itemId: "x:a" });
    expect(updated?.isActive).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```ts
export async function toggleCatalogItemActive(req: Request, res: Response) {
  const { itemId } = req.params;
  const { isActive } = req.body ?? {};
  if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive boolean required" });
  const updated = await OrderCatalogModel.findOneAndUpdate({ itemId }, { isActive }, { new: true });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ data: updated });
}
```

```ts
// adminRoutes.ts
adminRoutes.patch(
  "/order-catalog/:itemId/active",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await toggleCatalogItemActive(req, res);
    if (res.statusCode === 200) {
      await logAdminAction({ action: "order_catalog.toggle_active", target: req.params.itemId });
    }
  }),
);
```

- [ ] **Step 3: Test pass; commit**

```bash
npm --prefix backend test -- orderCatalogRoutes.test
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin PATCH toggle active catalog item"
```

---

### Task 8: Backend typecheck + run seed

- [ ] **Step 1: Typecheck full backend**

```bash
npm --prefix backend run typecheck
```
Expected: 0 errors.

- [ ] **Step 2: Run seed trên DB dev**

```bash
npm --prefix backend exec -- tsx src/scripts/seedOrderCatalog.ts
```
Expected: log `Seeded 22 catalog items`.

- [ ] **Step 3: Verify via curl**

```bash
curl http://localhost:<backend_port>/api/order-catalog | jq '.data | length'
```
Expected: `22`.

- [ ] **Step 4: Commit nếu có thay đổi config**

```bash
git status
# nếu sạch, skip commit
```

---

## Phase 1 — Frontend: Catalog Types & Service

### Task 9: Catalog types + DEFAULT_CATALOG fallback

**Files:**
- Create: `src/features/order/catalog/types.ts`
- Create: `src/features/order/catalog/defaults.ts`
- Create: `src/features/order/catalog/included.ts`

- [ ] **Step 1: Write types**

```ts
// src/features/order/catalog/types.ts
export type CatalogItemType = "frame" | "theme" | "sticker";

export interface CatalogItem {
  itemId: string;
  type: CatalogItemType;
  label: string;
  description?: string;
  priceVnd: number;
  thumbnail?: string;
  sortOrder: number;
  isActive: boolean;
  maxQty?: number;
}
```

- [ ] **Step 2: Write defaults (mirror seed)**

```ts
// src/features/order/catalog/defaults.ts
import type { CatalogItem } from "./types";

export const DEFAULT_CATALOG: CatalogItem[] = [
  // Frames
  { itemId: "frame:20x30", type: "frame", label: "Khung 20×30 cm", description: "Để bàn, nhỏ gọn", priceVnd: 79000, sortOrder: 1, isActive: true },
  { itemId: "frame:30x40", type: "frame", label: "Khung 30×40 cm", description: "Phổ biến nhất", priceVnd: 119000, sortOrder: 2, isActive: true },
  { itemId: "frame:40x60", type: "frame", label: "Khung 40×60 cm", description: "Treo tường ấn tượng", priceVnd: 189000, sortOrder: 3, isActive: true },
  // Themes
  ...["text-1","text-2","text-3","text-4","text-5","text-6","books","body","money","study","followers","cloth","friends","desk-corner","coffee","cars","lose-weight","travel"].map((slug, i): CatalogItem => ({
    itemId: `theme:${slug}`,
    type: "theme",
    label: slug.replace(/-/g, " ").toUpperCase(),
    priceVnd: 18000,
    sortOrder: 10 + i,
    isActive: true,
  })),
  // Stickers
  { itemId: "sticker:hynbee-round-v1", type: "sticker", label: "Sticker tròn HynBee", description: "Phụ kiện trang trí postcard", priceVnd: 15000, sortOrder: 50, isActive: true, maxQty: 10 },
];
```

- [ ] **Step 3: Write included docs**

```ts
// src/features/order/catalog/included.ts
export const INCLUDED_DOCS = [
  { id: "smart-guide", label: "Tờ hướng dẫn SMART Goal" },
  { id: "twelve-week-guide", label: "Tờ hướng dẫn kế hoạch 12 tuần" },
] as const;
```

- [ ] **Step 4: Commit**

```bash
git add src/features/order/catalog/
git commit -m "feat(order): catalog types + DEFAULT_CATALOG fallback + included docs"
```

---

### Task 10: `orderCatalogService` + `useOrderCatalog` hook

**Files:**
- Create: `src/services/orderCatalogService.ts`
- Create: `src/services/orderCatalogService.test.ts`
- Create: `src/features/order/hooks/useOrderCatalog.ts`

- [ ] **Step 1: Test service**

```ts
// src/services/orderCatalogService.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchOrderCatalog } from "./orderCatalogService";
import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchOrderCatalog", () => {
  it("returns server data when fetch ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ itemId: "frame:20x30", type: "frame", label: "X", priceVnd: 1000, sortOrder: 1, isActive: true }] }),
    }));
    const items = await fetchOrderCatalog();
    expect(items).toHaveLength(1);
    expect(items[0].itemId).toBe("frame:20x30");
  });

  it("falls back to DEFAULT_CATALOG when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const items = await fetchOrderCatalog();
    expect(items).toEqual(DEFAULT_CATALOG);
    expect(warn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement service**

```ts
// src/services/orderCatalogService.ts
import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";
import type { CatalogItem } from "@/features/order/catalog/types";

const ENDPOINT = "/api/order-catalog";

export async function fetchOrderCatalog(): Promise<CatalogItem[]> {
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data: CatalogItem[] };
    return json.data;
  } catch (err) {
    console.warn("[orderCatalog] fallback to DEFAULT_CATALOG:", err);
    return DEFAULT_CATALOG;
  }
}
```

- [ ] **Step 3: Implement hook**

```ts
// src/features/order/hooks/useOrderCatalog.ts
import { useEffect, useState } from "react";
import { fetchOrderCatalog } from "@/services/orderCatalogService";
import type { CatalogItem } from "@/features/order/catalog/types";

export interface UseOrderCatalogResult {
  catalog: CatalogItem[];
  isLoading: boolean;
  isFromFallback: boolean;
}

export function useOrderCatalog(): UseOrderCatalogResult {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isFromFallback, setFromFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOrderCatalog()
      .then((items) => {
        if (cancelled) return;
        setCatalog(items);
      })
      .catch(() => setFromFallback(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return { catalog, isLoading, isFromFallback };
}
```

- [ ] **Step 4: Run test → pass; commit**

```bash
npx vitest run src/services/orderCatalogService.test.ts
git add src/services/orderCatalogService.ts src/services/orderCatalogService.test.ts src/features/order/hooks/useOrderCatalog.ts
git commit -m "feat(order): orderCatalogService + useOrderCatalog hook với fallback"
```

---

---

### Task 11: LocalOrderV2 schema + storage

**Files:**
- Create: `src/features/order/storage/order.ts`
- Create: `src/features/order/storage/order.test.ts`

- [ ] **Step 1: Test**

```ts
// src/features/order/storage/order.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createLocalOrder, getOrders, getOrderById } from "./order";

beforeEach(() => {
  window.localStorage.clear();
});

describe("storage/order V2", () => {
  it("createLocalOrder writes schemaVersion=2 with lines + pricing snapshot", () => {
    const order = createLocalOrder({
      lines: [
        { itemId: "frame:30x40", label: "Khung 30×40", type: "frame", qty: 1, unitPriceVnd: 119000, lineTotalVnd: 119000 },
        { itemId: "theme:money", label: "MONEY", type: "theme", qty: 1, unitPriceVnd: 18000, lineTotalVnd: 18000 },
      ],
      subtotalVnd: 137000,
      shippingVnd: 0,
      totalVnd: 137000,
      fullName: "A B",
      email: "a@b.c",
      phone: "0900",
      shippingAddress: "X",
      goalId: null,
      goalTitle: "",
      keywords: [],
      note: "",
    });
    expect(order.schemaVersion).toBe(2);
    expect(getOrderById(order.id)?.totalVnd).toBe(137000);
  });

  it("getOrders sorts newest first", () => {
    const o1 = createLocalOrder({ ...baseDraft, totalVnd: 100 });
    const o2 = createLocalOrder({ ...baseDraft, totalVnd: 200 });
    expect(getOrders()[0].id).toBe(o2.id);
    expect(getOrders()[1].id).toBe(o1.id);
  });
});

const baseDraft = {
  lines: [{ itemId: "frame:30x40", label: "F", type: "frame" as const, qty: 1, unitPriceVnd: 100, lineTotalVnd: 100 }],
  subtotalVnd: 100,
  shippingVnd: 0,
  totalVnd: 100,
  fullName: "X", email: "x@y.z", phone: "1", shippingAddress: "Y",
  goalId: null, goalTitle: "", keywords: [], note: "",
};
```

- [ ] **Step 2: Implement storage**

```ts
// src/features/order/storage/order.ts
import { generateId } from "@/app/utils/storage-types";
import type { CatalogItemType } from "@/features/order/catalog/types";
import { migrateOrderV1ToV2 } from "./migration";

export const ORDER_STORAGE_KEY = "visionboard_orders_v1";
export const ORDER_SCHEMA_VERSION = 2 as const;

export type OrderStatus = "pending" | "printing" | "shipping" | "delivered";

export interface OrderLine {
  itemId: string;
  label: string;
  type: CatalogItemType;
  qty: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

export interface LocalOrderV2 {
  id: string;
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;

  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;

  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;

  goalId: string | null;
  goalTitle: string;
  keywords: string[];
  note: string;
}

export type LocalOrder = LocalOrderV2; // alias cho consumer cũ

export interface CreateLocalOrderInput
  extends Omit<LocalOrderV2, "id" | "schemaVersion" | "createdAt" | "updatedAt" | "status"> {
  status?: OrderStatus;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseOrders(raw: string | null): LocalOrderV2[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      if (item.schemaVersion === 2) return [item as LocalOrderV2];
      // legacy v1 → migrate
      try {
        return [migrateOrderV1ToV2(item)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function saveOrders(orders: LocalOrderV2[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

export function getOrders(): LocalOrderV2[] {
  if (!canUseStorage()) return [];
  return parseOrders(window.localStorage.getItem(ORDER_STORAGE_KEY)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getOrderById(id: string): LocalOrderV2 | null {
  return getOrders().find((o) => o.id === id) ?? null;
}

export function getLatestOrder(): LocalOrderV2 | null {
  return getOrders()[0] ?? null;
}

export function createLocalOrder(input: CreateLocalOrderInput): LocalOrderV2 {
  const now = new Date().toISOString();
  const order: LocalOrderV2 = {
    id: generateId(),
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
    status: input.status ?? "pending",
    lines: input.lines,
    subtotalVnd: input.subtotalVnd,
    shippingVnd: input.shippingVnd,
    totalVnd: input.totalVnd,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    shippingAddress: input.shippingAddress,
    goalId: input.goalId,
    goalTitle: input.goalTitle,
    keywords: input.keywords,
    note: input.note,
  };
  const existing = getOrders();
  saveOrders([order, ...existing]);
  return order;
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/storage/order.test.ts
git add src/features/order/storage/
git commit -m "feat(order): storage v2 LocalOrderV2 schema + helpers"
```

---

### Task 12: Migration v1 → v2

**Files:**
- Create: `src/features/order/storage/migration.ts`
- Create: `src/features/order/storage/migration.test.ts`

- [ ] **Step 1: Test**

```ts
// src/features/order/storage/migration.test.ts
import { describe, it, expect } from "vitest";
import { migrateOrderV1ToV2 } from "./migration";

describe("migrateOrderV1ToV2", () => {
  const v1 = {
    id: "o1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    status: "pending",
    kitType: "vision-kit",
    goalId: "g1",
    goalTitle: "Goal",
    focusArea: "Career",
    fullName: "A",
    email: "a@b.c",
    phone: "1",
    shippingAddress: "X",
    keywords: ["a"],
    note: "hello",
  };

  it("maps to v2 with default frame line + empty themes/sticker", () => {
    const v2 = migrateOrderV1ToV2(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.lines).toEqual([
      { itemId: "frame:30x40", label: "Khung 30×40 cm", type: "frame", qty: 1, unitPriceVnd: 0, lineTotalVnd: 0 },
    ]);
    expect(v2.subtotalVnd).toBe(0);
    expect(v2.totalVnd).toBe(0);
  });

  it("appends marker into note", () => {
    const v2 = migrateOrderV1ToV2(v1);
    expect(v2.note).toContain("[Đơn cũ — kitType: vision-kit]");
    expect(v2.note).toContain("hello");
  });

  it("preserves id/createdAt/shipping/goal fields", () => {
    const v2 = migrateOrderV1ToV2(v1);
    expect(v2.id).toBe("o1");
    expect(v2.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(v2.goalId).toBe("g1");
    expect(v2.fullName).toBe("A");
  });

  it("fills defaults when fields missing", () => {
    const partial = { id: "o2", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", status: "pending" };
    const v2 = migrateOrderV1ToV2(partial as never);
    expect(v2.fullName).toBe("");
    expect(v2.keywords).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/features/order/storage/migration.ts
import type { LocalOrderV2, OrderStatus } from "./order";

interface LegacyOrderV1 {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  kitType?: string;
  goalId?: string | null;
  goalTitle?: string;
  focusArea?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  shippingAddress?: string;
  keywords?: unknown[];
  note?: string;
  visionBoardId?: string;
}

function normStatus(s: unknown): OrderStatus {
  switch (s) {
    case "printing":
    case "shipping":
    case "delivered":
      return s;
    default:
      return "pending";
  }
}

export function migrateOrderV1ToV2(raw: LegacyOrderV1): LocalOrderV2 {
  const now = new Date().toISOString();
  const kitMarker = raw.kitType ? `[Đơn cũ — kitType: ${raw.kitType}]` : "[Đơn cũ]";
  const existingNote = typeof raw.note === "string" ? raw.note : "";
  return {
    id: typeof raw.id === "string" ? raw.id : `legacy-${Math.random().toString(36).slice(2)}`,
    schemaVersion: 2,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
    status: normStatus(raw.status),
    lines: [
      { itemId: "frame:30x40", label: "Khung 30×40 cm", type: "frame", qty: 1, unitPriceVnd: 0, lineTotalVnd: 0 },
    ],
    subtotalVnd: 0,
    shippingVnd: 0,
    totalVnd: 0,
    fullName: typeof raw.fullName === "string" ? raw.fullName : "",
    email: typeof raw.email === "string" ? raw.email : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    shippingAddress: typeof raw.shippingAddress === "string" ? raw.shippingAddress : "",
    goalId: typeof raw.goalId === "string" ? raw.goalId : null,
    goalTitle: typeof raw.goalTitle === "string" ? raw.goalTitle : "",
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter((k): k is string => typeof k === "string") : [],
    note: existingNote ? `${existingNote}\n\n${kitMarker}` : kitMarker,
  };
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/storage/migration.test.ts
git add src/features/order/storage/migration.ts src/features/order/storage/migration.test.ts
git commit -m "feat(order): migration v1 → v2 với marker note"
```

---

### Task 13: Pricing pure functions

**Files:**
- Create: `src/features/order/lib/pricing.ts`
- Create: `src/features/order/lib/pricing.test.ts`

- [ ] **Step 1: Test**

```ts
// src/features/order/lib/pricing.test.ts
import { describe, it, expect } from "vitest";
import { buildOrderLines, calcSubtotal, calcShipping, calcTotal, formatVnd } from "./pricing";
import type { CatalogItem } from "@/features/order/catalog/types";

const catalog: CatalogItem[] = [
  { itemId: "frame:30x40", type: "frame", label: "F", priceVnd: 100, sortOrder: 1, isActive: true },
  { itemId: "theme:money", type: "theme", label: "MONEY", priceVnd: 20, sortOrder: 2, isActive: true },
  { itemId: "theme:travel", type: "theme", label: "TRAVEL", priceVnd: 20, sortOrder: 3, isActive: true },
  { itemId: "sticker:hynbee-round-v1", type: "sticker", label: "S", priceVnd: 10, sortOrder: 4, isActive: true, maxQty: 5 },
];

describe("buildOrderLines", () => {
  it("returns lines for frame + themes + sticker qty 2", () => {
    const lines = buildOrderLines({
      frameItemId: "frame:30x40",
      themeItemIds: ["theme:money", "theme:travel"],
      stickerSelection: { itemId: "sticker:hynbee-round-v1", qty: 2 },
    }, catalog);
    expect(lines).toHaveLength(4);
    expect(lines[3]).toMatchObject({ itemId: "sticker:hynbee-round-v1", qty: 2, lineTotalVnd: 20 });
  });

  it("skips frame when frameItemId null", () => {
    const lines = buildOrderLines({ frameItemId: null, themeItemIds: [], stickerSelection: null }, catalog);
    expect(lines).toEqual([]);
  });

  it("skips items missing from catalog", () => {
    const lines = buildOrderLines({ frameItemId: "frame:nope", themeItemIds: [], stickerSelection: null }, catalog);
    expect(lines).toEqual([]);
  });
});

describe("calcSubtotal/calcTotal", () => {
  it("sums lineTotalVnd", () => {
    const lines = buildOrderLines({
      frameItemId: "frame:30x40",
      themeItemIds: ["theme:money"],
      stickerSelection: null,
    }, catalog);
    expect(calcSubtotal(lines)).toBe(120);
    expect(calcShipping({ frameItemId: "frame:30x40", themeItemIds: [], stickerSelection: null })).toBe(0);
    expect(calcTotal(120, 0)).toBe(120);
  });
});

describe("formatVnd", () => {
  it("formats with VN locale", () => {
    expect(formatVnd(119000)).toMatch(/119\.000/);
    expect(formatVnd(0)).toMatch(/0/);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/features/order/lib/pricing.ts
import type { CatalogItem } from "@/features/order/catalog/types";
import type { OrderLine } from "@/features/order/storage/order";

export interface OrderDraft {
  frameItemId: string | null;
  themeItemIds: string[];
  stickerSelection: { itemId: string; qty: number } | null;
}

function toLine(item: CatalogItem, qty: number): OrderLine {
  return {
    itemId: item.itemId,
    label: item.label,
    type: item.type,
    qty,
    unitPriceVnd: item.priceVnd,
    lineTotalVnd: item.priceVnd * qty,
  };
}

export function buildOrderLines(draft: OrderDraft, catalog: CatalogItem[]): OrderLine[] {
  const byId = new Map(catalog.map((i) => [i.itemId, i]));
  const lines: OrderLine[] = [];

  if (draft.frameItemId) {
    const frame = byId.get(draft.frameItemId);
    if (frame) lines.push(toLine(frame, 1));
  }
  for (const themeId of draft.themeItemIds) {
    const theme = byId.get(themeId);
    if (theme) lines.push(toLine(theme, 1));
  }
  if (draft.stickerSelection) {
    const sticker = byId.get(draft.stickerSelection.itemId);
    if (sticker) lines.push(toLine(sticker, draft.stickerSelection.qty));
  }
  return lines;
}

export function calcSubtotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotalVnd, 0);
}

export function calcShipping(_draft: OrderDraft): number {
  return 0; // MVP
}

export function calcTotal(subtotal: number, shipping: number): number {
  return subtotal + shipping;
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/lib/pricing.test.ts
git add src/features/order/lib/pricing.ts src/features/order/lib/pricing.test.ts
git commit -m "feat(order): pricing pure functions với tests"
```

---

### Task 14: Validators

**Files:**
- Create: `src/features/order/lib/validators.ts`
- Create: `src/features/order/lib/validators.test.ts`

- [ ] **Step 1: Test**

```ts
// src/features/order/lib/validators.test.ts
import { describe, it, expect } from "vitest";
import { validateOrderDraft } from "./validators";
import type { CatalogItem } from "@/features/order/catalog/types";

const catalog: CatalogItem[] = [
  { itemId: "frame:30x40", type: "frame", label: "F", priceVnd: 100, sortOrder: 1, isActive: true },
  { itemId: "theme:money", type: "theme", label: "M", priceVnd: 20, sortOrder: 2, isActive: true },
  { itemId: "sticker:hynbee-round-v1", type: "sticker", label: "S", priceVnd: 10, sortOrder: 3, isActive: true, maxQty: 5 },
];

const validShipping = { fullName: "A", email: "a@b.c", phone: "0900000000", shippingAddress: "X" };

describe("validateOrderDraft", () => {
  it("ok with frame + 1 theme + valid shipping", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:30x40", themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(true);
  });

  it("error when frame null", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: null, themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.frame).toBeTruthy();
  });

  it("error when no themes", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:30x40", themeItemIds: [], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.themes).toBeTruthy();
  });

  it("error when email invalid", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:30x40", themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: { ...validShipping, email: "bogus" },
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email).toBeTruthy();
  });

  it("error when sticker qty exceeds maxQty", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:30x40", themeItemIds: ["theme:money"], stickerSelection: { itemId: "sticker:hynbee-round-v1", qty: 99 } },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.sticker).toBeTruthy();
  });

  it("error when itemId not in catalog", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:nope", themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/features/order/lib/validators.ts
import type { CatalogItem } from "@/features/order/catalog/types";
import type { OrderDraft } from "./pricing";

export interface ShippingInput {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
}

export interface ValidateInput {
  draft: OrderDraft;
  shipping: ShippingInput;
  catalog: CatalogItem[];
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<"frame" | "themes" | "sticker" | "fullName" | "email" | "phone" | "shippingAddress" | "catalog", string>> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrderDraft({ draft, shipping, catalog }: ValidateInput): ValidateResult {
  const errors: Record<string, string> = {};
  const byId = new Map(catalog.map((i) => [i.itemId, i]));

  if (!draft.frameItemId) errors.frame = "Vui lòng chọn kích thước khung";
  else if (!byId.has(draft.frameItemId)) errors.frame = "Khung không còn khả dụng";

  if (draft.themeItemIds.length === 0) errors.themes = "Chọn ít nhất 1 set ảnh";
  else {
    const missing = draft.themeItemIds.filter((id) => !byId.has(id));
    if (missing.length) errors.themes = "Một số set ảnh không còn khả dụng";
  }

  if (draft.stickerSelection) {
    const sticker = byId.get(draft.stickerSelection.itemId);
    if (!sticker) errors.sticker = "Sticker không còn khả dụng";
    else if (draft.stickerSelection.qty < 1 || draft.stickerSelection.qty > (sticker.maxQty ?? 10)) {
      errors.sticker = `Số lượng phải từ 1 đến ${sticker.maxQty ?? 10}`;
    }
  }

  if (!shipping.fullName.trim()) errors.fullName = "Vui lòng nhập họ tên";
  if (!EMAIL_RE.test(shipping.email)) errors.email = "Email không hợp lệ";
  if (!shipping.phone.trim()) errors.phone = "Vui lòng nhập số điện thoại";
  if (!shipping.shippingAddress.trim()) errors.shippingAddress = "Vui lòng nhập địa chỉ giao hàng";

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/lib/validators.test.ts
git add src/features/order/lib/validators.ts src/features/order/lib/validators.test.ts
git commit -m "feat(order): validators cho draft + shipping"
```

---

### Task 15: FrameSizePicker component

**Files:**
- Create: `src/features/order/components/FrameSizePicker.tsx`
- Create: `src/features/order/components/FrameSizePicker.test.tsx`

- [ ] **Step 1: Test**

```tsx
// src/features/order/components/FrameSizePicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FrameSizePicker } from "./FrameSizePicker";
import type { CatalogItem } from "@/features/order/catalog/types";

const frames: CatalogItem[] = [
  { itemId: "frame:20x30", type: "frame", label: "20×30", priceVnd: 79000, sortOrder: 1, isActive: true },
  { itemId: "frame:30x40", type: "frame", label: "30×40", priceVnd: 119000, sortOrder: 2, isActive: true },
];

describe("FrameSizePicker", () => {
  it("renders all frames with prices", () => {
    render(<FrameSizePicker frames={frames} selected={null} onChange={() => {}} />);
    expect(screen.getByText("20×30")).toBeInTheDocument();
    expect(screen.getByText(/79\.000/)).toBeInTheDocument();
  });

  it("calls onChange with itemId on click", () => {
    const onChange = vi.fn();
    render(<FrameSizePicker frames={frames} selected={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("30×40"));
    expect(onChange).toHaveBeenCalledWith("frame:30x40");
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/features/order/components/FrameSizePicker.tsx
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import { cn } from "@/lib/utils";

export interface FrameSizePickerProps {
  frames: CatalogItem[];
  selected: string | null;
  onChange: (itemId: string) => void;
}

export function FrameSizePicker({ frames, selected, onChange }: FrameSizePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {frames.map((frame) => (
        <button
          type="button"
          key={frame.itemId}
          onClick={() => onChange(frame.itemId)}
          aria-pressed={selected === frame.itemId}
          className={cn(
            "rounded-[var(--r-card)] border bg-card p-4 text-left transition",
            selected === frame.itemId
              ? "border-app-accent ring-2 ring-app-accent/30"
              : "border-[color:var(--border)] hover:border-app-accent/50",
          )}
        >
          <div className="text-base font-semibold">{frame.label}</div>
          {frame.description && (
            <div className="mt-1 text-xs text-muted-foreground">{frame.description}</div>
          )}
          <div className="mt-2 text-sm font-medium text-app-accent">{formatVnd(frame.priceVnd)}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/components/FrameSizePicker.test.tsx
git add src/features/order/components/FrameSizePicker.tsx src/features/order/components/FrameSizePicker.test.tsx
git commit -m "feat(order): FrameSizePicker component"
```

---

### Task 16: ThemePicker component

**Files:**
- Create: `src/features/order/components/ThemePicker.tsx`
- Create: `src/features/order/components/ThemePicker.test.tsx`

- [ ] **Step 1: Test**

```tsx
// src/features/order/components/ThemePicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemePicker } from "./ThemePicker";
import type { CatalogItem } from "@/features/order/catalog/types";

const themes: CatalogItem[] = [
  { itemId: "theme:money", type: "theme", label: "MONEY", priceVnd: 18000, sortOrder: 1, isActive: true },
  { itemId: "theme:travel", type: "theme", label: "TRAVEL", priceVnd: 18000, sortOrder: 2, isActive: true },
];

describe("ThemePicker", () => {
  it("toggles selection on click", () => {
    const onChange = vi.fn();
    render(<ThemePicker themes={themes} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("MONEY"));
    expect(onChange).toHaveBeenCalledWith(["theme:money"]);
  });

  it("filters by search query", () => {
    render(<ThemePicker themes={themes} selected={[]} onChange={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Tìm chủ đề/i), { target: { value: "trav" } });
    expect(screen.queryByText("MONEY")).not.toBeInTheDocument();
    expect(screen.getByText("TRAVEL")).toBeInTheDocument();
  });

  it("shows selected count", () => {
    render(<ThemePicker themes={themes} selected={["theme:money"]} onChange={() => {}} />);
    expect(screen.getByText(/Đã chọn 1 set/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/features/order/components/ThemePicker.tsx
import { useState, useMemo } from "react";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface ThemePickerProps {
  themes: CatalogItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function ThemePicker({ themes, selected, onChange }: ThemePickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return themes;
    const q = query.toLowerCase();
    return themes.filter((t) => t.label.toLowerCase().includes(q));
  }, [themes, query]);

  function toggle(itemId: string) {
    if (selected.includes(itemId)) onChange(selected.filter((id) => id !== itemId));
    else onChange([...selected, itemId]);
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Tìm chủ đề..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((theme) => {
          const isOn = selected.includes(theme.itemId);
          return (
            <button
              type="button"
              key={theme.itemId}
              onClick={() => toggle(theme.itemId)}
              aria-pressed={isOn}
              className={cn(
                "rounded-[var(--r-card)] border bg-card p-3 text-left transition",
                isOn
                  ? "border-app-accent ring-2 ring-app-accent/30"
                  : "border-[color:var(--border)] hover:border-app-accent/50",
              )}
            >
              <div className="text-sm font-medium">{theme.label}</div>
              <div className="mt-1 text-xs text-app-accent">{formatVnd(theme.priceVnd)}</div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground">Đã chọn {selected.length} set</div>
    </div>
  );
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/components/ThemePicker.test.tsx
git add src/features/order/components/ThemePicker.tsx src/features/order/components/ThemePicker.test.tsx
git commit -m "feat(order): ThemePicker với search + multi-select"
```

---

### Task 17: StickerAddon component

**Files:**
- Create: `src/features/order/components/StickerAddon.tsx`
- Create: `src/features/order/components/StickerAddon.test.tsx`

- [ ] **Step 1: Test**

```tsx
// src/features/order/components/StickerAddon.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StickerAddon } from "./StickerAddon";
import type { CatalogItem } from "@/features/order/catalog/types";

const sticker: CatalogItem = {
  itemId: "sticker:hynbee-round-v1",
  type: "sticker",
  label: "Sticker tròn HynBee",
  priceVnd: 15000,
  sortOrder: 1,
  isActive: true,
  maxQty: 5,
};

describe("StickerAddon", () => {
  it("collapsed by default; expand on toggle", () => {
    render(<StickerAddon sticker={sticker} value={null} onChange={() => {}} />);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /thêm sticker/i }));
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("clamps qty within [1, maxQty]", () => {
    const onChange = vi.fn();
    render(<StickerAddon sticker={sticker} value={{ itemId: sticker.itemId, qty: 1 }} onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith({ itemId: sticker.itemId, qty: 5 });
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/features/order/components/StickerAddon.tsx
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import { Button } from "@/components/ui/button";

export interface StickerAddonProps {
  sticker: CatalogItem | null;
  value: { itemId: string; qty: number } | null;
  onChange: (next: { itemId: string; qty: number } | null) => void;
}

export function StickerAddon({ sticker, value, onChange }: StickerAddonProps) {
  if (!sticker) return null;
  const expanded = Boolean(value);
  const maxQty = sticker.maxQty ?? 10;

  function setQty(raw: number) {
    const clamped = Math.max(1, Math.min(maxQty, Math.floor(raw)));
    onChange({ itemId: sticker.itemId, qty: clamped });
  }

  return (
    <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{sticker.label}</div>
          <div className="text-xs text-muted-foreground">{formatVnd(sticker.priceVnd)} / tờ</div>
        </div>
        {expanded ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Bỏ
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ itemId: sticker.itemId, qty: 1 })}>
            Thêm sticker
          </Button>
        )}
      </div>
      {expanded && value && (
        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="sticker-qty">Số lượng</label>
          <input
            id="sticker-qty"
            type="number"
            role="spinbutton"
            min={1}
            max={maxQty}
            value={value.qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-20 rounded border border-[color:var(--border)] px-2 py-1 text-sm"
          />
          <div className="text-xs text-muted-foreground">Tối đa {maxQty}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/components/StickerAddon.test.tsx
git add src/features/order/components/StickerAddon.tsx src/features/order/components/StickerAddon.test.tsx
git commit -m "feat(order): StickerAddon component với qty stepper"
```

---

### Task 18: IncludedItemsCard + ShippingForm + NotesField

**Files:**
- Create: `src/features/order/components/IncludedItemsCard.tsx`
- Create: `src/features/order/components/ShippingForm.tsx`
- Create: `src/features/order/components/NotesField.tsx`

- [ ] **Step 1: IncludedItemsCard**

```tsx
// src/features/order/components/IncludedItemsCard.tsx
import { Gift } from "lucide-react";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";

export function IncludedItemsCard() {
  return (
    <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Gift className="h-4 w-4 text-app-accent" />
        Mỗi đơn luôn kèm:
      </div>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {INCLUDED_DOCS.map((doc) => (
          <li key={doc.id}>• {doc.label}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: ShippingForm**

```tsx
// src/features/order/components/ShippingForm.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ShippingFormValue {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  goalId: string | null;
  goalTitle: string;
}

export interface ShippingFormProps {
  value: ShippingFormValue;
  onChange: (next: ShippingFormValue) => void;
  errors?: Partial<Record<keyof ShippingFormValue, string>>;
  goalOptions?: Array<{ id: string; title: string }>;
}

export function ShippingForm({ value, onChange, errors, goalOptions = [] }: ShippingFormProps) {
  function set<K extends keyof ShippingFormValue>(key: K, v: ShippingFormValue[K]) {
    onChange({ ...value, [key]: v });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="order-fullname">Họ và tên</Label>
        <Input id="order-fullname" value={value.fullName} onChange={(e) => set("fullName", e.target.value)} />
        {errors?.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
      </div>
      <div>
        <Label htmlFor="order-email">Email</Label>
        <Input id="order-email" type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
        {errors?.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="order-phone">Số điện thoại</Label>
        <Input id="order-phone" value={value.phone} onChange={(e) => set("phone", e.target.value)} />
        {errors?.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="order-address">Địa chỉ giao hàng</Label>
        <Input id="order-address" value={value.shippingAddress} onChange={(e) => set("shippingAddress", e.target.value)} />
        {errors?.shippingAddress && <p className="mt-1 text-xs text-destructive">{errors.shippingAddress}</p>}
      </div>
      {goalOptions.length > 0 && (
        <div className="sm:col-span-2">
          <Label htmlFor="order-goal">Gắn với mục tiêu (tuỳ chọn)</Label>
          <select
            id="order-goal"
            className="w-full rounded border border-[color:var(--border)] bg-card px-3 py-2 text-sm"
            value={value.goalId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const goal = goalOptions.find((g) => g.id === id);
              onChange({ ...value, goalId: id, goalTitle: goal?.title ?? "" });
            }}
          >
            <option value="">— Không gắn —</option>
            {goalOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: NotesField**

```tsx
// src/features/order/components/NotesField.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface NotesFieldValue {
  keywords: string[];
  note: string;
}

export interface NotesFieldProps {
  value: NotesFieldValue;
  onChange: (next: NotesFieldValue) => void;
}

export function NotesField({ value, onChange }: NotesFieldProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="order-keywords">Từ khoá in lên kit (phân cách bằng dấu phẩy)</Label>
        <Input
          id="order-keywords"
          value={value.keywords.join(", ")}
          onChange={(e) => onChange({ ...value, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
        />
      </div>
      <div>
        <Label htmlFor="order-note">Ghi chú cho shop</Label>
        <Textarea id="order-note" rows={3} value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/order/components/IncludedItemsCard.tsx src/features/order/components/ShippingForm.tsx src/features/order/components/NotesField.tsx
git commit -m "feat(order): IncludedItemsCard + ShippingForm + NotesField"
```

---

### Task 19: OrderSummary component

**Files:**
- Create: `src/features/order/components/OrderSummary.tsx`
- Create: `src/features/order/components/OrderSummary.test.tsx`

- [ ] **Step 1: Test**

```tsx
// src/features/order/components/OrderSummary.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderSummary } from "./OrderSummary";

describe("OrderSummary", () => {
  it("renders lines + total + included items", () => {
    render(
      <OrderSummary
        lines={[
          { itemId: "frame:30x40", label: "Khung 30×40", type: "frame", qty: 1, unitPriceVnd: 119000, lineTotalVnd: 119000 },
        ]}
        subtotalVnd={119000}
        shippingVnd={0}
        totalVnd={119000}
        isSubmittable
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText(/Khung 30×40/)).toBeInTheDocument();
    expect(screen.getByText(/Tổng đơn/)).toBeInTheDocument();
    expect(screen.getByText(/Tờ hướng dẫn SMART Goal/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt đơn/ })).toBeEnabled();
  });

  it("disables CTA when not submittable", () => {
    render(<OrderSummary lines={[]} subtotalVnd={0} shippingVnd={0} totalVnd={0} isSubmittable={false} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /Đặt đơn/ })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/features/order/components/OrderSummary.tsx
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/features/order/lib/pricing";
import type { OrderLine } from "@/features/order/storage/order";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";

export interface OrderSummaryProps {
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  isSubmittable: boolean;
  isSubmitting?: boolean;
  onSubmit: () => void;
}

export function OrderSummary({ lines, subtotalVnd, shippingVnd, totalVnd, isSubmittable, isSubmitting, onSubmit }: OrderSummaryProps) {
  return (
    <aside className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Đơn hàng của bạn</h3>

      <div className="mt-3 space-y-2 text-sm">
        {lines.length === 0 && <p className="text-muted-foreground">Chưa chọn sản phẩm.</p>}
        {lines.map((line) => (
          <div key={`${line.itemId}-${line.qty}`} className="flex items-start justify-between gap-2">
            <div>
              <div>{line.label}</div>
              {line.qty > 1 && <div className="text-xs text-muted-foreground">× {line.qty}</div>}
            </div>
            <div className="shrink-0 tabular-nums">{formatVnd(line.lineTotalVnd)}</div>
          </div>
        ))}
        {INCLUDED_DOCS.map((doc) => (
          <div key={doc.id} className="flex items-start justify-between gap-2 text-muted-foreground">
            <div>{doc.label}</div>
            <div className="shrink-0">Tặng kèm — 0đ</div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 border-t border-[color:var(--border)] pt-3 text-sm">
        <div className="flex justify-between"><span>Tạm tính</span><span className="tabular-nums">{formatVnd(subtotalVnd)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Phí ship</span><span className="tabular-nums">{shippingVnd === 0 ? "Liên hệ" : formatVnd(shippingVnd)}</span></div>
        <div className="mt-2 flex justify-between text-base font-semibold">
          <span>Tổng đơn</span>
          <span className="tabular-nums">{formatVnd(totalVnd)}</span>
        </div>
      </div>

      <Button type="button" className="mt-4 w-full" disabled={!isSubmittable || isSubmitting} onClick={onSubmit}>
        {isSubmitting ? "Đang gửi..." : `Đặt đơn — ${formatVnd(totalVnd)}`}
      </Button>
    </aside>
  );
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/components/OrderSummary.test.tsx
git add src/features/order/components/OrderSummary.tsx src/features/order/components/OrderSummary.test.tsx
git commit -m "feat(order): OrderSummary với live total + included items"
```

---

### Task 20: OrderPage orchestration

**Files:**
- Create: `src/features/order/pages/OrderPage.tsx`
- Create: `src/features/order/pages/OrderPage.test.tsx`

- [ ] **Step 1: Test integration**

```tsx
// src/features/order/pages/OrderPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrderPage from "./OrderPage";
import { DEFAULT_CATALOG } from "@/features/order/catalog/defaults";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (typeof url === "string" && url.includes("/api/order-catalog")) {
      return Promise.resolve({ ok: true, json: async () => ({ data: DEFAULT_CATALOG }) });
    }
    if (typeof url === "string" && url.includes("/api/orders")) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: "srv-1" } }) });
    }
    return Promise.reject(new Error("unhandled"));
  }));
});

describe("OrderPage", () => {
  it("submits with itemId[] (no priceVnd) and saves localStorage", async () => {
    render(<MemoryRouter><OrderPage /></MemoryRouter>);
    await screen.findByText(/Khung 30×40/);

    fireEvent.click(screen.getByText(/Khung 30×40/));
    fireEvent.click(screen.getByText("MONEY"));

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: "A B" } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: "0900000000" } });
    fireEvent.change(screen.getByLabelText(/Địa chỉ giao hàng/), { target: { value: "Hanoi" } });

    fireEvent.click(screen.getByRole("button", { name: /Đặt đơn/ }));

    await waitFor(() => {
      const calls = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const submitCall = calls.find((c) => typeof c[0] === "string" && c[0].includes("/api/orders"));
      expect(submitCall).toBeDefined();
      const body = JSON.parse(submitCall![1]!.body as string);
      expect(body.itemIds).toEqual(["frame:30x40", "theme:money"]);
      expect("priceVnd" in body).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Implement page**

```tsx
// src/features/order/pages/OrderPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderCatalog } from "@/features/order/hooks/useOrderCatalog";
import { buildOrderLines, calcShipping, calcSubtotal, calcTotal, type OrderDraft } from "@/features/order/lib/pricing";
import { validateOrderDraft } from "@/features/order/lib/validators";
import { createLocalOrder } from "@/features/order/storage/order";
import { FrameSizePicker } from "../components/FrameSizePicker";
import { ThemePicker } from "../components/ThemePicker";
import { StickerAddon } from "../components/StickerAddon";
import { IncludedItemsCard } from "../components/IncludedItemsCard";
import { ShippingForm, type ShippingFormValue } from "../components/ShippingForm";
import { NotesField, type NotesFieldValue } from "../components/NotesField";
import { OrderSummary } from "../components/OrderSummary";

export function OrderPage() {
  const navigate = useNavigate();
  const { catalog, isLoading, isFromFallback } = useOrderCatalog();
  const [draft, setDraft] = useState<OrderDraft>({ frameItemId: null, themeItemIds: [], stickerSelection: null });
  const [shipping, setShipping] = useState<ShippingFormValue>({ fullName: "", email: "", phone: "", shippingAddress: "", goalId: null, goalTitle: "" });
  const [notes, setNotes] = useState<NotesFieldValue>({ keywords: [], note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const frames = useMemo(() => catalog.filter((i) => i.type === "frame"), [catalog]);
  const themes = useMemo(() => catalog.filter((i) => i.type === "theme"), [catalog]);
  const sticker = useMemo(() => catalog.find((i) => i.type === "sticker") ?? null, [catalog]);

  const lines = useMemo(() => buildOrderLines(draft, catalog), [draft, catalog]);
  const subtotal = calcSubtotal(lines);
  const shippingCost = calcShipping(draft);
  const total = calcTotal(subtotal, shippingCost);

  const validation = validateOrderDraft({ draft, shipping, catalog });

  async function handleSubmit() {
    if (!validation.ok) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        itemIds: [
          ...(draft.frameItemId ? [draft.frameItemId] : []),
          ...draft.themeItemIds,
        ],
        sticker: draft.stickerSelection,
        fullName: shipping.fullName,
        email: shipping.email,
        phone: shipping.phone,
        shippingAddress: shipping.shippingAddress,
        goalId: shipping.goalId,
        goalTitle: shipping.goalTitle,
        keywords: notes.keywords,
        note: notes.note,
      };
      let serverId: string | null = null;
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = (await res.json()) as { data: { id: string } };
          serverId = json.data.id;
        }
      } catch {
        // offline / fail: lưu local-only
      }
      const order = createLocalOrder({
        lines, subtotalVnd: subtotal, shippingVnd: shippingCost, totalVnd: total,
        fullName: shipping.fullName, email: shipping.email, phone: shipping.phone,
        shippingAddress: shipping.shippingAddress,
        goalId: shipping.goalId, goalTitle: shipping.goalTitle,
        keywords: notes.keywords, note: notes.note,
      });
      navigate(`/order-status/${serverId ?? order.id}`);
    } catch (err) {
      setSubmitError("Không thể tạo đơn lúc này. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold">Đặt kit Vision Board</h1>
      <p className="mt-1 text-sm text-muted-foreground">Chọn khung gỗ, set ảnh chủ đề và sticker (tuỳ chọn).</p>

      {isFromFallback && (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Đang dùng giá đã lưu — vui lòng kiểm tra lại trước khi đặt.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <IncludedItemsCard />

          <section>
            <h2 className="mb-3 text-base font-semibold">1. Chọn kích thước khung</h2>
            {isLoading ? <SkeletonRow /> : <FrameSizePicker frames={frames} selected={draft.frameItemId} onChange={(id) => setDraft((d) => ({ ...d, frameItemId: id }))} />}
            {validation.ok === false && validation.errors.frame && <p className="mt-1 text-xs text-destructive">{validation.errors.frame}</p>}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">2. Chọn set ảnh chủ đề</h2>
            {isLoading ? <SkeletonGrid /> : <ThemePicker themes={themes} selected={draft.themeItemIds} onChange={(ids) => setDraft((d) => ({ ...d, themeItemIds: ids }))} />}
            {validation.ok === false && validation.errors.themes && <p className="mt-1 text-xs text-destructive">{validation.errors.themes}</p>}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">3. Sticker (tuỳ chọn)</h2>
            <StickerAddon sticker={sticker} value={draft.stickerSelection} onChange={(v) => setDraft((d) => ({ ...d, stickerSelection: v }))} />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">4. Thông tin giao hàng</h2>
            <ShippingForm
              value={shipping}
              onChange={setShipping}
              errors={validation.ok === false ? validation.errors : undefined}
            />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">5. Ghi chú</h2>
            <NotesField value={notes} onChange={setNotes} />
          </section>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <OrderSummary
            lines={lines}
            subtotalVnd={subtotal}
            shippingVnd={shippingCost}
            totalVnd={total}
            isSubmittable={validation.ok}
            isSubmitting={submitting}
            onSubmit={handleSubmit}
          />
          {submitError && <p className="mt-2 text-xs text-destructive">{submitError}</p>}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return <div className="grid grid-cols-3 gap-3"><div className="h-20 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded bg-muted" /></div>;
}
function SkeletonGrid() {
  return <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded bg-muted" />)}</div>;
}

export default OrderPage;
```

- [ ] **Step 3: Test pass; commit**

```bash
npx vitest run src/features/order/pages/OrderPage.test.tsx
git add src/features/order/pages/
git commit -m "feat(order): OrderPage orchestration với 2-cột + submit flow"
```

---

### Task 21: Storage shim + route swap

**Files:**
- Modify: `src/app/utils/order-storage.ts` (chuyển thành shim)
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Convert shim**

Đè toàn bộ `src/app/utils/order-storage.ts`:
```ts
// src/app/utils/order-storage.ts
// DEPRECATED: re-export từ features/order/storage. Các import mới nên dùng @/features/order/storage/order.
export {
  getOrders,
  getOrderById,
  createLocalOrder,
  getLatestOrder,
  ORDER_STORAGE_KEY,
  ORDER_SCHEMA_VERSION,
} from "@/features/order/storage/order";
export type {
  LocalOrder,
  LocalOrderV2,
  OrderLine,
  OrderStatus,
  CreateLocalOrderInput,
} from "@/features/order/storage/order";

// Legacy helpers — không dùng nữa, nhưng giữ stub để build không vỡ ở consumer cũ.
export type OrderKitType = string; // deprecated
export function getKitTypeLabel(_kitType: string): string {
  return "Kit Vision Board"; // legacy fallback
}
```

- [ ] **Step 2: Update routes**

Trong `src/app/routes.tsx`, đổi:
```diff
- path: "order",
- ...lazyRoute(() => import("./pages/OrderPage"), "OrderPage"),
+ path: "order",
+ ...lazyRoute(() => import("@/features/order/pages/OrderPage"), "OrderPage"),
```

Xoá file cũ `src/app/pages/OrderPage.tsx`:
```bash
git rm src/app/pages/OrderPage.tsx
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/app/utils/order-storage.ts src/app/routes.tsx
git commit -m "refactor(order): shim order-storage + swap route OrderPage sang feature module"
```

---

## Phase 2 — Backend OrderModel + POST /api/orders + Admin UI

### Task 22: Update `OrderModel` schema

**Files:**
- Modify: `backend/src/models/OrderModel.ts`

- [ ] **Step 1: Add subdocument schemas + new fields**

Trong `backend/src/models/OrderModel.ts`, thêm trước `orderSchema`:
```ts
const orderLineSchema = new Schema(
  {
    itemId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["frame", "theme", "sticker"] },
    qty: { type: Number, required: true, min: 1 },
    unitPriceVnd: { type: Number, required: true, min: 0 },
    lineTotalVnd: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);
```

Trong `orderSchema`, thêm các trường mới (đặt `kitType` thành optional, gắn comment deprecated):
```ts
lines: { type: [orderLineSchema], default: [] },
subtotalVnd: { type: Number, default: 0, min: 0 },
shippingVnd: { type: Number, default: 0, min: 0 },
totalVnd: { type: Number, default: 0, min: 0 },
schemaVersion: { type: Number, default: 2 },
keywords: { type: [String], default: [] },
// kitType: deprecated kể từ v2, giữ optional để rollback
kitType: { type: String, required: false, trim: true },
```

- [ ] **Step 2: Typecheck**

```bash
npm --prefix backend run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/models/OrderModel.ts
git commit -m "feat(backend): OrderModel thêm lines/pricing, kitType optional"
```

---

### Task 23: Update `POST /api/orders` — server-side authoritative pricing

**Files:**
- Modify: `backend/src/controllers/orderController.ts` (file đang xử lý POST /api/orders)
- Modify: `backend/src/tests/orderRoutes.test.ts`

- [ ] **Step 1: Test**

```ts
// orderRoutes.test.ts — thêm describe block
import { OrderCatalogModel } from "../models/OrderCatalogModel";

describe("POST /api/orders v2", () => {
  beforeEach(async () => {
    await OrderCatalogModel.deleteMany({});
    await OrderCatalogModel.create([
      { itemId: "frame:30x40", type: "frame", label: "F", priceVnd: 119000, isActive: true },
      { itemId: "theme:money", type: "theme", label: "M", priceVnd: 18000, isActive: true },
    ]);
  });

  it("computes pricing server-side from catalog", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${process.env.TEST_USER_TOKEN}`)
      .send({
        itemIds: ["frame:30x40", "theme:money"],
        sticker: null,
        fullName: "A", email: "a@b.c", phone: "1",
        shippingAddress: "X", goalId: null, goalTitle: "",
        keywords: [], note: "",
        priceVnd: 999999, // tamper attempt — phải bị ignore
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subtotalVnd).toBe(137000);
    expect(res.body.data.totalVnd).toBe(137000);
  });

  it("rejects payload with legacy kitType field", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${process.env.TEST_USER_TOKEN}`)
      .send({ kitType: "vision-kit", fullName: "A", email: "a@b.c", phone: "1", shippingAddress: "X" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/phiên bản cũ/i);
  });
});
```

- [ ] **Step 2: Implement controller logic**

Trong `backend/src/controllers/orderController.ts`, sửa hàm tạo order (tên hiện tại thường là `createOrder`):
```ts
import { OrderCatalogModel } from "../models/OrderCatalogModel";

export async function createOrder(req: Request, res: Response) {
  const body = req.body ?? {};
  if (typeof body.kitType === "string") {
    return res.status(400).json({ error: "Phiên bản cũ, vui lòng tải lại trang" });
  }
  const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds.filter((id: unknown) => typeof id === "string") : [];
  if (itemIds.length === 0) return res.status(400).json({ error: "itemIds rỗng" });

  const items = await OrderCatalogModel.find({ itemId: { $in: itemIds }, isActive: true }).lean();
  const byId = new Map(items.map((i) => [i.itemId, i]));
  const missing = itemIds.filter((id) => !byId.has(id));
  if (missing.length) return res.status(400).json({ error: `Items không khả dụng: ${missing.join(", ")}` });

  const lines = itemIds.map((id) => {
    const item = byId.get(id)!;
    return {
      itemId: item.itemId,
      label: item.label,
      type: item.type,
      qty: 1,
      unitPriceVnd: item.priceVnd,
      lineTotalVnd: item.priceVnd,
    };
  });

  if (body.sticker && typeof body.sticker.itemId === "string") {
    const stickerItem = await OrderCatalogModel.findOne({ itemId: body.sticker.itemId, isActive: true, type: "sticker" });
    if (!stickerItem) return res.status(400).json({ error: "Sticker không khả dụng" });
    const qty = Math.max(1, Math.min(stickerItem.maxQty ?? 10, Math.floor(Number(body.sticker.qty) || 1)));
    lines.push({
      itemId: stickerItem.itemId,
      label: stickerItem.label,
      type: stickerItem.type,
      qty,
      unitPriceVnd: stickerItem.priceVnd,
      lineTotalVnd: stickerItem.priceVnd * qty,
    });
  }

  const subtotalVnd = lines.reduce((s, l) => s + l.lineTotalVnd, 0);
  const shippingVnd = 0;
  const totalVnd = subtotalVnd + shippingVnd;

  // Persist; userId tuỳ middleware auth
  const order = await OrderModel.create({
    userId: req.user?.id ?? "anon",
    status: "pending",
    lines,
    subtotalVnd,
    shippingVnd,
    totalVnd,
    schemaVersion: 2,
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    shippingAddress: typeof body.shippingAddress === "string"
      ? { line1: body.shippingAddress, city: "", country: "VN" }
      : body.shippingAddress,
    keywords: Array.isArray(body.keywords) ? body.keywords.filter((k: unknown) => typeof k === "string") : [],
    note: typeof body.note === "string" ? body.note : "",
    goalSnapshot: body.goalId ? { goalId: body.goalId, title: body.goalTitle ?? "" } : undefined,
  });

  res.status(201).json({ data: order });
}
```

- [ ] **Step 3: Test pass; commit**

```bash
npm --prefix backend test -- orderRoutes.test
git add backend/src/controllers/orderController.ts backend/src/tests/orderRoutes.test.ts
git commit -m "feat(backend): POST /api/orders v2 với server-side pricing"
```

---

### Task 24: AdminCatalogPage UI

**Files:**
- Create: `src/app/pages/AdminCatalogPage.tsx`

- [ ] **Step 1: Implement page**

```tsx
// src/app/pages/AdminCatalogPage.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CatalogItem, CatalogItemType } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";

async function adminFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function AdminCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const json = await adminFetch("/api/admin/order-catalog");
      setItems(json.data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function updatePrice(itemId: string, priceVnd: number) {
    setSaving(itemId);
    const prev = items;
    setItems(items.map((i) => i.itemId === itemId ? { ...i, priceVnd } : i));
    try {
      await adminFetch(`/api/admin/order-catalog/${encodeURIComponent(itemId)}`, {
        method: "PUT",
        body: JSON.stringify({ priceVnd }),
      });
    } catch (err) {
      setItems(prev);
      setError(`Lỗi lưu: ${err}`);
    } finally {
      setSaving(null);
    }
  }

  async function toggleActive(itemId: string, isActive: boolean) {
    setSaving(itemId);
    const prev = items;
    setItems(items.map((i) => i.itemId === itemId ? { ...i, isActive } : i));
    try {
      await adminFetch(`/api/admin/order-catalog/${encodeURIComponent(itemId)}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    } catch (err) {
      setItems(prev);
      setError(`Lỗi lưu: ${err}`);
    } finally {
      setSaving(null);
    }
  }

  function renderTab(type: CatalogItemType) {
    const list = items.filter((i) => i.type === type).sort((a, b) => a.sortOrder - b.sortOrder);
    return (
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th>Item ID</th><th>Tên</th><th>Giá (đ)</th><th>Trạng thái</th></tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.itemId} className="border-t border-[color:var(--border)]">
              <td className="py-2 font-mono text-xs">{item.itemId}</td>
              <td>{item.label}</td>
              <td>
                <Input
                  type="number"
                  className="w-32"
                  defaultValue={item.priceVnd}
                  disabled={saving === item.itemId}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v) || v < 0) return;
                    if (v !== item.priceVnd) void updatePrice(item.itemId, v);
                  }}
                />
                <span className="ml-2 text-xs text-muted-foreground">{formatVnd(item.priceVnd)}</span>
              </td>
              <td>
                <Button
                  type="button"
                  variant={item.isActive ? "default" : "outline"}
                  size="sm"
                  disabled={saving === item.itemId}
                  onClick={() => void toggleActive(item.itemId, !item.isActive)}
                >
                  {item.isActive ? "Đang bán" : "Đã ẩn"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (loading) return <div className="p-6">Đang tải catalog...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Quản lý catalog đơn kit</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sửa giá, ẩn/hiện sản phẩm. Thay đổi áp dụng ngay khi user reload trang đặt đơn.</p>
      {error && <div className="mt-3 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

      <Tabs defaultValue="frame" className="mt-6">
        <TabsList>
          <TabsTrigger value="frame">Khung gỗ</TabsTrigger>
          <TabsTrigger value="theme">Set ảnh chủ đề</TabsTrigger>
          <TabsTrigger value="sticker">Sticker</TabsTrigger>
        </TabsList>
        <TabsContent value="frame">{renderTab("frame")}</TabsContent>
        <TabsContent value="theme">{renderTab("theme")}</TabsContent>
        <TabsContent value="sticker">{renderTab("sticker")}</TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminCatalogPage;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/AdminCatalogPage.tsx
git commit -m "feat(admin): AdminCatalogPage sửa giá + toggle active"
```

---

### Task 25: Mount `/admin/catalog` route + sidebar

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/app/components/root-layout/navConfig.ts` (hoặc `AppSidebar.tsx` nếu nav inline)

- [ ] **Step 1: Add route**

Trong `routes.tsx`, gần `path: "admin/orders"`:
```ts
{
  path: "admin/catalog",
  ...lazyRoute(() => import("./pages/AdminCatalogPage"), "AdminCatalogPage"),
},
```

- [ ] **Step 2: Add nav item**

Trong `navConfig.ts` section admin:
```ts
{
  id: "admin-catalog",
  label: "Quản lý catalog",
  href: "/admin/catalog",
  icon: "Package", // hoặc tên icon Lucide tương ứng pattern hiện có
  requiresAdmin: true,
},
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/app/routes.tsx src/app/components/root-layout/navConfig.ts
git commit -m "feat(admin): mount /admin/catalog + sidebar nav item"
```

---

## Phase 3 — Cập nhật consumers + cắt liên kết Vision Board

### Task 26: Update `OrderStatusPage` render `lines[]`

**Files:**
- Modify: `src/app/pages/OrderStatusPage.tsx`

- [ ] **Step 1: Tìm khu vực render kitType**

```bash
grep -n "kitType\|getKitTypeLabel" src/app/pages/OrderStatusPage.tsx
```

- [ ] **Step 2: Thay khu vực đó**

Xoá tất cả import + usage của `getKitTypeLabel`, `OrderKitType`. Thay block hiển thị chi tiết đơn bằng:

```tsx
import { formatVnd } from "@/features/order/lib/pricing";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";

{/* trong JSX */}
<section className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-4">
  <h3 className="text-base font-semibold">Chi tiết đơn</h3>
  <ul className="mt-3 space-y-2 text-sm">
    {order.lines.map((line) => (
      <li key={`${line.itemId}-${line.qty}`} className="flex justify-between">
        <span>{line.label}{line.qty > 1 ? ` × ${line.qty}` : ""}</span>
        <span className="tabular-nums">{formatVnd(line.lineTotalVnd)}</span>
      </li>
    ))}
    {INCLUDED_DOCS.map((doc) => (
      <li key={doc.id} className="flex justify-between text-muted-foreground">
        <span>{doc.label}</span>
        <span>Tặng kèm — 0đ</span>
      </li>
    ))}
  </ul>
  <div className="mt-4 flex justify-between border-t border-[color:var(--border)] pt-3 text-base font-semibold">
    <span>Tổng đơn</span>
    <span className="tabular-nums">{formatVnd(order.totalVnd)}</span>
  </div>
</section>

{order.note?.includes("[Đơn cũ") && (
  <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
    Đơn này được tạo từ phiên bản trước. Vui lòng liên hệ shop để xác nhận chi tiết và giá.
  </div>
)}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/app/pages/OrderStatusPage.tsx
git commit -m "feat(order): OrderStatusPage render lines[] + banner đơn cũ"
```

---

### Task 27: Update `AdminOrdersPage` cột + filter

**Files:**
- Modify: `src/app/pages/AdminOrdersPage.tsx`

- [ ] **Step 1: Tìm cột kitType + filter**

```bash
grep -n "kitType\|getKitTypeLabel" src/app/pages/AdminOrdersPage.tsx
```

- [ ] **Step 2: Thay cột bảng**

Đổi tiêu đề + cell:
```tsx
// cũ: <th>Loại kit</th>
<th>Khung</th>
<th>Số set ảnh</th>

// cũ: <td>{getKitTypeLabel(order.kitType)}</td>
<td>{order.lines.find((l) => l.type === "frame")?.label ?? "—"}</td>
<td>{order.lines.filter((l) => l.type === "theme").length}</td>
```

- [ ] **Step 3: Thay filter dropdown**

```tsx
// cũ filter kitType options
<select value={frameFilter} onChange={(e) => setFrameFilter(e.target.value)}>
  <option value="">Tất cả khung</option>
  <option value="frame:20x30">20×30</option>
  <option value="frame:30x40">30×40</option>
  <option value="frame:40x60">40×60</option>
</select>

// và logic filter:
const filtered = orders.filter((o) => !frameFilter || o.lines.some((l) => l.itemId === frameFilter));
```

- [ ] **Step 4: Detail dialog — list lines**

Tìm dialog hiển thị order detail, thay render `kitType` bằng bảng lines (tương tự Task 26).

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/app/pages/AdminOrdersPage.tsx
git commit -m "feat(admin): AdminOrdersPage cột Khung/Set ảnh + filter mới"
```

---

### Task 28: Cắt CTA Vision Board → Order

**Files:**
- Modify: `src/app/pages/VisionBoardEditor.tsx`
- Modify: `src/app/pages/VisionBoardGallery.tsx`

- [ ] **Step 1: Grep CTA**

```bash
grep -n 'navigate.*order\|"/order"\|/order"\|visionBoardId' src/app/pages/VisionBoardEditor.tsx src/app/pages/VisionBoardGallery.tsx src/services/visionBoardService.ts
```

- [ ] **Step 2: Xoá toàn bộ**

- Xoá button/link dẫn `/order` từ board.
- Xoá `navigate("/order", { state: { visionBoardId, goalId } })`.
- Giữ nguyên các chức năng vẽ/sửa board.

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/app/pages/VisionBoardEditor.tsx src/app/pages/VisionBoardGallery.tsx
git commit -m "refactor(vision-board): cắt mọi CTA dẫn sang /order"
```

---

### Task 29: Cập nhật `Dashboard`, `Achievements`, fixtures, e2e tests

**Files:**
- Modify: `src/app/pages/Dashboard.tsx`
- Modify: `src/app/pages/Achievements.tsx`
- Modify: `src/test/fixtures/coreFunnelScenarios.ts`
- Modify: `src/app/pages/authenticated-core-flow.e2e.test.tsx`

- [ ] **Step 1: Grep tất cả nơi còn ref kitType**

```bash
grep -rn "kitType\|getKitTypeLabel\|OrderKitType\|vision-kit\|focus-kit\|reset-kit" src/ | grep -v ".test." | grep -v "order-storage.ts"
```

- [ ] **Step 2: Sửa từng file**

- `Dashboard.tsx`, `Achievements.tsx`: nơi nào đang đọc `order.kitType` để hiển thị → thay bằng `order.lines[0]?.label`.
- `coreFunnelScenarios.ts`: build fixture order v2 (có `lines`, `subtotalVnd`, `totalVnd`).
- `authenticated-core-flow.e2e.test.tsx`: cập nhật assertions để khớp UI mới.

- [ ] **Step 3: Run test → fix; commit**

```bash
npm run test:run
git add src/app/pages/Dashboard.tsx src/app/pages/Achievements.tsx src/test/fixtures/coreFunnelScenarios.ts src/app/pages/authenticated-core-flow.e2e.test.tsx
git commit -m "refactor: cập nhật consumers + fixtures dùng order schema v2"
```

---

### Task 30: Backend migration script orders v1 → v2 (production data)

**Files:**
- Create: `backend/src/scripts/migrateOrdersV1ToV2.ts`

- [ ] **Step 1: Implement**

```ts
// backend/src/scripts/migrateOrdersV1ToV2.ts
import mongoose from "mongoose";
import { OrderModel } from "../models/OrderModel";
import { connectDb } from "../config/db";

async function run() {
  await connectDb();
  const cursor = OrderModel.find({ $or: [{ schemaVersion: { $exists: false } }, { schemaVersion: { $lt: 2 } }] }).cursor();
  let migrated = 0;
  for await (const doc of cursor) {
    const kitTypeMarker = doc.get("kitType") ? `[Đơn cũ — kitType: ${doc.get("kitType")}]` : "[Đơn cũ]";
    const note = doc.get("note") ?? "";
    doc.set("lines", [
      { itemId: "frame:30x40", label: "Khung 30×40 cm", type: "frame", qty: 1, unitPriceVnd: 0, lineTotalVnd: 0 },
    ]);
    doc.set("subtotalVnd", 0);
    doc.set("shippingVnd", 0);
    doc.set("totalVnd", 0);
    doc.set("schemaVersion", 2);
    doc.set("note", note ? `${note}\n\n${kitTypeMarker}` : kitTypeMarker);
    await doc.save();
    migrated += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Migrated ${migrated} orders to v2`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch((err) => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 2: Smoke test (chạy trên DB dev)**

```bash
npm --prefix backend exec -- tsx src/scripts/migrateOrdersV1ToV2.ts
npm --prefix backend exec -- tsx src/scripts/migrateOrdersV1ToV2.ts
```
Expected: lần 1 migrate N orders, lần 2 migrate 0 (idempotent).

- [ ] **Step 3: Commit**

```bash
git add backend/src/scripts/migrateOrdersV1ToV2.ts
git commit -m "feat(backend): script migrate orders v1 → v2 (idempotent)"
```

---

## Phase 4 — Final Verification

### Task 31: Full check + smoke

- [ ] **Step 1: Frontend typecheck + lint + test + build**

```bash
npm run check
```
Expected: 0 error, tất cả test pass.

- [ ] **Step 2: Backend typecheck + test**

```bash
npm --prefix backend run check
```
Expected: 0 error.

- [ ] **Step 3: Final grep sạch**

```bash
grep -rn "getKitTypeLabel\|OrderKitType\|kitType" src/ backend/src/ | grep -v ".test." | grep -v "// DEPRECATED" | grep -v "order-storage.ts" | grep -v "OrderModel.ts" | grep -v "migrate"
```
Expected: rỗng (không còn ref ngoài shim + model + migration).

- [ ] **Step 4: Smoke MVP**

```bash
npm run smoke:mvp1
```
Expected: pass nếu environment có sẵn (browser + dev server). Nếu thiếu, ghi nhận skip.

- [ ] **Step 5: Manual test**

1. Mở `/order`, chọn frame 30×40 + 2 theme + sticker qty 2 + điền shipping → submit → navigate `/order-status/:id`, summary đúng.
2. Login admin → `/admin/catalog` → sửa giá frame 20×30 → `/order` reload thấy giá mới.
3. Seed `localStorage` 1 order v1 cũ → mở `/order-status/<id>` → thấy banner "Đơn cũ".
4. Mở `/vision-board/...` → không còn CTA dẫn sang `/order`.

- [ ] **Step 6: Final commit (nếu có fix)**

```bash
git status
# nếu có lint/format fixes:
git add -A
git commit -m "chore: final lint/format pass cho order module"
```

---

## Acceptance criteria (cuối plan)

1. `npm run check` pass.
2. `npm --prefix backend run check` pass.
3. `/order` chọn frame + ≥1 theme + sticker optional, tổng đơn live đúng, submit thành công.
4. `/admin/catalog` admin sửa giá → reload `/order` thấy giá mới.
5. Orders v1 cũ trong localStorage hiển thị được ở `/order-status/:id` với banner "Đơn cũ".
6. `npm run smoke:mvp1` pass nếu môi trường có sẵn.
7. Không còn import `getKitTypeLabel` / `OrderKitType` ngoài shim.
8. Vision Board features chạy bình thường, không còn navigate sang `/order` từ board.

