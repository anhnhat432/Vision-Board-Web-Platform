# P1-08 — Card & Surface Polish

## Mục tiêu

Chuẩn hoá card surface (depth, border, hover, radius) toàn site. Hiện tại có chỗ `rounded-lg`, chỗ `rounded-xl`, `rounded-2xl`; shadow lúc có lúc không; hover state không đều. Mục tiêu: nhịp surface tĩnh, có depth khi cần, hover subtle.

## Context dự án

- Token: `--app-radius-card: 14px`, `--shadow-1` đến `--shadow-5`, `--app-line`, `--app-surface`.
- Component base: `src/app/components/ui/card.tsx` (shadcn).
- Featured card: `src/app/components/ui/featured-card.tsx`.
- Interactive surface: `src/app/components/ui/interactive-surface.tsx`.

## Scope file

- `src/app/components/ui/card.tsx` — chuẩn hoá variant.
- Tất cả `src/app/pages/**` dùng card / surface custom.
- `src/app/features/**` card.

KHÔNG sửa: card-as-component cụ thể có logic phức tạp (chỉ apply class).

## Yêu cầu kỹ thuật

### 1. Radius scale

- Card lớn (hero card, plan card): `rounded-2xl` (16px).
- Card thường (task, entry): `rounded-xl` (12px) hoặc dùng token `rounded-card` (14px).
- Pill / chip: `rounded-full`.
- Input / button: `rounded-lg` (8px).

Đồng bộ:
- Plan card billing: `rounded-2xl`.
- Today task card: `rounded-xl`.
- Vision board tile: `rounded-2xl`.
- Reflection entry: `rounded-xl`.
- Goal card: `rounded-xl`.

### 2. Border vs Shadow

3 level surface:

**Flat surface** (list item, inline section):
- `bg-app-surface border border-app-line`.
- No shadow.

**Raised surface** (card chính):
- `bg-app-surface border border-app-line shadow-1`.
- Hover: `shadow-2 -translate-y-px transition-all duration-fast`.
- KHÔNG translate quá 2px.

**Elevated surface** (featured plan, modal-like):
- `bg-app-surface border border-app-line shadow-3`.
- Hover: `shadow-4`.

### 3. Card hover (chỉ khi clickable)

- Cursor: pointer.
- Hover: `-translate-y-px shadow-2` (raised) hoặc `shadow-4` (elevated).
- Active: `translate-y-0 shadow-1 scale-[0.99]`.
- Focus-visible: ring (P1-05).
- Reduced motion: bỏ translate + scale.

Card không clickable: KHÔNG hover state, giữ tĩnh.

### 4. Padding nội bộ

- Card lớn: `p-6` desktop / `p-5` mobile (xem P1-02).
- Card thường: `p-5` desktop / `p-4` mobile.
- Card list item: `p-4`.

### 5. Header trong card

- Cấu trúc: title (h3 `text-lg font-serif`), optional eyebrow (`text-xs uppercase tracking-wide text-app-ink-muted`), optional badge.
- Spacing title → body: `mt-2`.
- KHÔNG dùng `text-2xl` cho card title trừ hero card.

### 6. Divider trong card

- `border-t border-app-line`.
- Margin `my-4`.

### 7. Featured card (plan recommended)

- Border `border-app-accent/40`.
- Background `bg-app-surface` + 1 lớp `bg-gradient-to-br from-app-accent-soft/30 to-transparent`.
- Badge "Phổ biến" góc trên phải: `bg-app-accent text-white text-xs rounded-full px-3 py-1`.

### 8. Empty card

- Border dashed `border-dashed border-app-line`.
- Background `bg-app-bg/50`.
- Icon + copy `text-app-ink-muted`.

## Acceptance Criteria

- [ ] Search `rounded-3xl` trong `src/app/**` → 0 (trừ image).
- [ ] Card lớn hero/plan: `rounded-2xl` đồng bộ.
- [ ] Card thường: `rounded-xl` đồng bộ.
- [ ] Hover translate-y luôn ≤ 2px, không nhảy.
- [ ] Reduced motion: hover bỏ translate, giữ shadow change.
- [ ] Featured plan card có border accent + gradient nhẹ.
- [ ] Empty state card dashed border.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
```

Manual:

1. `/billing/plan` → 3 card đồng radius, featured có border accent.
2. `/today` → task card hover lift nhẹ, không glitch.
3. `/dashboard` → goal card / progress card đồng bộ.
4. `/vision-board` → tile rounded 2xl đẹp.
5. `/reflection-journal` → entry card rhythm.
6. Reduced motion → hover bỏ translate.
7. Dark mode → border + shadow vẫn rõ.

## Không làm

- KHÔNG dùng glassmorphism (`backdrop-blur` lan).
- KHÔNG dùng neumorphism (inset shadow đè).
- KHÔNG glow neon.
- KHÔNG đổi component prop API.
- KHÔNG sửa logic state.

## Ghi chú khi trả kết quả

- File đã sửa.
- Top 3 surface cải thiện rõ.
- Risk còn lại.
