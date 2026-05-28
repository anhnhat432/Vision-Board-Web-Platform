# P1-02 — Spacing & 8pt Grid System

## Mục tiêu

Chuẩn hoá nhịp khoảng cách (spacing rhythm) toàn site theo 8pt grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64). Hiện tại nhiều chỗ đang dùng `mt-[14px]`, `gap-7`, `py-9`... lệch grid khiến cảm giác "đẹp ngẫu nhiên" thay vì "đẹp có hệ thống".

## Context dự án

- Tailwind v4 — spacing scale mặc định (`1` = 4px, `2` = 8px, `3` = 12px...).
- Tokens cho section gap có sẵn: `--app-section-gap: 24px`, `--app-section-gap-compact: 20px`, `--app-card-padding: 24px`, `--app-card-padding-mobile: 20px` (xem `src/styles/tokens.css`).
- Container max-width thường dùng: `max-w-6xl` cho landing, `max-w-3xl` cho article-like, `max-w-md` cho auth form.

## Scope file

Sửa spacing trong:

- `src/app/pages/*.tsx` (tất cả page-level)
- `src/app/components/layout/*.tsx`
- `src/app/components/landing/*.tsx` nếu có
- `src/app/features/**/components/*.tsx`

KHÔNG sửa: `src/app/components/ui/*.tsx` (shadcn base) — giữ nguyên.

## Yêu cầu kỹ thuật

### 1. Grid 8pt

Chỉ dùng các giá trị spacing này:

- `gap-1` (4), `gap-2` (8), `gap-3` (12), `gap-4` (16), `gap-5` (20), `gap-6` (24), `gap-8` (32), `gap-10` (40), `gap-12` (48), `gap-16` (64).
- Tương tự cho `p-*`, `m-*`, `space-y-*`.
- KHÔNG dùng `gap-7` (28), `gap-9` (36), `gap-11` (44), `gap-14` (56), `gap-15` (60). Nếu bắt buộc, comment lý do.
- KHÔNG dùng arbitrary `p-[NNpx]`, `mt-[NNpx]` trừ trường hợp đặc biệt (sticky offset, scroll-margin) — có comment.

### 2. Section rhythm

Trong 1 page:

- Section đầu (hero) → section sau: `mt-16` (64px) desktop / `mt-12` (48px) mobile.
- Section thường → section thường: `mt-12` desktop / `mt-10` mobile.
- Block trong section: `space-y-6` (24px) hoặc `space-y-8` (32px).
- Card group: `gap-6` (24px) hoặc `gap-4` (16px) tuỳ density.

### 3. Card padding

- Card lớn / hero card: `p-6` desktop / `p-5` mobile (dùng token `var(--app-card-padding)` qua arbitrary chỉ khi cần).
- Card thường: `p-5` desktop / `p-4` mobile.
- Card nhỏ / list item: `p-4`.

### 4. Container

- Public landing & footer: `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8`.
- App sau login dạng article (Reflection, Privacy, Terms): `mx-auto max-w-3xl px-4 sm:px-6`.
- Form auth / single column: `mx-auto max-w-md px-4`.
- Dashboard / Today / Plan: `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` (đồng bộ).

### 5. Vertical rhythm trong form

- Field gap: `space-y-4` (16px) hoặc `space-y-5` (20px) tuỳ density.
- Label → input: `space-y-1.5` (6px) — đây là exception cần thiết, comment "form label tight".
- Input → helper text: `mt-1.5`.

## Acceptance Criteria

- [ ] Search `p-\[\d+px\]`, `m-\[\d+px\]`, `gap-\[\d+px\]` trong `src/app/pages/**` → ≤ 5 occurrences, mỗi cái phải có comment lý do.
- [ ] Không còn `gap-7`, `gap-9`, `gap-11`, `gap-14` trong `src/app/**`.
- [ ] Mọi page có hero → section sau cách 64px desktop / 48px mobile.
- [ ] Footer cách content trên đó đúng `mt-16` (64px).
- [ ] Mobile 360px: padding ngoài cùng tối thiểu `px-4` (16px), không sát mép.
- [ ] Desktop ≥ 1024px: container không tràn quá `max-w-6xl`, nội dung article không quá `max-w-3xl`.
- [ ] Form `/login`, `/billing/plan`: field rhythm đều.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
```

Visual check:

1. `/` — hero, features, footer căn nhịp.
2. `/login` — form cân, không sát mép mobile.
3. `/billing/plan` — 3 card cùng padding, gap đều.
4. `/today` — task list không bị chật, có thở.
5. `/reflection-journal` — list entry rhythm đều.
6. `/settings` — section group cân đối.
7. Resize 360 → 768 → 1024 → 1440 không vỡ.

## Không làm

- KHÔNG đổi typography (P1-01 lo).
- KHÔNG đổi màu / border / shadow.
- KHÔNG đổi animation / motion.
- KHÔNG sửa logic, chỉ className.
- KHÔNG đụng `src/app/components/ui/*` (shadcn).

## Ghi chú khi trả kết quả

Liệt kê:
- Số file đã sửa.
- Diff stat (approximate).
- Top 3 page có cải thiện rõ nhất.
- Risk còn lại (nếu có chỗ phải break grid).
