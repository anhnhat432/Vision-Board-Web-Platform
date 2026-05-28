# P1-01 — Typography Rhythm & Scale

## Mục tiêu

Tạo nhịp typography nhất quán toàn site (public + app sau login). Hiện tại heading/body có chỗ dùng `text-2xl`, chỗ dùng arbitrary `text-[26px]`, line-height không đều, font-weight nhảy 500 → 700 không lý do. Phase 1 chuẩn hoá lại để cảm giác premium như Linear / Stripe.

## Context dự án

- Stack: React 18 + Vite + TypeScript + Tailwind v4 + react-router.
- Heading font: `Source Serif 4 Variable` (qua `--app-font-serif`).
- Body font: `Be Vietnam Pro` (qua `--app-font-sans`).
- Tokens hiện có ở `src/styles/theme.css` từ `--text-xs` đến `--text-4xl` kèm `line-height`.
- Vibe: Calm Productivity + Warm Reflective — KHÔNG marketing-style giant headlines.

## Scope file

Đọc & sửa:

- `src/styles/theme.css` (tinh chỉnh token `--text-*` nếu cần)
- `src/styles/tokens.css` (chỉ chỉnh nếu cần thêm token mới)
- Các trang public:
  - `src/app/pages/LoginPage.tsx`
  - `src/app/pages/BillingPlan.tsx`
  - `src/app/pages/BillingFAQPage.tsx`
  - `src/app/pages/TermsPage.tsx`, `PrivacyPage.tsx`, `RefundPolicyPage.tsx`
  - `src/app/components/layout/AppPublicFooter.tsx`
- Các trang app sau login:
  - `src/app/pages/Dashboard.tsx`
  - `src/app/pages/TodayV2/TodayV2Page.tsx`
  - `src/app/pages/GoalTracker.tsx`
  - `src/app/pages/ReflectionJournal.tsx`
  - `src/app/pages/SettingsPage.tsx`

Đọc tham khảo (KHÔNG sửa logic, chỉ học pattern):

- `src/app/components/RootLayout.tsx`
- `src/app/components/landing/*.tsx` nếu có

## Yêu cầu kỹ thuật

### 1. Chuẩn hoá scale heading

Định nghĩa rõ trong comment ở `theme.css`:

- `text-display` (~40–48px, line-height 1.1, weight 500) → chỉ dùng cho hero `/`.
- `text-4xl` (~32px, 1.15, 500) → page hero H1 app.
- `text-3xl` (~26px, 1.2, 500) → section heading lớn.
- `text-2xl` (~22px, 1.3, 500) → section heading thường.
- `text-xl` (~18px, 1.4, 500) → card title.
- `text-lg` (~17px, 1.5, 500) → emphasis.
- `text-base` (~16px, 1.6, 400) → body default.
- `text-sm` (~15px, 1.55, 400) → secondary body.
- `text-xs` (~13px, 1.45, 500) → meta/label uppercase.

Heading luôn dùng `font-serif`. Body + UI label dùng `font-sans`. KHÔNG mix.

### 2. Loại bỏ arbitrary classes

Search regex `text-\[\d+px\]`, `leading-\[\d+`, `font-\[\d+\]` toàn `src/app/**/*.tsx`. Thay bằng token Tailwind tương đương. Báo cáo trong response các file đã thay.

### 3. Font-weight rule

- Heading serif: 500 (medium) là default. 600/700 chỉ khi cần nhấn rất mạnh (≤ 2 chỗ/page).
- Body sans: 400 default, 500 cho UI label/button, 600 cho stat/number nổi bật.
- KHÔNG dùng 700+ cho body Vietnamese (gãy chân chữ).

### 4. Line-height rule

Heading 1.1–1.3. Body 1.55–1.6. Label/meta 1.45. KHÔNG để `leading-tight` cho body Vietnamese vì dấu nặng/sắc bị đè.

### 5. Letter-spacing rule

Heading: `tracking-tight` (-0.01em) cho display, default cho còn lại.
Uppercase meta label: `tracking-[0.18em]` (đã có ở footer, giữ nguyên).
Body: default. KHÔNG `tracking-wide` cho Vietnamese body.

## Acceptance Criteria

- [ ] Không còn `text-[NNpx]` arbitrary trong `src/app/pages/**` và `src/app/components/**` (trừ trường hợp đặc biệt có comment lý do).
- [ ] Mọi `<h1>` page hero dùng `font-serif text-4xl` hoặc `text-display`.
- [ ] Mọi `<h2>` section dùng `font-serif text-2xl` hoặc `text-3xl`.
- [ ] Mọi body paragraph dùng `font-sans text-base` hoặc `text-sm` (cho secondary).
- [ ] Mobile 360px: không có chữ tràn ngang, không heading bị wrap xấu (1 chữ rớt xuống dòng).
- [ ] Dark mode: typography contrast giữ AA (`--app-ink` trên `--app-bg`).
- [ ] Visual diff so với trước: nhịp đều hơn, không có heading "to lệch" giữa các trang.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
```

Sau đó test thủ công:

1. Mở `/` → heading hero serif đẹp, không bold quá.
2. Mở `/login` → form heading + label cân đối.
3. Mở `/billing/plan` → 3 plan card có heading nhất quán.
4. Login → `/today` → page H1 + task title đều rhythm.
5. Mở `/reflection-journal` → heading + body story cân.
6. Toggle dark mode (Settings) → kiểm tra contrast.
7. Resize 360px → 1440px → không vỡ chữ.

## Không làm

- KHÔNG đổi nội dung copy.
- KHÔNG đổi component structure / props.
- KHÔNG thêm font mới.
- KHÔNG đổi color (đó là việc của prompt khác).
- KHÔNG sửa logic, chỉ sửa className + token.

## Ghi chú khi trả kết quả

Liệt kê:
- Số file đã sửa.
- Số arbitrary `text-[]` đã loại.
- Ảnh chụp before/after nếu có (mobile + desktop, light + dark).
- Risk / TODO còn lại.
