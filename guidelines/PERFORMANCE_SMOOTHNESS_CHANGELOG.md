# Performance Smoothness Changelog

Date: 2026-05-05 (continued)
Engineer: Claude (Frontend Performance)

---

## Summary (Continued)

Completed the 12WeekSystem performance optimization audit and implemented critical fixes:

- **Memoized all derived values** in `useTwelveWeekSystemSnapshot` hook (20+ values)
- **Removed motion dependency** from `TwelveWeekTodayTab` → replaced with CSS animations
- All 12WeekSystem tests passing (71 tests)

Build baseline unchanged (motion chunk still present for Onboarding page).

## Changes Made (Continued)

### 5. Memoize Derived Values in useTwelveWeekSystemSnapshot (Critical)

**File**: `src/app/hooks/useTwelveWeekSystemSnapshot.ts`

Wrapped ~20 derived values with `useMemo` to prevent unnecessary recalculations on every render:

- Current week data: `currentWeekTasks`, `scheduledTodayTasks`, `missedTasks`, `todayQueue`, `weekCompletion`
- Derived counts: `todayCompletedCount`, `todayRemainingCount`, `overdueOpenCount`, `optionalOpenThisWeekCount`
- Priority tasks: `firstPriorityTask`, `secondaryTodayTasks`, `currentWeekOpenTasks`
- Tactic counts: `coreTacticCount`, `optionalTacticCount`
- Aggregations: `averageScore` (reduce over scoreboard)
- Plan values: `currentReview`, `currentScore`, `currentPlan`, `currentPlanFocus`, `currentPlanMilestone`, `currentLagMetricValue`
- Indicators: `coreIndicators`, `optionalIndicators`
- Computed insights: `rescuePlanSummary`, `activeTriggers`, `premiumReviewInsight`, `suggestedNextWeekPlan`

**Dependencies**: Each useMemo has precise dependency array (e.g., `[effectiveSystem, currentWeek]`, `[effectiveSystem]`, `[missedTasks, currentWeekTasks]`, etc.)

**Impact**: Prevents expensive recalculations (filter, reduce, sort, map) on every state change. Expected to reduce 12WeekSystem re-render time by 10-30ms per update.

### 6. Remove motion Import from TwelveWeekTodayTab

**File**: `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`

- Removed `import { motion } from "motion/react"`
- Replaced `<motion.div>` (2 instances) with `<div className="animate-fade-in-up">`
- Added inline `style={{ animationDelay: '0.06s' }}` for staggered second panel animation
- Replaced closing `</motion.div>` with `</div>`

**Impact**: Today tab no longer imports motion chunk. Since Today is the default tab, this defers motion (~42 KB gzip) until other pages (Onboarding) need it. Combined with Dashboard fix, motion chunk is now only loaded on pages that truly need it.

**Behavior**: CSS `@keyframes fadeIn-up` already defined in `src/styles/theme.css`; animations remain smooth (fade-in + translateY).

### 7. Verified Existing Optimizations

- **Radix Tabs**: Confirmed only active tab content mounts (default behavior)
- **Lazy loading**: 12WeekSystem route already lazy-loaded (149 KB chunk)
- **Charts**: Progress tab uses custom HTML/Progress components (no recharts bloat)
- **WeeklyProgressChart**: Does not exist as separate component; Progress tab is already lightweight

## Build Baseline (post-motion changes, pre-memoization)

| Chunk | Raw | Gzip |
|-------|-----|------|
| index | 321.81 kB | 91.95 kB |
| vendor | 451.57 kB | ~129 kB |
| charts | 312.40 kB | ~80 kB |
| motion | 127.96 kB | ~42 kB |
| router | 88.60 kB | ~30 kB |
| radix | 67.98 kB | ~22 kB |
| icons | 44.99 kB | ~9 kB |
| CSS | 259.81 kB | 37.60 kB |
| 12WeekSystem | 149.00 kB | ~44 kB |

**First paint total (gzip)**: ~323 KB (index + vendor + router + radix + icons + CSS)

**Note**: Motion chunk (127 KB raw) is no longer imported by Dashboard or Today tab. It remains for Onboarding page.

## Verification

- **Typecheck**: `npm run typecheck` - passed
- **Build**: `npm run build` - completed in 8.83s, no errors
- **Tests**: `npm run test:run -- src/app/components/twelve-week/` - 71 tests passed

## Remaining Risks / Future Work

1. **Action handlers not memoized** (`useTwelveWeekExecutionActions`, `useTwelveWeekSettingsActions`, `useTwelveWeekBackendActions`):
   - These handlers are recreated on every render, causing child components (TaskBoard, WeeklyReview, etc.) to re-render even when props unchanged.
   - Impact: Moderate (unnecessary renders when system state updates)
   - Effort: Medium (requires careful dependency analysis and wrapping ~30 handlers)
   - Status: Deferred to separate PR; memoized derived values already reduce frequency of these re-renders.

2. **Potential localStorage reads in render path**:
   - Already audited: most storage reads are inside hooks with memoization or useEffect. No blocking reads detected.

3. **Large CSS bundle (259 KB raw)**:
   - Gzip to 37.6 KB, acceptable. No action needed.

## Recommendations

1. **Wrap action handlers in useCallback** in next optimization cycle:
   - Focus on handlers passed to TaskBoard, WeeklyReview, WeekEditor, PlanOverview
   - Dependencies: mostly stable (system, activeGoal, refreshSnapshotMeta, loadGoalData, etc.)
   - Use `useCallback` with empty deps where possible, or with explicit stable deps

2. **Consider React.memo** for expensive child components after handlers are stable:
   - TaskBoard, WeeklyReview, WeekEditor, PlanOverview
   - Only if profiling shows continued re-render overhead

3. **Monitor runtime performance** with React DevTools profiler:
   - Record interactions: task toggle, check-in save, week review submit
   - Verify re-render counts align with expectations

## Metrics

**Before optimization** (audit baseline):
- index: 321.84 KB raw / 91.98 kB gzip
- motion: 125 KB raw / ~42 kB gzip (loaded on first paint via Dashboard)

**After optimization**:
- index: 321.81 KB raw / 91.95 kB gzip (unchanged)
- motion: 127.96 KB raw / 42.04 kB gzip (still present but deferred from Today/Dashboard)
- Runtime: Derived values memoized → fewer recalculations per state update

**Test coverage**: 71 tests for twelve-week components - all passing.
