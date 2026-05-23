# Task 7 — Admin `PATCH /api/admin/order-catalog/:itemId/active` (toggle)

> Copy toàn bộ phần dưới `---` để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**.

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Plan: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
- Tiền đề: Tasks 1-6 đã xong.

Hãy thực hiện **Task 7: Admin endpoint `PATCH /api/admin/order-catalog/:itemId/active`** (toggle active) theo TDD.

## Mục tiêu

Endpoint admin bật/tắt `isActive` của 1 catalog item. Body chỉ chứa `{ isActive: boolean }`. Ghi audit log.

## Steps

### 1. Thêm test

Append vào `backend/src/tests/orderCatalogRoutes.test.ts`:

```ts
describe("PATCH /api/admin/order-catalog/:itemId/active", () => {
  it("toggles isActive false", async () => {
    await OrderCatalogModel.create({ itemId: "x:a", type: "frame", label: "A", priceVnd: 1, isActive: true });
    const res = await request(app)
      .patch("/api/admin/order-catalog/x:a/active")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    const updated = await OrderCatalogModel.findOne({ itemId: "x:a" });
    expect(updated?.isActive).toBe(false);
  });

  it("rejects non-boolean isActive", async () => {
    await OrderCatalogModel.create({ itemId: "x:a", type: "frame", label: "A", priceVnd: 1, isActive: true });
    const res = await request(app)
      .patch("/api/admin/order-catalog/x:a/active")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ isActive: "yes" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    const res = await request(app)
      .patch("/api/admin/order-catalog/x:nope/active")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`)
      .send({ isActive: false });
    expect(res.status).toBe(404);
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
export async function toggleCatalogItemActive(req: Request, res: Response) {
  const { itemId } = req.params;
  const { isActive } = req.body ?? {};
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive boolean required" });
  }
  const updated = await OrderCatalogModel.findOneAndUpdate({ itemId }, { isActive }, { new: true });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ data: updated });
}
```

### 4. Mount + audit log

```ts
import { toggleCatalogItemActive } from "../controllers/orderCatalogController";

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

### 5. Chạy test → pass

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

### 6. Commit

```bash
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin PATCH toggle active catalog item"
```

Báo cáo cuối: hash commit + 3 tests pass.

Bắt đầu làm.
