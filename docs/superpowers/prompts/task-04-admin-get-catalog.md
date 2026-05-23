# Task 4 — Admin `GET /api/admin/order-catalog`

> Copy toàn bộ phần dưới `---` để paste sang AI khác.

---

Tôi đang làm dự án **Vision Board Web Platform**. Stack: Express + Mongoose 8.

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- Plan: `docs/superpowers/plans/2026-05-23-tach-vision-board-khoi-kit-order.md`
- Tiền đề: Tasks 1-3 đã xong.

Hãy thực hiện **Task 4: Admin endpoint `GET /api/admin/order-catalog`** (trả tất cả items kể cả inactive, yêu cầu admin auth) theo TDD.

## Mục tiêu

Thêm endpoint admin để xem toàn bộ catalog (kể cả `isActive: false`), bảo vệ bằng middleware `requireAdmin` đã có sẵn.

**Files cần sửa:**
- `backend/src/controllers/orderCatalogController.ts` — thêm hàm `listAllCatalog`
- `backend/src/routes/adminRoutes.ts` — mount route mới
- `backend/src/tests/orderCatalogRoutes.test.ts` — thêm describe block

## Steps

### 1. Thêm test

Append vào `backend/src/tests/orderCatalogRoutes.test.ts`:

```ts
describe("GET /api/admin/order-catalog", () => {
  it("returns all items including inactive", async () => {
    await OrderCatalogModel.create([
      { itemId: "x:a", type: "frame", label: "A", priceVnd: 1, isActive: true },
      { itemId: "x:b", type: "frame", label: "B", priceVnd: 1, isActive: false },
    ]);
    // Dùng pattern admin auth của repo hiện có (đọc backend/src/tests/adminController.test.ts để xem cách mock admin token)
    const res = await request(app)
      .get("/api/admin/order-catalog")
      .set("Authorization", `Bearer ${process.env.TEST_ADMIN_TOKEN ?? "test-admin"}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("rejects without admin auth", async () => {
    const res = await request(app).get("/api/admin/order-catalog");
    expect([401, 403]).toContain(res.status);
  });
});
```

**Quan trọng:** Đọc `backend/src/tests/adminController.test.ts` để biết cách repo này test admin endpoint. Có thể cần inject mock cho `requireAdmin` middleware hoặc set env `TEST_ADMIN_TOKEN`. Follow đúng pattern đó.

### 2. Chạy test → fail

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

### 3. Thêm controller

Append vào `backend/src/controllers/orderCatalogController.ts`:

```ts
export async function listAllCatalog(_req: Request, res: Response) {
  const items = await OrderCatalogModel.find({}).sort({ sortOrder: 1, itemId: 1 }).lean();
  successResponse(res, { data: items });
}
```

### 4. Mount trong `backend/src/routes/adminRoutes.ts`

Thêm import:
```ts
import { listAllCatalog } from "../controllers/orderCatalogController";
```

Thêm route (gần các admin route khác, trước `export`):
```ts
adminRoutes.get("/order-catalog", requireAdmin, asyncHandler(listAllCatalog));
```

Lưu ý: `requireAdmin` đã được import sẵn trong file (xem các route khác). Nếu file dùng helper `auditedAdminAction` hoặc tương tự cho mỗi route, follow pattern đó.

### 5. Chạy test → pass

```bash
npm --prefix backend test -- orderCatalogRoutes.test
```

### 6. Commit

```bash
git add backend/src/controllers/orderCatalogController.ts backend/src/routes/adminRoutes.ts backend/src/tests/orderCatalogRoutes.test.ts
git commit -m "feat(backend): admin GET /api/admin/order-catalog"
```

## Quy tắc

- Follow pattern admin route hiện có (đọc `adminRoutes.ts` xem các route khác register thế nào).
- Báo cáo cuối: hash commit + test output.

Bắt đầu làm.
