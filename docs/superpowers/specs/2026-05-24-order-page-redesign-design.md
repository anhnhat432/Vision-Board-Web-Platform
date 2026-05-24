# Order Page Redesign — Warm Scrapbook

**Ngày:** 2026-05-24
**Trạng thái:** Draft, chờ review
**Phạm vi:** `/order` (kit Vision Board), không động backend, không động billing/storage/pricing logic.

## 1. Vấn đề

Trang `/order` hiện tại bị cảm giác khô khan, đơn điệu:

- Header chỉ một dòng h1 + một dòng mô tả nhỏ.
- 5 section đánh số "1." → "5." trên nền trắng, không có nhịp thị giác phân biệt giữa các bước.
- `OrderSummary` cột phải là card trắng phẳng, không cho user thấy "kit của mình đang ra sao".
- Không có tín hiệu tiến độ — user không biết còn thiếu gì khi cuộn dài.
- Tone màu lạnh, không khớp với cảm hứng "vision board làm tay" của sản phẩm.

## 2. Mục tiêu

- Làm trang ấm hơn, có cảm giác như đang "lắp ráp" một bộ kit thay vì điền form.
- Cho user thấy preview trực quan của kit theo các lựa chọn đang chọn.
- Có chỉ báo tiến độ rõ ràng qua 5 bước.
- **Không** động logic pricing/validation/storage/services.
- **Không** thêm dependency mới (giữ Tailwind + Lucide + Radix hiện có).
- **Không** thêm testimonial / trust badges (theo yêu cầu).

## 3. Non-goals

- Không redesign trang `/order-status/:id`.
- Không đổi cấu trúc data của `OrderDraft`, `CatalogItem`, `OrderLine`.
- Không thêm animation page-level (parallax, confetti, scroll reveal).
- Không gộp / tách step (giữ nguyên 5 step).
- Không build mockup engine ghép ảnh thành "vision board" — chỉ list thumbnail.

## 4. Visual system

### 4.1 Tokens

Scoped trong selector `.order-page`, không override global theme:

```css
.order-page {
  --order-bg: #FBF6EE;          /* cream base */
  --order-card: #FFFFFF;        /* card vẫn trắng để ảnh nổi */
  --order-border: #E8DFCF;      /* kraft border */
  --order-accent: #F4A582;      /* peach */
  --order-accent-soft: #FBE4D5; /* peach 20% cho ring/highlight */
  --order-text-muted: #7A6F5E;  /* warm muted */
  --order-eyebrow: #B8956F;     /* tone hint nâu nhạt */
}
```

Font, radius (`--r-card`, `--r-card-sm`), spacing scale: giữ hệ design hiện tại.

### 4.2 Animation

Mức độ subtle:

- Hover thẻ picker: `transition-all duration-150`, border đổi sang `--order-accent`.
- Selected: ring 2px `--order-accent-soft`, dấu tick fade-in 100ms ở góc trên phải.
- CTA hover: `translateY(-1px)` + shadow nhẹ.
- Không có page-level animation, không stagger, không scroll reveal.

## 5. Layout

```
┌─────────────────────────────────────────────────────┐
│  HERO HEADER (cream card, padding rộng)             │
│  eyebrow • h1 • mô tả                ┌─ Bao gồm ─┐  │
│                                       │ chip×4    │  │
│                                       └───────────┘  │
└─────────────────────────────────────────────────────┘

┌─ PROGRESS BAR (sticky) ────────────────────────────┐
│  ●━━━●━━━○━━━○━━━○   Bước 2/5 — Set ảnh chủ đề    │
└────────────────────────────────────────────────────┘

┌─ Step cards ──────────────┐  ┌─ Preview Summary ──┐
│ [1] Khung gỗ              │  │ Kit của bạn        │
│   FrameSizePicker         │  │ ┌──────────────┐   │
│                           │  │ │ frame thumb  │   │
│ [2] Set ảnh chủ đề        │  │ ├──┬──┬──┐     │   │
│   ThemePicker             │  │ │t1│t2│t3│     │   │
│                           │  │ └──┴──┴──┘     │   │
│ [3] Sticker               │  │ ─────────────  │   │
│   StickerAddon            │  │ Tạm tính ...   │   │
│                           │  │ Phí ship ...   │   │
│ [4] Giao hàng             │  │ Tổng tạm tính  │   │
│   ShippingForm            │  │ [Đặt đơn — X]  │   │
│                           │  └────────────────┘   │
│ [5] Ghi chú               │                       │
│   NotesField              │                       │
└───────────────────────────┘
```

Mobile: progress bar thu thành "Bước 2/5 — …", preview summary chỉ hiển thị qua sticky bottom bar (như hiện tại), preview ảnh ẩn để giữ trang gọn.

## 6. Component changes

### 6.1 OrderPage (`src/features/order/pages/OrderPage.tsx`)

Thay layout outer:

- Wrap toàn bộ trong `<div className="order-page bg-[var(--order-bg)]">`.
- Replace header h1 + p hiện tại bằng `OrderHero` (component mới hoặc inline).
- Xoá `IncludedItemsCard` ở vị trí cũ — gộp vào hero.
- Insert `OrderProgressBar` (sticky) phía dưới hero.
- Mỗi `<section>` thay bằng `<StepCard step={n} title="..." status={…}>`.
- Cột phải: thay `<OrderSummary>` bằng `<OrderPreviewSummary>`.

State management giữ nguyên 100% (`draft`, `shipping`, `notes`, `touched`, `submitAttempted`, `submitError`). Không đổi `handleSubmit`, không đổi gọi `validateOrderDraft`, không đổi `createLocalOrder` / `createOrder`.

### 6.2 OrderHero (mới, inline trong OrderPage)

Props: không cần (static + render INCLUDED_DOCS).

- Card cream `bg-[var(--order-bg)]` với border kraft.
- Eyebrow uppercase tracking-wide `text-[var(--order-eyebrow)]`: "VISION BOARD KIT".
- h1: "Đặt kit của riêng bạn".
- Sub: "Chọn khung gỗ, set ảnh chủ đề và sticker — chúng mình đóng gói gửi tận nhà."
- Right block: heading nhỏ "Bao gồm sẵn" + 4 chip (icon Lucide + label) cho từng `INCLUDED_DOCS`. Map icon theo id (fallback `Sparkles` nếu chưa map).

Mobile: stack dọc, chip wrap.

### 6.3 OrderProgressBar (mới — `src/features/order/components/OrderProgressBar.tsx`)

```ts
interface OrderProgressBarProps {
  currentStep: number;       // 1..5, step "đang focus" theo logic completion
  completedSteps: number[];  // các step đã thoả điều kiện
  onStepClick: (step: number) => void;
}
```

- Desktop: 5 segment ngang, mỗi segment có dot + label ngắn ("Khung", "Theme", "Sticker", "Giao hàng", "Ghi chú").
  - Completed: fill peach + tick.
  - Current: outline peach + dot peach.
  - Pending: kraft mờ.
- Mobile: thu gọn thành một dòng "Bước X/5 — <tên step>" + thanh fill thoả tỉ lệ.
- Sticky `top-0 z-20`, background cream với border-bottom kraft, backdrop-blur nhẹ.
- Click segment → smooth scroll tới `#step-N`.

Logic completion (derive trong `OrderPage`):

- Step 1 done: `draft.frameItemId !== null`.
- Step 2 done: `draft.themeItemIds.length > 0`.
- Step 3 done: luôn `true` (sticker là tuỳ chọn).
- Step 4 done: `validation.errors` không có field nào trong `["fullName","email","phone","shippingAddress"]`.
- Step 5 done: luôn `true` (notes là tuỳ chọn).

Current step = step done thấp nhất chưa xong, default 1.

### 6.4 StepCard (mới, inline component nhỏ trong OrderPage)

```ts
interface StepCardProps {
  step: number;
  title: string;
  status?: "pending" | "current" | "done";
  hint?: string;       // ví dụ "đã chọn 2 set"
  errorText?: string;
  children: React.ReactNode;
  id?: string;         // anchor cho scroll
}
```

- Card trắng, border kraft, shadow-sm, radius `--r-card`, padding rộng.
- Header: bubble peach tròn 28px chứa số step (hoặc tick khi done) + title font-semibold + hint phải.
- Body: children, padding-top.
- ErrorText hiển thị dưới body, destructive color.

### 6.5 FrameSizePicker

Thay class:

- Card: thêm `transition-all duration-150 hover:-translate-y-[2px]` (chỉ khi không selected).
- Selected: `border-[var(--order-accent)] ring-2 ring-[var(--order-accent-soft)]`, dấu tick góc trên phải (`absolute top-2 right-2`, lucide `Check` trong bubble peach 20px).
- Placeholder gradient: `from-[var(--order-accent-soft)]/40 to-[var(--order-bg)]` thay vì gradient accent.
- Giá: `text-[var(--order-accent)]` font-semibold.

Không đổi props, không đổi behavior.

### 6.6 ThemePicker

- Search input: thêm icon `Search` lucide bên trái (absolute), border kraft, focus ring peach.
- Card item: tương tự FrameSizePicker (ring peach + tick selected).
- Counter "Đã chọn X set": chip tròn `bg-[var(--order-accent-soft)] text-[var(--order-accent)]` font-medium, sticky `position: sticky; bottom: 0` dưới grid (chỉ khi `selected.length > 0`).

### 6.7 StickerAddon

Restyle theo cùng tone (border kraft, accent peach). Không đổi cấu trúc.

### 6.8 IncludedItemsCard

- Xoá khỏi DOM tree của OrderPage.
- File có thể giữ nếu còn nơi dùng khác — cần grep. Nếu chỉ OrderPage dùng thì xoá file luôn.

### 6.9 OrderPreviewSummary (replace OrderSummary)

File: rename `OrderSummary.tsx` → `OrderPreviewSummary.tsx`, hoặc giữ tên file và đổi nội dung. Đề xuất **giữ tên file `OrderSummary.tsx`** để giảm churn import — chỉ đổi nội dung.

Props mở rộng:

```ts
interface OrderPreviewSummaryProps {
  // existing
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  isSubmittable: boolean;
  isSubmitting?: boolean;
  missingFields?: string[];
  onSubmit: () => void;

  // new
  selectedFrame: CatalogItem | null;
  selectedThemes: CatalogItem[];
  selectedSticker: CatalogItem | null;  // catalog row, không phải selection state
}
```

Layout chia 2 khối trong cùng `<aside>`:

**Khối A — Preview ảnh:**

- Heading nhỏ "Kit của bạn".
- Empty state (chưa chọn gì có ảnh): ô vuông cream aspect-square, icon `Package` lucide ở giữa, caption "Chọn khung và set ảnh để xem trước".
- Có data:
  - Nếu `selectedFrame?.thumbnail`: ảnh frame full-width aspect 3/4 ở trên.
  - Grid 3 cột thumbnail theme (chỉ những theme có `thumbnail`).
  - Nếu `selectedSticker?.thumbnail` và sticker được chọn: thumbnail nhỏ riêng dưới grid.
- Item nào không có thumbnail: bỏ qua trong preview (vẫn xuất hiện ở khối B dạng chữ).

**Khối B — Tổng tiền:**

- Giữ nguyên line-items + INCLUDED_DOCS hiện tại.
- Divider kraft thay border xám.
- "Tổng tạm tính" font-base → font-lg, color `var(--order-accent)`.
- CTA: `bg-[var(--order-accent)] hover:bg-[var(--order-accent)]/90 text-white` + hover lift.
- Box "còn thiếu": `bg-[var(--order-accent-soft)] text-[var(--order-eyebrow)] border-[var(--order-accent)]/30` thay amber.

Mobile sticky bottom bar: giữ nguyên logic, chỉ cập nhật tone (CTA peach).

### 6.10 Skeleton + banner

- Skeleton dùng `bg-[var(--order-border)]` thay `bg-muted` để đỡ chói.
- Banner "Đang dùng giá đã lưu": `bg-[var(--order-accent-soft)] border-[var(--order-accent)]/40 text-[var(--order-eyebrow)]`.

## 7. Files

**Sửa:**

- `src/features/order/pages/OrderPage.tsx`
- `src/features/order/components/OrderSummary.tsx` (mở rộng + restyle)
- `src/features/order/components/FrameSizePicker.tsx`
- `src/features/order/components/ThemePicker.tsx`
- `src/features/order/components/StickerAddon.tsx`
- `src/features/order/components/OrderSummary.test.tsx` (cập nhật props mới)
- `src/features/order/pages/OrderPage.test.tsx` (assertion progress bar + step card)
- `src/features/order/components/FrameSizePicker.test.tsx` (selected state)
- `src/features/order/components/ThemePicker.test.tsx` (selected state)

**Mới:**

- `src/features/order/styles/order-theme.css` — khai báo tokens scoped `.order-page`.
- `src/features/order/components/OrderProgressBar.tsx`
- `src/features/order/components/OrderProgressBar.test.tsx`
- `src/features/order/components/StepCard.tsx` (hoặc inline trong OrderPage nếu < 60 dòng)

**Có thể xoá** sau khi grep:

- `src/features/order/components/IncludedItemsCard.tsx` (nếu chỉ OrderPage dùng)

**Không động:**

- `src/features/order/lib/pricing.ts`
- `src/features/order/lib/validators.ts`
- `src/features/order/storage/order.ts`
- `src/features/order/hooks/useOrderCatalog.ts`
- `src/features/order/catalog/*`
- `src/services/orderService.ts`

## 8. Behavior parity (không được vỡ)

Test phải pass với cùng kịch bản hiện tại:

- Submit thành công với draft hợp lệ → navigate `/order-status/:id`.
- Submit khi validation fail → set `submitAttempted = true`, không navigate.
- Touched logic giữ nguyên: chỉ show error sau khi user đã chạm hoặc đã thử submit.
- Mobile sticky bar hiện đúng tổng tiền + missing fields preview.
- Banner `isFromFallback` hiện khi catalog từ fallback.
- Skeleton hiện khi `isLoading`.
- Backend sync best-effort: lỗi `createOrder` không chặn navigate.

## 9. Testing

- Unit: `OrderProgressBar` render đúng số step, click gọi `onStepClick`.
- Unit: `OrderSummary` render preview block khi có thumbnail, render empty state khi không.
- Unit: `FrameSizePicker` / `ThemePicker` selected state có dấu tick.
- Integration (OrderPage): chọn frame → step 1 báo done → progress bar update; submit invalid → "còn thiếu" hiện.
- Visual: chạy `npm run qa:visual-ux-ui` cho `/order` ở 375 / 768 / 1280 nếu pipeline có.

## 10. Verification trước khi merge

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual check:

- Mobile 375: header stack, progress bar thu gọn, sticky bottom bar OK.
- Tablet 768: layout 1 cột, preview summary nằm dưới step.
- Desktop 1280: layout 2 cột, sticky preview ở phải.
- Empty state preview: chưa chọn gì → icon + caption.
- Có chọn frame không có thumbnail: preview block không render frame, chỉ render khối B.

## 11. Rủi ro

- **Theme thumbnail thiếu**: nếu seed catalog không có `thumbnail`, preview block A trông trống. Mitigation: empty state rõ ràng, không show khối preview rỗng.
- **Sticky progress bar đè header app**: cần kiểm tra `z-index` không xung đột với layout cha. Mitigation: `z-20` đủ thấp, header app thường `z-30+`.
- **CSS scoped tokens không apply** nếu Tailwind purge khử class động. Mitigation: dùng arbitrary value `bg-[var(--order-bg)]` thay class động — Tailwind giữ.
- **Test snapshot vỡ** ở các test hiện có. Mitigation: cập nhật assertion theo behavior, không lưu snapshot dài.

## 12. Open questions

Không. Đã chốt:

- Tone: warm scrapbook (cream + peach).
- Animation: subtle (hover/selected only).
- Live preview: chỉ list thumbnail, không mockup engine.
- Bỏ testimonial + trust badges.
