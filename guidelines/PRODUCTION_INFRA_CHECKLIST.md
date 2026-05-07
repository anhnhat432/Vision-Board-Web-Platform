# Production Infra Checklist — Casso + VietQR

Last updated: 2026-05-07

Mục tiêu của checklist này là chốt hạ tầng thật trước khi nhận user trả phí:

- Frontend chạy trên Vercel ở `real` mode.
- Backend chạy trên Render.
- Firebase Auth là lớp đăng nhập.
- MongoDB Atlas lưu dữ liệu backend.
- Casso + VietQR xác nhận chuyển khoản thật.

Không commit secret vào repo. Tất cả giá trị thật phải nằm trong Vercel, Render, Firebase, MongoDB Atlas hoặc Casso.

## 1. Trạng thái repo hiện tại

Đã sẵn sàng trong code:

- `render.yaml` đã cấu hình Render backend với health check `/api/health`.
- Backend đã có Firebase Admin auth middleware.
- Backend đã có Mongo/Mongoose connection.
- Backend đã có Casso order + webhook flow:
  - `backend/src/models/PaymentOrderModel.ts`
  - `backend/src/services/cassoPaymentAdapter.ts`
  - `backend/src/controllers/cassoWebhookController.ts`
  - `backend/src/controllers/orderStatusController.ts`
- Frontend đã có QR checkout page:
  - `src/app/pages/BillingCheckoutQR.tsx`
  - route `/billing/checkout/:orderId?`
- Runtime check có lệnh riêng cho Casso:
  - `npm run env:check:casso`

Chưa làm được trong repo vì cần tài khoản/secret thật:

- Tạo Firebase project.
- Tạo MongoDB Atlas cluster.
- Tạo Render service và nhập env vars.
- Tạo Casso account, bank connection và webhook secure token.
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
BILLING_PROVIDER=casso
BILLING_REPOSITORY=mongo
CASSO_WEBHOOK_SECRET=...
CASSO_BANK_ACCOUNT=...
CASSO_BANK_NAME=MB
CASSO_ACCOUNT_NAME=NGUYEN VAN A
PLUS_PRICE_VND=79000
```

Sau deploy, kiểm tra:

```bash
curl https://<render-service>.onrender.com/api/health
```

Kỳ vọng:

```json
{"success":true,"data":{"status":"ok"}}
```

## 5. Casso + VietQR

Tạo Casso:

1. Đăng ký Casso.
2. Liên kết tài khoản ngân hàng nhận tiền.
3. Tạo webhook.
4. Webhook URL:

```text
https://<render-service>.onrender.com/api/billing/webhook/casso
```

5. Secure token của webhook phải trùng với `CASSO_WEBHOOK_SECRET` trong Render.
6. Event: giao dịch tiền vào.

Repo hiện chỉ cần webhook secure token + bank info để tạo order và xác nhận giao dịch. `CASSO_API_KEY` chưa được code sử dụng cho flow webhook hiện tại; chỉ thêm sau nếu làm reconciliation/pull transaction history.

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
VITE_BILLING_PROVIDER_LABEL=Casso + VietQR
VITE_ANALYTICS_MODE=off
```

Sau khi nhập env vars, redeploy production.

## 7. Verification

Chạy local checks:

```bash
npm run check
npm --prefix backend run check
```

Chạy env check Casso sau khi local `backend/.env` và frontend env production đã đủ:

```bash
npm run env:check:casso
```

Nếu muốn kiểm tra env trước khi backend health sẵn sàng:

```bash
node scripts/check-runtime-env.mjs --full-stack --mode production --casso-billing --skip-health
```

Manual smoke sau khi deploy:

1. Mở production Vercel.
2. Đăng ký/đăng nhập Firebase.
3. Tạo mục tiêu và 12-week plan.
4. Refresh, đăng xuất, đăng nhập lại để kiểm tra dữ liệu sync.
5. Mở `/billing/checkout`.
6. Tạo QR order.
7. Chuyển khoản test số nhỏ với đúng nội dung order.
8. Casso webhook về Render.
9. Order chuyển `completed`.
10. `GET /api/billing/entitlement` trả gói `PLUS`.

## 8. Go/No-Go hạ tầng

Go khi:

- Vercel production dùng `VITE_APP_MODE=real`.
- Firebase login hoạt động.
- Render `/api/health` OK.
- MongoDB ghi/đọc được profile/plan.
- Casso webhook trả 200 khi gửi payload đúng.
- QR checkout tạo order thật và poll được trạng thái.

No-Go khi:

- Thiếu Firebase client env trên Vercel.
- Render chưa có Firebase Admin env.
- Render chưa có MongoDB URI.
- `BILLING_PROVIDER` khác `casso` trong production.
- `BILLING_REPOSITORY` không phải `mongo`.
- Casso webhook secret không khớp.
- Checkout UI có thể mở gói mà không qua webhook thành công.
