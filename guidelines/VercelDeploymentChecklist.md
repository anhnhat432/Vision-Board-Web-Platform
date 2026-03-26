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

- App này là SPA và đã có rewrite trong [vercel.json](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/vercel.json), nên route như `/dashboard` hay `/12-week-system` sẽ không bị 404 khi refresh.

## 3. Chọn mode deploy

### Mode A: Demo nhanh nhất

Phù hợp khi bạn chỉ muốn web chạy ổn trên Vercel trước.

Thiết lập env:

- `VITE_ANALYTICS_MODE=off`
- `VITE_BILLING_PROVIDER_MODE=mock_provider`
- `VITE_BILLING_PROVIDER_LABEL=Mock provider`

Mode này:

- không cần GA4
- không cần backend billing
- paywall vẫn hiện được ở dạng mock/demo

### Mode B: Có analytics, billing vẫn mock

Phù hợp khi bạn muốn đo funnel trước.

Thiết lập env:

- `VITE_ANALYTICS_MODE=ga4`
- `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
- `VITE_BILLING_PROVIDER_MODE=mock_provider`
- `VITE_BILLING_PROVIDER_LABEL=Mock provider`

Mode này:

- app vẫn dùng mock checkout
- event premium/paywall có thể đẩy sang `gtag` / `dataLayer`

### Mode C: Billing contract thật

Phù hợp khi bạn đã có backend hoặc billing proxy.

Thiết lập tối thiểu:

- `VITE_ANALYTICS_MODE=ga4`
- `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
- `VITE_BILLING_PROVIDER_MODE=api_contract`
- `VITE_BILLING_PROVIDER_LABEL=Stripe` hoặc tên provider bạn muốn hiện

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

Tham chiếu nhanh từ [.env.example](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/.env.example):

- `VITE_ANALYTICS_MODE`
- `VITE_GA_MEASUREMENT_ID`
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
4. Kiểm tra [12WeekSetup.tsx](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/pages/12WeekSetup.tsx) có hiện `khung gợi ý`
5. Kiểm tra [12WeekSystem.tsx](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/pages/12WeekSystem.tsx) mở được tab `Hôm nay / Tuần / Tiến độ / Cài đặt`
6. Mở paywall để chắc [UpgradePaywallDialog.tsx](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/components/UpgradePaywallDialog.tsx) không vỡ layout
7. Nếu đang để `mock_provider`, thử flow mock checkout ở [MockBillingCheckout.tsx](c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/pages/MockBillingCheckout.tsx)

## 6. Khuyến nghị cho bản hiện tại

Với tình trạng dự án bây giờ, cách an toàn nhất là deploy theo `Mode A` trước:

- app lên nhanh
- không phụ thuộc backend
- vẫn demo được `Free` và `Plus`

Khi cần đo funnel thật thì chuyển sang `Mode B`.
Khi có backend billing thật thì mới chuyển sang `Mode C`.
