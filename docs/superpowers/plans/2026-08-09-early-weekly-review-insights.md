# Early Weekly Review Insight Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents unless the user explicitly authorizes delegation.

**Goal:** Keep deterministic Weekly Review and Progress insights time-aware so future scheduled tasks are not treated as missed work during an active week.

**Architecture:** Centralize week-phase and as-of-date semantics inside the existing pure execution insight aggregator. Preserve whole-week evidence separately, derive active-week task and core completion only from tasks scheduled through the reference date, suppress future-week insights, and pass actual today from the snapshot caller.

**Tech Stack:** React 18, TypeScript 6, Vitest 3, existing calendar-date helpers, existing 12-week storage/domain utilities.

## Global Constraints

- Base SHA is `3489a28ce0bb2bd511451c7058b55f7cbed78bf4`.
- Branch is `fix/early-weekly-review-insights` in `D:\Projects\vision-board-early-review-insights`.
- Follow strict RED -> GREEN -> REFACTOR; no production-code change before its failing regression test is observed.
- Keep `getWeeklyReviewEvidence().completion` as completed divided by all unskipped tasks in the reviewed week.
- Do not change Weekly Review UI, copy, persistence, canonical mutation, sync, storage, backend, API, billing, auth, routes, or network behavior.
- Preserve insight IDs, copy, severity, ordering, cap, and positive-selection behavior.
- Use existing calendar-date helpers; do not introduce UTC timestamp comparison for calendar-day eligibility.
- Do not add dependencies.

---

### Task 1: Make execution insight aggregation week-phase aware

**Files:**
- Modify: `src/features/plan12week/logic/executionInsights.test.ts`
- Modify: `src/features/plan12week/logic/executionInsights.ts`
- Reference only: `src/features/plan12week/logic/weeklyReviewEvidence.ts`

**Interfaces:**
- Consumes: `getTwelveWeekWeekRange(system, weekNumber)`, `todayDateKey`, task `scheduledDate`, `completed`, `isCore`, and `skipped`.
- Produces: private `weekPhase`, `insightReferenceDateKey`, `fullWeekCompletionPercent`, `executionToDateCompletionPercent`, and `executionToDateLeadCompletionPercent` metrics.
- Preserves: public `ExecutionInsight`, `ExecutionInsightsContext`, `getExecutionInsights()`, and `getWeeklyReflectionInsights()` signatures.

- [ ] **Step 1: Add deterministic test builders and the exact whole-week-versus-to-date regression**

Add the evidence import:

```ts
import { getWeeklyReviewEvidence } from "./weeklyReviewEvidence";
```

Add these builders after `makeSystem()`:

```ts
function makeTaskBatch(input: {
  prefix: string;
  count: number;
  completedCount: number;
  scheduledDate: string;
  weekNumber?: number;
  isCore?: boolean;
}): TwelveWeekTaskInstance[] {
  return Array.from({ length: input.count }, (_, index) =>
    makeTask({
      id: `${input.prefix}_${index}`,
      weekNumber: input.weekNumber ?? 1,
      scheduledDate: input.scheduledDate,
      completed: index < input.completedCount,
      isCore: input.isCore ?? true,
    }),
  );
}

function makeAugustSystem(
  taskInstances: TwelveWeekTaskInstance[],
  overrides: Partial<TwelveWeekSystem> = {},
): TwelveWeekSystem {
  return makeSystem({
    startDate: "2026-08-03",
    endDate: "2026-10-25",
    currentWeek: 1,
    lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "20" },
    taskInstances,
    scoreboard: [makeScoreboard({ weekNumber: 1, weeklyScore: 40, leadCompletionPercent: 0 })],
    ...overrides,
  });
}
```

Add a `getWeeklyReflectionInsights` test with Monday-Sunday week 1, Wednesday as today, four completed due tasks, and six incomplete future tasks:

```ts
it("keeps whole-week evidence factual while early-review insights use tasks due so far", () => {
  const dueTasks = [
    ...makeTaskBatch({ prefix: "mon", count: 1, completedCount: 1, scheduledDate: "2026-08-03" }),
    ...makeTaskBatch({ prefix: "tue", count: 1, completedCount: 1, scheduledDate: "2026-08-04" }),
    ...makeTaskBatch({ prefix: "wed", count: 2, completedCount: 2, scheduledDate: "2026-08-05" }),
  ];
  const futureTasks = [
    ...makeTaskBatch({ prefix: "thu", count: 2, completedCount: 0, scheduledDate: "2026-08-06" }),
    ...makeTaskBatch({ prefix: "fri", count: 2, completedCount: 0, scheduledDate: "2026-08-07" }),
    ...makeTaskBatch({ prefix: "sat", count: 1, completedCount: 0, scheduledDate: "2026-08-08" }),
    ...makeTaskBatch({ prefix: "sun", count: 1, completedCount: 0, scheduledDate: "2026-08-09" }),
  ];
  const system = makeAugustSystem([...dueTasks, ...futureTasks]);

  expect(getWeeklyReviewEvidence(system, 1, new Date(2026, 7, 5, 12)).completion).toEqual({
    completed: 4,
    total: 10,
    percent: 40,
    isEmpty: false,
  });

  const insights = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" });
  expect(ids(insights)).not.toContain("progress_without_consistency");
  expect(ids(insights)).not.toContain("overloaded_week");
});
```

This test explicitly proves `4/4 due = 100% execution-to-date` while the unchanged evidence contract remains `4/10 whole week = 40%`.

- [ ] **Step 2: Add regressions that independently cover overload, real misses, boundaries, scope reduction, history, future weeks, and Progress**

Add these complete focused tests:

```ts
it("does not call an active week overloaded from future workload", () => {
  const dueTasks = [
    ...makeTaskBatch({ prefix: "overload_mon", count: 1, completedCount: 1, scheduledDate: "2026-08-03" }),
    ...makeTaskBatch({ prefix: "overload_tue", count: 1, completedCount: 1, scheduledDate: "2026-08-04" }),
    ...makeTaskBatch({ prefix: "overload_wed", count: 2, completedCount: 2, scheduledDate: "2026-08-05" }),
  ];
  const futureTasks = [
    ...makeTaskBatch({ prefix: "overload_thu", count: 2, completedCount: 0, scheduledDate: "2026-08-06" }),
    ...makeTaskBatch({ prefix: "overload_fri", count: 2, completedCount: 0, scheduledDate: "2026-08-07" }),
    ...makeTaskBatch({ prefix: "overload_sat", count: 2, completedCount: 0, scheduledDate: "2026-08-08" }),
    ...makeTaskBatch({ prefix: "overload_sun", count: 2, completedCount: 0, scheduledDate: "2026-08-09" }),
  ];
  const system = makeAugustSystem([...dueTasks, ...futureTasks]);

  expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }))).not.toContain(
    "overloaded_week",
  );
});

it("keeps real missed due work eligible during an early review", () => {
  const dueTasks = [
    ...makeTaskBatch({ prefix: "miss_mon", count: 2, completedCount: 1, scheduledDate: "2026-08-03" }),
    ...makeTaskBatch({ prefix: "miss_tue", count: 1, completedCount: 0, scheduledDate: "2026-08-04" }),
    ...makeTaskBatch({ prefix: "miss_wed", count: 1, completedCount: 0, scheduledDate: "2026-08-05" }),
  ];
  const futureTasks = makeTaskBatch({
    prefix: "miss_future",
    count: 6,
    completedCount: 0,
    scheduledDate: "2026-08-07",
  });
  const system = makeAugustSystem([...dueTasks, ...futureTasks]);

  const insight = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }).find(
    (item) => item.id === "progress_without_consistency",
  );
  expect(insight?.metrics.completionPercent).toBe(25);
});

it("includes tasks scheduled today and excludes tasks scheduled tomorrow", () => {
  const system = makeAugustSystem(
    [
      ...makeTaskBatch({ prefix: "boundary_mon", count: 1, completedCount: 1, scheduledDate: "2026-08-03" }),
      ...makeTaskBatch({ prefix: "boundary_today", count: 1, completedCount: 1, scheduledDate: "2026-08-05" }),
      ...makeTaskBatch({ prefix: "boundary_tomorrow", count: 1, completedCount: 0, scheduledDate: "2026-08-06" }),
    ],
    {
      lagMetric: { name: "Lag", unit: "u", target: "100", currentValue: "" },
      scoreboard: [makeScoreboard({ weekNumber: 1, weeklyScore: 67, leadCompletionPercent: 67 })],
    },
  );

  const insight = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }).find(
    (item) => item.id === "task_completion_without_progress",
  );
  expect(insight?.metrics.completionPercent).toBe(100);
});

it("does not derive a zero-percent warning when no tasks are due yet", () => {
  const system = makeAugustSystem([
    ...makeTaskBatch({ prefix: "not_due_tue", count: 2, completedCount: 0, scheduledDate: "2026-08-04" }),
    ...makeTaskBatch({ prefix: "not_due_wed", count: 2, completedCount: 0, scheduledDate: "2026-08-05" }),
  ]);

  expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-03" }))).not.toContain(
    "progress_without_consistency",
  );
});

it("does not treat future core tasks as low lead execution", () => {
  const system = makeAugustSystem([
    ...makeTaskBatch({
      prefix: "scope_optional_due",
      count: 8,
      completedCount: 8,
      scheduledDate: "2026-08-05",
      isCore: false,
    }),
    ...makeTaskBatch({
      prefix: "scope_core_future",
      count: 2,
      completedCount: 0,
      scheduledDate: "2026-08-06",
      isCore: true,
    }),
  ]);

  expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }))).not.toContain(
    "needs_scope_reduction",
  );
});

it("still flags scope reduction when due core execution is genuinely low", () => {
  const system = makeAugustSystem([
    ...makeTaskBatch({
      prefix: "real_scope_optional",
      count: 8,
      completedCount: 8,
      scheduledDate: "2026-08-05",
      isCore: false,
    }),
    ...makeTaskBatch({
      prefix: "real_scope_core",
      count: 2,
      completedCount: 0,
      scheduledDate: "2026-08-05",
      isCore: true,
    }),
  ]);

  expect(ids(getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-05" }))).toContain(
    "needs_scope_reduction",
  );
});

it("uses the whole ended week for historical completion insights", () => {
  const system = makeAugustSystem(
    makeTaskBatch({ prefix: "historical", count: 10, completedCount: 4, scheduledDate: "2026-08-03" }),
  );

  const insight = getWeeklyReflectionInsights(system, 1, { todayDateKey: "2026-08-19" }).find(
    (item) => item.id === "progress_without_consistency",
  );
  expect(insight?.metrics.completionPercent).toBe(40);
});

it("returns no deterministic insights for a future reviewed week", () => {
  const system = makeAugustSystem(
    makeTaskBatch({
      prefix: "future_week",
      count: 12,
      completedCount: 0,
      scheduledDate: "2026-08-10",
      weekNumber: 2,
    }),
    {
      scoreboard: [
        makeScoreboard({ weekNumber: 1, weeklyScore: 80, leadCompletionPercent: 80 }),
        makeScoreboard({ weekNumber: 2, weeklyScore: 20, leadCompletionPercent: 0 }),
      ],
      weeklyReviews: [makeReview({ weekNumber: 1, reviewCompleted: true })],
    },
  );

  expect(getWeeklyReflectionInsights(system, 2, { todayDateKey: "2026-08-05" })).toEqual([]);
});

it("uses due-to-date task completion on the Progress surface", () => {
  const system = makeAugustSystem([
    ...makeTaskBatch({ prefix: "progress_due", count: 4, completedCount: 4, scheduledDate: "2026-08-05" }),
    ...makeTaskBatch({ prefix: "progress_future", count: 6, completedCount: 0, scheduledDate: "2026-08-07" }),
  ]);

  expect(ids(getExecutionInsights(system, { weekNumber: 1, todayDateKey: "2026-08-05" }))).not.toContain(
    "progress_without_consistency",
  );
});
```

- [ ] **Step 3: Run the focused suite and verify RED**

Run:

```bash
npm run test:run -- src/features/plan12week/logic/executionInsights.test.ts
```

Expected: the new exact regression tests fail because the current aggregate counts future tasks, uses full-week core percentage, and does not suppress future weeks. Existing 23 tests remain green.

- [ ] **Step 4: Introduce private week timing and semantic metric names**

Update imports in `executionInsights.ts`:

```ts
import {
  getCalendarDayDifference,
  isCalendarDateKeyAfter,
  isCalendarDateKeyBefore,
  isCalendarDateKeyOnOrBefore,
  parseCalendarDate,
} from "@/app/utils/storage-date-utils";
import { getTwelveWeekWeekRange } from "@/app/utils/storage-twelve-week";
```

Add private timing types and helper before `AggregateMetrics`:

```ts
type InsightWeekPhase = "historical" | "active" | "future";

interface InsightWeekTiming {
  phase: InsightWeekPhase;
  referenceDateKey: string;
}

function getInsightWeekTiming(
  system: TwelveWeekSystem,
  weekNumber: number,
  todayDateKey: string,
): InsightWeekTiming {
  const range = getTwelveWeekWeekRange(system, weekNumber);

  if (isCalendarDateKeyBefore(todayDateKey, range.start)) {
    return { phase: "future", referenceDateKey: todayDateKey };
  }
  if (isCalendarDateKeyAfter(todayDateKey, range.end)) {
    return { phase: "historical", referenceDateKey: range.end };
  }
  return { phase: "active", referenceDateKey: todayDateKey };
}

function getCompletionPercent(completed: number, total: number): number | null {
  return total > 0 ? Math.round((completed / total) * 100) : null;
}
```

Replace ambiguous aggregate fields with:

```ts
weekPhase: InsightWeekPhase;
insightReferenceDateKey: string;
fullWeekTaskCount: number;
fullWeekCompletionPercent: number | null;
executionToDateTaskCount: number;
executionToDateCompletionPercent: number | null;
executionToDateLeadCompletionPercent: number | null;
```

- [ ] **Step 5: Derive coherent task eligibility inside `aggregate()`**

After normalizing `todayKey`, derive timing:

```ts
const timing = getInsightWeekTiming(system, weekNumber, todayKey);
```

Replace full-week-only task aggregation with:

```ts
const fullWeekTasks = taskInstances.filter((task) => task.weekNumber === weekNumber && !task.skipped);
const fullWeekTaskCount = fullWeekTasks.length;
const fullWeekCompletionPercent = getCompletionPercent(
  fullWeekTasks.filter((task) => task.completed).length,
  fullWeekTaskCount,
);
const executionToDateTasks =
  timing.phase === "future"
    ? []
    : timing.phase === "historical"
      ? fullWeekTasks
      : fullWeekTasks.filter((task) =>
          isCalendarDateKeyOnOrBefore(task.scheduledDate, timing.referenceDateKey),
        );
const executionToDateTaskCount = executionToDateTasks.length;
const executionToDateCompletionPercent = getCompletionPercent(
  executionToDateTasks.filter((task) => task.completed).length,
  executionToDateTaskCount,
);
const executionToDateCoreTasks = executionToDateTasks.filter((task) => task.isCore);
const executionToDateLeadCompletionPercent = getCompletionPercent(
  executionToDateCoreTasks.filter((task) => task.completed).length,
  executionToDateCoreTasks.length,
);
```

Use `timing.referenceDateKey` rather than raw `todayKey` for the existing seven-day check-in calculation. Return all newly named fields from the aggregate.

- [ ] **Step 6: Switch only completion-dependent rules to to-date metrics**

At the beginning of `detectInsights()`:

```ts
if (metrics.weekPhase === "future") return [];
```

Update rule conditions and analytics-safe metric values:

```ts
// overloaded_week
metrics.executionToDateTaskCount >= OVERLOADED_TASK_COUNT &&
(metrics.executionToDateCompletionPercent ?? 100) < LOW_COMPLETION_PERCENT

// task_completion_without_progress
(metrics.executionToDateCompletionPercent ?? 0) >= HIGH_COMPLETION_PERCENT

// needs_scope_reduction
(metrics.executionToDateCompletionPercent ?? 0) >= HIGH_COMPLETION_PERCENT &&
metrics.executionToDateLeadCompletionPercent !== null &&
metrics.executionToDateLeadCompletionPercent <= LOW_LEAD_COMPLETION_PERCENT

// progress_without_consistency
metrics.executionToDateCompletionPercent !== null &&
metrics.executionToDateCompletionPercent < LOW_COMPLETION_PERCENT
```

Keep output metric keys stable:

```ts
taskCount: metrics.executionToDateTaskCount,
completionPercent: metrics.executionToDateCompletionPercent,
leadCompletionPercent: metrics.executionToDateLeadCompletionPercent,
```

Do not change other rule thresholds, copy, ordering, or balancing.

- [ ] **Step 7: Update public comments for the future-week empty result**

Change the `getExecutionInsights()` and `getWeeklyReflectionInsights()` comments so they no longer promise at least one insight when the explicitly requested week is in the future. Preserve the null-system `no_data` behavior.

- [ ] **Step 8: Run focused tests and verify GREEN**

Run:

```bash
npm run test:run -- src/features/plan12week/logic/executionInsights.test.ts
```

Expected: all existing and new tests pass with no warnings or skipped tests.

- [ ] **Step 9: Commit the pure logic checkpoint**

```bash
git add -- src/features/plan12week/logic/executionInsights.ts src/features/plan12week/logic/executionInsights.test.ts
git commit -m "fix: make execution insights time-aware"
```

---

### Task 2: Pass actual today through the Weekly Review snapshot

**Files:**
- Modify: `src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx`
- Modify: `src/app/hooks/useTwelveWeekSystemSnapshot.ts`

**Interfaces:**
- Consumes: existing memoized `snapshotTodayDateKey`.
- Produces: weekly review view models whose insight engine receives actual today for every reviewed week.
- Preserves: evidence `referenceDate`, view-model type, maximum 12-week memoization, and all component props.

- [ ] **Step 1: Add a snapshot integration test that fails while the caller forces week end**

Extend test imports:

```ts
import { getTwelveWeekWeekRange, getUserData, saveUserData } from "@/app/utils/storage";
```

Add this scenario:

```ts
it("does not derive insight judgements for a future weekly review view model", async () => {
  resetTestStorage();
  const { goalId } = seedTwelveWeekGoal();
  const data = getUserData();
  const goal = data.goals.find((item) => item.id === goalId);
  if (!goal?.twelveWeekSystem) throw new Error("Expected seeded 12-week system");

  const futureWeekStart = getTwelveWeekWeekRange(goal.twelveWeekSystem, 2).start;
  goal.twelveWeekSystem.lagMetric.currentValue = "20";
  goal.twelveWeekSystem.taskInstances.push(
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `future_week_${index}`,
      weekNumber: 2,
      scheduledDate: futureWeekStart,
      title: `Future task ${index}`,
      leadIndicatorName: "Ship",
      isCore: true,
      completed: false,
    })),
  );
  saveUserData(data);

  const { result } = renderHook(() => useTwelveWeekSystemSnapshot(), {
    wrapper: wrapperFor("/12-week-system?tab=week"),
  });

  await waitFor(() => {
    expect(result.current.weeklyReviewViewModels[2]).toBeDefined();
  });
  expect(result.current.weeklyReviewViewModels[2]?.insights).toEqual([]);
});
```

- [ ] **Step 2: Run the snapshot test and verify RED**

Run:

```bash
npm run test:run -- src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx
```

Expected: the new test fails because the caller supplies week 2 end date, causing the engine to evaluate week 2 rather than recognize it as future.

- [ ] **Step 3: Pass actual snapshot today to weekly reflection insights**

Replace:

```ts
todayDateKey: evidence.dateRange.end,
```

with:

```ts
todayDateKey: snapshotTodayDateKey,
```

Add `snapshotTodayDateKey` to the `weeklyReviewViewModels` memo dependency array:

```ts
}, [effectiveSystem, activeTab, snapshotTodayDateKey]);
```

Keep `referenceDate = new Date()` for `getWeeklyReviewEvidence()` so evidence overdue semantics remain unchanged.

- [ ] **Step 4: Run snapshot and combined focused tests and verify GREEN**

Run:

```bash
npm run test:run -- src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx src/features/plan12week/logic/executionInsights.test.ts src/features/plan12week/logic/weeklyReviewEvidence.test.ts
```

Expected: all focused tests pass; evidence tests still prove unchanged whole-week completion semantics.

- [ ] **Step 5: Commit the caller integration checkpoint**

```bash
git add -- src/app/hooks/useTwelveWeekSystemSnapshot.ts src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx
git commit -m "fix: keep early weekly review insights time-aware"
```

---

### Task 3: Verify UI contract and full frontend safety

**Files:**
- Modify only if a new regression is proven: none expected.
- Inspect: all tracked changes on `fix/early-weekly-review-insights`.

**Interfaces:**
- Consumes: completed implementation and the spec acceptance checklist.
- Produces: fresh automated evidence and an exact baseline comparison for any unrelated failure.

- [ ] **Step 1: Run relevant Weekly Review UI regression suites**

Run:

```bash
npm run test:ui -- src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx
```

Expected: existing Weekly Review form, completed summary, evidence panel, insight rendering, and early-review controls pass without UI changes.

- [ ] **Step 2: Run static checks and full focused unit suite**

Run separately and record each exit code:

```bash
npm run typecheck
npm run lint
npm run test:run
```

Expected: all pass with no new failure.

- [ ] **Step 3: Run broad UI, sync, ops, and build verification**

Run separately:

```bash
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
```

Expected: `test:ops` and build pass. If known UI or sync failures remain, capture exact test names and reproduce them against a detached worktree at `BASE_SHA` before classifying them as baseline.

- [ ] **Step 4: Reproduce any broad-suite failure against exact base**

Only if Step 3 fails, create a temporary external detached worktree from the fixed base without touching the main checkout:

```bash
git worktree add --detach ../vision-board-early-review-insights-base 3489a28ce0bb2bd511451c7058b55f7cbed78bf4
cd ../vision-board-early-review-insights-base
npm ci
```

Run only the failing command or exact failing files. Record matching/non-matching counts, then return to the feature worktree. Do not reset, clean, stash, or modify the main checkout.

- [ ] **Step 5: Inspect scope and trace every acceptance requirement**

Run:

```bash
git status --short --branch
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
git diff origin/main...HEAD -- src/features/plan12week/logic/executionInsights.ts src/app/hooks/useTwelveWeekSystemSnapshot.ts
```

Expected changed scope:

```text
docs/specs/2026-08-09-early-weekly-review-insight-semantics.md
docs/superpowers/plans/2026-08-09-early-weekly-review-insights.md
src/features/plan12week/logic/executionInsights.ts
src/features/plan12week/logic/executionInsights.test.ts
src/app/hooks/useTwelveWeekSystemSnapshot.ts
src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx
```

Confirm `backend/`, storage modules, persistence, Weekly Review components, and network code are absent from the diff.

- [ ] **Step 6: Perform manual QA only if a practical deterministic browser seed is available**

If existing local browser tooling can seed the exact midweek scenarios without changing production code, verify:

```text
Scenario A: all due tasks complete, future tasks incomplete -> no false low-execution warning
Scenario B: due tasks mostly missed -> valid low-execution warning may render
Historical week -> full-week behavior remains
```

If deterministic browser setup is not practical, report the omission and rely on pure logic plus snapshot/component regression tests; do not add debug routes or seeders.

---

### Task 4: Publish the reviewed fix

**Files:**
- No additional source changes expected.
- PR body is created through GitHub CLI.

**Interfaces:**
- Consumes: clean worktree, committed spec/plan/code/tests, and fresh verification evidence.
- Produces: remote branch and one ready PR targeting `main`.

- [ ] **Step 1: Verify final branch state before publishing**

Run:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```

Expected: clean worktree and only scoped commits.

- [ ] **Step 2: Push the authorized branch**

```bash
git push -u origin fix/early-weekly-review-insights
```

- [ ] **Step 3: Create one ready PR**

Title:

```text
fix: avoid premature weekly review warnings
```

Body:

```markdown
## Problem

Early Weekly Review evaluates the current week with end-of-week task completion semantics, so future scheduled tasks can lower completion and trigger premature deterministic warnings.

## Root cause

Weekly Reflection Insights receive the reviewed week's end date and aggregate all scheduled tasks rather than only tasks due as of the active review date.

## Solution

- derive a time-aware insight reference from the reviewed week range
- use due-to-date task and core execution for the active week
- preserve whole-week execution for historical weeks
- suppress deterministic judgement for future weeks
- pass actual today from the Weekly Review snapshot

## Preserved

- Weekly Evidence Summary
- canonical Weekly Review save
- sync
- review UI
- insight copy and ordering
- historical whole-week semantics

## Verification

- `npm run test:run -- src/features/plan12week/logic/executionInsights.test.ts` -> PASS
- combined focused snapshot/evidence/insight suites -> PASS
- focused Weekly Review UI suites -> PASS
- `npm run typecheck` -> PASS
- `npm run lint` -> PASS
- `npm run test:run` -> PASS
- `npm run test:ui` -> PASS, or exact base-matched baseline details if the known unrelated failures remain
- `npm run test:sync` -> PASS, or exact base-matched baseline details if the known unrelated assertion remains
- `npm run test:ops` -> PASS
- `npm run build` -> PASS

## Follow-up

> Implement Weekly Review V2 Three Questions + Confirmed Next-Week Handoff.
```

Create with:

```powershell
$body = @'
## Problem

Early Weekly Review evaluates the current week with end-of-week task completion semantics, so future scheduled tasks can lower completion and trigger premature deterministic warnings.

## Root cause

Weekly Reflection Insights receive the reviewed week's end date and aggregate all scheduled tasks rather than only tasks due as of the active review date.

## Solution

- derive a time-aware insight reference from the reviewed week range
- use due-to-date task and core execution for the active week
- preserve whole-week execution for historical weeks
- suppress deterministic judgement for future weeks
- pass actual today from the Weekly Review snapshot

## Preserved

- Weekly Evidence Summary
- canonical Weekly Review save
- sync
- review UI
- insight copy and ordering
- historical whole-week semantics

## Verification

- focused insight tests: PASS
- combined snapshot/evidence/insight tests: PASS
- focused Weekly Review UI tests: PASS
- typecheck: PASS
- lint: PASS
- full unit suite: PASS
- full UI suite: PASS or exact base-matched baseline recorded before creation
- full sync suite: PASS or exact base-matched baseline recorded before creation
- ops suite: PASS
- build: PASS

## Follow-up

> Implement Weekly Review V2 Three Questions + Confirmed Next-Week Handoff.
'@
gh pr create --repo anhnhat432/Vision-Board-Web-Platform --base main --head fix/early-weekly-review-insights --title "fix: avoid premature weekly review warnings" --body $body
```

Before running the command, replace only a `PASS or exact base-matched baseline` line with the observed base evidence when the corresponding broad suite does not pass. Do not create or commit a PR-body artifact.

- [ ] **Step 4: Verify PR state and checks**

Run:

```bash
gh pr view --repo anhnhat432/Vision-Board-Web-Platform --json number,state,isDraft,url,baseRefName,headRefName,mergeable,mergeStateStatus,statusCheckRollup
```

Expected: one open ready PR from `fix/early-weekly-review-insights` to `main`. Report checks as pending or final truth; do not claim pass before completion.
