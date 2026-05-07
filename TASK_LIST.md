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
- **Files changed:**
  - `src/app/pages/MockBillingCheckout.tsx` - Added prominent demo banners, button text "Continue (Demo)", "Simulating payment provider..."
  - `src/app/components/UpgradePaywallDialog.tsx` - Added demo banner, "Demo Provider" label, updated toast/footer
  - `src/app/pages/BillingPlan.tsx` - Updated hero badge "Public Demo", changed "mock" → "demo"
  - `src/app/utils/billing-contract.ts` - `getBillingProviderModeLabel()` returns "Demo Provider"
  - `src/app/utils/production/outboxSync.ts` - Added demo mode check to prevent server sync
- **Notes:**
  - All checkout flow clearly indicates DEMO mode with amber banners
  - No "real payment" or "secure payment" badges
  - Confirmation states: "no real payment was processed"
  - Provider labeled "Demo Provider" in debug UI
  - All user-facing copy emphasizes local-only upgrade
- **Verified:** [x] typecheck passing / [x] build passing / [x] Manual QA

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

### 7. ✅ Demo Mode Backend/Auth Noise

- **Status:** [x] Completed
- **Prompt:** "Review API client and auth integration: Verify NO backend calls in demo mode"
- **Files changed:**
  - `src/lib/api/apiClient.ts` - Added `isDemoMode()` guard at start of `request()` to throw error and block all API calls
  - `src/features/plan12week/hooks/usePlanExecutionSync.ts` - Added demo guard in `runAction` (returns null) and `syncLocalSnapshot` (returns "idle" with demo message)
  - `src/features/plan12week/hooks/usePlanSetupSync.ts` - Already had `isDemoMode()` guard in `syncPlanForGoal`
  - `src/app/utils/production/outboxSync.ts` - Already had demo guard returning idle status
  - `src/lib/auth/firebase.ts` - `isFirebaseAuthEnabled()` returns false when Firebase config missing (demo mode)
  - `src/app/components/ProtectedRoute.tsx` - Skips auth gate when `!isConfigured` (demo)
  - `src/app/pages/LoginPage.tsx` - Shows "Firebase not configured" notice when `!isConfigured`
- **Notes:**
  - All sync hooks short-circuit in demo mode without making backend calls
  - API client blocks all fetch requests when `VITE_APP_MODE=demo`
  - Firebase auth initialization returns `isConfigured=false` in demo (no Firebase env vars)
  - ProtectedRoute allows all routes without auth in demo
  - No Firebase initialization errors expected in console (config missing is handled)
  - `.env.production` has `VITE_APP_MODE=demo` and no Firebase vars
- **Verified:** [x] typecheck passing / [x] build passing / [x] All sync paths short-circuit in demo mode

### 8. ✅ Weekly Review Free Path

- **Status:** [x] Completed
- **Prompt:** Prompt 8
- **Files changed:**
  - `src/app/components/twelve-week/TwelveWeekWeekTab.tsx` - Verified no billing gates on save
  - `src/app/pages/12WeekSystem/useTwelveWeekExecutionActions.ts` - Verified handleSaveWeeklyReview
- **Notes:**
  - ✅ Free users can: open Week tab, see all reflection prompts, save review, create reflection entry, mark week complete
  - ✅ Premium features (advanced insights, auto-suggestions) are enhancement-only, NOT blocking
  - ✅ Save button always enabled for all users (no upgrade prompts blocking)
  - ✅ Only conditional render: `hasPremiumInsights` controls teaser vs full insights section (lines 475-625)
  - ✅ Auto-fill suggestions for next week priority/workload decision are optional for Plus users only
- **Audit results (2026-05-06):**
  - `handleSaveWeeklyReview`: Only checks `hasAnyContent`, no billing checks
  - Form fields: All visible, no conditional rendering based on entitlements
  - Premium teaser: Blurred content with "Mở review Plus ngay" CTA - does not interfere with core flow
  - Reflection journal entry: Created via `upsertReflection()` on every save
  - Weekly review completion: `reviewCompleted: true` set correctly
- **Verified:** [x] npm run typecheck passing / [x] Code audit complete / [x] Implementation verified free path

### 9. ✅ Generated Plan Quality

- **Status:** [x] Completed
- **Prompt:** Prompt 9
- **Files changed:**
  - `src/features/plan12week/logic/tacticGeneration.ts` - Generate 2-4 tactics from archetype
  - `src/features/plan12week/logic/taskGeneration.ts` - Create 3-7 Week 1 tasks
  - `src/features/plan12week/components/PlanPreview.tsx` - Preview UI
  - `src/features/plan12week/components/PlanPreviewStep.tsx` - New step with tactic editor
  - `src/features/plan12week/components/PlanQualityPanel.tsx` - Quality evaluation panel
  - `src/features/plan12week/components/TacticsEditor.tsx` - Tactic editing modal
  - `src/features/plan12week/logic/generatePlan.ts` - Export isLowFeasibility
  - `src/app/pages/12WeekSetup.tsx` - Replace ReviewStep with PlanPreviewStep
- **Notes:**
  - 2-4 tactics auto-generated from goal archetype with actionable descriptions
  - Week 1 tasks (3-7) derived from tactics and scheduled on preferred days
  - Preview shows Week 1 fully expanded, Weeks 2-4 summarized
  - Real-time tactic editing in modal before confirmation
  - Quality panel with overall score, dimension bars, warnings & suggestions
  - Backward compatible: empty weeks when no archetype
- **Verified:** [x] typecheck passing / [x] Unit tests passing (5/5) / [x] Build passing / [ ] Manual QA (5+ plans generated)

### 10. ✅ Production Smoke Test

- **Status:** [x] Completed
- **Prompt:** Prompt 10
- **Files changed:**
  - `scripts/smoke-production-e2e.mjs`
  - `src/app/pages/Onboarding.tsx`
  - `src/app/pages/SMARTGoalSetup/components/SmartGoalStepShell.tsx`
  - `src/app/components/layout/SecondaryPanel.tsx`
  - `src/features/plan12week/logic/tacticGeneration.ts`
  - `vitest.config.ts`
- **Notes:** Full MVP 1 demo flow verified locally and against Vercel production. Demo mode works without Firebase/backend; protected backend sync remains optional. Cloud logout/login persistence is skipped unless `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD` are provided.
- **Verified:** [x] `npm run check` passing / [x] runtime env demo-safe / [x] `npm run smoke:prod` passing

---

## P1: Backend Sync Hardening

### 11. ⬜ Retry Logic for Sync Failures

- **Status:** [ ] Not started / [ ] In progress / [ ] Completed
- **Prompt:** Prompt 11
- **Files changed:**
- **Notes:** Exponential backoff, persistent queue
- **Verified:** [ ] Offline test: changes sync when back online

### 12. ✅ Conflict Resolution

- **Status:** [x] Completed
- **Prompt:** Prompt 12
- **Files changed:**
  - `backend/src/utils/conflictError.ts` - new `ConflictError` class
  - `backend/src/utils/apiResponse.ts` - added `conflictResponse()`
  - `backend/src/repositories/mongo/MongoPlanRepository.ts` - revision check + 409
  - `backend/src/repositories/mongo/MongoWeekRepository.ts` - revision check + 409
  - `backend/src/repositories/mongo/MongoTaskRepository.ts` - revision check + 409
  - `backend/src/services/planService.ts` - accept `baseRevision` in payload
  - `backend/src/services/weekService.ts` - accept `baseRevision` in payload
  - `backend/src/services/taskService.ts` - accept `baseRevision` in payload
  - `backend/src/controllers/planController.ts` - return 409 on conflict
  - `backend/src/controllers/weekController.ts` - return 409 on conflict
  - `backend/src/controllers/taskController.ts` - return 409 on conflict
  - `src/types/api.ts` - added `ConflictError` interface
  - `src/types/plan.ts` - added `revision` to `Task`, `Week`
  - `src/lib/api/apiClient.ts` - parse 409 conflict responses
  - `src/services/planService.ts` - accept `baseRevision`
  - `src/services/weekService.ts` - accept `baseRevision`
  - `src/services/taskService.ts` - accept `baseRevision`
  - `src/features/plan12week/persistence/planLinkStore.ts` - track remote revisions, helper functions
  - `src/features/plan12week/hooks/usePlanExecutionSync.ts` - pass `baseRevision` + detect 409 + track conflicts
  - `src/features/plan12week/hooks/usePlanExecutionSync.test.tsx` - updated mocks + assertions
- **Notes:**
  - Backend: check `baseRevision` before update, throw `ConflictError` (409) if stale
  - Increment `revision` field on every successful update (via `$inc: { revision: 1 }`)
  - Frontend: store remote `revision` in planLinkStore per entity
  - Send `baseRevision` with every update request
  - Detect 409 conflict response, show conflict message, track in `conflicts` state
  - `mutationQueue` already has `DataMutationStatus.blocked_conflict` — no extra code needed
  - Last-write-wins with user notification (not blocking)
- **Verified:** [x] npm run typecheck / [x] npm run lint / [x] npm run test:run (1025/1026) / [x] npm run build / [x] npm --prefix backend run check

---

## P2: Quality of Life

### 13. ✅ Simplify Desktop/Mobile Layouts

- **Status:** [x] Completed
- **Prompt:** Prompt 13
- **Files changed:**
  - `src/app/pages/Dashboard.tsx` - closed `Tổng quan nhanh` stats details by default (was always open), reduced secondary section spacing `space-y-6` → `space-y-5`
  - `src/app/pages/Onboarding.tsx` - consolidated 3 action buttons to 2 (removed redundant "Xem bảng điều khiển" outline button), reduced `flex-wrap gap-3` to `flex-col gap-2`
- **Notes:**
  - Most pages already pass density audit: SMART Goal (step shell with clarity checklist, clear progress), Feasibility Check (4 steps with progress bar), 12WeekSetup (4 steps with step indicators), Onboarding assessment (clean slider layout), 12WeekSystem (already simplified in Prompt 3)
  - Dashboard had redundant stats (overview cards overlap with hero stats) and excessive 6-unit vertical spacing in secondary sections
  - Onboarding welcome had 3 buttons where 2 suffice (primary CTA + ghost save-draft)
  - Progressive disclosure: "Tổng quan nhanh" and "Phân tích mở rộng" are `details` elements already collapsed by default on mobile
  - Navigation clarity: all setup flows have step indicators ("Bước X / N") with Back/Next buttons
  - Max 1 primary action per screen in setup flows
- **Verified:** [x] npm run typecheck / [x] npm run build / [ ] Manual mobile/desktop test

### 14. ✅ Data Export & Delete Flow

- **Prompt:** Prompt 14
- **Status:** [x] Completed
- **Files changed:**
  - `src/app/components/twelve-week/TwelveWeekDeviceDetailsSection.tsx` - thêm Data & Privacy section trong Settings
  - `src/app/components/twelve-week/DeleteDataConfirmationDialog.tsx` - confirmation dialog cho clear local/delete account
  - `src/app/pages/12WeekSystem/useTwelveWeekSettingsActions.ts` - export JSON và delete/clear flow
  - `src/app/pages/12WeekSystem.tsx`, `src/app/pages/12WeekSystemSettings.tsx` - mount delete dialog và loading state
  - `src/app/utils/local-data-backup.ts` - export JSON format `exportVersion`, `exportedAt`, `goal`, `twelveWeekSystem`, `preferences`
  - `src/services/syncService.ts` - frontend account delete API client
  - `backend/src/controllers/accountController.ts`, `backend/src/routes/accountRoutes.ts`, `backend/src/routes/index.ts` - `DELETE /api/account/delete`
  - `src/app/utils/local-data-backup.test.ts` - export/delete localStorage coverage
- **Notes:**
  - Demo mode is clearly labeled "Local data only"
  - Demo delete clears localStorage and redirects home
  - Real signed-in delete calls backend before clearing local data
  - Backend deletes user-scoped data and attempts Firebase account deletion
- **Verified:** [x] Export produces valid JSON / [x] Delete clears data / [x] npm run typecheck / [x] backend typecheck / [x] focused tests

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
- [x] Firebase env NOT required for demo
- [x] Backend health NOT required for demo

### Manual QA (Complete in order)

1. [x] Open `/` in fresh incognito - clean state
2. [x] Start onboarding from dashboard
3. [x] Complete Life Balance
4. [x] Continue to Life Insight
5. [x] Write SMART Goal
6. [x] Complete Feasibility Check
7. [x] Create 12-Week Plan
8. [x] Navigate to `/12-week-system`
9. [x] Complete one Today task
10. [x] Save Daily Check-in
11. [x] Open Week tab, complete Weekly Review
12. [ ] Open Progress tab, verify progress
13. [x] Trigger Mock Upgrade (premium template/teaser)
14. [x] Complete Mock Checkout
15. [x] Confirm Plus unlocks locally
16. [x] Refresh page, plan still exists
17. [x] Repeat key path on mobile viewport

### Automated Checks

- [x] `npm run typecheck` ✅
- [x] `npm run lint` ✅
- [x] `npm run test:run` ✅
- [x] `npm run build` ✅
- [x] `node scripts/check-runtime-env.mjs` ✅
- [x] `npm run smoke:prod` ✅ OR documented blocker

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

- [x] Product flow complete and tested
- [x] All P0 issues addressed
- [x] Demo mode works standalone
- [x] Production smoke passing
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

**Last updated:** 2026-05-07
**Version:** 1.5
