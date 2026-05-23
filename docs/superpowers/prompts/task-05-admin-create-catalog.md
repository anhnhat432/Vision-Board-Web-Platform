# Task 5 — Admin `POST /api/admin/order-catalog` (create)

> Copy toàn bộ phần dưới `---` để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**.

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Plan: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
- Tiền đề: Tasks 1-4 đã xong.

Hãy thực hiện **Task 5: Admin endpoint `POST /api/admin/order-catalog`** (tạo catalog item mới) theo TDD.

## Mục tiêu

Endpoint admin tạo item mới với validation: `itemId` format `^(frame|theme|sticker):[a-z0-9-]+$`, `priceVnd >= 0`, `type` đúng enum. Ghi audit log qua `logAdminAction`.

## Steps

### 1. Thêm test

Append vào `backend/src/tests/orderCatalogRoutes.test.ts`:

```ts
describe("POST /api/admin/order-catalog", () => {
  it("creates item and logs audit", async () => {
    const res = await request(app)
      .post("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ itemId: "sticker:new-x", type: "sticker", label: "New X", priceVnd: 20000, maxQty: 5 });
    expect(res.status).toBe(201);
    const created = await OrderCatalogModel.findOne({ itemId: "sticker:new-x" });
    expect(created).toBeTruthy();
  });

  it("rejects invalid itemId format", async () => {
    const res = await request(app)
      .post("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ itemId: "bogus", type: "frame", label: "X", priceVnd: 100 });
    expect(res.status).toBe(400);
  });

  it("rejects priceVnd negative", async () => {
    const res = await request(app)
      .post("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ itemId: "frame:bad", type: "frame", label: "Bad", priceVnd: -1 });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate itemId", async () => {
    await OrderCatalogModel.create({ itemId: "frame:20x30", type: "frame", label: "X", priceVnd: 100 });
    const res = await request(app)
      .post("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ itemId: "frame:20x30", type: "frame", label: "Dup", priceVnd: 100 });
    expect(res.status).toBe(409);
  });
});
```

### 2. Chạy test → fail

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

### 3. Thêm controller

Append vào `backend/src/controllers/orderCatalogController.ts`:

```ts
const ITEM_ID_RE = /^(frame|theme|sticker):[a-z0-9-]+$/;

export async function createCatalogItem(req: Request, res: Response) {
  const { itemId, type, label, description, priceVnd, thumbnail, sortOrder, isActive, maxQty } = req.body ?? {};

  if (typeof itemId !== "string" || !ITEM_ID_RE.test(itemId)) {
    return res.status(400).json({ error: "Invalid itemId format" });
  }
  if (!["frame", "theme", "sticker"].includes(type)) {
    return res.status(400).json({ error: "Invalid type" });
  }
  if (typeof label !== "string" || !label.trim()) {
    return res.status(400).json({ error: "label required" });
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

### 4. Mount + audit log trong `adminRoutes.ts`

Đọc `adminRoutes.ts` để xem repo dùng helper `logAdminAction` thế nào. Có thể có hàm wrap như `auditedAdminAction(...)`. Follow pattern đó.

Nếu không có wrapper, viết kiểu:

```ts
import { createCatalogItem } from "../controllers/orderCatalogController";

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

Quan trọng: `logAdminAction` có thể có signature khác — đọc `backend/src/services/auditLogService.ts` để biết.

### 5. Chạy test → pass

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

### 6. Commit

```bash
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin POST /api/admin/order-catalog với audit log"
```

## Quy tắc

- Follow pattern admin route hiện có (đặc biệt audit log).
- Báo cáo cuối: hash commit + test output (4 tests pass).

Bắt đầu làm.
