# Vercel Deployment Checklist

## 1. Kết nối repo

- Trên Vercel, chọn repo `Vision-Board-Web-Platform`
- Branch deploy chính: `main`

## 2. Build settings

Vercel có thể tự nhận diện Vite, nhưng nếu muốn điền tay thì dùng:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Lưu ý:

- App này là SPA và đã có rewrite trong [`vercel.json`](../vercel.json), nên route như `/dashboard` hay `/12-week-system` sẽ không bị 404 khi refresh.

## 3. Chọn mode deploy

### Mode A: Demo nhanh nhất

Phù hợp khi bạn chỉ muốn web chạy ổn trên Vercel trước.

Thiết lập env:

- `VITE_APP_MODE=demo`
- `VITE_ANALYTICS_MODE=off`
- `VITE_BILLING_PROVIDER_MODE=mock_provider`
- `VITE_BILLING_PROVIDER_LABEL=Mock provider`

Mode này:

- không cần GA4
- không cần Firebase
- không gọi backend sync khi tạo 12-week plan
- không cần backend billing
- paywall vẫn hiện được ở dạng mock/demo

### Mode B: Real login + backend sync

Phù hợp khi bạn muốn dùng Firebase login và sync 12-week plan về backend thật.

Thiết lập env:

- `VITE_APP_MODE=real`
- `VITE_API_BASE_URL=https://your-backend.example.com/api`
- `VITE_FIREBASE_API_KEY=...`
- `VITE_FIREBASE_AUTH_DOMAIN=...`
- `VITE_FIREBASE_PROJECT_ID=...`
- `VITE_FIREBASE_APP_ID=...`
- `VITE_BILLING_PROVIDER_MODE=mock_provider`
- `VITE_BILLING_PROVIDER_LABEL=Mock provider`

Mode này:

- app vẫn dùng mock checkout
- backend sync chỉ chạy sau khi Firebase configured, user đã đăng nhập và backend profile đã sẵn sàng
- nếu thiếu Firebase env, Login page sẽ hiện notice cấu hình và backend sync sẽ bị bỏ qua

### Mode C: Casso + VietQR billing thật

Phù hợp khi backend Render đã deploy, Firebase/MongoDB đã cấu hình và Casso webhook đã sẵn sàng.

Thiết lập tối thiểu:

- `VITE_ANALYTICS_MODE=ga4`
- `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
- `VITE_APP_MODE=real`
- `VITE_API_BASE_URL=https://your-backend.onrender.com/api`
- `VITE_BILLING_PROVIDER_MODE=api_contract`
- `VITE_BILLING_PROVIDER_LABEL=Casso + VietQR`
- `VITE_ENABLE_12_WEEK_MUTATION_SYNC=true`
- `VITE_ENABLE_12_WEEK_PULL_SYNC=true`
- `VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN=true`
- `VITE_ENABLE_12_WEEK_CLOUD_IMPORT=true`

Chọn 1 trong 2 cách:

1. Dùng API base chung

- `VITE_BILLING_API_BASE=https://your-api.example.com/billing`

App sẽ tự suy ra:

- `/checkout`
- `/portal`
- `/restore`
- `/entitlements`

2. Dùng endpoint riêng

- `VITE_BILLING_CHECKOUT_ENDPOINT=...`
- `VITE_BILLING_PORTAL_ENDPOINT=...`
- `VITE_BILLING_RESTORE_ENDPOINT=...`
- `VITE_BILLING_ENTITLEMENT_SYNC_ENDPOINT=...`

Nếu có outbox sync thật, thêm:

- `VITE_OUTBOX_SYNC_ENDPOINT=https://your-api.example.com/outbox/sync`

## 4. Env variables nên tạo trên Vercel

Tham chiếu nhanh từ [`.env.example`](../.env.example):

- `VITE_ANALYTICS_MODE`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_APP_MODE`
- `VITE_API_BASE_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_OUTBOX_SYNC_ENDPOINT`
- `VITE_BILLING_PROVIDER_MODE`
- `VITE_BILLING_PROVIDER_LABEL`
- `VITE_BILLING_API_BASE`
- `VITE_BILLING_CHECKOUT_ENDPOINT`
- `VITE_BILLING_PORTAL_ENDPOINT`
- `VITE_BILLING_RESTORE_ENDPOINT`
- `VITE_BILLING_ENTITLEMENT_SYNC_ENDPOINT`

## 5. Smoke check sau khi deploy

Sau khi Vercel build xong, kiểm tra nhanh:

1. Mở `/`
2. Refresh ở `/dashboard` để chắc rewrite SPA hoạt động
3. Mở flow `Tạo mục tiêu -> SMART -> Feasibility -> 12-week`
4. Kiểm tra [`12WeekSetup.tsx`](../src/app/pages/12WeekSetup.tsx) có hiện `khung gợi ý`
5. Kiểm tra [`12WeekSystem.tsx`](../src/app/pages/12WeekSystem.tsx) mở được tab `Hôm nay / Tuần / Tiến độ / Cài đặt`
6. Mở paywall để chắc [`UpgradePaywallDialog.tsx`](../src/app/components/UpgradePaywallDialog.tsx) không vỡ layout
7. Nếu đang để `mock_provider`, thử flow mock checkout ở [`MockBillingCheckout.tsx`](../src/app/pages/MockBillingCheckout.tsx)

## 6. Khuyến nghị cho bản hiện tại

Với tình trạng dự án bây giờ, cách an toàn nhất là deploy theo `Mode A` trước:

- app lên nhanh
- không phụ thuộc backend
- vẫn demo được `Free` và `Plus`

Khi cần login và backend sync thật thì chuyển sang `Mode B` sau khi Firebase/Vercel env đã đầy đủ.
Khi có backend billing thật thì mới chuyển sang `Mode C`.

## 7. Required production env vars before soft launch

Frontend env on Vercel:

- `VITE_APP_MODE=real`
- `VITE_API_BASE_URL=https://vision-board-web-platform.onrender.com/api`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_BILLING_PROVIDER_MODE=api_contract`
- `VITE_BILLING_PROVIDER_LABEL`
- `VITE_ENABLE_12_WEEK_MUTATION_SYNC=true`
- `VITE_ENABLE_12_WEEK_PULL_SYNC=true`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT=production`
- `VITE_SENTRY_RELEASE`

Backend env on Render:

- `NODE_ENV=production`
- `PORT`
- `MONGODB_URI`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FRONTEND_ORIGIN=https://vision-board-web-platform.vercel.app`
- `BILLING_PROVIDER=casso`
- `BILLING_REPOSITORY=mongo`
- `CASSO_WEBHOOK_SECRET`
- `CASSO_BANK_ACCOUNT`
- `CASSO_BANK_NAME`
- `CASSO_ACCOUNT_NAME`
- `PLUS_PRICE_VND`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_RELEASE`

Do not commit any real value from this list. Set production values only in Vercel, Render, Firebase, MongoDB Atlas, Casso, and Sentry dashboards.

## 8. Security verification

Run local env checks before deploy:

```bash
node scripts/check-runtime-env.mjs
node scripts/check-runtime-env.mjs --full-stack --casso-billing
```

Expected behavior:

- Dev/report mode may warn about missing Sentry and backend env, but must not require Sentry.
- Full-stack mode fails when MongoDB, Firebase Admin, or required Casso billing env is missing.
- Full-stack mode warns, but does not fail, when `SENTRY_DSN` or `VITE_SENTRY_DSN` is missing.

After Vercel preview deploy, verify HTTP security headers:

```bash
curl -I https://<vercel-preview-url>.vercel.app
```

Expected headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` with `frame-ancestors 'none'`

Sentry smoke check:

1. Set `SENTRY_DSN` on Render and `VITE_SENTRY_DSN` on Vercel.
2. Trigger one known failing backend request in staging, for example an authenticated endpoint with an invalid bearer token.
3. Confirm Sentry receives an `auth_failed` event with method/path context and without raw request body.
4. Trigger one Casso webhook request with an invalid secure token in staging.
5. Confirm Sentry receives `casso_webhook_signature_mismatch`.

If Firebase popup login breaks after CSP is enabled, check the browser console first and add only the exact Firebase origin that is blocked.
