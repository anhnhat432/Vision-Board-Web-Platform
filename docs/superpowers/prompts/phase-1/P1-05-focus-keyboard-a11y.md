# P1-05 — Focus States & Keyboard Navigation A11y

## Mục tiêu

Đảm bảo toàn site (public + app) accessible-by-keyboard với focus ring nhất quán, skip-link, focus trap đúng chỗ. Lighthouse a11y phải đạt ≥ 95 trên `/` và `/login` sau prompt này.

## Context dự án

- Đã có `focus-visible:ring-*` rải rác.
- `src/styles/theme.css` có token `--app-accent`, `--app-bg` cho ring offset.
- Có Radix UI primitives (`Dialog`, `Popover`, `Tooltip`...) — Radix tự handle focus trap đúng, ĐỪNG override.
- `useReducedMotion` hook nếu có.

## Scope file

Đọc & sửa:

- `src/app/components/RootLayout.tsx` — thêm skip-link.
- `src/app/components/layout/AppHeader.tsx` (nếu có) — đảm bảo nav keyboard-reachable.
- `src/app/components/layout/AppPublicFooter.tsx` — đã ok, kiểm tra lại.
- `src/styles/theme.css` — chuẩn focus ring utility nếu cần.
- Tất cả interactive element thiếu `focus-visible:*` trong `src/app/**`.

KHÔNG sửa:
- Radix-based dialog/popover/sheet internals (đã đúng).
- `src/app/components/ui/*.tsx` (chỉ kiểm tra, không override).

## Yêu cầu kỹ thuật

### 1. Skip-link

Đầu `<body>` (qua RootLayout):

```tsx
<a
  href="#main-content"
  className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-spotlight focus-visible:rounded-md focus-visible:bg-app-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-white focus-visible:shadow-3"
>
  Đến nội dung chính
</a>
```

`<main id="main-content">` tồn tại ở mỗi route container.

### 2. Focus ring chuẩn

Utility class chung trong `theme.css`:

```css
.focus-ring {
  outline: none;
}
.focus-ring:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--app-bg),
    0 0 0 4px color-mix(in oklab, var(--app-accent) 60%, transparent);
  border-radius: inherit;
}
```

Hoặc giữ Tailwind pattern: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg`.

Áp cho:
- Mọi `<button>` chưa có ring.
- Mọi `<a>` chưa có ring.
- Mọi `<input>`, `<textarea>`, `<select>` chưa có ring.
- Tab/Toggle/Card-as-button.

### 3. Tab order

- Header logo → nav links → CTA → main content → footer links.
- Public hero: H1 không focusable, CTA primary focus đầu tiên trong hero.
- Card-as-link (vd plan card): `tabIndex={0}` + `role="link"` + Enter/Space handler, KHÔNG dùng div onclick.

### 4. ARIA labels

- Icon-only button bắt buộc `aria-label`.
- Toggle theme: `aria-label="Chuyển sang chế độ tối/sáng"`.
- Close button modal: `aria-label="Đóng"`.
- Nav landmark: `<nav aria-label="Chính">`.
- Footer: `<footer>` (đã có).

### 5. Form field

Mỗi `<input>` phải có `<label htmlFor>` (visible hoặc `sr-only`). Error message liên kết qua `aria-describedby`. Field invalid: `aria-invalid="true"`.

### 6. Focus visible khi mở dialog/sheet

- Dialog mở → focus vào title hoặc primary action.
- Đóng → focus trả về trigger.
- Radix tự làm — chỉ verify, không can thiệp.

### 7. Esc key

- Mọi dialog/sheet/popover/tooltip → Esc đóng.
- Reduced motion: dialog mở instant.

## Acceptance Criteria

- [ ] Skip-link hiện khi Tab lần đầu, click nhảy đến `#main-content`.
- [ ] Mọi button + link visible focus ring khi tab.
- [ ] Lighthouse a11y `/` ≥ 95, `/login` ≥ 95, `/billing/plan` ≥ 90.
- [ ] axe-core (qua DevTools) → 0 critical issue.
- [ ] Keyboard tab `/` từ đầu đến cuối không kẹt, không skip element.
- [ ] Esc đóng đúng dialog đang mở.
- [ ] Icon-only button có aria-label.
- [ ] Form `/login`: label + aria-invalid + describedby đầy đủ.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
```

Manual:

1. Mở `/` → Tab → skip-link hiện → Enter → nhảy đến main.
2. Tab tiếp → đi qua nav → CTA → footer.
3. Mở `/login` → Tab → email → password → button. Submit empty → error linked.
4. Mở dialog bất kỳ (ví dụ AI assistant) → Tab loop trong dialog → Esc đóng → focus về trigger.
5. Chrome DevTools → Lighthouse a11y audit `/` và `/login`.
6. Reduced motion ON → dialog mở không animation, focus đúng.

## Không làm

- KHÔNG đổi color (P1-01 / P1-07).
- KHÔNG đổi spacing (P1-02).
- KHÔNG đổi component API.
- KHÔNG dùng `outline: none` thiếu thay thế.
- KHÔNG override Radix focus trap.

## Ghi chú khi trả kết quả

- Lighthouse score before/after (a11y).
- Số element đã thêm focus ring.
- Skip-link hoạt động chưa (screenshot).
- Risk: list element nào còn miss (nếu có) → tạo TODO.
