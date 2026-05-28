# Demo Readiness — Plan 7 ngày trước demo trước lớp

> Audit thực hiện ngày 2026-05-24. Demo trên **cả URL Vercel + laptop + máy chiếu**.
> Đã chạy manual QA path qua Playwright MCP (8/17 bước; còn lại đủ insight để dừng).

---

## Findings từ audit

### ✅ Đã sẵn sàng

1. **Core flow đầy đủ code** — 14 bước MVP từ Onboarding đến `/12-week-system` đều render thật, không stub.
2. **Tests xanh** — 1616 pass / 0 fail / 7 skipped trên `main` branch (verify hôm nay).
3. **Demo banner ở mỗi step** — "Bản demo · Dữ liệu lưu trên trình duyệt này" hiển thị consistent.
4. **Auto-hydrate demo data hoạt động** — khi vào `/12-week-system` chưa setup, app tự tạo goal mẫu "Ra mắt portfolio mới...", tuần 4/12, 7 tasks ngày — đủ để demo flow execution không cần làm onboarding.
5. **TodayV2 dùng DATA THẬT** (không phải mock hardcode như audit agent đã báo nhầm). Lifestyle balance + task list lấy từ `twelveWeekSystem` storage. Risk này LOẠI.
6. **Task toggle, mobile layout 375px** — pass khi test.
7. **PublicVisitorView mới** (commit cd14fb4a) hoạt động tốt, làm rõ "app làm gì + dùng ra sao".
8. **Public visitor flow** không lộ data giả, có CTA đăng nhập rõ ràng.

### 🔴 Risk **BLOCKER** — phải fix trước demo

#### B1. `.env.local` ép `VITE_APP_MODE=real` → `npm run dev` BẮT BUỘC LOGIN

- **Hiện trạng**: file `.env.local` do Vercel CLI tạo có `VITE_APP_MODE=real` + Firebase config. Vì `.env.local` ưu tiên cao nhất, mọi lần `npm run dev` đều load real mode → `/onboarding` redirect về `/login?next=%2Fonboarding`.
- **Ảnh hưởng**: Nếu demo trên laptop bằng `npm run dev`, user sẽ thấy màn đăng nhập đầu tiên thay vì flow demo.
- **Fix** (1 trong 2):
  - **Cách 1**: Tạo `.env.development.local` (cũng được Vite ưu tiên cao nhưng chỉ áp dụng mode `development`) với `VITE_APP_MODE=demo`, `VITE_BILLING_PROVIDER_MODE=mock_provider`, `VITE_ANALYTICS_MODE=off`. **Khuyến nghị** — sạch, không đụng `.env.local`.
  - **Cách 2**: Tạm rename `.env.local` → `.env.local.bak` trước khi demo (ít sạch hơn).

#### B2. Vercel production env có thể đang ở real mode

- **Hiện trạng**: `.env.production` trong repo = `VITE_APP_MODE=real` + `VITE_BILLING_PROVIDER_MODE=api_contract`. Vercel dashboard env có thể override.
- **Ảnh hưởng**: Nếu URL Vercel demo đang load real mode + thiếu Firebase → trải nghiệm vỡ.
- **Fix**: Vào Vercel dashboard → Project Settings → Environment Variables, set Production:
  ```
  VITE_APP_MODE=demo
  VITE_ANALYTICS_MODE=off
  VITE_BILLING_PROVIDER_MODE=mock_provider
  VITE_BILLING_PROVIDER_LABEL=Mock provider
  ```
  Sau đó redeploy + smoke `npm run smoke:prod`.

#### B3. `/billing/plan` hiển thị copy thanh toán THẬT trong demo mode

- **Hiện trạng** (screenshot `qa-artifacts/demo-readiness/11-billing-plan.png`): trong demo mode, page vẫn show:
  - "Chuyển khoản rõ ràng, hỗ trợ sau thanh toán."
  - "Biên nhận điện tử gửi qua email trong 1-2 phút."
  - "Liên hệ hỗ trợ: support@dearourfuture.com"
  - "Hoàn tiền linh hoạt theo chính sách hoàn tiền."
- **Ảnh hưởng**: Người xem có thể nghĩ app đang charge thật → mất trust + có thể trouble pháp lý nếu họ nghĩ sản phẩm đã thương mại hóa.
- **Fix**: Conditional render — khi `isDemoMode()` → ẩn block "Tin cậy khi thanh toán" hoặc thay thế bằng banner "Đây là mô phỏng — không xử lý giao dịch thật". File ưu tiên check: `src/app/pages/BillingPlan.tsx` + bất kỳ section component nào load `payment-history`.

### 🟡 Risk vừa — nên fix nếu có thời gian

#### M1. Auto-hydrate demo data có thể gây hiểu nhầm

- User vào `/12-week-system` lần đầu thấy goal "Ra mắt portfolio mới" — chưa nhập gì mà đã có. Banner "Bản demo" có, nhưng có thể chưa đủ rõ rằng đây là **goal mẫu**.
- **Fix**: Thêm pill nhỏ trên header goal khi `isDemoSeed === true`: "Goal mẫu — bắt đầu lại để tạo của bạn" + nút "Tạo mục tiêu của tôi".

#### M2. 12-week-system layout đầy đặn trên mobile

- Banner cảnh báo "Đến lúc chốt review tuần" (3 button) chiếm chỗ ngay khi vừa vào. Mobile 375px vẫn render OK nhưng phải scroll khá nhiều để thấy task chính.
- **Fix**: Collapse banner thành 1 dòng nhỏ trên mobile, expand on tap.

#### M3. Working tree đang dirty trên `feat/order-page-redesign`

- 9 file modified + 14 file untracked (screenshots, .playwright-mcp, qa-artifacts...).
- **Fix**: Trước demo, gitignore artifact paths (`.playwright-mcp/`, `qa-artifacts/`, `*.png` ở root). Commit hoặc revert OrderPage.test.tsx + restore 8 task prompts đã bị delete.

### 🟢 Risk thấp — chấp nhận được

- SMART wizard 5 tab nhiều bước nhưng có template + sentence preview — đủ cho demo.
- Feasibility gate bắt buộc — đúng product design.
- Console không có error trên các page đã test.

---

## Plan 7 ngày (Day 1 = ngày bắt đầu fix, Day 7 = sáng demo)

### Day 1 (HÔM NAY) — Unblock + chuẩn hoá env

| Task | Estimate | File / Action |
|---|---|---|
| Tạo `.env.development.local` với 4 biến demo-safe | 5 phút | Tạo file mới, không commit vào git |
| Vào Vercel dashboard, set 4 env biến demo-safe cho Production | 10 phút | Vercel Settings UI |
| Redeploy Vercel + chạy `npm run smoke:prod` | 15 phút | GitHub Actions hoặc local |
| Confirm URL Vercel hiển thị PublicVisitorView, không bắt login | 5 phút | Mở incognito |

### Day 2 — Fix /billing/plan demo mode copy (B3)

| Task | Estimate | File / Action |
|---|---|---|
| Đọc `src/app/pages/BillingPlan.tsx` + section "Tin cậy khi thanh toán" | 20 phút | Tìm component name |
| Wrap block bằng `isDemoMode() ? <DemoBanner /> : <RealCopy />` | 30 phút | Code change |
| Verify trong demo mode KHÔNG còn copy thanh toán thật | 10 phút | Manual |
| Verify trong real mode VẪN giữ copy cũ (regression test) | 10 phút | Manual |
| Commit + push | 5 phút | `fix(billing): hide real-payment copy in demo mode` |

### Day 3 — Polish demo-seed UX (M1)

| Task | Estimate | File / Action |
|---|---|---|
| Tìm flag `isDemoSeed` trong storage helpers | 15 phút | Grep |
| Thêm pill "Goal mẫu" trên header `/12-week-system` khi flag true | 30 phút | `src/app/pages/12WeekSystem.tsx` |
| Thêm CTA "Tạo mục tiêu của tôi" → onboarding | 20 phút | |
| Verify khi user setup goal mới, pill biến mất | 10 phút | |
| Commit | 5 phút | `feat(dashboard): label seeded goal as sample` |

### Day 4 — Mobile polish (M2) + dọn working tree (M3)

| Task | Estimate | File / Action |
|---|---|---|
| Collapse banner "review tuần" trên mobile thành 1 dòng | 30 phút | 12WeekSystem component |
| Thêm `.gitignore` cho `qa-artifacts/`, `.playwright-mcp/`, `*.png` ở root | 10 phút | |
| Revert hoặc commit 8 task prompt deletion | 10 phút | Quyết định: nếu task này đã xong thì commit deletion |
| Revert hoặc commit OrderPage.test.tsx | 10 phút | |
| Merge `feat/order-page-redesign` về `main` (nếu sẵn sàng) | 30 phút | |

### Day 5 — Smoke + visual regression

| Task | Estimate | File / Action |
|---|---|---|
| `npm run typecheck && npm run lint && npm run test:run && npm run build` | 5 phút | |
| `npm run smoke:mvp1` (local) | 15 phút | |
| `npm run qa:visual-ux-ui` | 30 phút | |
| `npm run smoke:prod` (live Vercel) | 15 phút | |
| Fix nếu có regression | flex | |

### Day 6 — Tổng duyệt + script demo

| Task | Estimate | Action |
|---|---|---|
| Mở incognito Chrome trên cả laptop + URL Vercel, chạy QA path 17 bước theo `MVP_1_SCOPE` §9.2 | 60 phút | Lập checklist các bước gây lag, các bước cần giải thích thêm |
| Viết script đọc bằng tiếng Việt 5-7 phút cho từng phần demo | 60 phút | Hero → Onboarding → Life Balance → Today → Week review → Mock upgrade |
| Test trên thiết bị thật (laptop + máy chiếu thử trước) | 30 phút | |
| Chuẩn bị fallback: nếu mạng lỗi → switch sang laptop local (npm run dev đã set demo env) | 15 phút | |

### Day 7 — Sáng demo

| Task | Action |
|---|---|
| Mở fresh incognito browser profile (tránh dữ liệu lẫn từ test) | |
| Clear localStorage trước khi present | `localStorage.clear()` trong DevTools |
| Mở sẵn 2 tab: URL Vercel + localhost:5173 (backup) | |
| Tắt notification, screen sharing apps không liên quan | |
| Charge laptop đầy 100% | |
| Có sẵn HDMI/USB-C adapter dự phòng | |

---

## Quick decisions cần trả lời

1. **URL Vercel chính xác là gì?** Mình chưa smoke được vì chưa có URL cuối cùng. Cần bạn cung cấp để mình hoặc AI khác chạy `npm run smoke:prod` đúng target.
2. **Có nên ẩn các route phụ khỏi sidebar trong demo mode không?** Vision board, Đặt kit, Thư viện, Thành tựu — không nằm trong core flow MVP. Nếu ẩn, user demo focus hơn vào 12-week-system. Nếu để, có thể distract.
3. **Có cần video record demo backup không?** Phòng trường hợp máy chiếu/mạng có vấn đề, có video 3 phút show core flow chạy mượt là plan B an toàn.

---

## File evidence

Screenshot QA trong session này lưu ở `qa-artifacts/demo-readiness/`:
- `01-fresh-home.png` — PublicVisitorView sạch
- `03-onboarding-demo.png` — Onboarding step 1
- `04-life-balance.png` — 8 lĩnh vực slider
- `05-life-insight.png` — chọn focus
- `06-smart-goal.png` — wizard 5 tab
- `07-12week-setup.png` — feasibility gate
- `08-12week-system-empty.png` — auto-hydrate demo data
- `09-task-toggled.png` — task strikethrough sau click
- `10-today-v2.png` — Today với real data (KHÔNG mock)
- `11-billing-plan.png` — **EVIDENCE Risk B3** — copy thanh toán thật trong demo mode
- `12-billing-after-upgrade-click.png` — sau click Nâng cấp Plus
- `13-mobile-12week-system.png` — mobile 375px layout
