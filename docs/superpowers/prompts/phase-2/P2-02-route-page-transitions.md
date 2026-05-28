# P2-02 — Route Page Transitions

## Mục tiêu

Thêm chuyển tiếp mượt giữa các route. Hiện tại click link → trang nhảy đột ngột → cảm giác "cứng". Mục tiêu: fade nhẹ + đổi page mượt như Linear hoặc Stripe.

## Tiền điều kiện

- P2-01 đã xong (motion tokens, hooks, motion.ts variant sẵn).

## Context dự án

- React Router v6 — dùng `Routes` + `Route`.
- Có thể có `RootLayout` wrap mọi route trong `<Outlet />`.
- Framer Motion: kiểm tra có sẵn không. Nếu không, dùng CSS class approach.

## Scope file

- `src/app/components/RootLayout.tsx` (hoặc tương đương) — wrap `<Outlet />` bằng motion wrapper.
- `src/app/App.tsx` (nếu có) — chỉ verify routes structure.
- `src/styles/theme.css` — bổ sung keyframe nếu cần (CSS-only approach).

KHÔNG sửa: route definition, page component internals.

## Yêu cầu kỹ thuật

### 1. Approach A — Framer Motion (nếu đã cài)

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Outlet } from "react-router-dom";
import { fade } from "@/app/lib/motion";

function RouteTransition() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        {...fade}
        className="min-h-[60vh]"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
```

Wrap trong RootLayout:

```tsx
<main id="main-content">
  <RouteTransition />
</main>
```

### 2. Approach B — Pure CSS (nếu không có framer-motion)

`theme.css`:

```css
@keyframes page-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.page-enter-anim {
  animation: page-enter var(--duration-base) var(--ease-standard) both;
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-anim { animation: none; opacity: 1; }
}
```

Trong RootLayout, dùng `useLocation()` để re-mount key + apply class:

```tsx
const location = useLocation();
return (
  <main id="main-content" key={location.pathname} className="page-enter-anim">
    <Outlet />
  </main>
);
```

### 3. Quy tắc duration

- Public route → public route (`/` ↔ `/login` ↔ `/billing/plan`): duration-base (240ms), ease-standard.
- App route → app route (sau login): duration-fast (180ms), ease-standard.
- Public → App (sau đăng nhập): không transition (auth redirect, để page mới render ngay).

### 4. Scroll restoration

- Khi đổi route → scroll về top (trừ back/forward).
- Dùng `ScrollRestoration` của react-router hoặc effect thủ công.
- Smooth scroll: `behavior: "smooth"` desktop, `instant` mobile.

### 5. View Transitions API (optional, nếu browser hỗ trợ)

Nếu muốn thử nghiệm:

```ts
if ("startViewTransition" in document) {
  document.startViewTransition(() => navigate(to));
}
```

Chỉ trong feature flag, không thay thế approach chính.

### 6. Không transition khi modal/sheet mở

Nếu user mở modal rồi đổi route → modal đóng trước → transition page chạy. KHÔNG transition đè nhau.

### 7. Loading state khi lazy route

Nếu route là lazy (`React.lazy`):

- Suspense fallback dùng skeleton page tương ứng (đã làm ở P1-09).
- Fade từ skeleton → content khi load xong.

## Acceptance Criteria

- [ ] Mọi route change có fade transition mượt (~240ms).
- [ ] Scroll về top khi đổi route (trừ back).
- [ ] Reduced motion: transition tắt, page hiện instant.
- [ ] CLS ≤ 0.1 sau transition.
- [ ] Mobile 60fps khi transition (test DevTools Performance).
- [ ] Modal đang mở → đổi route → đóng modal trước, không glitch.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Click `/` → `/login` → mượt.
2. Click `/login` → `/billing/plan` → mượt.
3. Login → click sidebar → đổi page → mượt.
4. Back button browser → snap về cũ + giữ scroll cũ.
5. Reduced motion ON → đổi route không animation.
6. DevTools Performance → record route change → 60fps.

## Không làm

- KHÔNG slide-from-side (cảm giác mobile native, không phù hợp web productivity).
- KHÔNG fade quá dài (>360ms).
- KHÔNG transition cho login redirect (đó là auth flow).
- KHÔNG blur background trong transition.
- KHÔNG persistent layout trick (giữ sidebar fixed, transition content) trừ khi nhỏ + đơn giản.

## Ghi chú khi trả kết quả

- Approach đã chọn (A framer-motion vs B pure CSS).
- File đã sửa.
- Video demo transition.
- Lighthouse Perf trước/sau.
- Risk còn lại.
