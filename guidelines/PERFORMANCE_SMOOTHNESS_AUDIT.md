# Performance Smoothness Audit

Date: 2026-05-05 (after motion calmness changes)
Auditor: Senior Frontend Performance Engineer + UX Engineer

---

## 1. Executive Summary

**Goal**: Make the web app feel smoother without adding new effects — focus on load, transitions, responsiveness.

**Current state**: After motion reduction work (Prompt #1-4), the app is calmer visually but initial load and runtime smoothness still have optimization opportunities.

**Build baseline** (this run):

| Chunk | Raw | Gzip |
|-------|-----|------|
| index | 321.84 kB | 91.98 kB |
| vendor | 441.00 kB (est.) | ~129 kB |
| charts | 306.00 kB | ~80 kB |
| motion | 125.00 kB | ~42 kB |
| router | 87.00 kB | ~30 kB |
| radix | 67.00 kB | ~22 kB |
| icons | 44.00 kB | ~9 kB |
| CSS | 259.65 kB | 37.56 kB |

**First paint total (approx)**: index + vendor + router + radix + icons + CSS = **~323 kB gzip**

**Comparison** (old audit from 2026-05-04):
- index chunk: 456.80 kB → 321.84 kB (**-135 KB raw**)
- This reduction came from earlier lazy-load conversions and motion cleanup.

---

## 2. Potential Smoothness Issues

### 2.1 Bundle/Chunk Size

- **index (322 KB raw)**: Still heavy but acceptable for SPA. Contains Dashboard + all eager non-page components.
- **vendor (441 KB raw)**: Firebase SDK dominates (~100-150 KB). Demo users pay cost for auth they don't use.
- **charts (306 KB raw)**: recharts + d3. Only needed on Progress tab and Dashboard radar. Already lazy-split but Dashboard pulls it via `DashboardLifeAreaRadar` which is lazy — good, but still loads when radar section appears.
- **motion (125 KB raw)**: framer-motion successor. Dashboard imports `motion` directly → this chunk loads on first paint. If motion only needed on lazy pages, we could defer it further.

### 2.2 Route Loading

✅ All routes except Dashboard are lazy-loaded via `lazyRoute()`. Good.

⚠️ Dashboard is eager (index route) — must be eager. But Dashboard contains:
- `DashboardLifeAreaRadar` (lazy, pulls charts chunk)
- `WeeklyProgressChart` (likely uses recharts? need verify)
- motion.div for scroll animations

→ First paint: index + vendor + motion. When user scrolls to radar, charts chunk loads (80 KB gzip). That's okay if below-the-fold.

### 2.3 Component Render Cost

**12WeekSystem**: Already lazy-loaded (145 KB). Contains tabs (Today/Week/Progress/Settings). Need audit:
- Are all tabs rendered simultaneously or only active tab?
- Does Progress tab render heavy charts immediately or only when active?
- Does Today tab recalc execution score on every keystroke?

**SMART/Feasibility wizards**: Already lazy. Step transitions use motion.div? Need check for animation overhead.

**GoalTracker**: Contains list of goals with tasks. Task toggle should be instant. Check for unnecessary re-renders.

### 2.4 Hidden Tabs Rendering

If 12WeekSystem renders all tab panels unconditionally, that's wasteful. Should render only active tab content.

### 2.5 LocalStorage Usage

Core data flows use `src/app/utils/storage.ts` and `src/features/plan12week/storage-*`. Need check:
- Are we reading localStorage on every render? (bad)
- Are we writing too frequently? (can block UI thread)
- Is there debouncing for autosave?

### 2.6 Progress/Insight Calculations

`useBackendProgressOverlay`, `useTwelveWeekSystemSnapshot`, `planInsights`, `executionScore` — these may recalc on every render if not memoized.

Look for expensive operations in render paths:
- `map/filter/reduce` over large arrays
- `sort()` on goal/task lists
- date calculations
- aggregation for progress %

### 2.7 Heavy Components Load Timing

- `Recharts` charts: Already lazy via DashboardLifeAreaRadar, but verify WeeklyProgressChart also lazy.
- `canvas-confetti`: Already split into `effects` chunk (11 KB) — okay.
- `recharts` chunk is large (306 KB). Ensure only loaded when actually needed.

### 2.8 Transition Durations & Layout Shift

Earlier motion work reduced `transition-all` and shadow opacities. Check for any remaining long durations (>200ms) that cause perceived lag.

Layout shift: Ensure images have aspect-ratio or fixed dimensions to prevent CLS.

### 2.9 Mobile Scroll & Overflow

Check for horizontal overflow causing bounce. Look for fixed-width elements exceeding viewport.

### 2.10 Analytics/Sync Blocking

Analytics tracking likely fire-and-forget. But if localStorage writes or API calls are awaited during UI interactions (e.g., task toggle), that can cause lag.

---

## 3. Top 10 Performance/Smoothness Risks

| # | Risk | Impact | Effort to Fix | Status |
|---|------|--------|---------------|--------|
| 1 | `motion` import in Dashboard → 125K chunk on first paint | High (42 KB gzip on FP) | Low (replace with CSS) | **Active** |
| 2 | Firebase SDK in vendor → 40-50 KB gzip for demo users | High | Medium (dynamic import) | **Active** |
| 3 | All 12WeekSystem tabs rendered at once (if true) | Medium (unnecessary render) | Low (conditional) | **To verify** |
| 4 | Progress calculations recalc too often | Medium (jank on input) | Medium (memoize) | **To verify** |
| 5 | WeeklyProgressChart may eager-load charts chunk | Medium | Low (lazy wrap) | **To verify** |
| 6 | Unused Radix packages bloating vendor | Low | Low (prune) | **Optional** |
| 7 | localStorage reads in render path | Low-Medium | Low (move to useEffect) | **To verify** |
| 8 | Large CSS bundle (259 KB raw) | Low (gzip good) | Not actionable | **Defer** |
| 9 | Icon tree-shaking not perfect (45 KB) | Low | Low (manual import) | **Optional** |
| 10 | Scroll animations in Dashboard (motion.div) | Low-Medium | Low (CSS @keyframes) | **To verify** |

---

## 4. Quick Wins (High Confidence, Low Risk)

### 4.1 Replace motion.div with CSS transitions in Dashboard (Target: #1)

Dashboard uses `motion.div` for simple fade-in-up on scroll. Replace with CSS `@keyframes` or IntersectionObserver + class toggle. This defers 125K motion chunk.

**Approach**:
- Identify all `<motion.div>` in Dashboard.
- Replace with `<div className="animate-fade-in-up">` using CSS.
- Remove `import { motion } from "motion/react"` from Dashboard.
- Keep motion for pages that need complex gestures (Onboarding, 12WeekSystem if they use it).

**Expected saving**: 42 KB gzip from first paint.

### 4.2 Lazy-load WeeklyProgressChart if it imports recharts (Target: #5)

Check if `WeeklyProgressChart` component uses recharts. If yes, wrap in `React.lazy()` + `Suspense` inside Dashboard.

**Expected saving**: Charts chunk (80 KB gzip) may already be lazy via radar; confirm if WeeklyProgressChart triggers it earlier than expected.

### 4.3 Ensure 12WeekSystem tabs render only active tab (Target: #3)

In `TwelveWeekSystem.tsx`, check if tab panels are conditionally rendered. If not, change to render only active tab content.

**Expected**: Less DOM nodes, less JS execution on tab switch.

### 4.4 Memoize expensive derived calculations (Target: #4)

In 12WeekTodayTab and Progress tab, identify:
- Execution score calculations
- Progress aggregations
- Insights generation

Wrap in `useMemo` with proper dependencies.

**Expected**: Smoother typing/check-in response.

### 4.5 Defer Firebase initialization (Target: #2)

If app mode is `demo`, don't import Firebase SDK at all. Use dynamic import only when user clicks "Đăng nhập".

**Expected**: 40-50 KB gzip saved for demo sessions.

---

## 5. Optimizations NOT to Do Now (Premature/Risky)

| Optimization | Reason to Skip |
|--------------|----------------|
| Virtualize long lists | Lists are short (<50 items), overkill |
| Code-split CSS | Not supported by Tailwind v4 + Vite yet |
| Replace recharts with raw SVG | Charts are core to progress tab; recharts is fine if lazy |
| Implement worker threads for calculations | Over-engineering; current calcs are cheap |
| Add Service Worker precache for chunks | Already have SW; precache can be added later if needed |
| Aggressive bundle analyzer optimizations | Current chunking is reasonable; focus on lazy first |
| Rewrite state management | Existing local-first pattern works |

---

## 6. Screens to Prioritize

| Screen | Why Priority | Target Improvements |
|--------|--------------|---------------------|
| Dashboard (first paint) | Every user sees this | Defer motion chunk, keep index light |
| 12WeekSystem Today tab | Daily driver | Instant task toggle, check-in |
| 12WeekSystem Progress tab | Weekly review | Smooth chart render, fast calculations |
| 12WeekSetup wizard | First-time setup | Step transitions snappy |
| SMART/Feasibility wizards | Goal creation | Input typing no lag |

---

## 7. Test/Check Plan

### 7.1 Build & Bundle

```bash
npm run build
# Check:
# - index chunk size (target < 300 KB raw)
# - charts chunk lazy? (should not be in index)
# - motion chunk lazy? (should not be in index if Dashboard fixed)
```

### 7.2 Runtime Smoothness

- **Dashboard load**: Should paint < 1s on 3G ( Lighthouse audit )
- **Task toggle**: Should update UI immediately, no 100ms+ delay
- **Tab switch (12WeekSystem)**: Should feel instant, no blank screen
- **Step navigation (wizards)**: No lag between steps
- **Mobile scroll**: No jank, no horizontal overflow

### 7.3 Regression Checks

- Typecheck: `npm run typecheck`
- Build: `npm run build` (no errors)
- Core flow tests: `npm run test:run` (targeted)
- Manual: login flow (if touched), task toggle, check-in, review

---

## 8. Baseline Metrics (this build)

**Build**:
- Time: 9.00s
- Index: 321.84 KB raw / 91.98 kB gzip
- Vendor: 441 KB raw / ~129 kB gzip
- Charts: 306 KB raw / ~80 kB gzip
- Motion: 125 KB raw / ~42 kB gzip
- Total first paint (gzip): ~323 KB

**Lazy routes**: 15 / 17 (Dashboard + LoginPage are eager; LoginPage is tiny)

**Known issues**:
- Motion imported in Dashboard → loads on first paint
- Firebase SDK in vendor → loads for everyone
- Possibly all 12WeekSystem tabs render at once

---

## 9. Next Steps

1. **Immediate** (this session):
   - Replace motion.div with CSS in Dashboard → defer 42 KB
   - Verify 12WeekSystem tab rendering (conditional)
   - Memoize any heavy calculations found

2. **Short-term** (next PR):
   - Lazy-initialize Firebase for demo mode → defer 40-50 KB
   - Lazy-load WeeklyProgressChart if not already
   - Audit Radix imports for unused packages

3. **Medium-term**:
   - Consider extracting motion to only pages that need it (already mostly done)
   - Review localStorage write frequency
   - Add intersection observer for below-fold components (if any)

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking Dashboard animations while replacing motion | Low | Medium | Test scroll reveal visually |
| Affecting 12WeekSystem state when conditional rendering tabs | Low | High | Preserve tab state in parent component |
| Firebase lazy init causing auth race condition | Medium | High | Guard with `AuthStateInitialized` flag |
| Charts double-load if both radar and progress lazy-loaded | Low | Low | Ensure same chunk key; Vite dedupes |

---

## Appendix: Chunk List (Raw Sizes)

```
315K index-BKuCrJzS.js
441K vendor-B0cxeNfx.js
306K charts-CJ_BbT6-.js
125K motion-VrKLeeg2.js
145K 12WeekSystem-Di5Ewqj2.js
94K  12WeekSetup-BtUFgYjb.js
87K  router-Cutui2nY.js
67K  radix-CAw1UlgD.js
55K  FeasibilityCheck-P2-nj855.js
49K  SMARTGoalSetup-oDyn2zAU.js
44K  icons-Dd39mXTb.js
31K  GoalTracker-32M5rgze.js
24K  ReflectionJournal-Tjyomqa2.js
23K  VisionBoardEditor-Mc4tXkUq.js
21K  WeeklyReview-9GPWzTfr.js
19K  OrderPage-gHsVnZW9.js
19K  PlanOverview-DDlKhW3V.js
16K  OrderStatusPage-CdC7qke0.js
16K  LifeBalance-yn9GASDZ.js
14K  VisionBoardGallery-CC34yT_w.js
14K  Onboarding-BfbhGQWO.js
... (smaller chunks omitted)
```

**Total JS (uncompressed)**: ~2.9 MB  
**Total JS (gzip est.)**: ~800 KB (including all lazy chunks)

First paint only loads subset: index + vendor + router + radix + icons + CSS ≈ 323 KB gzip.
