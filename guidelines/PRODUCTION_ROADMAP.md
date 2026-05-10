# Production Roadmap — 200 Users + Casso + VietQR Billing

Last updated: 2026-05-10

## Status snapshot 2026-05-10

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1.1 Firebase project | ✅ Done | Firebase project linked. Frontend env keys in `.env.local` and Vercel project. Backend Admin SDK env on Render. |
| Phase 1.2 MongoDB Atlas | ✅ Done | M0 cluster reachable. Backend connects through `MONGODB_URI`. |
| Phase 1.3 Backend Render | ✅ Done | `/api/health` returns 200. `/api/billing/checkout-session` correctly returns 401 without auth. |
| Phase 1.4 Frontend Vercel real mode | ✅ Done | `VITE_APP_MODE=real`, `VITE_BILLING_PROVIDER_MODE=api_contract`, `VITE_BILLING_PROVIDER_LABEL=Chuyển khoản ngân hàng` set on Vercel Production scope. |
| Phase 1.5 Verification | OK Done | Live Casso/VietQR transaction smoke on 2026-05-10: real bank transfer cleared, webhook fired, entitlement granted, Plus active. |
| Phase 2 Casso + VietQR | OK Live verified | `BillingCheckoutQR` page, Casso adapter, webhook route, VietQR routing in `billingProvider.ts` and `BillingPlan.tsx` wired and confirmed end-to-end with a real bank transfer on 2026-05-10. |
| Phase 3 Bảo mật | ⚠ Partial | `helmet`, `express-rate-limit`, `@sentry/node`, `@sentry/react` installed. Rate limiters mounted in `backend/src/middleware/rateLimiters.ts`. CORS, env enforcement, and full Sentry init still need a final pass. |
| Phase 4 UX cho production | OK Done | Auto-sync, conflict dialog, sync pill, first-login restore landed. Real-mode copy audit + `RealModeLoginGate` for 12-week setup landed in `d1241a9`. |

Auto-sync batch (2026-05-10) added on top of the original roadmap:

- Auto trigger of cloud sync on app load, login, periodic interval, tab visibility regain, network reconnect, and post-mutation debounced drain.
- Global `AutoCloudConflictDialog` for conflict and unsafe merge resolution.
- Header `SyncStatusPill` showing live sync state.
- `FirstLoginRestoreToast` for fresh-device login.

See `MVP_2_SYNC_IMPLEMENTATION_STATUS.md` Section 0 for the truth update on what auto-sync covers and what still needs manual escalation.

## Tổng quan

Dự án chuyển từ **demo local-first** sang **production thật** với:

- ~200 người dùng thật (sinh viên Việt Nam)
- Thu phí Premium qua Casso + VietQR (QR / chuyển khoản ngân hàng)
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
[Casso + VietQR] ←── webhook ──→ [POST /api/billing/webhook/casso]
```

## Điểm mạnh hiện tại (đã có sẵn)

Backend đã có kiến trúc billing provider-agnostic rất tốt:

- [x] `PaymentProviderAdapter` interface — đã có adapter Casso + VietQR
- [x] `paymentProviderRegistry.ts` — đã có `casso` và placeholder cho provider khác
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

1. **Casso production account + webhook** — liên kết tài khoản ngân hàng và lấy secure token
2. **Casso live transfer test** — chuyển khoản test số nhỏ để xác nhận webhook/order/entitlement
3. **Firebase project thật** — tạo project, bật Auth providers
4. **MongoDB Atlas** — tạo cluster, whitelist IPs
5. **Backend deploy trên Render** — env vars production
6. **Frontend `.env.production` chuyển sang real mode**
7. **Production env verification** — `npm run env:check:casso` phải pass sau khi nhập env Render/Vercel

### Quan trọng (nên có trước launch)

8. **Rate limiting** — chống abuse API (express-rate-limit)
9. **CORS chặt** — chỉ cho phép domain Vercel production
10. **Error monitoring** — Sentry hoặc tương đương
11. **Helmet** — security headers
12. **Input validation** — sanitize tất cả user input
13. **Backup MongoDB** — Atlas auto-backup hoặc manual

### Nên có (sau launch nếu kịp)

14. [x] **Email notification** — xác nhận thanh toán, hết hạn
15. [x] **Account data export** — GDPR-style
16. [x] **Analytics** — GA4 verified
17. [x] **Admin dashboard** — xem users, revenue

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
  BILLING_PROVIDER=casso
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
  VITE_BILLING_PROVIDER_LABEL=Chuyển khoản ngân hàng
  VITE_BILLING_SUPPORT_EMAIL=<email hỗ trợ thanh toán>
  VITE_ENABLE_12_WEEK_MUTATION_SYNC=true
  VITE_ENABLE_12_WEEK_PULL_SYNC=true
  VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN=true
  VITE_ENABLE_12_WEEK_CLOUD_IMPORT=true
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

## Phase 2: Casso + VietQR Integration

**Mục tiêu:** User thanh toán thật qua chuyển khoản ngân hàng (QR code), backend tự động xác nhận qua Casso webhook.

**Tại sao chọn Casso + VietQR:**

- Miễn phí hoàn toàn (free tier: 2 tài khoản ngân hàng)
- Không cần giấy phép kinh doanh, chỉ cần tài khoản ngân hàng cá nhân
- Đăng ký xong dùng luôn, không chờ duyệt
- Real-time webhook khi có giao dịch vào tài khoản
- VietQR chuẩn Napas — mọi app ngân hàng đều quét được

### 2.1 Đăng ký Casso

```
Bước 1: Vào https://app.casso.vn/register
Bước 2: Đăng ký bằng email
Bước 3: Liên kết tài khoản ngân hàng:
  - Vào "Ngân hàng" → "Thêm ngân hàng"
  - Chọn ngân hàng (MB, Vietcombank, Techcombank, ACB, ...)
  - Xác thực qua app ngân hàng hoặc internet banking
Bước 4: Cấu hình Webhook:
  - Vào "Webhook" → "Thêm webhook"
  - URL: https://your-backend.onrender.com/api/billing/webhook/casso
  - Secure token: tạo chuỗi random dài (dùng làm signature verify)
  - Events: Giao dịch tiền vào
Bước 5: Lấy API key:
  - Vào "Kết nối" → "API Keys" → copy API key
```

**Env vars (Backend):**

```bash
CASSO_WEBHOOK_SECRET=your-casso-webhook-v2-checksum-key
# Optional if separated:
# CASSO_WEBHOOK_CHECKSUM_KEY=your-casso-webhook-v2-checksum-key
# CASSO_SECURE_TOKEN=your-legacy-secure-token
CASSO_BANK_ACCOUNT=1234567890
CASSO_BANK_NAME=MB
CASSO_ACCOUNT_NAME=NGUYEN VAN A
BILLING_PROVIDER=casso
BILLING_REPOSITORY=mongo
```

### 2.2 Luồng thanh toán Casso + VietQR

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User click "Nâng cấp Plus"                              │
│    → Frontend gọi POST /api/billing/checkout-session        │
│                                                             │
│ 2. Backend tạo PaymentOrder trong MongoDB:                  │
│    - orderId: "VB" + random 8 chars (VD: VB3KF8M2NP)       │
│    - userId, planCode, amount, status: "pending"            │
│    - expiresAt: now + 30 phút                               │
│                                                             │
│ 3. Backend trả về:                                          │
│    - orderId (= nội dung chuyển khoản)                      │
│    - amount: 79000                                          │
│    - bankAccount: "1234567890"                              │
│    - bankName: "MB"                                         │
│    - accountName: "NGUYEN VAN A"                            │
│    - qrDataUrl: VietQR image URL                            │
│                                                             │
│ 4. Frontend hiện trang checkout:                            │
│    - QR code lớn ở giữa                                    │
│    - Thông tin: STK, ngân hàng, số tiền, nội dung CK       │
│    - Countdown 30 phút                                      │
│    - Poll GET /api/billing/order-status/:orderId mỗi 5s     │
│                                                             │
│ 5. User quét QR bằng app ngân hàng → chuyển khoản          │
│    (QR đã nhúng sẵn STK + số tiền + nội dung)              │
│                                                             │
│ 6. Casso phát hiện giao dịch → POST webhook tới backend    │
│    Payload: { amount, description, bankSubAccId, ... }      │
│                                                             │
│ 7. Backend webhook handler:                                 │
│    - Verify secret token từ header                          │
│    - Tìm PaymentOrder có orderId match description          │
│    - Verify amount >= order amount                          │
│    - Mark order "completed"                                 │
│    - Upsert BillingSubscription → PLUS active              │
│                                                             │
│ 8. Frontend poll thấy order "completed"                     │
│    → Hiện "Thanh toán thành công!" → redirect /12-week     │
│    → GET /api/billing/entitlement → cập nhật quyền Plus    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Backend: PaymentOrder Model

**File mới:** `backend/src/models/PaymentOrderModel.ts`

```typescript
Schema:
  orderId: String (unique, indexed) — "VB" + 8 chars
  userId: String (indexed)
  planCode: "PLUS"
  billingCycle: "twelve_week"
  amount: Number (VND, e.g. 79000)
  currency: "VND"
  status: "pending" | "completed" | "expired" | "failed"
  provider: "casso"
  bankAccount: String
  bankName: String
  description: String (= orderId, dùng để match)
  completedAt: Date (optional)
  cassoTransactionId: String (optional, for idempotency)
  expiresAt: Date
  createdAt, updatedAt (timestamps)
```

### 2.4 Backend: Casso Payment Adapter

**File mới:** `backend/src/services/cassoPaymentAdapter.ts`

Implement `PaymentProviderAdapter` interface:

```
createCheckoutSession(input):
  1. Tạo orderId unique: "VB" + nanoid(8).toUpperCase()
  2. Tạo PaymentOrder trong DB (status: pending, expiresAt: +30min)
  3. Build VietQR URL:
     https://img.vietqr.io/image/{bankBin}-{accountNo}-compact2.png
       ?amount={amount}
       &addInfo={orderId}
       &accountName={accountName}
  4. Return {
       sessionId: orderId,
       checkoutUrl: "" (không redirect, frontend tự hiện QR),
       qrDataUrl: vietQR URL,
       bankAccount, bankName, accountName, amount, orderId
     }

verifyWebhookSignature(input):
  1. Lấy header "secure-token" hoặc "Authorization"
  2. So sánh với CASSO_WEBHOOK_SECRET
  3. Match → valid, không match → invalid

parseWebhookEvent(rawBody):
  1. Parse JSON body từ Casso webhook
  2. Lấy trường "data" → array giao dịch
  3. Mỗi giao dịch: { amount, description, when, ... }
  4. Tìm orderId trong description (regex match "VB[A-Z0-9]{8}")
  5. Map sang NormalizedProviderEvent:
     - eventType: "checkout_completed"
     - userId: lookup từ PaymentOrder by orderId
     - planCode: "PLUS"
     - status: "active"
```

### 2.5 Backend: Order status polling endpoint

**Route mới:** `GET /api/billing/order-status/:orderId`

```
1. Auth required (chỉ owner xem được order của mình)
2. Tìm PaymentOrder by orderId + userId
3. Trả: { status, amount, expiresAt, completedAt }
4. Frontend poll mỗi 5 giây để biết khi nào thanh toán xong
```

### 2.6 Backend: Casso webhook route

**Route:** `POST /api/billing/webhook/casso`

```
Casso gọi khi có giao dịch tiền VÀO tài khoản:
{
  "error": 0,
  "data": [
    {
      "id": 123456,
      "tid": "FT24001234567",
      "description": "VB3KF8M2NP",
      "amount": 79000,
      "cusum_balance": 5000000,
      "when": "2026-05-07 15:30:00",
      "bank_sub_acc_id": "1234567890"
    }
  ]
}

Handler:
1. Verify secure-token header
2. Iterate data[] array
3. Cho mỗi transaction:
   a. Extract orderId từ description (regex VB[A-Z0-9]{8})
   b. Tìm PaymentOrder by orderId, status="pending"
   c. Check amount >= order.amount
   d. Mark order completed + save cassoTransactionId
   e. Upsert BillingSubscription (PLUS, active, twelve_week cycle)
   f. Grant entitlements
4. Return { success: true }
```

### 2.7 Frontend: Checkout QR page

**Route:** `/billing/checkout/:orderId`

```
UI:
┌────────────────────────────────────┐
│  Nâng cấp gói Plus                │
│  79.000đ / chu kỳ 12 tuần         │
│                                    │
│  ┌────────────────────────┐        │
│  │                        │        │
│  │    [VietQR Image]      │        │
│  │                        │        │
│  └────────────────────────┘        │
│                                    │
│  Ngân hàng: MB Bank               │
│  Số TK: 1234567890                 │
│  Chủ TK: NGUYEN VAN A             │
│  Số tiền: 79,000đ                 │
│  Nội dung: VB3KF8M2NP             │
│                                    │
│  ⏱ Còn 28:45 để thanh toán        │
│                                    │
│  📱 Mở app ngân hàng              │
│     → Quét mã QR ở trên           │
│     → Xác nhận chuyển khoản       │
│                                    │
│  ⏳ Đang chờ xác nhận...          │
│                                    │
│  [Hủy thanh toán]                  │
└────────────────────────────────────┘

Logic:
- Poll GET /api/billing/order-status/:orderId mỗi 5s
- Khi status = "completed" → hiện confetti + "Chúc mừng!"
  → sau 3s redirect /12-week-system
- Khi countdown hết → hiện "Hết thời gian" + nút "Thử lại"
```

### 2.8 Thêm BillingCycle "twelve_week"

**File:** `backend/src/models/BillingSubscriptionModel.ts`

```
Thêm "twelve_week" vào BillingCycle type và schema enum.
currentPeriodStart = now
currentPeriodEnd = now + 12 weeks (84 ngày)
```

### 2.9 VietQR URL format

```
Base: https://img.vietqr.io/image/{bankBin}-{accountNo}-compact2.png
Params:
  ?amount=79000
  &addInfo=VB3KF8M2NP
  &accountName=NGUYEN%20VAN%20A

Ví dụ (MB Bank, bin=970422):
https://img.vietqr.io/image/970422-1234567890-compact2.png?amount=79000&addInfo=VB3KF8M2NP&accountName=NGUYEN%20VAN%20A
```

Bank BIN lookup: https://api.vietqr.io/v2/banks (public API, không cần key)

### 2.10 Testing checklist

```
□ Tạo order → QR hiển thị đúng (quét test bằng app bank)
□ Chuyển khoản thật 1,000đ test → Casso webhook → order completed
□ Frontend poll detect → hiện thành công
□ Entitlement: GET /api/billing/entitlement trả PLUS
□ Duplicate webhook: Casso gửi 2 lần → idempotent (cassoTransactionId)
□ Expired order: sau 30 phút chưa thanh toán → status "expired"
□ Wrong amount: chuyển thiếu tiền → không mở gói, log warning
□ Wrong description: user nhập sai nội dung → không match → không mở gói
□ Expired cycle: sau 12 tuần → quyền revoke (cron job hoặc check on-request)
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
npm install @sentry/react
```

- Init Sentry trong server.ts
- Capture unhandled errors
- Frontend capture runtime/route errors qua `AppErrorBoundary`
- Optional env:
  - Backend: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`
  - Frontend: `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_TRACES_SAMPLE_RATE`

### 3.6 MongoDB backup

- Atlas M0 không có auto-backup
- Viết script `mongodump` chạy hàng ngày (hoặc nâng M2 nếu cần auto-backup)
- Script: `npm run backup:mongo`
- Dry-run/check tool: `npm run backup:mongo:dry-run`
- Backup ghi vào `backups/mongodb` mặc định; `backups/` không commit lên git.
- Production: chạy từ máy/operator hoặc scheduled job bảo mật có `MONGODB_URI`; không upload backup chứa user data lên public CI artifact.

---

## Phase 4: UX cho production (user thật)

### 4.1 Copy UI update

- Bỏ tất cả "demo", "mock", "mô phỏng" khỏi UI khi `VITE_APP_MODE=real`
- Checkout page: hiện QR thật, giá thật, không có banner cảnh báo demo
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
VITE_BILLING_PROVIDER_LABEL=Chuyển khoản ngân hàng
VITE_BILLING_SUPPORT_EMAIL=<email hỗ trợ thanh toán>
VITE_ENABLE_12_WEEK_MUTATION_SYNC=true
VITE_ENABLE_12_WEEK_PULL_SYNC=true
VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN=true
VITE_ENABLE_12_WEEK_CLOUD_IMPORT=true
VITE_ANALYTICS_MODE=off
VITE_GA_MEASUREMENT_ID=G-...  (optional when VITE_ANALYTICS_MODE=ga4)
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
BILLING_PROVIDER=casso
ADMIN_EMAILS=admin@example.com  (optional, comma-separated)
CASSO_WEBHOOK_SECRET=your-random-secret-string-32chars
CASSO_BANK_ACCOUNT=1234567890
CASSO_BANK_NAME=MB
CASSO_ACCOUNT_NAME=NGUYEN VAN A
PLUS_PRICE_VND=79000
SENTRY_DSN=https://...  (optional)
EMAIL_PROVIDER=disabled  (set to resend when email is ready)
RESEND_API_KEY=re_...  (optional)
EMAIL_FROM="Dear Our Future <support@example.com>"  (optional)
EMAIL_REPLY_TO=support@example.com  (optional)
BILLING_SUPPORT_EMAIL=support@example.com  (optional)
```

---

## Timeline ước tính

| Phase                   | Thời gian | Output                                      |
| ----------------------- | --------- | ------------------------------------------- |
| Phase 1: Hạ tầng        | 2-3 ngày  | App chạy real mode, đăng nhập, sync backend |
| Phase 2: Casso + VietQR | 3-4 ngày  | Thanh toán thật qua chuyển khoản ngân hàng  |
| Phase 3: Bảo mật        | 1-2 ngày  | Rate limit, CORS, Sentry                    |
| Phase 4: UX             | 2-3 ngày  | Copy production, billing page, onboarding   |

**Tổng: ~8-12 ngày**

> **Ưu điểm Casso:** Không cần chờ duyệt merchant, đăng ký xong dùng luôn. Test bằng chuyển khoản thật (1,000đ).

---

## Rủi ro cần lưu ý

1. **User nhập sai nội dung CK** — QR đã nhúng sẵn nội dung, nhưng user có thể sửa. Cần hướng dẫn rõ "không sửa nội dung"
2. **Free tier MongoDB (M0)** — giới hạn 512MB storage, 500 connections. Đủ cho 200 users nhưng monitor usage
3. **Render free tier** — cold start 30-60s nếu dùng free. Nên dùng Starter ($7/month) cho production
4. **Casso free tier** — giới hạn 2 tài khoản ngân hàng. Đủ cho MVP
5. **Không có recurring billing** — cần tự quản lý gia hạn (nhắc user thanh toán lại khi hết 12 tuần)
6. **Firebase free tier** — 10K authentications/month, đủ cho 200 users
7. **Casso webhook delay** — thường real-time (< 30s) nhưng có thể delay 1-2 phút trong một số trường hợp

---

## Lệnh bắt đầu

Khi bạn sẵn sàng, báo tôi để bắt đầu từ task cụ thể:

```
Phase 1 → "Bắt đầu Phase 1" (tôi sẽ chuẩn bị code cho real mode)
Phase 2 → "Implement Casso adapter" (tôi sẽ code adapter + QR checkout page)
Phase 3 → "Thêm security" (tôi sẽ thêm rate limit, helmet, CORS)
Phase 4 → "Update UI production" (tôi sẽ bỏ demo copy, thêm billing page)
```
