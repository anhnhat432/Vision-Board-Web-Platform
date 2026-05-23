# Task 6 — Admin `PUT /api/admin/order-catalog/:itemId` (update)

> Copy toàn bộ phần dưới `---` để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**.

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Plan: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
- Tiền đề: Tasks 1-5 đã xong.

Hãy thực hiện **Task 6: Admin endpoint `PUT /api/admin/order-catalog/:itemId`** (cập nhật item) theo TDD.

## Mục tiêu

Endpoint admin cập nhật các field cho phép: `label`, `description`, `priceVnd`, `thumbnail`, `sortOrder`, `maxQty`. Không cho đổi `itemId` hoặc `type`. Validate `priceVnd >= 0`. Ghi audit log.

## Steps

### 1. Thêm test

Append vào `backend/src/tests/orderCatalogRoutes.test.ts`:

```ts
describe("PUT /api/admin/order-catalog/:itemId", () => {
  it("updates price and label", async () => {
    await OrderCatalogModel.create({ itemId: "frame:20x30", type: "frame", label: "Old", priceVnd: 50000 });
    const res = await request(app)
      .put("/api/admin/order-catalog/frame:20x30")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ label: "New", priceVnd: 60000 });
    expect(res.status).toBe(200);
    const updated = await OrderCatalogModel.findOne({ itemId: "frame:20x30" });
    expect(updated?.label).toBe("New");
    expect(updated?.priceVnd).toBe(60000);
  });

  it("returns 404 when itemId not found", async () => {
    const res = await request(app)
      .put("/api/admin/order-catalog/frame:nope")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ priceVnd: 999 });
    expect(res.status).toBe(404);
  });

  it("rejects priceVnd negative", async () => {
    await OrderCatalogModel.create({ itemId: "frame:20x30", type: "frame", label: "X", priceVnd: 100 });
    const res = await request(app)
      .put("/api/admin/order-catalog/frame:20x30")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ priceVnd: -1 });
    expect(res.status).toBe(400);
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
  if ("maxQty" in update && (typeof update.maxQty !== "number" || update.maxQty < 1)) {
    return res.status(400).json({ error: "maxQty must be >= 1" });
  }

  const updated = await OrderCatalogModel.findOneAndUpdate({ itemId }, update, { new: true });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ data: updated });
}
```

### 4. Mount + audit log trong `adminRoutes.ts`

```ts
import { updateCatalogItem } from "../controllers/orderCatalogController";

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

### 5. Chạy test → pass

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

### 6. Commit

```bash
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin PUT /api/admin/order-catalog/:itemId"
```

## Quy tắc

- Follow pattern audit log như Task 5.
- Báo cáo cuối: hash commit + test output (3 tests pass).

Bắt đầu làm.
