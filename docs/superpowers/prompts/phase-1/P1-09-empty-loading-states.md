# P1-09 — Empty States, Loading States, Skeletons

## Mục tiêu

Tạo trải nghiệm chờ + trống nhất quán + thân thiện toàn app. Hiện tại nhiều chỗ chỉ hiện text "Đang tải..." hoặc trống không, làm app cảm giác "đang lỗi" thay vì "đang chuẩn bị".

## Context dự án

- Đã có `src/app/components/ui/skeleton.tsx` (shadcn).
- Đã có `src/app/components/ui/loading-spinner.tsx`.
- LocalStorage seed có thể trống lần đầu (user mới).
- Đã có pattern empty card ở vài chỗ.

## Scope file

- `src/app/pages/Dashboard.tsx`
- `src/app/pages/TodayV2/TodayV2Page.tsx`
- `src/app/pages/GoalTracker.tsx`
- `src/app/pages/ReflectionJournal.tsx`
- `src/app/pages/VisionBoardGallery.tsx`
- `src/app/pages/Achievements.tsx`
- `src/app/pages/AdminOrdersPage.tsx` (nếu có route)
- `src/app/components/ui/skeleton.tsx` — verify pattern.

KHÔNG sửa: data fetching logic, query hook.

## Yêu cầu kỹ thuật

### 1. Loading skeleton

Khi đang load data lần đầu (chưa có local cache):

- Hiện skeleton card có shape giống content thật.
- Skeleton: `bg-app-line/60 animate-pulse rounded-md`.
- Reduced motion: `animate-pulse` → `opacity-60` static.
- Duration skeleton hiện ≥ 200ms (tránh flash) nhưng ≤ 5s (sau đó hiện empty/error).

Layout skeleton cụ thể:
- Dashboard: 1 hero card + 3 stat card + 1 list.
- Today: 1 hero ngày + 3-5 task placeholder.
- Reflection: 5 entry placeholder.
- Vision board: 6 tile grid placeholder.

### 2. Empty state

Khi data load xong nhưng rỗng (user mới, chưa tạo gì):

- Icon (lucide-react) size 32–40px, color `text-app-ink-muted`.
- Title `text-lg font-serif text-app-ink`.
- Description `text-sm text-app-ink-soft max-w-sm mx-auto`.
- Primary action button (CTA tạo entry đầu tiên).
- Background card dashed border (xem P1-08).

Copy mẫu:

- Today empty: "Hôm nay chưa có việc nào. Thêm việc đầu tiên?" + button "Thêm việc".
- Reflection empty: "Chưa có dòng nhật ký nào. Viết dòng đầu tiên?" + button.
- Goal empty: "Chưa có mục tiêu nào. Bắt đầu SMART Goal?" + button.
- Vision board empty: "Bảng còn trống. Thêm hình ảnh đầu tiên?".
- Achievements empty: "Chưa có thành tựu. Hoàn thành task đầu tiên để mở khoá.".

### 3. Error state

Khi fetch fail (hiếm — app local-first):

- Icon warning, color `text-destructive`.
- Title "Không tải được dữ liệu".
- Description ngắn.
- Button "Thử lại" + button "Báo lỗi" (mailto).
- KHÔNG dùng tiếng Anh "Something went wrong".

### 4. Inline loading (button)

- Button có `loading` prop → spinner + label dimmed (đã P1-04).
- Form submit: dùng inline loading.

### 5. Toast feedback

- Save thành công: toast success "Đã lưu", 2s.
- Save fail: toast error "Lưu thất bại. Thử lại?".
- KHÔNG toast cho action quá nhỏ (toggle task complete) — đã có animation đủ.

### 6. Suspense fallback

Nếu dùng `<Suspense>`:

- Fallback dùng skeleton tương ứng page, KHÔNG dùng spinner full-screen.
- Full-screen spinner chỉ khi route lazy load lần đầu < 200ms.

### 7. Reduced motion

- Skeleton: `animate-pulse` → static `opacity-60`.
- Spinner: giữ rotate (đây là indicator, không decorative).

## Acceptance Criteria

- [ ] Mỗi page chính có skeleton matching layout.
- [ ] Mỗi page chính có empty state với icon + copy + CTA.
- [ ] Reduced motion: skeleton static, spinner vẫn quay.
- [ ] Copy tiếng Việt thân, không doạ.
- [ ] Light + dark mode: skeleton color đúng (`bg-app-line/60`).
- [ ] Lighthouse Perf không bị giảm vì skeleton (CLS ≤ 0.1).
- [ ] Test thủ công với clear localStorage → tất cả empty state hiện đúng.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. DevTools → Application → Clear localStorage → reload site.
2. Đi qua mỗi route trong scope → confirm empty state đúng.
3. Throttle CPU 6x → reload → skeleton hiện rồi mới content.
4. Click "Thử lại" trên error state → reload thử.
5. Dark mode → tất cả state vẫn rõ.
6. Reduced motion → skeleton static, spinner vẫn quay.

## Không làm

- KHÔNG đổi data fetching layer.
- KHÔNG cache mới.
- KHÔNG retry tự động (chỉ button retry).
- KHÔNG illustration / 3D — chỉ icon đơn.
- KHÔNG mascot xuất hiện trong empty state.

## Ghi chú khi trả kết quả

- File đã sửa.
- Screenshot empty state mỗi page (light + dark).
- Skeleton match-rate (~ giống content thật bao nhiêu %).
- Risk còn lại.
