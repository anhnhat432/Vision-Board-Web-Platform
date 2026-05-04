# UX/UI Performance Notes

Last updated: 2026-05-04
Source: `npm run build` output + route/entrypoint audit.

---

## 1. Build Result

```
npm run build — ✓ built in 14.26s
No explicit chunk-size warnings from Vite (default warning threshold: 500 kB).
```

### JS Chunks (sorted by raw size)

| Chunk                      | Raw           | Gzip          | Notes                                        |
| -------------------------- | ------------- | ------------- | -------------------------------------------- |
| **index** (main bundle)    | **456.80 kB** | **124.38 kB** | ⚠️ Largest app chunk — 8 eager pages         |
| **vendor**                 | **451.57 kB** | **129.14 kB** | ⚠️ Firebase SDK + React + misc               |
| **charts** (recharts + d3) | **312.40 kB** | **80.48 kB**  | ⚠️ Only used in Progress + 1 dashboard chart |
| 12WeekSystem               | 147.44 kB     | 44.15 kB      | ✅ Already lazy-loaded                       |
| **motion**                 | **127.96 kB** | **42.04 kB**  | ⚠️ Animation lib, loaded globally            |
| 12WeekSetup                | 95.23 kB      | 24.90 kB      | ✅ Already lazy-loaded                       |
| router                     | 88.60 kB      | 30.02 kB      | React Router — unavoidable                   |
| WeekEditor                 | 76.42 kB      | 17.02 kB      | Sub-chunk of 12WeekSystem                    |
| radix                      | 67.98 kB      | 21.82 kB      | 20+ Radix packages bundled                   |
| FeasibilityCheck           | 55.68 kB      | 16.31 kB      | ✅ Already lazy-loaded                       |
| SMARTGoalSetup             | 49.14 kB      | 13.44 kB      | ✅ Already lazy-loaded                       |
| icons (lucide)             | 44.99 kB      | 9.03 kB       | Tree-shaken but still 45 kB                  |
| feedback (sonner)          | 33.73 kB      | 9.51 kB       | Toast lib                                    |
| planQuality                | 26.77 kB      | 8.93 kB       | Domain logic chunk                           |

### CSS

| File      | Raw       | Gzip     |
| --------- | --------- | -------- |
| index CSS | 256.06 kB | 37.09 kB |

### Total initial load estimate (first paint = Dashboard)

All eager chunks loaded before any route renders:

| What        | Gzip             |
| ----------- | ---------------- |
| index (app) | 124 kB           |
| vendor      | 129 kB           |
| router      | 30 kB            |
| radix       | 22 kB            |
| icons       | 9 kB             |
| feedback    | 10 kB            |
| CSS         | 37 kB            |
| **Total**   | **~361 kB gzip** |

This does NOT include `charts`, `motion`, `12WeekSystem`, etc. — those load on demand. But 361 kB gzip for first paint is heavy for a SPA.

---

## 2. Chunk / Bundle Warnings

No Vite warnings emitted (threshold 500 kB raw). However:

- **index (457 kB raw)** and **vendor (452 kB raw)** are both just under the 500 kB threshold.
- **charts (312 kB raw)** is a heavy optional chunk — recharts pulls in 10+ d3 sub-packages.
- **motion (128 kB raw)** is loaded by any page importing `motion` components.

---

## 3. Top 5 Performance Risks

### Risk 1: 8 pages eagerly imported in `routes.tsx`

`routes.tsx` directly imports (non-lazy):

- `Dashboard` — needed, this is the index route ✅
- `LifeBalance`
- `GoalTracker`
- `Achievements`
- `ReflectionJournal`
- `VisionBoardEditor`
- `VisionBoardGallery`
- `BillingPlan`

**Impact:** All 7 non-Dashboard pages + their dependencies are bundled into the `index` chunk (457 kB). Users landing on Dashboard download code for 7 pages they may never visit.

### Risk 2: Firebase SDK in vendor chunk

`App.tsx` wraps everything in `<AuthProvider>` which imports Firebase client SDK. Firebase Auth alone is ~100-150 kB raw. Every visitor — including demo mode users who never sign in — downloads it.

**Impact:** ~40-50 kB gzip added to first paint for a feature most demo users don't use.

### Risk 3: charts chunk (312 kB raw / 80 kB gzip)

recharts + d3 are split into their own chunk (good), but any component importing `recharts` triggers loading this 80 kB gzip chunk. Used in:

- Progress tab (inside lazy-loaded 12WeekSystem)
- `DashboardLifeAreaRadar` (inside Dashboard — eager)
- `LifeBalanceHistoryChart` (inside LifeBalance — currently eager)

**Impact:** If Dashboard imports a chart, the 80 kB charts chunk loads on first paint.

### Risk 4: motion chunk (128 kB raw / 42 kB gzip)

The `motion` package (framer-motion successor) is used for page transitions and micro-animations. If any eager-loaded component imports from `motion`, this chunk loads on first paint.

**Impact:** 42 kB gzip for animations that are decorative, not functional.

### Risk 5: Single CSS bundle (256 kB raw / 37 kB gzip)

Tailwind CSS v4 with Vite plugin generates a single CSS file. No code-splitting for CSS. All styles for all routes are in one file.

**Impact:** 37 kB gzip is acceptable for now, but will grow as features are added. Not actionable until Tailwind/Vite support CSS code-splitting.

---

## 4. Top 5 Quick Wins

### Win 1: Lazy-load 7 eager pages in `routes.tsx`

Convert `LifeBalance`, `GoalTracker`, `Achievements`, `ReflectionJournal`, `VisionBoardEditor`, `VisionBoardGallery`, `BillingPlan` from direct imports to `lazyRoute()` calls (the helper already exists in the file).

**Expected saving:** 100-200 kB raw moved out of the index chunk. First-paint gzip reduction ~30-60 kB.

**Effort:** ~15 min, low risk. The `lazyRoute` pattern is already proven in the same file.

### Win 2: Lazy-load chart components inside Dashboard

If `DashboardLifeAreaRadar` is rendered on Dashboard, it pulls in the 312 kB charts chunk. Wrapping it in `React.lazy()` + `<Suspense>` defers the chart load until the radar section scrolls into view or renders.

**Expected saving:** 80 kB gzip deferred from first paint (if Dashboard is the only eager chart consumer).

**Effort:** ~10 min, low risk.

### Win 3: Lazy-initialize Firebase / AuthProvider

Evaluate if `AuthProvider` can defer Firebase import until auth is actually needed (e.g., user clicks "Đăng nhập"). In demo mode, Firebase is never used.

**Expected saving:** 40-50 kB gzip deferred for demo-mode first paint.

**Effort:** ~30-60 min, medium risk (auth state needs to be available synchronously for ProtectedRoute).

### Win 4: Audit unused Radix packages

`package.json` lists 25 Radix packages. Some may not be imported anywhere (e.g., `react-context-menu`, `react-hover-card`, `react-menubar`, `react-navigation-menu`, `react-aspect-ratio`). Unused packages still occupy install size and potentially bundle size if re-exported.

**Expected saving:** Small bundle reduction (Radix tree-shakes well), but cleaner dependency surface.

**Effort:** ~15 min, low risk. Run `grep` for each Radix import.

### Win 5: Review `motion` usage scope

If `motion` is only used in a few lazy-loaded pages (12WeekSystem, Onboarding), it's already deferred. If any eager page (Dashboard, RootLayout) imports `motion`, move those animations behind lazy boundaries or replace with CSS transitions.

**Expected saving:** 42 kB gzip deferred if motion is moved off the eager path.

**Effort:** ~20 min audit, medium risk for replacements.

---

## 5. Lazy-Load Route Audit

Audit date: 2026-05-04.

### 5.1 Current state

| #     | Route                     | Page component      | Load strategy                   | In index chunk?                     |
| ----- | ------------------------- | ------------------- | ------------------------------- | ----------------------------------- |
| 1     | `/`                       | Dashboard           | **Eager**                       | ✅ Yes — index route, must be eager |
| 2     | `/life-balance`           | LifeBalance         | **Eager**                       | ⚠️ Yes                              |
| 3     | `/goals`                  | GoalTracker         | **Eager**                       | ⚠️ Yes                              |
| 4     | `/achievements`           | Achievements        | **Eager**                       | ⚠️ Yes                              |
| 5     | `/journal`                | ReflectionJournal   | **Eager**                       | ⚠️ Yes                              |
| 6     | `/vision-board/:id?`      | VisionBoardEditor   | **Eager**                       | ⚠️ Yes                              |
| 7     | `/gallery`                | VisionBoardGallery  | **Eager**                       | ⚠️ Yes                              |
| 8     | `/billing/plan`           | BillingPlan         | **Eager**                       | ⚠️ Yes                              |
| 9     | `/login`                  | LoginPage           | Lazy ✅                         | No                                  |
| 10    | `/onboarding`             | Onboarding          | Lazy ✅                         | No                                  |
| 11    | `/life-insight`           | LifeInsight         | Lazy ✅                         | No                                  |
| 12    | `/feasibility`            | FeasibilityCheck    | Lazy ✅                         | No                                  |
| 13    | `/smart-goal-setup`       | SMARTGoalSetup      | Lazy ✅                         | No                                  |
| 14    | `/12-week-setup`          | TwelveWeekSetup     | Lazy ✅                         | No                                  |
| 15    | `/12-week-system`         | TwelveWeekSystem    | Lazy ✅ (React.lazy + Suspense) | No                                  |
| 16    | `/billing/mock-checkout`  | MockBillingCheckout | Lazy ✅                         | No                                  |
| 17    | `/order`                  | OrderPage           | Lazy ✅ (protected)             | No                                  |
| 18    | `/order-status/:orderId?` | OrderStatusPage     | Lazy ✅ (protected)             | No                                  |
| 19    | `/admin/orders`           | AdminOrdersPage     | Lazy ✅                         | No                                  |
| 20-22 | redirects                 | Navigate components | Inline ✅ (tiny)                | Negligible                          |

Infrastructure components always eager (correct):

- `RootLayout` — shell, nav, toaster
- `AppErrorBoundary` — error fallback
- `ProtectedRoute` — auth gate

### 5.2 Per-page analysis of 7 eager candidates

| Page                   | Core-flow page? | Likely dependencies pulled in                                  | Estimated contribution to index chunk | Safe to lazy?                 |
| ---------------------- | --------------- | -------------------------------------------------------------- | ------------------------------------- | ----------------------------- |
| **LifeBalance**        | Secondary       | May import recharts → pulls 312 kB charts chunk on first paint | High                                  | ✅ Yes — not on critical path |
| **GoalTracker**        | Secondary       | localStorage reads, UI components                              | Medium                                | ✅ Yes                        |
| **Achievements**       | Secondary       | Badges, confetti? (canvas-confetti already split)              | Low-medium                            | ✅ Yes                        |
| **ReflectionJournal**  | Secondary       | Textarea, date formatting                                      | Low-medium                            | ✅ Yes                        |
| **VisionBoardEditor**  | Secondary       | Canvas/image libs? Possibly heavy                              | Medium-high                           | ✅ Yes                        |
| **VisionBoardGallery** | Secondary       | Image grid, masonry?                                           | Medium                                | ✅ Yes                        |
| **BillingPlan**        | Secondary       | Billing UI, possibly shared with mock checkout                 | Low                                   | ✅ Yes                        |

**None of these 7 pages are the index route.** All are visited after Dashboard. All are safe to lazy-load.

### 5.3 Recommended conversion order

Prioritized by estimated impact (dependencies pulled into index chunk) and risk:

| Priority | Page                   | Reason                                                                                                             | Risk                                     |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **P1**   | **LifeBalance**        | Most likely to pull recharts/charts chunk into eager path → 80 kB gzip saved if it's the only eager chart consumer | Low — `lazyRoute` pattern proven         |
| **P2**   | **VisionBoardEditor**  | Possibly heavy (canvas/image processing), param route `/vision-board/:id?`                                         | Low — param routes work with `lazyRoute` |
| **P3**   | **VisionBoardGallery** | Image grid, masonry libs                                                                                           | Low                                      |
| **P4**   | **GoalTracker**        | Medium-weight localStorage page                                                                                    | Low                                      |
| **P5**   | **Achievements**       | Low-medium weight                                                                                                  | Low                                      |
| **P6**   | **ReflectionJournal**  | Low-medium weight                                                                                                  | Low                                      |
| **P7**   | **BillingPlan**        | Lightest, but still unnecessary in index                                                                           | Low                                      |

All 7 can be done in a single batch — the `lazyRoute()` helper already exists and is used by 9 other routes. No new pattern needed.

### 5.4 Pages that should NOT be lazy-loaded

| Page                    | Reason                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Dashboard**           | Index route (`/`). First thing every user sees. Must render instantly without chunk-fetch delay. |
| **RootLayout**          | Shell component rendered for all routes. Lazy-loading would delay every page.                    |
| **AppErrorBoundary**    | Must be available synchronously for error catching.                                              |
| **ProtectedRoute**      | Auth gate must be ready before protected children render.                                        |
| **Redirect components** | Inline `<Navigate>`, ~0 kB each, no benefit from lazy.                                           |

### 5.5 Implementation notes for next task

**Pattern (copy from existing routes):**

```tsx
// Before (eager):
import { LifeBalance } from "./pages/LifeBalance";
{ path: "life-balance", Component: LifeBalance }

// After (lazy):
{ path: "life-balance", ...lazyRoute(() => import("./pages/LifeBalance"), "LifeBalance") }
```

**Checklist:**

1. Remove the 7 static imports at top of `routes.tsx`
2. Replace each `Component: X` with `...lazyRoute(() => import("./pages/X"), "X")`
3. For `VisionBoardEditor` — confirm named export matches (it uses `{ VisionBoardEditor }`)
4. Run `npm run typecheck`
5. Run `npm run build` — compare index chunk size before/after
6. Smoke test: navigate to each converted route, verify fallback appears then page loads

**Expected result:**

- index chunk drops from ~457 kB to ~250-350 kB raw (estimate)
- First-paint gzip drops from ~124 kB to ~80-100 kB (estimate)
- 7 new lazy chunks created, each loaded on-demand

---

## 6. Next Prompt

```
Bạn là frontend performance engineer.

Nhiệm vụ:
1. Convert 7 eager pages (LifeBalance, GoalTracker, Achievements,
   ReflectionJournal, VisionBoardEditor, VisionBoardGallery,
   BillingPlan) to lazyRoute() in routes.tsx.
2. Remove 7 static imports at top of routes.tsx.
3. Chạy npm run typecheck.
4. Chạy npm run build.
5. So sánh index chunk trước (457 kB) / sau.
6. Báo cáo files changed, chunk diff, risks.

Ràng buộc:
- Không sửa logic, copy, layout.
- Không thêm dependency.
- Không sửa Dashboard, RootLayout, ProtectedRoute.
- Không chạy full test suite.
```

---

## 7. Change Log

### 2026-05-04 — Lazy-load LifeBalance (P1)

**What changed:** `src/app/routes.tsx` — removed static import of `LifeBalance`, replaced `Component: LifeBalance` with `...lazyRoute(() => import("./pages/LifeBalance"), "LifeBalance")`.

**Build result after change:**

| Chunk              | Before        | After         | Delta          |
| ------------------ | ------------- | ------------- | -------------- |
| index (raw)        | 456.80 kB     | 437.36 kB     | **−19.44 kB**  |
| index (gzip)       | 124.38 kB     | 119.33 kB     | **−5.05 kB**   |
| LifeBalance (new)  | —             | 15.87 kB      | +15.87 kB lazy |
| charts             | 312.40 kB     | 312.40 kB     | unchanged      |

Conclusion: LifeBalance itself was ~19 kB raw in the index chunk. The charts chunk did **not** drop — confirming that `DashboardLifeAreaRadar` (eager, inside Dashboard) is the remaining charts consumer, not LifeBalance. Win 2 (lazy-load chart inside Dashboard) is still needed to defer the 80 kB gzip charts chunk.

Verified: `tsc` pass, `vitest run core-funnel-guard.test.tsx authenticated-core-flow.e2e.test.tsx` 6/6 pass, `npm run build` ✓ 8.91s no warnings.

---

## 8. Remaining Optimizations

### Still recommended (in priority order)

| #  | Win  | Description                                    | Est. saving (gzip) | Effort   | Risk   |
| -- | ---- | ---------------------------------------------- | ------------------- | -------- | ------ |
| 1  | Win 1 (partial) | Lazy-load remaining 6 eager pages (GoalTracker, Achievements, ReflectionJournal, VisionBoardEditor, VisionBoardGallery, BillingPlan) | ~25-40 kB | 15 min | Low |
| 2  | Win 2 | Lazy-load `DashboardLifeAreaRadar` inside Dashboard → defer 80 kB charts chunk | ~80 kB | 10 min | Low |
| 3  | Win 5 | Audit `motion` usage on eager path → defer 42 kB if removable from Dashboard/RootLayout | ~42 kB | 20 min | Medium |

### Not recommended now

| Win   | Description                          | Why skip                                                                                    |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Win 3 | Lazy-initialize Firebase/AuthProvider | Medium risk — auth state needed synchronously for ProtectedRoute. Needs careful refactor.   |
| Win 4 | Audit unused Radix packages          | Low bundle impact (tree-shaking works). Cleanup value only, not performance-critical.       |
| Win 5 (CSS) | CSS code-splitting              | Not actionable — Tailwind v4 + Vite don't support it yet.                                   |

---

## 9. Current State Summary

| Metric                    | Value          | Target           |
| ------------------------- | -------------- | ---------------- |
| index chunk (raw)         | 437.36 kB      | < 350 kB         |
| index chunk (gzip)        | 119.33 kB      | < 90 kB          |
| First-paint total (gzip)  | ~356 kB        | < 300 kB         |
| Lazy-loaded routes        | 10 / 17        | 16 / 17          |
| Eager non-Dashboard pages | 6              | 0                |

---

## 10. Next 3 Quota-Safe Prompts

### Prompt 1 — Lazy-load remaining 6 eager pages

```
QUOTA-SAFE MODE.

Bạn là frontend performance engineer.

Chỉ đọc:
1. src/app/routes.tsx

Nhiệm vụ:
Convert 6 eager pages (GoalTracker, Achievements, ReflectionJournal,
VisionBoardEditor, VisionBoardGallery, BillingPlan) to lazyRoute() in routes.tsx.
Remove 6 static imports. Verify each has named export matching the string.

Sau khi sửa:
- Chạy npm run typecheck.
- Chạy npm run build, chỉ báo cáo index chunk size.
- Không chạy full test suite.
```

### Prompt 2 — Lazy-load DashboardLifeAreaRadar (charts defer)

```
QUOTA-SAFE MODE.

Bạn là frontend performance engineer.

Chỉ đọc:
1. src/app/pages/Dashboard.tsx — tìm DashboardLifeAreaRadar import/usage
2. src/app/components/DashboardLifeAreaRadar.tsx — verify export

Nhiệm vụ:
Wrap DashboardLifeAreaRadar in React.lazy() + <Suspense> inside Dashboard.tsx
so the 312 kB charts chunk is deferred from first paint.

Sau khi sửa:
- Chạy npm run typecheck.
- Chạy npm run build, báo cáo charts chunk còn load eager không.
```

### Prompt 3 — Update performance notes

```
QUOTA-SAFE MODE.

Bạn là frontend performance reviewer. Không code.

Chỉ đọc:
1. guidelines/UX_UI_PERFORMANCE_NOTES.md

Nhiệm vụ:
Cập nhật notes với build result mới, recalculate first-paint total,
đánh giá có đạt target < 300 kB gzip chưa, đề xuất next steps.
```

---

## Cross-reference

- Build config: `vite.config.ts` — manual chunks already split charts, radix, motion, icons, router, forms, effects, feedback, vendor.
- Route config: `src/app/routes.tsx` — `lazyRoute()` helper available, used by 10 routes (after LifeBalance conversion).
- Entrypoint: `src/main.tsx` — GA4 conditional, service worker registration.
- Tab-level audits: ProgressTab and TodayTab audited 2026-05-04 — both already lean, no optimization needed.
