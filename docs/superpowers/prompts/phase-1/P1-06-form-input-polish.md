# P1-06 — Form Inputs & Validation Polish

## Mục tiêu

Tinh chỉnh các form chính: login, billing checkout, onboarding, settings, SMART goal, reflection journal. Mục tiêu cảm giác form "calm + chính xác" — Stripe-like — chứ không messy.

## Context dự án

- Form base ở `src/app/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `label.tsx`, `form.tsx` (shadcn).
- Đang dùng `react-hook-form` + `zod` ở vài form (login, SMART goal).
- Tokens: `--app-line` (border), `--app-accent` (focus), `--app-ink-soft` (label).

## Scope file

- `src/app/components/ui/input.tsx`, `textarea.tsx`, `select.tsx` — chuẩn hoá variant.
- `src/app/pages/LoginPage.tsx` — apply.
- `src/app/pages/BillingPlan.tsx`, `BillingCheckoutQR.tsx` — apply.
- `src/app/pages/Onboarding.tsx` — apply.
- `src/app/pages/SettingsPage.tsx` — apply.
- `src/app/pages/SMARTGoalSetup/components/*Step.tsx` — apply (chỉ wrapper, không đổi logic).
- `src/app/pages/ReflectionJournal.tsx` — apply.

KHÔNG sửa: validation schema, react-hook-form logic, action submit.

## Yêu cầu kỹ thuật

### 1. Input default

- Height: 44px desktop / 44px mobile (touch target).
- Border: `border border-app-line bg-app-surface rounded-lg`.
- Padding: `px-3 py-2`.
- Text: `text-base font-sans text-app-ink`.
- Placeholder: `text-app-ink-muted`.
- Focus: `border-app-accent ring-2 ring-app-accent/20 outline-none`.
- Disabled: `bg-app-bg/50 text-app-ink-muted cursor-not-allowed`.
- Invalid (aria-invalid="true"): `border-destructive ring-2 ring-destructive/20`.

### 2. Label

- `text-sm font-medium text-app-ink`.
- Required indicator: `<span className="text-destructive ml-0.5" aria-hidden>*</span>` + `aria-required` trên input.
- Label-input gap: `mb-1.5`.
- Optional hint text: `text-xs text-app-ink-muted mt-1`.

### 3. Error message

- `text-xs text-destructive mt-1` + `role="alert"`.
- Link với input qua `aria-describedby={errorId}`.
- Không quá 2 dòng. Copy thân, không doạ ("Email chưa đúng định dạng" thay vì "Invalid email format").

### 4. Helper text

- `text-xs text-app-ink-muted mt-1`.
- Khi có error, ẩn helper, chỉ show error.

### 5. Textarea

- Min-height: 96px (3 dòng).
- Max-height: 240px, sau đó scroll.
- Resize: `resize-y` (chỉ dọc).
- Còn lại như Input.

### 6. Select

- Dùng Radix Select hiện có.
- Trigger style đồng bộ Input.
- Item active: `bg-app-accent-soft text-app-accent`.

### 7. Checkbox & Radio

- Size 18px.
- Border `border-app-line`.
- Checked: `bg-app-accent border-app-accent`.
- Focus: ring (P1-04).
- Label clickable (htmlFor).

### 8. Button submit trong form

- Width: full mobile, auto desktop.
- Loading state đã chuẩn ở P1-04.
- Sau submit thành công: hiện toast (đã có sonner), KHÔNG đổi route ngay nếu user đang fill — wait toast 800ms rồi navigate.

### 9. Field group (multi-field row)

- Desktop ≥ 768px: `grid grid-cols-2 gap-4`.
- Mobile: 1 cột, `gap-3`.
- Field name "first/last name" → KHÔNG áp dụng vì Vietnamese, dùng 1 trường "Họ và tên".

### 10. Autofocus

- Form `/login`: autofocus email input.
- Form onboarding step 1: autofocus first field.
- Modal open form: focus đầu vào (Radix tự lo).

## Acceptance Criteria

- [ ] Tất cả input/textarea/select trong scope file dùng pattern chuẩn.
- [ ] Mọi input có label + aria-describedby + aria-invalid đúng.
- [ ] Error message hiện rõ, không xô layout (reserved space hoặc transform).
- [ ] Touch target ≥ 44px mọi field.
- [ ] Light + dark mode: border, focus ring, disabled state đều rõ.
- [ ] Lighthouse a11y `/login` ≥ 95.
- [ ] axe-core 0 critical issue trên form login.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
```

Manual:

1. `/login` → tab email → password → submit. Empty submit → error rõ.
2. `/billing/plan` → click upgrade → form checkout. Field rõ ràng.
3. Login → `/onboarding` → form step rõ.
4. `/settings` → đổi tên → save → toast hiện.
5. `/reflection-journal` → tạo entry → textarea resize được, max-height hợp lý.
6. Mobile 360px: form `/login` không tràn ngang.
7. Dark mode toggle → form vẫn rõ.

## Không làm

- KHÔNG đổi schema validation.
- KHÔNG đổi logic submit / API call.
- KHÔNG thêm trường mới.
- KHÔNG đổi copy error message lớn — chỉ chỉnh nhỏ cho thân.
- KHÔNG thay react-hook-form.

## Ghi chú khi trả kết quả

- File đã sửa.
- Before/after screenshot form `/login` (light + dark).
- Lighthouse score form.
- Risk còn lại.
