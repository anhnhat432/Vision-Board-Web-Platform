# Task Tracking - Vision Board Web Platform MVP 1

Sử dụng file này để theo dõi tiến độ hoàn thiện dự án.

## Quick Summary

**Mục tiêu:** Public demo local-first cho 12-week execution system  
**Target completion:** [Thêm deadline]  
**Current phase:** [Setup / P0 Fixes / P1 / P2 / Ready for Release]

---

## P0 Critical Fixes (Top 10 Risks)

### 1. ✅ Fresh Signed-Out Dashboard Confusion

- **Status:** [x] Completed
- **Prompt:** Prompt 1 trong PROMPTS_FOR_CLAUDE.md
- **Files changed:** `src/app/pages/Dashboard.tsx`
- **Notes:**
  - Thêm `isFreshDemoVisitor` flag để xác định fresh demo user chưa có data
  - Refactor từ `isPublicVisitor` → `isSignedOut` cho logic rõ ràng hơn
  - Thêm DemoEmptyState component hiển thị clean state với CTA "Bắt đầu Life Balance"
  - Ẩn workspace details, reflections, data backup cho fresh demo visitors
  - Preserve returning demo user's local data
- **Verified:** [x] npm run typecheck passing / [x] Manual QA done (incognito test required)

### 2. ✅ Mobile Scroll Position Reset

- **Status:** [x] Completed
- **Prompt:** Prompt 2
- **Files changed:** `src/app/pages/LifeBalance.tsx`, `src/app/pages/LifeInsight.tsx`
- **Notes:**
  - Thêm `useScrollToTopOnChange` hook vào LifeBalance và LifeInsight (trước đây thiếu)
  - LifeBalance: reset scroll khi page mount
  - LifeInsight: reset scroll khi page mount
  - Tất cả trang trong core flow giờ đều reset scroll:
    - Onboarding (wizard steps)
    - LifeBalance (page navigation)
    - LifeInsight (page navigation)
    - SMART Goal Setup (wizard steps)
    - Feasibility Check (wizard steps)
    - 12-Week Setup (wizard steps via SetupStepShell)
    - 12-Week System (tab changes)
- **Verified:** [x] typecheck / [ ] Mobile test (375px)

### 3. ✅ Simplify 12-Week System Layout

- **Status:** [x] Completed
- **Prompt:** Prompt 3
- **Files changed:**
  - `src/app/pages/12WeekSystem.tsx` - replace Tabs với activeSection, thêm desktop dropdown và mobile bottom nav
  - `src/app/components/twelve-week/ProgressSummaryCard.tsx` - new component cho progress summary
  - `src/app/pages/12WeekSystemSettings.tsx` - new settings page riêng
  - `src/app/routes.tsx` - nested route `/12-week-system/settings`
  - `src/app/components/twelve-week/TwelveWeekTodayTab.tsx` - tăng check-in button size
- **Notes:**
  - Today tab là default, chỉ hiển thị Today section khi landing
  - Secondary nav (Week/Progress/Settings) vào desktop dropdown "Thêm" và mobile bottom nav
  - Progress section là summary card với trend hero + 3 score cards, có "Xem đầy đủ" button
  - Settings tách thành page riêng tại `/12-week-system/settings`
  - Check-in button tăng 150% kích thước (text-lg py-4)
  - Loại bỏ duplicate panels
- **Verified:** [x] typecheck passing / [x] build passing / [ ] Desktop & mobile tested

### 4. ✅ Plain Language Replacements

- **Status:** [x] Completed
- **Prompt:** Prompt 4
- **Files changed:** `src/app/utils/twelve-week-premium/access.ts`, `src/app/pages/BillingPlan.tsx`, `src/app/components/twelve-week/TwelveWeekLocalStatusSection.tsx`, `src/app/components/twelve-week/TwelveWeekDeviceDetailsSection.tsx`, `src/app/pages/monetization-flows.e2e.test.tsx`
- **Notes:**
  - Entitlement labels: Template premium → Mẫu nâng cao, Insight review premium → Phân tích review nâng cao, Analytics nâng cao → Thống kê nâng cao
  - Billing panel: Checkout/Restore/Entitlement sync → Tiếng Việt
  - Outbox → Hàng chờ gửi (toàn bộ settings panels)
  - Conflict labels dịch sang tiếng Việt
  - tactic/outcome → việc lặp lại/kết quả trong reset copy
  - Lead/lag metrics đã OK từ trước: "Việc lặp lại", "Kết quả cuối"
  - Code identifiers giữ nguyên tiếng Anh
- **Verified:** [x] typecheck passing / [x] e2e test updated

### 5. ✅ Mock Checkout Trust Fix

- **Status:** [x] Completed
- **Prompt:** Prompt 5
- **Files changed:** `src/app/pages/MockBillingCheckout.tsx`, `src/app/components/UpgradePaywallDialog.tsx`
- **Notes:**
  - MockBillingCheckout: banner, buttons, labels đều tiếng Việt rõ ràng
  - UpgradePaywallDialog: banner, toast, footer, debug panel tiếng Việt
  - Mọi copy user-facing đều nói rõ "không thu tiền thật" và "trình duyệt này"
  - Nguồn gọi hiển thị tiếng Việt thay vì raw source code
- **Verified:** [x] typecheck passing / [x] No test breakage

### 6. ✅ LocalStorage Clarity

- **Status:** [x] Completed
- **Prompt:** Prompt 6
- **Files changed:** `src/app/components/DataStorageInfo.tsx` (mới), `src/app/pages/12WeekSystemSettings.tsx`, `src/app/pages/Dashboard.tsx`, `src/app/pages/12WeekSetup.tsx`, `src/features/dashboard/components/DashboardDataBackupCard.tsx`
- **Notes:**
  - Tạo `DataStorageInfo` component với 3 variants: card (Settings), inline (Dashboard), banner (backup section)
  - Settings page: thêm card "Dữ liệu và quyền riêng tư" ở đầu trang
  - Dashboard: inline notice khi có plan + banner ở backup section
  - Toast tạo plan: thêm "Kế hoạch được lưu trên trình duyệt này"
  - DashboardDataBackupCard: copy rõ hơn về lý do cần xuất sao lưu
- **Verified:** [x] typecheck passing / [x] No test breakage

### 7. ⬜ Demo Mode Backend/Auth Noise

- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Prompt:** Prompt 7
- **Files changed:**
- **Notes:** Verify NO backend calls in demo mode, no Firebase errors
- **Verified:** [ ] Network tab clean, console clean in demo

### 8. ⬜ Weekly Review Free Path

- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Prompt:** Prompt 8
- **Files changed:**
- **Notes:** Basic review must be free, Plus only enhances
- **Verified:** [ ] Can save review without upgrade

### 9. ⬜ Generated Plan Quality

- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Prompt:** Prompt 9
- **Files changed:**
- **Notes:** 2-4 tactics, clear Week 1, specific tasks
- **Verified:** [ ] Generated 5+ plans, all reasonable

### 10. ⬜ Production Smoke Test

- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Prompt:** Prompt 10
- **Files changed:**
- **Notes:** Full flow verified in production or documented blockers
- **Verified:** [ ] smoke:prod passing OR blocker documented

---

## P1: Backend Sync Hardening

### 11. ⬜ Retry Logic for Sync Failures

- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Prompt:** Prompt 11
- **Files changed:**
- **Notes:** Exponential backoff, persistent queue
- **Verified:** [ ] Offline test: changes sync when back online

### 12. ⬜ Conflict Resolution

- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Prompt:** Prompt 12
- **Files changed:**
- **Notes:** Version checking, last-write-wins with notification
- **Verified:** [ ] Two-browser conflict test

---

## P2: Quality of Life

### 13. ⬜ Simplify Desktop/Mobile Layouts

- **Prompt:** Prompt 13
- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Files changed:**
- **Verified:** [ ] Mobile & desktop tested

### 14. ⬜ Data Export & Delete Flow

- **Prompt:** Prompt 14
- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Files changed:**
- **Verified:** [ ] Export produces valid JSON / Delete clears data

### 15. ⬜ Improve Smoke Test Coverage

- **Prompt:** Prompt 15
- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Files changed:**
- **Verified:** [ ] All smoke steps covered

### 16. ⬜ Backend Controller Tests

- **Prompt:** Prompt 16
- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Files changed:**
- **Verified:** [ ] npm --prefix backend run test passes

### 17. ⬜ Durable Retry Queue

- **Prompt:** Prompt 17
- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Files changed:**
- **Verified:** [ ] Queue persists across reloads

### 18. ⬜ Loading States

- **Prompt:** Prompt 18
- **Status:** [ ] Not started / [x] In progress / [ ] Completed
- **Files changed:** `src/app/components/root-layout/useWorkspaceGate.ts`
- **Notes:**
  - Bỏ `backendHydrationLoading` khỏi workspace loading gate → UI hiện ngay với data local, backend sync chạy ngầm
  - Còn lại: các loading state khác chưa review
- **Verified:** [ ] All async ops show loading

### 19. ⬜ TypeScript Strictness

- **Prompt:** Prompt 19
- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Files changed:**
- **Verified:** [ ] npm run typecheck clean

### 20. ⬜ Mobile-First Responsive

- **Prompt:** Prompt 20
- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Files changed:**
- **Verified:** [ ] 375px, 414px, 768px, 1024px all tested

---

## Final Release Checklist

### Pre-release Configuration

- [ ] `.env.production` set to demo-safe:
  - `VITE_APP_MODE=demo`
  - `VITE_ANALYTICS_MODE=off`
  - `VITE_BILLING_PROVIDER_MODE=mock_provider`
- [ ] Firebase env NOT required for demo
- [ ] Backend health NOT required for demo

### Manual QA (Complete in order)

1. [ ] Open `/` in fresh incognito - clean state
2. [ ] Start onboarding from dashboard
3. [ ] Complete Life Balance
4. [ ] Continue to Life Insight
5. [ ] Write SMART Goal
6. [ ] Complete Feasibility Check
7. [ ] Create 12-Week Plan
8. [ ] Navigate to `/12-week-system`
9. [ ] Complete one Today task
10. [ ] Save Daily Check-in
11. [ ] Open Week tab, complete Weekly Review
12. [ ] Open Progress tab, verify progress
13. [ ] Trigger Mock Upgrade (premium template/teaser)
14. [ ] Complete Mock Checkout
15. [ ] Confirm Plus unlocks locally
16. [ ] Refresh page, plan still exists
17. [ ] Repeat key path on mobile viewport

### Automated Checks

- [ ] `npm run typecheck` ✅
- [ ] `npm run lint` ✅
- [ ] `npm run test:run` ✅
- [ ] `npm run build` ✅
- [ ] `node scripts/check-runtime-env.mjs` ✅
- [ ] `npm run smoke:prod` ✅ OR documented blocker

### Documentation

- [ ] Release notes include:
  - [ ] "This is a local-first public demo"
  - [ ] "Data stored on current browser/device"
  - [ ] "Mock upgrade does not charge real money"
  - [ ] "Login/backend sync not required for MVP 1"

---

## Known Issues / Blockers

| Issue | Priority | Owner | Notes |
| ----- | -------- | ----- | ----- |
|       |          |       |       |
|       |          |       |       |

---

## Completion Certificate

**MVP 1 Ready:** [ ] Yes / [ ] No  
**Ready Date:** **\*\***\_\_\_**\*\***  
**Verified by:** **\*\***\_\_\_**\*\***  
**Deployed to:** https://vision-board-web-platform.vercel.app

**Sign-off:**

- [ ] Product flow complete and tested
- [ ] All P0 issues addressed
- [ ] Demo mode works standalone
- [ ] Production smoke passing
- [ ] Release notes written
- [ ] Team aware of known limitations

---

## Usage Instructions

1. **Mỗi task** (prompt) nên được gán cho một developer/Claude session
2. **Status update** sau mỗi completion
3. **Verification** bắt buộc trước khi mark complete
4. **Không skip** P0 tasks - chúng là critical bugs
5. **Document blockers** rõ ràng nếu không thể fix

**File locations:**

- Chi tiết từng prompt: `PROMPTS_FOR_CLAUDE.md`
- Quick reference: `PROMPTS_QUICK_REFERENCE.md`
- Task tracking: `TASK_LIST.md` (file này)

---

**Last updated:** 2026-05-06  
**Version:** 1.3
