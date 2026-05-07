# Production Roadmap — 200 Users + VNPay Billing

Last updated: 2026-05-07

## Tổng quan

Dự án chuyển từ **demo local-first** sang **production thật** với:

- ~200 người dùng thật (sinh viên Việt Nam)
- Thu phí Premium qua VNPay (QR / chuyển khoản ngân hàng)
- Gói Plus: 79k–149k VND / chu kỳ 12 tuần
- Bắt buộc đăng nhập để lưu dữ liệu và thanh toán
- Backend là source of truth cho billing và 12-week data

## Kiến trúc production

```
[User trình duyệt]
    ↓
[Vercel SPA — VITE_APP_MODE=real]
    ↓ Firebase Auth (Google + Email)
[Render Backend — Express + Firebase Admin]
    ↓
[MongoDB Atlas — M0 free tier]
    ↓
[VNPay] ←── webhook ──→ [POST /api/billing/webhook/vnpay]
```

## Điểm mạnh hiện tại (đã có sẵn)

Backend đã có kiến trúc billing provider-agnostic rất tốt:

- [x] `PaymentProviderAdapter` interface — chỉ cần implement cho VNPay
- [x] `paymentProviderRegistry.ts` — đã có slot cho `vnpay` (hiện là placeholder)
- [x] `BillingSubscriptionModel` — provider-agnostic, đã có entitlement grants
- [x] `BillingEventModel` — idempotency tracking cho webhook
- [x] `webhookController.ts` — signature verify → parse → upsert subscription
- [x] `billingController.ts` — checkout session, entitlement API, cancel, customer portal
- [x] `billingRoutes.ts` + `webhookRoutes.ts` — đã mount đúng (webhook trước auth middleware)
- [x] Firebase Auth middleware cho protected routes
- [x] Goal/Plan/Week/Task/Metric CRUD routes
- [x] Frontend billing helpers: paywall dialog, checkout flow, entitlement sync
- [x] `accountRoutes.ts` — delete account endpoint

## Thiếu gì cho production

### Bắt buộc (Blocker)

1. **VNPay payment adapter** — implement `PaymentProviderAdapter` cho VNPay
2. **VNPay sandbox credentials** — đăng ký tài khoản sandbox VNPay
3. **Firebase project thật** — tạo project, bật Auth providers
4. **MongoDB Atlas** — tạo cluster, whitelist IPs
5. **Backend deploy trên Render** — env vars production
6. **Frontend `.env.production` chuyển sang real mode**
7. **Billing cycle "12_week"** — thêm vào `BillingCycle` type (hiện chỉ có monthly/quarterly/yearly/lifetime)

### Quan trọng (nên có trước launch)

8. **Rate limiting** — chống abuse API (express-rate-limit)
9. **CORS chặt** — chỉ cho phép domain Vercel production
10. **Error monitoring** — Sentry hoặc tương đương
11. **Helmet** — security headers
12. **Input validation** — sanitize tất cả user input
13. **Backup MongoDB** — Atlas auto-backup hoặc manual

### Nên có (sau launch nếu kịp)

14. **Email notification** — xác nhận thanh toán, hết hạn
15. **Account data export** — GDPR-style
16. **Analytics** — GA4 verified
17. **Admin dashboard** — xem users, revenue

---

## Phase 1: Hạ tầng cơ bản

**Mục tiêu:** App chạy real mode, đăng nhập được, data sync backend.

### 1.1 Tạo Firebase project

```
Bước 1: Vào https://console.firebase.google.com
Bước 2: Create project → đặt tên "vision-board-production"
Bước 3: Authentication → Get started
Bước 4: Sign-in method → Enable:
  - Google (đơn giản nhất cho user VN)
  - Email/Password (backup option)
Bước 5: Settings → Authorized domains → thêm domain Vercel production
Bước 6: Project settings → General → copy Web app config:
  - apiKey
  - authDomain
  - projectId
  - appId
Bước 7: Project settings → Service accounts → Generate new private key
  → Lấy: project_id, client_email, private_key (cho backend)
```

**Env vars cần lấy:**

```bash
# Frontend (Vercel)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=vision-board-production.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vision-board-production
VITE_FIREBASE_APP_ID=1:123456:web:abc...

# Backend (Render)
FIREBASE_PROJECT_ID=vision-board-production
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@vision-board-production.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 1.2 Tạo MongoDB Atlas

```
Bước 1: Vào https://cloud.mongodb.com
Bước 2: Create Cluster → M0 (FREE tier, đủ cho 200 users)
  - Provider: AWS
  - Region: Singapore (ap-southeast-1) — gần VN nhất
Bước 3: Database Access → tạo user + password
Bước 4: Network Access → Allow All (0.0.0.0/0) cho Render
  (hoặc whitelist Render static IP nếu có)
Bước 5: Connect → Drivers → copy connection string
```

**Env var:**

```bash
MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/visionboard?retryWrites=true&w=majority
```

### 1.3 Deploy Backend trên Render

```
Bước 1: Vào https://render.com
Bước 2: New → Web Service → connect GitHub repo
Bước 3: Settings:
  - Build command: cd backend && npm ci && npm run build
  - Start command: cd backend && npm start
  - Node version: 20
Bước 4: Environment → thêm tất cả env vars:
  PORT=4000
  MONGODB_URI=mongodb+srv://...
  FIREBASE_PROJECT_ID=...
  FIREBASE_CLIENT_EMAIL=...
  FIREBASE_PRIVATE_KEY="-----BEGIN..."
  FRONTEND_ORIGIN=https://your-app.vercel.app
  BILLING_PROVIDER=vnpay  (sau khi implement xong, lúc đầu để mock)
  NODE_ENV=production
Bước 5: Deploy → verify /api/health returns OK
```

### 1.4 Deploy Frontend trên Vercel

```
Bước 1: Vercel project settings → Environment Variables:
  VITE_APP_MODE=real
  VITE_API_BASE_URL=https://your-backend.onrender.com/api
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=...
  VITE_FIREBASE_PROJECT_ID=...
  VITE_FIREBASE_APP_ID=...
  VITE_BILLING_PROVIDER_MODE=api_contract
  VITE_BILLING_PROVIDER_LABEL=VNPay
  VITE_ANALYTICS_MODE=off  (bật sau khi GA4 verified)
Bước 2: Re-deploy
Bước 3: Verify: đăng ký → đăng nhập → tạo plan → data sync backend
```

### 1.5 Verification checklist

```bash
# Backend
curl https://your-backend.onrender.com/api/health
# Expected: { "success": true, "data": { "status": "ok" } }

# Frontend
# 1. Mở app → thấy nút đăng nhập
# 2. Đăng nhập Google → thành công
# 3. Tạo 12-week plan → data lưu lên MongoDB
# 4. Đăng xuất → đăng nhập lại → data vẫn còn

# Runtime env check (local)
node scripts/check-runtime-env.mjs --full-stack
```

---

## Phase 2: VNPay Integration

**Mục tiêu:** User có thể thanh toán thật qua VNPay để mở gói Plus.

### 2.1 Đăng ký VNPay Sandbox

```
Bước 1: Vào https://sandbox.vnpayment.vn
Bước 2: Đăng ký tài khoản merchant sandbox
Bước 3: Lấy credentials:
  - vnp_TmnCode (mã website)
  - vnp_HashSecret (chuỗi bí mật)
  - vnp_Url (URL thanh toán sandbox)
  - vnp_ReturnUrl (URL trả về sau thanh toán — backend endpoint)
Bước 4: Test thẻ sandbox: 9704198526191432198 / NGUYEN VAN A / 07/15 / OTP
```

**Env vars (Backend):**

```bash
VNPAY_TMN_CODE=XXXXXXXX
VNPAY_HASH_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-backend.onrender.com/api/billing/vnpay-return
```

### 2.2 Implement VNPay Payment Adapter

**File cần tạo:** `backend/src/services/vnpayPaymentAdapter.ts`

Adapter cần implement `PaymentProviderAdapter` interface:

```
createCheckoutSession(input):
  1. Tạo orderId unique (format: VBOARD_{userId}_{timestamp})
  2. Build VNPay payment URL với params:
     - vnp_Version=2.1.0
     - vnp_TmnCode=env
     - vnp_Amount=giá * 100 (VNPay dùng đơn vị VND * 100)
     - vnp_Command=pay
     - vnp_CreateDate=yyyyMMddHHmmss
     - vnp_CurrCode=VND
     - vnp_IpAddr=user IP
     - vnp_Locale=vn
     - vnp_OrderInfo=Thanh toan goi Plus 12 tuan - Vision Board
     - vnp_OrderType=subscription
     - vnp_ReturnUrl=env
     - vnp_TxnRef=orderId
     - vnp_SecureHash=HMAC SHA512
  3. Return { sessionId: orderId, checkoutUrl: vnpayUrl }

verifyWebhookSignature(input):
  1. Parse query params từ VNPay IPN/Return
  2. Lấy vnp_SecureHash từ params
  3. Remove vnp_SecureHash, vnp_SecureHashType từ params
  4. Sort params alphabetically
  5. HMAC SHA512 với HashSecret
  6. So sánh hash → valid/invalid

parseWebhookEvent(rawBody):
  1. Parse VNPay response params
  2. vnp_ResponseCode === "00" → checkout_completed
  3. vnp_ResponseCode !== "00" → payment_failed
  4. Map sang NormalizedProviderEvent

mapSubscriptionStatus(status):
  "00" → "active"
  other → "incomplete"
```

### 2.3 Thêm BillingCycle "twelve_week"

**File:** `backend/src/models/BillingSubscriptionModel.ts`

```
Thêm "twelve_week" vào BillingCycle type và schema enum.
```

**File:** `backend/src/services/billingService.ts`

```
Thêm pricing cho twelve_week cycle:
PLUS twelve_week = 79000 VND (hoặc 149000 VND)
```

### 2.4 VNPay Return URL handler

**File cần tạo route:** `GET /api/billing/vnpay-return`

```
Flow:
1. VNPay redirect user về URL này sau thanh toán
2. Verify signature (dùng adapter.verifyWebhookSignature)
3. Parse event (dùng adapter.parseWebhookEvent)
4. Upsert subscription qua billingService
5. Redirect user về frontend: https://app.vercel.app/billing/success hoặc /billing/failed
```

### 2.5 VNPay IPN (Instant Payment Notification)

VNPay gọi server-to-server → dùng webhook route hiện tại:

```
POST /api/billing/webhook/vnpay
```

Chỉ cần adapter đã implement → webhookController xử lý tự động.

### 2.6 Frontend checkout flow update

**File:** `src/app/utils/production/billingProvider.ts`

```
Khi VITE_BILLING_PROVIDER_MODE=api_contract:
1. Frontend gọi POST /api/billing/checkout-session
2. Backend trả checkoutUrl (VNPay payment page)
3. Frontend redirect user tới checkoutUrl
4. User thanh toán trên VNPay
5. VNPay redirect về backend return URL
6. Backend verify + upsert subscription
7. Backend redirect về frontend /billing/success
8. Frontend gọi GET /api/billing/entitlement → cập nhật quyền
```

### 2.7 Frontend billing success/failed pages

**Tạo 2 route mới:**

- `/billing/success` — hiện thông báo thanh toán thành công, gói đã mở
- `/billing/failed` — hiện thông báo lỗi, nút thử lại

### 2.8 Pricing UI update

**File:** `src/app/utils/twelve-week-premium.ts`

```
Cập nhật PLAN_DEFINITIONS:
- PLUS priceLabel: "79.000đ / chu kỳ 12 tuần" (hoặc giá bạn chọn)
- Bỏ "Giá trong bản demo" → "Giá"
- Bỏ "mock" references
```

### 2.9 Testing checklist

```
□ Sandbox test: tạo checkout → thanh toán thẻ test → redirect về app → gói mở
□ IPN test: VNPay gọi webhook → subscription created trong MongoDB
□ Entitlement test: sau thanh toán, GET /api/billing/entitlement trả PLUS
□ Duplicate webhook: gửi IPN 2 lần → idempotent, không tạo subscription mới
□ Failed payment: dùng thẻ lỗi → payment_failed → không mở gói
□ Cancel: user hủy gói → giữ quyền đến hết chu kỳ
□ Expired: sau 12 tuần → quyền tự động revoke
```

---

## Phase 3: Bảo mật và ổn định

**Mục tiêu:** App an toàn cho 200 users, không bị abuse.

### 3.1 Rate limiting

```bash
npm --prefix backend install express-rate-limit
```

**File:** `backend/src/middleware/rateLimiter.ts`

```
- Auth routes: 5 requests / 15 phút / IP
- Billing routes: 10 requests / phút / user
- General API: 100 requests / phút / user
- Webhook: 50 requests / phút / IP
```

### 3.2 Security headers

```bash
npm --prefix backend install helmet
```

**File:** `backend/src/server.ts` — thêm `app.use(helmet())`

### 3.3 CORS cứng

**File:** `backend/src/server.ts`

```
cors({
  origin: ["https://your-app.vercel.app"],
  credentials: true,
})
```

### 3.4 Input validation

- Validate tất cả req.body trước khi xử lý
- Sanitize strings (trim, max length)
- Validate ObjectId params

### 3.5 Error monitoring (Sentry)

```bash
npm --prefix backend install @sentry/node
```

- Init Sentry trong server.ts
- Capture unhandled errors
- Frontend: `npm install @sentry/react`

### 3.6 MongoDB backup

- Atlas M0 không có auto-backup
- Viết script `mongodump` chạy hàng ngày (hoặc nâng M2 nếu cần auto-backup)

---

## Phase 4: UX cho production (user thật)

### 4.1 Copy UI update

- Bỏ tất cả "demo", "mock", "mô phỏng" khỏi UI khi `VITE_APP_MODE=real`
- Checkout page: hiện giá thật, tên VNPay, không có banner cảnh báo demo
- Settings: hiện gói hiện tại, ngày hết hạn, nút gia hạn
- Dashboard: hiện trạng thái Premium rõ ràng

### 4.2 Onboarding flow update

- Bắt buộc đăng nhập trước khi tạo 12-week plan (để sync backend)
- Hoặc: cho phép dùng thử không đăng nhập, nhắc đăng nhập khi lưu plan

### 4.3 Data migration prompt

- User cũ có data localStorage → prompt merge lên backend khi đăng nhập lần đầu
- Component `LocalDataMigrationPrompt` đã có sẵn trong code

### 4.4 Billing management page

- `/billing` hoặc `/account/billing`
- Hiện: gói hiện tại, ngày hết hạn, lịch sử thanh toán
- Nút: gia hạn, hủy gói, liên hệ hỗ trợ

---

## Env vars tổng hợp

### Frontend (Vercel Project Settings)

```bash
VITE_APP_MODE=real
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=vision-board-production.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vision-board-production
VITE_FIREBASE_APP_ID=1:...
VITE_BILLING_PROVIDER_MODE=api_contract
VITE_BILLING_PROVIDER_LABEL=VNPay
VITE_ANALYTICS_MODE=off
```

### Backend (Render Environment)

```bash
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
FIREBASE_PROJECT_ID=vision-board-production
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_ORIGIN=https://your-app.vercel.app
BILLING_PROVIDER=vnpay
VNPAY_TMN_CODE=XXXXXXXX
VNPAY_HASH_SECRET=XXXXXXXXXXXXXXXX
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-backend.onrender.com/api/billing/vnpay-return
SENTRY_DSN=https://...  (optional)
```

---

## Timeline ước tính

| Phase | Thời gian | Output |
|-------|-----------|--------|
| Phase 1: Hạ tầng | 2-3 ngày | App chạy real mode, đăng nhập, sync backend |
| Phase 2: VNPay | 3-5 ngày | Thanh toán thật qua VNPay sandbox |
| Phase 3: Bảo mật | 1-2 ngày | Rate limit, CORS, Sentry |
| Phase 4: UX | 2-3 ngày | Copy production, billing page, onboarding |
| **VNPay production** | 1-2 tuần | Chờ VNPay duyệt tài khoản merchant thật |

**Tổng: ~2-3 tuần** (song song VNPay duyệt merchant)

> **Lưu ý quan trọng:** VNPay production cần đăng ký merchant thật, nộp giấy tờ doanh nghiệp/cá nhân, và chờ duyệt. Nên bắt đầu đăng ký ngay từ Phase 1.

---

## Rủi ro cần lưu ý

1. **VNPay merchant approval** — có thể mất 1-2 tuần, nên đăng ký sớm
2. **Free tier MongoDB (M0)** — giới hạn 512MB storage, 500 connections. Đủ cho 200 users nhưng monitor usage
3. **Render free tier** — cold start 30-60s nếu dùng free. Nên dùng Starter ($7/month) cho production
4. **VNPay không hỗ trợ recurring billing** — cần tự quản lý gia hạn (nhắc user thanh toán lại khi hết 12 tuần)
5. **Không có customer portal** — VNPay không có trang quản lý subscription như Stripe. Cần tự build
6. **Firebase free tier** — 10K authentications/month, đủ cho 200 users

---

## Lệnh bắt đầu

Khi bạn sẵn sàng, báo tôi để bắt đầu từ task cụ thể:

```
Phase 1 → "Bắt đầu Phase 1" (tôi sẽ chuẩn bị code cho real mode)
Phase 2 → "Implement VNPay adapter" (tôi sẽ code adapter)
Phase 3 → "Thêm security" (tôi sẽ thêm rate limit, helmet, CORS)
Phase 4 → "Update UI production" (tôi sẽ bỏ demo copy, thêm billing page)
```
