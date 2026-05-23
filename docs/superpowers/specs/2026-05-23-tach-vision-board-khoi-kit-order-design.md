# Tách Vision Board khỏi Kit Order — Design Spec

- **Date**: 2026-05-23
- **Author**: Brainstorm session (Claude + user)
- **Scope**: MVP demo
- **Status**: Approved, sẵn sàng viết implementation plan

---

## 1. Mục tiêu

Tách hoàn toàn 2 luồng đang bị bó vào nhau:

- **Vision Board (editor trong app)**: chuyển thành tính năng phụ độc lập, không còn liên kết sang Order. Giữ nguyên file và route, chỉ cắt CTA + truyền state sang Order.
- **Kit Order (trang đặt đơn)**: thiết kế lại thành 1 đơn combo duy nhất. User chọn:
  1. **Kích thước khung gỗ** — 3 size: 20×30, 30×40, 40×60.
  2. **Set ảnh vision board theo chủ đề** — multi-select, danh sách hard-code các theme: TEXT 1–6, BOOKS, BODY, MONEY, STUDY, FOLLOWERS, CLOTH, FRIENDS, DESK CORNER, COFFEE, CARS, LOSE WEIGHT, TRAVEL.
  3. **Sticker add-on (optional)** — trước mắt 1 loại (HynBee Round Sticker), schema thiết kế sẵn cho mở rộng nhiều loại sau.

Mỗi đơn combo **mặc định luôn kèm 2 tờ hướng dẫn** (SMART Goal + Kế hoạch 12 tuần) — không phải option, hiển thị as "Tặng kèm — 0đ".

**Giá tiền do admin set qua backend catalog + Admin UI**, frontend fetch và có fallback hard-code khi backend offline.

## 2. Decisions chốt từ brainstorm

| # | Quyết định |
|---|---|
| D1 | Vision Board (editor) giữ là tính năng phụ. Không xoá, không ẩn. Cắt CTA + visionBoardId routing sang Order. |
| D2 | Bỏ khái niệm "loại kit" (vision-kit / focus-kit / reset-kit). 1 đơn combo duy nhất. |
| D3 | Mỗi combo mặc định kèm 2 tờ hướng dẫn (SMART + 12-week). Không phải option, hardcode hiển thị. |
| D4 | 3 size khung gỗ: 20×30, 30×40, 40×60. Mỗi size có giá riêng. |
| D5 | Theme: seed cố định 18 theme vào DB lần đầu deploy. Admin UI cho phép sửa giá / ẩn-hiện / thêm theme mới sau (cùng UI với frame, sticker), nhưng MVP không cần thêm gì ngoài 18 theme đã seed. |
| D6 | Theme: user multi-select, mỗi theme tính tiền riêng. |
| D7 | Sticker: 1 loại MVP, schema hỗ trợ nhiều loại sau. User toggle thêm + qty. |
| D8 | Giá + tổng đơn live, hiển thị trong OrderSummary. |
| D9 | Giữ form fields: ship info (bắt buộc), goalId (optional), keywords (tự nhập), note (tự nhập). |
| D10 | Bỏ coupon khỏi MVP này. |
| D11 | Admin set giá qua backend catalog + Admin UI (`/admin/catalog`). Frontend fetch + fallback. |
| D12 | Orders cũ trong localStorage được migrate sang schema v2, mặc định combo, marker `[Đơn cũ — kitType: ...]` trong note. |

## 3. Architecture & file layout

### Frontend
```
src/features/order/
├── catalog/
│   ├── types.ts           # CatalogItem, CatalogItemType
│   ├── defaults.ts        # DEFAULT_CATALOG fallback hard-code
│   └── included.ts        # 2 tờ hướng dẫn (SMART + 12-week)
├── lib/
│   ├── pricing.ts         # buildOrderLines, calcSubtotal, calcTotal, formatVnd
│   └── validators.ts      # validateOrderDraft
├── components/
│   ├── FrameSizePicker.tsx
│   ├── ThemePicker.tsx
│   ├── StickerAddon.tsx
│   ├── IncludedItemsCard.tsx
│   ├── ShippingForm.tsx
│   ├── NotesField.tsx
│   └── OrderSummary.tsx
├── hooks/
│   └── useOrderCatalog.ts # fetch + cache catalog
├── pages/
│   └── OrderPage.tsx      # orchestrate, < 250 dòng
└── storage/
    ├── order.ts           # LocalOrderV2 + helpers
    ├── migration.ts       # migrateOrderV1ToV2
    └── *.test.ts
```

Shim: `src/app/utils/order-storage.ts` re-export từ `features/order/storage/order` để không vỡ import ở các nơi khác.

### Backend
```
backend/src/
├── models/OrderCatalogModel.ts          # mới
├── controllers/orderCatalogController.ts # mới
├── routes/orderCatalogRoutes.ts          # mới (public GET)
├── scripts/seedOrderCatalog.ts           # mới
├── scripts/migrateOrdersV1ToV2.ts        # mới
└── tests/orderCatalog*.test.ts           # mới
```
- Admin endpoints (`PUT/POST/PATCH`) mount qua `adminRoutes.ts` hiện có.
- `OrderModel.ts` cập nhật schema: `lines[]`, `subtotalVnd`, `totalVnd`, giữ `kitType` optional/deprecated 1-2 release.

### Routes
- `/order` lazy-load từ `@/features/order/pages/OrderPage`.
- `/admin/catalog` mới, dùng `ProtectedRoute` + role admin.
- `/vision-board/:id?`, `/order-status/:orderId?`, `/admin/orders` giữ nguyên.

## 4. Data schema

### Backend `OrderCatalogModel`
```ts
const orderCatalogItemSchema = new Schema({
  itemId:    { type: String, required: true, unique: true, index: true },
  type:      { type: String, required: true, enum: ["frame", "theme", "sticker"] },
  label:     { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  priceVnd:  { type: Number, required: true, min: 0 },
  thumbnail: { type: String, trim: true },
  sortOrder: { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
  maxQty:    { type: Number, default: 10 }, // sticker-only
}, { timestamps: true });
```

`itemId` namespaced: `"frame:20x30"`, `"theme:money"`, `"sticker:hynbee-round-v1"`.

### Frontend `CatalogItem`
```ts
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

### `LocalOrderV2`
```ts
export const ORDER_SCHEMA_VERSION = 2;

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
  status: "pending" | "printing" | "shipping" | "delivered";

  lines: OrderLine[];        // 1 frame + N themes + (1 sticker?)
  subtotalVnd: number;
  shippingVnd: number;       // MVP = 0
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
```

Bỏ so với v1: `kitType`, `visionBoardId`, `focusArea`.

## 5. Backend catalog API + Admin UI

### Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/order-catalog` | public | Trả `isActive: true`, sort `sortOrder`. Cache 60s. |
| GET | `/api/admin/order-catalog` | requireAdmin | Trả tất cả (kể cả inactive). |
| POST | `/api/admin/order-catalog` | requireAdmin | Tạo item mới. |
| PUT | `/api/admin/order-catalog/:itemId` | requireAdmin | Cập nhật label/price/thumbnail/sortOrder. |
| PATCH | `/api/admin/order-catalog/:itemId/active` | requireAdmin | Toggle isActive. |

Mọi action admin ghi audit log qua `logAdminAction()` sẵn có.

### Validation backend
- `priceVnd >= 0`, integer.
- `type` ∈ {`frame`, `theme`, `sticker`}.
- `itemId` unique, format `^(frame|theme|sticker):[a-z0-9-]+$`.
- `maxQty >= 1` khi `type === "sticker"`.

### Frontend Admin UI (`AdminCatalogPage.tsx`)
- 3 tab (Frames / Themes / Stickers).
- Bảng item: thumbnail, label, priceVnd (inline edit), sortOrder, active toggle.
- Nút "Thêm item" mở dialog tạo mới.
- Confirm dialog trước save/disable.
- Optimistic update + revert nếu PUT fail.
- Mount route `/admin/catalog`, dùng `ProtectedRoute` + role check.
- Thêm nav item "Quản lý catalog" trong `AppSidebar` section admin.

### Bảo vệ giá (server-side authoritative)
1. Client gửi `POST /api/orders` với `{ itemIds: string[], stickerQty?, shipping..., meta... }` — **không gửi giá**.
2. Server re-fetch catalog từ DB, build `lines[]` + tính `subtotalVnd` + `totalVnd`.
3. Server trả `LocalOrderV2` snapshot → client lưu localStorage.
4. Nếu network fail → client tạo order từ catalog cache, queue qua `mutationQueue` (pattern đã có ở plan12week), khi online retry.

## 6. Pricing logic + UI flow

### Pure functions (`features/order/lib/pricing.ts`)
```ts
export interface OrderDraft {
  frameItemId: string | null;
  themeItemIds: string[];
  stickerSelection: { itemId: string; qty: number } | null;
}

export function buildOrderLines(draft: OrderDraft, catalog: CatalogItem[]): OrderLine[];
export function calcSubtotal(lines: OrderLine[]): number;
export function calcShipping(draft: OrderDraft): number;  // MVP = 0
export function calcTotal(subtotal: number, shipping: number): number;
export function formatVnd(amount: number): string;        // "189.000 đ"
```

### Validators (`features/order/lib/validators.ts`)
Order hợp lệ:
- `frameItemId !== null`
- `themeItemIds.length >= 1`
- `fullName`, `email`, `phone`, `shippingAddress` không rỗng (trim)
- `email` đúng format
- Nếu `stickerSelection`: `qty >= 1 && qty <= sticker.maxQty`
- Tất cả `itemId` trong draft tồn tại trong catalog hiện tại (chặn ID lỗi thời)

Trả `{ ok: true } | { ok: false, errors: Record<field, string> }`.

### UI layout `/order` (1 trang, không wizard)
**Desktop 2 cột, mobile stack:**

Cột trái — chọn sản phẩm:
1. `<IncludedItemsCard />` — banner thông báo 2 tờ hướng dẫn tặng kèm.
2. `<FrameSizePicker />` — 3 thẻ radio (grid 3 desktop / horizontal scroll mobile), thumbnail + tên + giá.
3. `<ThemePicker />` — grid 2-3 cột, mỗi tile có checkbox + thumb + label + giá. Search input filter live. Footer "Đã chọn N set".
4. `<StickerAddon />` — collapsible: toggle "Thêm sticker", expand → tile sticker + qty stepper.

Cột phải — sticky `<OrderSummary />`:
- Bảng line items: label / qty / unit / total.
- "Tạm tính" / "Phí ship" / "Tổng đơn" live update.
- IncludedItems = 0đ as quà tặng.
- Collapsible `<ShippingForm />` + `<NotesField />`.
- CTA: `Đặt đơn — {formatVnd(total)}` disabled khi validate fail.

Mobile: summary sticky footer mỏng + bottom-sheet "Xem chi tiết đơn".

### Submit flow
1. Validate. Fail → scroll tới error đầu tiên + toast.
2. `POST /api/orders` với `itemId[]` (không kèm giá).
3. 200 → save localStorage → navigate `/order-status/:id`.
4. 4xx → render error theo field server trả.
5. Network fail → tạo `LocalOrderV2` client từ catalog cache, queue mutation outbox, navigate `/order-status/:id` với badge "Chưa đồng bộ".

### Loading & error states
- Catalog đang fetch: skeleton card.
- Fetch fail + có cache: dùng cache + banner "Đang dùng giá đã lưu".
- Fetch fail + không cache: dùng `DEFAULT_CATALOG`.
- Catalog rỗng (admin disable hết): empty state "Shop đang cập nhật".

## 7. Migration v1 → v2

### Strategy
- **Giữ nguyên storage key** `visionboard_orders_v1`. Bản ghi có `schemaVersion`.
- Parse: record không có `schemaVersion` hoặc `=== 1` → chạy `migrateV1ToV2`. Record `=== 2` → pass through.
- Write luôn ghi V2.

### `migrateOrderV1ToV2`
```ts
// Input: legacy v1 record { kitType, visionBoardId, focusArea, ... }
// Output: LocalOrderV2 với:
//   - frame line: "frame:30x40" (size giữa, default)
//   - themes: [] (rỗng)
//   - sticker: null
//   - subtotalVnd: 0, totalVnd: 0 → đánh dấu cần admin xác minh
//   - note += "[Đơn cũ — kitType: <vision-kit|focus-kit|reset-kit>]"
//   - giữ nguyên: id, createdAt, updatedAt, status, shipping fields, goalId, goalTitle, keywords, note
//   - drop: kitType, visionBoardId, focusArea
```

### Backend migration script
`backend/src/scripts/migrateOrdersV1ToV2.ts`:
- Idempotent (find orders chưa có `lines`).
- Build defaults, backfill, mark `migratedAt`.
- Chạy 1 lần khi deploy. Không runtime migrate trong query.

### Compat shim
`src/app/utils/order-storage.ts` chỉ re-export:
```ts
export { getOrders, getOrderById, createLocalOrder, getLatestOrder } from "@/features/order/storage/order";
export type { LocalOrderV2 as LocalOrder } from "@/features/order/storage/order";
```
Xoá: `getKitTypeLabel`, `OrderKitType` (grep + thay thế ở consumer).

## 8. Cập nhật khu vực dùng chung

### `OrderStatusPage`
- Render `LocalOrderV2.lines[]` thay vì `kitType`.
- Block "Chi tiết đơn": khung gỗ + list theme + sticker (nếu có) + quà tặng (2 tờ).
- Tổng tiền từ `order.totalVnd` (snapshot).
- Banner "Đơn cũ" nếu detect migrated.

### `AdminOrdersPage` (1251 dòng — chỉ sửa khu vực liên quan)
- Cột "Loại kit" → đổi thành 2 cột: "Khung" + "Số set ảnh".
- Filter "Lọc theo loại kit" → bỏ. Thay bằng "Lọc theo khung" (3 size).
- Detail dialog: render `lines[]` dạng bảng.
- Xoá import `getKitTypeLabel`, `OrderKitType`.

### Các nơi khác
- `Dashboard.tsx`, `Achievements.tsx`, `authenticated-core-flow.e2e.test.tsx`, `coreFunnelScenarios.ts`: grep `kitType` → cập nhật.
- `chunkLoad.ts` test: thêm `AdminCatalogPage` nếu cần.

### Vision Board — cắt liên kết
- Grep `navigate.*order` trong vision board files → xoá tất cả CTA "Đặt kit từ board".
- Xoá truyền `visionBoardId` qua route state.
- `OrderPage` mới **không đọc `userData.visionBoards`** nữa.
- Bỏ `buildSuggestedKeywords`, `buildSuggestedNote`, `getPreferredVisionBoard`.
- Giữ nguyên `VisionBoardEditor`, `VisionBoardGallery`, `visionBoardService`.

### Navigation
- `AppSidebar.tsx`: thêm "Quản lý catalog" trong section admin, icon Lucide `Package` hoặc `Tag`.

## 9. Testing strategy

### Unit (Vitest)
- `features/order/lib/pricing.test.ts`: edge cases cho buildOrderLines/calcSubtotal/calcTotal/formatVnd.
- `features/order/lib/validators.test.ts`: mỗi rule trả đúng error key.
- `features/order/storage/order.test.ts`: createLocalOrder ghi V2, getOrders parse hỗn hợp V1+V2, JSON corrupt không crash.
- `features/order/storage/migration.test.ts`: V1 full → V2 đúng, V1 thiếu field → default, V2 idempotent, marker note ghi đúng.
- `services/orderCatalogService.test.ts`: mock fetch success/fail, log warn khi fallback.

### Component (RTL)
- `FrameSizePicker.test.tsx`, `ThemePicker.test.tsx`, `StickerAddon.test.tsx`, `OrderSummary.test.tsx`: render + interaction + state.

### Integration
- `features/order/pages/OrderPage.test.tsx`: full flow chọn frame+theme+sticker → submit → assert payload itemId[], không có kitType, không có giá. Mock success → navigate. Offline path → localStorage + outbox queue.
- Migration E2E: seed localStorage 1 v1 → mount OrderStatusPage → render được, banner hiện.

### Backend
- `orderCatalogRoutes.test.ts`: GET public chỉ active+sort, PUT admin chặn 401, validate body 400, audit log ghi đúng.
- `orderRoutes.test.ts` (cập nhật): POST v2 OK, v1 (`kitType`) → 400 với message rõ.

### E2E (Playwright)
- `tests/e2e/order-flow.spec.ts`: user vào /order chọn 30×40 + 2 theme + sticker qty 2, điền shipping, submit, assert /order-status.
- `tests/e2e/admin-catalog.spec.ts`: admin sửa giá frame, reload /order thấy giá mới.

### Verification (CLAUDE.md)
```bash
npm run typecheck
npm run lint
npm run test:run
npm --prefix backend run typecheck
npm --prefix backend run check
npm run build
npm run smoke:mvp1   # nếu môi trường có
```

## 10. Risks

| # | Rủi ro | Mức | Mitigation |
|---|---|---|---|
| R1 | Schema breaking với orders v1 trong localStorage | Cao | Migration idempotent, giữ storage key, test với fixture v1 |
| R2 | Client tamper giá | Cao | Backend re-tính từ DB, ignore priceVnd payload |
| R3 | Backend catalog down | Trung | DEFAULT_CATALOG fallback + banner "Đang dùng giá đã lưu" |
| R4 | Admin set giá < 0 | Trung | Backend validate `priceVnd >= 0` |
| R5 | User /order khi admin disable item | Thấp | Validate itemId trước submit, toast "vui lòng chọn lại" |
| R6 | Race condition 2 admin sửa cùng item | Thấp | updatedAt diff → 409 conflict, refresh UI |
| R7 | AdminOrdersPage 1251 dòng — sửa nhầm | Trung | Chỉ sửa khu vực cột kit type + detail dialog |
| R8 | E2E test phụ thuộc kitType | Trung | Grep + update fixtures cùng PR |
| R9 | Vision Board CTA lẩn quẩn | Thấp | Grep + xoá toàn bộ navigate→order |
| R10 | Image thumbnail chưa có | Thấp | MVP dùng placeholder, admin upload sau |

## 11. Rollout plan

### Phase 0 — Backend foundation (PR riêng)
- `OrderCatalogModel`, controller, routes (public + admin), seed script.
- Deploy backend trước frontend.
- Verify `curl /api/order-catalog` trả 22 items (3 frame + 18 theme + 1 sticker).

### Phase 1 — Frontend order module (PR chính)
- Tạo `src/features/order/` đầy đủ.
- Migration v1→v2 + shim `order-storage.ts`.
- Cập nhật `OrderStatusPage`, `AdminOrdersPage`, `Dashboard`, fixtures.
- Cắt liên kết Vision Board → Order.
- Cập nhật `routes.tsx`.

### Phase 2 — Admin catalog UI (PR riêng hoặc gộp Phase 1)
- `AdminCatalogPage`, route `/admin/catalog`, nav item.
- E2E `admin-catalog.spec.ts`.

### Phase 3 — Polish & migrate prod
- Chạy `migrateOrdersV1ToV2.ts` trên backend prod (1 lần).
- Verify admin orders hiển thị orders cũ với banner.
- Theo dõi log 1-2 ngày, xoá `kitType` khỏi `OrderModel`.

## 12. Out of scope (deferred)

- Coupon / mã giảm giá.
- Thư viện ảnh thumbnail thật (placeholder OK trong PR này).
- Nhiều mẫu sticker (#1-#8 như Shopee) — schema sẵn, chỉ chưa seed.
- Cart pattern.
- Recommend theme dựa trên goal SMART.
- Real payment integration (vẫn mock).
- Image upload cho admin (cần S3/Cloudinary pipeline riêng).

## 13. Acceptance criteria

1. `npm run check` pass.
2. `npm --prefix backend run check` pass.
3. `/order` chọn được frame + ≥1 theme + sticker optional, tổng đơn live đúng, submit thành công.
4. `/admin/catalog` admin sửa giá → reload `/order` thấy giá mới.
5. Orders v1 cũ trong localStorage hiển thị được ở `/order-status/:id` với banner "Đơn cũ".
6. `npm run smoke:mvp1` pass nếu môi trường có sẵn.
7. Không còn import `getKitTypeLabel` / `OrderKitType` nào trong `src/`.
8. Vision Board features chạy bình thường, không còn navigate sang `/order` từ board.
