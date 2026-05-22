# Production Infra Checklist — PayOS

Last updated: 2026-05-22

Mục tiêu của checklist này là chốt hạ tầng thật trước khi nhận user trả phí:

- Frontend chạy trên Vercel ở `real` mode.
- Backend chạy trên Render.
- Firebase Auth là lớp đăng nhập.
- MongoDB Atlas lưu dữ liệu backend.
- PayOS xác nhận thanh toán thật qua hosted payment link + webhook.

Casso giữ lại trong code làm provider legacy (xem [docs/ops/payos-migration-plan.md](../docs/ops/payos-migration-plan.md)) nhưng không được dùng cho real payment đến khi Standard plan + webhook được khôi phục và verify lại độc lập.

Không commit secret vào repo. Tất cả giá trị thật phải nằm trong Vercel, Render, Firebase, MongoDB Atlas hoặc PayOS dashboard.

## 1. Trạng thái repo hiện tại

Đã sẵn sàng trong code:

- `render.yaml` đã cấu hình Render backend với health check `/api/health`.
- Backend đã có Firebase Admin auth middleware.
- Backend đã có Mongo/Mongoose connection.
- Backend đã có PayOS order + webhook flow:
  - `backend/src/models/PaymentOrderModel.ts` (sparse index cho `metadata.payos.orderCode` và `metadata.payos.paymentLinkId`)
  - `backend/src/services/payosPaymentAdapter.ts`
  - `backend/src/controllers/payosWebhookController.ts` (atomic claim chống race retry)
- Backend giữ Casso legacy cho rollback an toàn:
  - `backend/src/services/cassoPaymentAdapter.ts`
  - `backend/src/controllers/cassoWebhookController.ts`
- Frontend đã có QR/checkout page:
  - `src/app/pages/BillingCheckoutQR.tsx`
  - route `/billing/checkout/:orderId?`
- Runtime check vẫn dùng `npm run env:check` (full-stack) hoặc lệnh Casso legacy nếu cần kiểm chéo.

Chưa làm được trong repo vì cần tài khoản/secret thật:

- Tạo Firebase project.
- Tạo MongoDB Atlas cluster.
- Tạo Render service và nhập env vars.
- Tạo PayOS merchant account, lấy `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.
- Cấu hình PayOS production webhook URL.
- Nhập Vercel production env vars.

## 2. Firebase

Tạo project production:

1. Vào Firebase Console.
2. Create project: `vision-board-production`.
3. Authentication -> Sign-in method:
   - Enable Google.
   - Enable Email/Password.
4. Authentication -> Settings -> Authorized domains:
   - `vision-board-web-platform.vercel.app`
   - domain custom nếu có.
5. Project settings -> General -> Web app config.
6. Project settings -> Service accounts -> Generate new private key.

Vercel cần:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=vision-board-production.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vision-board-production
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_MEASUREMENT_ID=
```

Render cần:

```env
FIREBASE_PROJECT_ID=vision-board-production
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@vision-board-production.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Giữ `\n` escaped trong `FIREBASE_PRIVATE_KEY`.

## 3. MongoDB Atlas

Tạo cluster:

1. MongoDB Atlas -> Create cluster.
2. Tier: M0 hoặc M2 nếu muốn backup tự động sau này.
3. Region gần Việt Nam, ưu tiên Singapore nếu có.
4. Database Access -> tạo database user riêng cho app.
5. Network Access:
   - Cho MVP Render có thể dùng `0.0.0.0/0`.
   - Khi có static outbound IP thì siết lại.
6. Copy connection string.

Render cần:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/vision_board?retryWrites=true&w=majority
```

## 4. Render Backend

Tạo Web Service từ GitHub repo bằng `render.yaml`.

Quan trọng:

- Root dir: `backend`
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm run start`
- Health check path: `/api/health`
- Node: backend package yêu cầu `20.x`

Render env vars:

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_ORIGIN=https://vision-board-web-platform.vercel.app
BILLING_PROVIDER=payos
BILLING_REPOSITORY=mongo
BILLING_PAID_DISABLED=true
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
PLUS_PRICE_VND=99000
```

Giữ `BILLING_PAID_DISABLED=true` cho đến khi PayOS đã verify end-to-end (xem mục rollout trong [docs/ops/payos-migration-plan.md](../docs/ops/payos-migration-plan.md)).

Sau deploy, kiểm tra:

```bash
curl https://<render-service>.onrender.com/api/health
```

Kỳ vọng:

```json
{"success":true,"data":{"status":"ok"}}
```

## 5. PayOS

Tạo PayOS:

1. Đăng ký tài khoản PayOS merchant.
2. Lấy `Client ID`, `API Key`, `Checksum Key` từ PayOS dashboard.
3. Cấu hình webhook URL trong PayOS dashboard:

```text
https://<render-service>.onrender.com/api/webhooks/payos
```

Lưu ý:

- Backend còn route alias `/api/billing/webhook/payos` để tương thích cấu hình cũ; cả 2 đều gọi cùng controller.
- `PAYOS_CHECKSUM_KEY` trên Render phải khớp với checksum key trên PayOS dashboard. Webhook không có checksum hoặc sai checksum đều bị reject (HTTP 401) trước khi vào logic billing.
- PayOS webhook idempotent ở 2 lớp: (a) atomic `findOneAndUpdate` claim trong `payosWebhookController`, (b) dedup theo `providerEventId` trong `billingService`. Có thể bật retry không lo grant trùng.

Casso legacy (chỉ kích hoạt nếu khôi phục lại):

```text
https://<render-service>.onrender.com/api/webhooks/casso
```

Không cần cấu hình Casso khi `BILLING_PROVIDER=payos`.

## 6. Vercel Frontend

Production env vars:

```env
VITE_APP_MODE=real
VITE_API_BASE_URL=https://<render-service>.onrender.com/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=vision-board-production.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vision-board-production
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_MEASUREMENT_ID=
VITE_BILLING_PROVIDER_MODE=api_contract
VITE_BILLING_PROVIDER_LABEL=PayOS
VITE_BILLING_PAID_CHECKOUT_DISABLED=true
VITE_ENABLE_12_WEEK_MUTATION_SYNC=true
VITE_ENABLE_12_WEEK_PULL_SYNC=true
VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN=true
VITE_ENABLE_12_WEEK_CLOUD_IMPORT=true
VITE_ANALYTICS_MODE=off
```

Giữ `VITE_BILLING_PAID_CHECKOUT_DISABLED=true` cho đến khi sandbox + 1 giao dịch thật được verify (xem rollout plan).

Sau khi nhập env vars, redeploy production.

## 7. Verification

Chạy local checks:

```bash
npm run check
npm --prefix backend run check
```

Chạy env check full-stack sau khi local `backend/.env` và frontend env production đã đủ:

```bash
npm run env:check
npm run env:check:full
```

Nếu muốn kiểm tra env trước khi backend health sẵn sàng:

```bash
node scripts/check-runtime-env.mjs --full-stack --mode production --skip-health
```

Manual smoke sau khi deploy (giai đoạn kill-switch còn bật):

1. Mở production Vercel.
2. Đăng ký/đăng nhập Firebase.
3. Tạo mục tiêu và 12-week plan.
4. Refresh, đăng xuất, đăng nhập lại để kiểm tra dữ liệu sync.
5. Mở `/billing/plan`. Upgrade CTA phải hiển thị copy fallback hỗ trợ, không POST tới `/billing/checkout-session`.
6. `POST /api/billing/checkout-session` (auth) phải trả 503 với `errorCode: "checkout_disabled"`.
7. `GET /api/billing/webhook/payos/health` trả `configured: true` khi đã có env.

Manual smoke sau khi tắt kill-switch (controlled rollout):

1. Tạo PayOS payment link qua `/billing/confirm`.
2. Thanh toán số nhỏ (e.g. 1000 VND test plan nếu PayOS cho phép, nếu không dùng `PLUS_PRICE_VND` thật).
3. PayOS webhook về Render; theo dõi Sentry `feature=billing`.
4. Order chuyển `completed`, `metadata.payos.webhookReference` được set.
5. `GET /api/billing/entitlement` trả gói `PLUS` với `currentPeriodEnd` = ngày thanh toán + 12 tuần.
6. Email biên nhận gửi tới `receiptEmail`.
7. Nếu PayOS retry webhook, lần thứ hai trả `status: "duplicate"` mà không grant lại.

## 8. Go/No-Go hạ tầng

Go khi:

- Vercel production dùng `VITE_APP_MODE=real`.
- Firebase login hoạt động.
- Render `/api/health` OK.
- MongoDB ghi/đọc được profile/plan.
- `GET /api/billing/webhook/payos/health` trả `configured: true`.
- PayOS webhook trả 200 khi gửi payload có signature đúng, 401 khi sai.
- Hosted PayOS checkout link tạo được order và poll được trạng thái.
- 1 giao dịch thật trong cửa sổ controlled đã grant PLUS đúng và idempotent với retry.

No-Go khi:

- Thiếu Firebase client env trên Vercel.
- Render chưa có Firebase Admin env hoặc PayOS env (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`).
- Render chưa có MongoDB URI.
- `BILLING_PROVIDER` khác `payos` trong production.
- `BILLING_REPOSITORY` không phải `mongo`.
- PayOS checksum key trên Render không khớp với PayOS dashboard.
- Checkout UI có thể mở gói mà không qua webhook thành công.
- Sentry alert `feature=billing severity=critical` chưa được cấu hình.
