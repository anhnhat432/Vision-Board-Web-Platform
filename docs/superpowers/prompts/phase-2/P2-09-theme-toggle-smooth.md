# P2-09 — Theme Toggle Smooth Transition (Light ↔ Dark)

## Mục tiêu

Khi user toggle light/dark mode, toàn site chuyển mượt thay vì flash đột ngột. Inspiration: Linear, GitHub, Vercel (đều có smooth swap).

## Tiền điều kiện

- P2-01 đã xong.
- P1-07 đã làm dark mode audit (loại hardcode bg-white).

## Context dự án

- Theme toggle ở Settings page (hoặc dropdown avatar).
- Dùng class `html.dark` để switch (xem `tokens.css`).
- Mặc định Tailwind không animate color change.

## Scope file

- `src/styles/theme.css` — thêm global transition rule.
- `src/styles/tokens.css` — verify.
- File toggle logic (search "dark" trong `src/app/`).

KHÔNG sửa: token color, business logic.

## Yêu cầu kỹ thuật

### 1. Global color transition

Thêm vào `theme.css` (cẩn thận, đây là rule rộng):

```css
/* Smooth theme transition — chỉ áp dụng cho color properties */
*, *::before, *::after {
  transition: 
    background-color var(--duration-base) var(--ease-standard),
    border-color var(--duration-base) var(--ease-standard),
    color var(--duration-base) var(--ease-standard),
    fill var(--duration-base) var(--ease-standard),
    stroke var(--duration-base) var(--ease-standard);
}

/* KHÔNG transition cho element đang animate khác (tránh chồng) */
[data-skip-theme-transition],
[data-skip-theme-transition] *,
[data-radix-dialog-content],
[data-radix-dialog-overlay] {
  transition: none !important;
}
```

**Cảnh báo**: rule `*` này có thể chậm trên page có 1000+ DOM node. Nếu lag, dùng cách 2 dưới.

### 2. Cách 2 — Transition chỉ trên html khi user toggle (chính xác hơn)

```tsx
function toggleTheme() {
  const html = document.documentElement;
  html.classList.add("theme-transitioning");
  html.classList.toggle("dark");
  // Save preference
  localStorage.setItem("theme", html.classList.contains("dark") ? "dark" : "light");
  // Remove after transition
  window.setTimeout(() => {
    html.classList.remove("theme-transitioning");
  }, 280);
}
```

CSS:

```css
html.theme-transitioning,
html.theme-transitioning *,
html.theme-transitioning *::before,
html.theme-transitioning *::after {
  transition: 
    background-color var(--duration-base) var(--ease-standard),
    border-color var(--duration-base) var(--ease-standard),
    color var(--duration-base) var(--ease-standard) !important;
}
```

Pros: chỉ transition khi user toggle, không ảnh hưởng performance bình thường.

**Khuyến nghị dùng cách 2.**

### 3. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  html.theme-transitioning,
  html.theme-transitioning * {
    transition: none !important;
  }
}
```

### 4. View Transitions API (optional, advanced)

Chrome / Edge hỗ trợ `document.startViewTransition`. Có thể dùng để morph từ light → dark như Linear:

```tsx
function toggleTheme() {
  if (!document.startViewTransition) {
    // fallback
    document.documentElement.classList.toggle("dark");
    return;
  }
  document.startViewTransition(() => {
    document.documentElement.classList.toggle("dark");
  });
}
```

Add CSS:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 360ms;
  animation-timing-function: var(--ease-standard);
}
```

Triển khai NẾU browser-target hỗ trợ. Fallback về cách 2.

### 5. Toggle button feedback

Toggle button (icon sun/moon):
- Click → rotate 180° + fade swap icon.
- Duration 360ms, ease-emphasized.

```tsx
<button onClick={toggleTheme} className="motion-press">
  <span className="relative inline-flex size-5 items-center justify-center">
    <Sun className={`size-5 transition-all duration-medium ease-emphasized ${dark ? "rotate-180 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
    <Moon className={`absolute size-5 transition-all duration-medium ease-emphasized ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-180 scale-0 opacity-0"}`} />
  </span>
</button>
```

### 6. Avoid FOUC khi load

- Đọc theme từ localStorage trước React mount (đã có?). Nếu chưa, thêm script inline trong `<head>`:

```html
<script>
  (function() {
    var t = localStorage.getItem("theme");
    var prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (t === "dark" || (!t && prefers)) {
      document.documentElement.classList.add("dark");
    }
  })();
</script>
```

### 7. Chỉ transition color, KHÔNG transition layout

- KHÔNG transition `box-shadow` global (gây lag mobile).
- KHÔNG transition `filter` (blur, brightness).
- Background image chuyển instant (swap qua `dark:bg-image-...`).

## Acceptance Criteria

- [ ] Toggle theme từ light → dark → smooth ~280ms.
- [ ] Toggle ngược lại smooth.
- [ ] Icon sun/moon swap với rotate + fade.
- [ ] FOUC không xảy ra khi reload với dark mode đã set.
- [ ] Reduced motion: toggle instant.
- [ ] Mobile không lag (test thật hoặc throttle CPU 4x).
- [ ] Lighthouse Perf không tụt.
- [ ] Box-shadow / image không transition (giữ instant).

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Settings → toggle dark → toàn page chuyển mượt 280ms.
2. Toggle ngược → mượt.
3. Reload với dark đã set → không flash trắng.
4. Reduced motion ON → toggle instant.
5. Mobile real device → mượt.
6. DevTools Performance → record toggle → 60fps, không layout thrashing.

## Không làm

- KHÔNG transition trên tất cả properties (chỉ color group).
- KHÔNG dùng `transition: all` (gây lag).
- KHÔNG animate font color của text trong code/pre block (đọc xé mắt).
- KHÔNG sound khi toggle.
- KHÔNG đổi color token.

## Ghi chú khi trả kết quả

- Cách đã chọn (1 vs 2 vs View Transitions).
- File đã sửa.
- Video demo toggle.
- Performance test mobile.
- Risk còn lại.
