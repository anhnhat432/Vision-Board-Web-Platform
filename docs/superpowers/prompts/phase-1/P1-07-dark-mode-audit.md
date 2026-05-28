# P1-07 — Dark Mode Full Audit & Fix

## Mục tiêu

Audit toàn site ở dark mode, fix mọi chỗ hardcode `bg-white`, `text-black`, `border-gray-200`, gradient sáng làm hỏng vibe tối. Mục tiêu: dark mode đẹp tương đương light, không hỏng hierarchy.

## ⚠️ Carryover từ P1-05 (BẮT BUỘC fix trong prompt này)

P1-05 baseline phát hiện **R3 — dark mode contrast blocker**:

- Token `--app-accent: #5BA590` (dark mode, `tokens.css:43`) trên text trắng `#FFFFFF` → contrast 2.9:1.
- WCAG AA yêu cầu ≥ 4.5:1 cho body text, ≥ 3:1 cho large text/UI.
- axe-core flag 3 button trên `/` ở dark mode (serious).
- Light mode KHÔNG bị (P1-05 đã pass 100/100/100 light).

**Giải pháp cần evaluate:**

1. **Option A — Darken `--app-accent` dark:** đổi `#5BA590` → `#3D8A75` hoặc `#4A8A78` (kiểm tra contrast với `#FFFFFF` ≥ 4.5:1 + giữ recognizable forest green).
2. **Option B — Dark text trên accent button (dark mode):** giữ token, đổi text color khi dark: `dark:text-app-bg` (text gần đen trên green nhạt).
3. **Option C — Dual token:** thêm `--app-accent-text-dark` riêng cho text-on-accent.

Khuyến nghị Option A (đơn giản, sweep 1 chỗ fix toàn site). Verify bằng:

```bash
# Sau khi fix, re-run axe trên dark mode:
# Set html.classList.add("dark") → run axe → confirm 0 serious violations.
```

KHÔNG được close P1-07 nếu R3 chưa pass axe dark mode 0 serious violation.

## Context dự án

- Dark mode đã có ở `html.dark` trong `src/styles/tokens.css`.
- Toggle dark/light ở Settings.
- Token đã có: `--app-bg #1C1A15`, `--app-surface #26231D`, `--app-ink #F2EDE5`, `--app-accent #5BA590`, `--app-warm #E89878`.
- Vibe dark: "warm near-black" — không pure `#000`, không neon glow.

## Scope file

- Tất cả `src/app/pages/**/*.tsx`.
- Tất cả `src/app/components/layout/**/*.tsx`.
- Tất cả `src/app/features/**/*.tsx`.
- `src/styles/theme.css` — thêm dark override CSS-only nếu cần (sparing).

KHÔNG sửa: `src/app/components/ui/*` (shadcn đã có dark variant).

## Yêu cầu kỹ thuật

### 1. Search & replace hardcode

Search regex trong `src/app/**/*.tsx`:

- `bg-white\b` → `bg-app-surface`.
- `text-black\b` → `text-app-ink`.
- `text-white\b` (trừ khi nằm trên accent fill) → `text-app-ink` hoặc giữ nếu cần.
- `border-gray-(100|200|300)\b` → `border-app-line`.
- `bg-gray-(50|100)\b` → `bg-app-bg` hoặc `bg-app-surface`.
- `text-gray-(500|600|700)\b` → `text-app-ink-soft` hoặc `text-app-ink-muted`.

Mỗi thay thế phải check context: nếu là button accent (text trắng trên xanh) thì giữ `text-white`.

### 2. Gradient & background image

- Background gradient sáng (`from-white to-gray-50`) → `from-app-bg to-app-surface`.
- Hero gradient warm → giữ logic nhưng kiểm tra dark đủ contrast.
- Background image marketing → ẩn ở dark hoặc dùng version dark riêng (CSS `:is(.dark) .hero-bg { background-image: url(...) }`).

### 3. Shadow

- Shadow drop cho card light: ổn vì dùng `rgba(15, 23, 42, ...)` → trên dark vẫn ok nhưng nhẹ.
- Dark mode có thể tăng border-1 thay shadow để rõ hơn: thêm `dark:shadow-none dark:border` nếu cần.

### 4. Image / mockup

- Screenshot mockup light tone → ẩn ở dark, swap version dark (`src="..." className="dark:hidden"` + `src="..." className="hidden dark:block"`).
- Logo: nếu logo trắng/đen, swap qua `dark:invert` hoặc 2 file.
- Favicon giữ nguyên.

### 5. Code block & syntax

- Nếu có code preview (Terms/Privacy có thể không), dùng background `bg-app-bg dark:bg-app-bg` để đồng bộ.

### 6. Tag / badge

- Badge `bg-app-accent-soft text-app-accent` → dark dùng `bg-app-accent-soft` (#1F3A33), `text-app-accent` (#5BA590). Đã ok do token.
- Status badge color: success/warn/error → dùng token destructive/success/warning đã có.

### 7. Contrast check

Mỗi cặp text/bg trong dark mode phải ≥ 4.5:1 (body) hoặc 3:1 (large text/heading ≥ 18.66px).

Chạy mental check hoặc dùng axe DevTools:

- `--app-ink #F2EDE5` trên `--app-bg #1C1A15` → ~14:1 ✓
- `--app-ink-soft #C8C2B5` trên `--app-bg` → ~10:1 ✓
- `--app-ink-muted #A39B8C` trên `--app-bg` → ~6.9:1 ✓
- `--app-accent #5BA590` trên `--app-bg` → ~6.2:1 ✓ (large/UI text)
- `--app-warm #E89878` trên `--app-bg` → ~6.8:1 ✓

## Acceptance Criteria

- [ ] Search `bg-white`, `text-black`, `border-gray-*`, `text-gray-*` trong `src/app/**` → 0 hardcode (trừ chỗ comment lý do).
- [ ] Toggle dark mode toàn site không có "vùng sáng đột ngột".
- [ ] Mockup / logo / hero image swap đúng theo mode.
- [ ] Lighthouse a11y dark mode `/` và `/dashboard` ≥ 95.
- [ ] axe-core 0 contrast issue.
- [ ] Light mode KHÔNG bị ảnh hưởng (regression check).

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Settings → toggle dark → đi qua `/`, `/login`, `/billing/plan`, `/today`, `/dashboard`, `/reflection-journal`, `/settings`.
2. Không có vùng nào "trắng phếu" giữa dark.
3. Mọi text rõ.
4. Mọi border / divider visible.
5. Card có depth (border hoặc shadow).
6. Toggle về light → không vỡ.
7. Lighthouse a11y dark mode.

## Không làm

- KHÔNG đổi `--app-*` token color (đã chuẩn).
- KHÔNG đổi accent / warm hue.
- KHÔNG thêm dark-mode-only animation.
- KHÔNG đổi component API.
- KHÔNG sửa shadcn ui base.

## Ghi chú khi trả kết quả

- Số file sửa.
- Số hardcode đã loại.
- Lighthouse score light vs dark.
- Top 3 trang cải thiện rõ nhất ở dark.
- Risk: trang nào còn miss → TODO.
