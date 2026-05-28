# P1-04 — Button & Link Micro-interactions

## Mục tiêu

Chuẩn hoá micro-interaction (hover, active, focus, disabled) của button + link toàn site. Hiện tại nhiều chỗ chỉ có `hover:opacity-80` hoặc không có gì — cảm giác "tĩnh". Mục tiêu: subtle, premium, không over-animated.

## Context dự án

- Đã có button base ở `src/app/components/ui/button.tsx` (shadcn).
- Đã có `--duration-*` và `--ease-*` token ở `src/styles/theme.css`.
- Đã có `interactive-surface.tsx` component.
- Brand color: `--app-accent` (forest green), `--app-warm` (terracotta).

## Scope file

Đọc & sửa:

- `src/app/components/ui/button.tsx` — chuẩn hoá variant.
- `src/app/components/ui/interactive-surface.tsx` — nếu cần thêm state.
- Search regex `hover:opacity-` và `transition-opacity` toàn `src/app/**` → thay bằng pattern chuẩn.

Đọc tham khảo:
- `src/styles/theme.css` (xem token motion / shadow đã có).

KHÔNG sửa: anchor `<a>` raw trong markdown / footer link đã có pattern tốt.

## Yêu cầu kỹ thuật

### 1. Button variants

**Primary (`bg-app-accent text-white`)**:
- Idle: `bg-app-accent`, `shadow-1`.
- Hover: `bg-app-accent/95`, `shadow-2`, `transition-all duration-fast ease-standard`.
- Active: `scale-[0.98]`, `shadow-1`, `duration-instant`.
- Focus-visible: `outline-none ring-2 ring-app-accent/40 ring-offset-2 ring-offset-app-bg`.
- Disabled: `opacity-50 pointer-events-none`.

**Secondary / Outline (`border border-app-line bg-app-surface`)**:
- Idle: `border-app-line`.
- Hover: `border-app-accent/40 bg-app-accent-soft/30`.
- Active: `scale-[0.98] bg-app-accent-soft/50`.
- Focus-visible: same ring.
- Disabled: `opacity-50`.

**Ghost (`bg-transparent text-app-ink`)**:
- Hover: `bg-app-ink/5`.
- Active: `bg-app-ink/8 scale-[0.98]`.

**Destructive**:
- Idle: `bg-destructive text-white`.
- Hover: `bg-destructive/90`.
- Active: `scale-[0.98]`.

### 2. Link (text link inline)

- Idle: `text-app-accent underline-offset-4`.
- Hover: `underline decoration-app-accent/60 decoration-1`.
- Active: `text-app-accent/80`.
- Focus-visible: ring-2 (same as button).
- KHÔNG dùng `hover:opacity-80` cho link nữa.

### 3. Icon button

- Size 44×44 mobile (touch target), 36×36 desktop optional.
- Idle: `bg-transparent text-app-ink-soft`.
- Hover: `bg-app-ink/5 text-app-ink`.
- Active: `bg-app-ink/8 scale-[0.96]`.
- Focus-visible: ring-2.

### 4. Tap feedback

Mobile: tất cả button chính → `active:scale-[0.98]` hoặc `active:scale-[0.96]` cho icon-only. Duration `duration-instant` (120ms).

### 5. Loading state

Button khi `loading={true}`:
- Disable click.
- Show spinner (`LoadingSpinner` đã có).
- Giữ label dimmed (`opacity-60`).
- KHÔNG đổi width (chống layout shift).

### 6. Reduced motion

`@media (prefers-reduced-motion: reduce)`:
- Bỏ scale active, giữ color hover.
- Bỏ transition delay.

## Acceptance Criteria

- [ ] Tất cả button trong `src/app/components/ui/button.tsx` có 4 state rõ (idle/hover/active/focus) + disabled + loading.
- [ ] Search `hover:opacity-` trong `src/app/**` chỉ còn ở 0–3 chỗ có lý do (ví dụ logo).
- [ ] Focus ring visible trên mọi button khi tab keyboard.
- [ ] Active scale rõ trên mobile khi tap (test trên thiết bị thật / DevTools touch).
- [ ] Reduced motion: scale bị disable, ring vẫn còn.
- [ ] Disabled button: opacity 50%, không hover effect.
- [ ] Light + dark: ring offset đúng theo `--app-bg`.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
```

Manual:

1. `/login` — primary button "Đăng nhập" hover/active/focus đẹp.
2. `/billing/plan` — 3 CTA card, mỗi cái focus ring không đè card neighbor.
3. Login → `/today` → button "Thêm việc" tap mobile có scale.
4. Footer link hover underline subtle.
5. Tab toàn `/` từ đầu → cuối → focus đi đúng thứ tự, không mất ring.
6. DevTools toggle reduced-motion → scale gone, ring kept.

## Không làm

- KHÔNG thêm haptic / vibration API.
- KHÔNG thêm sound effect.
- KHÔNG glow / shadow màu rực.
- KHÔNG bounce / overshoot.
- KHÔNG đổi variant API (giữ props giống shadcn).
- KHÔNG sửa logic onClick.

## Ghi chú khi trả kết quả

- Số file sửa.
- Số `hover:opacity-` còn lại + lý do.
- Visual demo (gif hoặc screenshot 4 state).
- Risk còn lại.
