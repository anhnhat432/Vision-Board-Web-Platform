# Weekly Review V2 Evidence Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show factual weekly evidence and up to three deterministic insights before the existing Weekly Review reflection workflow, with identical metric semantics before and after review submission.

**Architecture:** Add one pure weekly evidence derivation in `src/features/plan12week/logic`, then memoize a small per-week review view-model map in `useTwelveWeekSystemSnapshot`. Pass that map through the existing tab boundary and render one grouped evidence panel in both `WeeklyReviewForm` and `WeeklyReviewSummary`; keep persistence, sync, storage, Premium entitlement, and review field contracts untouched.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS, Lucide icons, Vitest, Testing Library, Biome.

## Global Constraints

- Base SHA is `7fe04145b9a672bfd89063cdbd4b32f90aef3133`; do not hard-code it in production code.
- Worktree is `D:\Projects\vision-board-weekly-review-v2-summary` on branch `feat/weekly-review-v2-summary-insights`.
- Do not modify `commitTwelveWeekWeeklyReview()`, Assistant review actions, review field schemas, localStorage shapes, backend DTOs, backend files, API routes, sync ordering, or network behavior.
- Basic completion, core/optional, overdue, carry-over, check-in, on-time, comparison, and deterministic insight evidence must not be paywalled.
- Use direct task completion for current/previous-week comparison; do not substitute `scoreboard.weeklyScore`.
- Use normalized calendar dates; do not compare raw ISO timestamps against `YYYY-MM-DD`.
- No-task weeks must not display `0%` as failure; empty core/optional categories must not display fake `0%` or `100%`.
- Count unique check-in calendar dates; duplicate same-day edit entries count once.
- Render at most three insights; do not generate psychological, motivation, stress, discipline, procrastination-time, or morning/evening claims.
- Preserve rescue, week rail, Premium insight, Emotion Flow, review inputs, readiness validation, save behavior, and the existing mobile sticky CTA.
- Keep one grouped evidence container; do not create a dashboard of equally weighted metric cards.
- Follow RED -> verify failure -> GREEN -> verify pass -> refactor for every production behavior.

---

### Task 1: Derive Trustworthy Weekly Evidence

**Files:**
- Create: `src/features/plan12week/logic/weeklyReviewEvidence.ts`
- Create: `src/features/plan12week/logic/weeklyReviewEvidence.test.ts`
- Modify: `src/features/plan12week/logic/index.ts`

**Interfaces:**
- Consumes: `TwelveWeekSystem`, `getWeekTaskBreakdown()`, `getTwelveWeekWeekRange()`, and calendar-date helpers.
- Produces:

```ts
export interface WeeklyReviewRatio {
  completed: number;
  total: number;
  percent: number;
}

export interface WeeklyReviewEvidence {
  weekNumber: number;
  totalWeeks: number;
  dateRange: { start: string; end: string };
  completion: WeeklyReviewRatio & { isEmpty: boolean };
  core: WeeklyReviewRatio | null;
  optional: WeeklyReviewRatio | null;
  checkIns: { days: number; possibleDays: number };
  overdueOpenCount: number;
  carryOverCount: number;
  onTime: { completed: number; total: number } | null;
  previousWeek: (WeeklyReviewRatio & { deltaPoints: number }) | null;
}

export interface WeeklyReviewViewModel {
  evidence: WeeklyReviewEvidence;
  insights: ReadonlyArray<ExecutionInsight>;
}

export function getWeeklyReviewEvidence(
  system: TwelveWeekSystem,
  weekNumber: number,
  referenceDate?: Date,
): WeeklyReviewEvidence;
```

- [ ] **Step 1: Write the evidence fixtures and failing summary tests**

Create `weeklyReviewEvidence.test.ts` with stable local calendar fixtures:

```ts
import { describe, expect, it } from "vitest";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { getWeeklyReviewEvidence } from "./weeklyReviewEvidence";

function makeTask(
  id: string,
  weekNumber: number,
  isCore: boolean,
  completed: boolean,
  scheduledDate: string,
  completedAt?: string,
): TwelveWeekTaskInstance {
  return {
    id,
    weekNumber,
    scheduledDate,
    title: id,
    leadIndicatorName: isCore ? "Core" : "Optional",
    tacticId: isCore ? "core" : "optional",
    isCore,
    completed,
    completedAt,
  };
}

function makeSystem(taskInstances: TwelveWeekTaskInstance[] = []): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship Weekly Review V2",
    lagMetric: { name: "Output", unit: "%", target: "100", currentValue: "" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-08-03",
    endDate: "2026-10-25",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 2,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances,
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

describe("getWeeklyReviewEvidence", () => {
  it("derives 17/21 overall, 12/14 core, and 5/7 optional completion", () => {
    const tasks = Array.from({ length: 21 }, (_, index) => {
      const isCore = index < 14;
      const completed = isCore ? index < 12 : index < 19;
      return makeTask(
        `task_${index}`,
        1,
        isCore,
        completed,
        "2026-08-03",
        completed ? "2026-08-03T09:00:00+07:00" : undefined,
      );
    });

    const evidence = getWeeklyReviewEvidence(makeSystem(tasks), 1, new Date(2026, 7, 10));

    expect(evidence.completion).toEqual({ completed: 17, total: 21, percent: 81, isEmpty: false });
    expect(evidence.core).toEqual({ completed: 12, total: 14, percent: 86 });
    expect(evidence.optional).toEqual({ completed: 5, total: 7, percent: 71 });
  });

  it("returns neutral empty categories instead of fake percentages", () => {
    const evidence = getWeeklyReviewEvidence(
      makeSystem([makeTask("optional", 1, false, true, "2026-08-03", "2026-08-03")]),
      1,
      new Date(2026, 7, 10),
    );

    expect(evidence.core).toBeNull();
    expect(evidence.optional).toEqual({ completed: 1, total: 1, percent: 100 });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:run -- src/features/plan12week/logic/weeklyReviewEvidence.test.ts
```

Expected: FAIL because `./weeklyReviewEvidence` does not exist.

- [ ] **Step 3: Add failing edge-case tests**

Add explicit cases to the same `describe` block:

```ts
it("counts duplicate same-date check-ins once", () => {
  const system = makeSystem();
  system.dailyCheckIns = [
    { date: "2026-08-04", didWorkToday: true, whichLeadIndicatorWorkedOn: "", amountDone: "", outputCreated: "", obstacleOrIssue: "", dailySelfRating: 4, optionalNote: "", updatedCount: 1 },
    { date: "2026-08-04T20:00:00+07:00", didWorkToday: false, whichLeadIndicatorWorkedOn: "", amountDone: "", outputCreated: "", obstacleOrIssue: "", dailySelfRating: 3, optionalNote: "edited", updatedCount: 2 },
    { date: "2026-08-06", didWorkToday: true, whichLeadIndicatorWorkedOn: "", amountDone: "", outputCreated: "", obstacleOrIssue: "", dailySelfRating: 5, optionalNote: "" },
  ];

  expect(getWeeklyReviewEvidence(system, 1, new Date(2026, 7, 10)).checkIns).toEqual({ days: 2, possibleDays: 7 });
});

it("counts only true overdue work and separates carry-over", () => {
  const overdue = makeTask("overdue", 2, true, false, "2026-08-10");
  const today = makeTask("today", 2, true, false, "2026-08-12");
  const carried = { ...makeTask("carried", 2, true, false, "2026-08-10"), rescheduledFrom: "2026-08-05" };
  const evidence = getWeeklyReviewEvidence(makeSystem([overdue, today, carried]), 1, new Date(2026, 7, 12));

  expect(evidence.overdueOpenCount).toBe(0);
  expect(evidence.carryOverCount).toBe(1);

  const currentEvidence = getWeeklyReviewEvidence(makeSystem([overdue, today, carried]), 2, new Date(2026, 7, 12));
  expect(currentEvidence.overdueOpenCount).toBe(2);
});

it("shows on-time only when every completed task has a valid completion date", () => {
  const reliable = makeSystem([
    makeTask("on-time", 1, true, true, "2026-08-03", "2026-08-03T23:00:00+07:00"),
    makeTask("late", 1, true, true, "2026-08-04", "2026-08-05T01:00:00+07:00"),
  ]);
  expect(getWeeklyReviewEvidence(reliable, 1, new Date(2026, 7, 10)).onTime).toEqual({ completed: 1, total: 2 });

  reliable.taskInstances[1] = { ...reliable.taskInstances[1], completedAt: undefined };
  expect(getWeeklyReviewEvidence(reliable, 1, new Date(2026, 7, 10)).onTime).toBeNull();
});

it.each([
  { previousCompleted: 18, previousTotal: 25, currentCompleted: 17, currentTotal: 21, delta: 9 },
  { previousCompleted: 17, previousTotal: 21, currentCompleted: 7, currentTotal: 10, delta: -11 },
])("derives direct task-completion delta $delta points", ({ previousCompleted, previousTotal, currentCompleted, currentTotal, delta }) => {
  const previous = Array.from({ length: previousTotal }, (_, index) =>
    makeTask(`previous_${index}`, 1, true, index < previousCompleted, "2026-08-03", index < previousCompleted ? "2026-08-03" : undefined),
  );
  const current = Array.from({ length: currentTotal }, (_, index) =>
    makeTask(`current_${index}`, 2, true, index < currentCompleted, "2026-08-10", index < currentCompleted ? "2026-08-10" : undefined),
  );

  expect(getWeeklyReviewEvidence(makeSystem([...previous, ...current]), 2, new Date(2026, 7, 17)).previousWeek?.deltaPoints).toBe(delta);
});

it("omits comparison for week 1 and for no-task weeks", () => {
  expect(getWeeklyReviewEvidence(makeSystem(), 1, new Date(2026, 7, 10)).previousWeek).toBeNull();
  expect(getWeeklyReviewEvidence(makeSystem(), 1, new Date(2026, 7, 10)).completion.isEmpty).toBe(true);
});
```

The current-week overdue expectation is `2` because `overdue` and the carried task are both currently scheduled before August 12; the `today` task is excluded. The reviewed-week-1 carry-over count remains `1` because only `rescheduledFrom` belongs to week 1.

- [ ] **Step 4: Implement the minimal pure helper**

Create `weeklyReviewEvidence.ts`:

```ts
import {
  formatDateInputValue,
  getCalendarDateKey,
  isCalendarDateKeyOnOrAfter,
  isCalendarDateKeyOnOrBefore,
} from "@/app/utils/storage-date-utils";
import { getTwelveWeekWeekRange, getWeekTaskBreakdown } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem } from "@/app/utils/storage-types";
import type { ExecutionInsight } from "./executionInsights";

export interface WeeklyReviewRatio {
  completed: number;
  total: number;
  percent: number;
}

export interface WeeklyReviewEvidence {
  weekNumber: number;
  totalWeeks: number;
  dateRange: { start: string; end: string };
  completion: WeeklyReviewRatio & { isEmpty: boolean };
  core: WeeklyReviewRatio | null;
  optional: WeeklyReviewRatio | null;
  checkIns: { days: number; possibleDays: number };
  overdueOpenCount: number;
  carryOverCount: number;
  onTime: { completed: number; total: number } | null;
  previousWeek: (WeeklyReviewRatio & { deltaPoints: number }) | null;
}

export interface WeeklyReviewViewModel {
  evidence: WeeklyReviewEvidence;
  insights: ReadonlyArray<ExecutionInsight>;
}

function ratio(completed: number, total: number): WeeklyReviewRatio {
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

function belongsToRange(dateKey: string | null, range: { start: string; end: string }): boolean {
  return Boolean(
    dateKey &&
      isCalendarDateKeyOnOrAfter(dateKey, range.start) &&
      isCalendarDateKeyOnOrBefore(dateKey, range.end),
  );
}

export function getWeeklyReviewEvidence(
  system: TwelveWeekSystem,
  weekNumber: number,
  referenceDate = new Date(),
): WeeklyReviewEvidence {
  const safeWeekNumber = Math.max(1, Math.min(weekNumber, system.totalWeeks));
  const dateRange = getTwelveWeekWeekRange(system, safeWeekNumber);
  const breakdown = getWeekTaskBreakdown(system, safeWeekNumber);
  const referenceDateKey = formatDateInputValue(referenceDate);
  const checkInDays = new Set(
    system.dailyCheckIns
      .map((entry) => getCalendarDateKey(entry.date))
      .filter((dateKey): dateKey is string => belongsToRange(dateKey, dateRange)),
  );
  const completedTasks = breakdown.tasks.filter((task) => task.completed);
  const completedDateKeys = completedTasks.map((task) => getCalendarDateKey(task.completedAt ?? ""));
  const hasReliableCompletionDates = completedTasks.length > 0 && completedDateKeys.every(Boolean);
  const previousBreakdown = safeWeekNumber > 1 ? getWeekTaskBreakdown(system, safeWeekNumber - 1) : null;

  return {
    weekNumber: safeWeekNumber,
    totalWeeks: system.totalWeeks,
    dateRange,
    completion: {
      completed: breakdown.completed,
      total: breakdown.total,
      percent: breakdown.overallPercent,
      isEmpty: breakdown.isEmpty,
    },
    core: breakdown.coreTotal > 0 ? ratio(breakdown.coreCompleted, breakdown.coreTotal) : null,
    optional: breakdown.optionalTotal > 0 ? ratio(breakdown.optionalCompleted, breakdown.optionalTotal) : null,
    checkIns: { days: checkInDays.size, possibleDays: 7 },
    overdueOpenCount: breakdown.tasks.filter(
      (task) => !task.completed && task.scheduledDate < referenceDateKey,
    ).length,
    carryOverCount: system.taskInstances.filter(
      (task) =>
        task.weekNumber > safeWeekNumber &&
        belongsToRange(getCalendarDateKey(task.rescheduledFrom ?? ""), dateRange),
    ).length,
    onTime: hasReliableCompletionDates
      ? {
          completed: completedTasks.filter((task, index) =>
            isCalendarDateKeyOnOrBefore(completedDateKeys[index] as string, task.scheduledDate),
          ).length,
          total: completedTasks.length,
        }
      : null,
    previousWeek:
      previousBreakdown && !breakdown.isEmpty && !previousBreakdown.isEmpty
        ? {
            ...ratio(previousBreakdown.completed, previousBreakdown.total),
            deltaPoints: breakdown.overallPercent - previousBreakdown.overallPercent,
          }
        : null,
  };
}
```

Export the type and helper from `logic/index.ts`:

```ts
export type { WeeklyReviewEvidence, WeeklyReviewRatio, WeeklyReviewViewModel } from "./weeklyReviewEvidence";
export { getWeeklyReviewEvidence } from "./weeklyReviewEvidence";
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm run test:run -- src/features/plan12week/logic/weeklyReviewEvidence.test.ts src/app/utils/storage-twelve-week.test.ts
```

Expected: both files pass; existing `getWeekTaskBreakdown()` behavior remains unchanged.

- [ ] **Step 6: Commit the domain helper**

```bash
git add src/features/plan12week/logic/weeklyReviewEvidence.ts src/features/plan12week/logic/weeklyReviewEvidence.test.ts src/features/plan12week/logic/index.ts
git commit -m "feat: derive weekly review evidence"
```

---

### Task 2: Balance Weekly Insight Selection Without Changing Progress Insights

**Files:**
- Modify: `src/features/plan12week/logic/executionInsights.ts`
- Modify: `src/features/plan12week/logic/executionInsights.test.ts`

**Interfaces:**
- Consumes: existing deterministic candidates and `PRIORITY_ORDER`.
- Produces: `getWeeklyReflectionInsights()` still returns `ExecutionInsight[]`, capped at three, but includes the highest-ranked positive item when the first three candidates are all warnings.
- Does not change: `getExecutionInsights()` selection on the Progress tab.

- [ ] **Step 1: Write the failing weekly-selection test**

Add to the `getWeeklyReflectionInsights` describe block:

```ts
it("includes the highest-ranked positive when the first three weekly candidates are warnings", () => {
  const system = makeSystem({
    currentWeek: 2,
    lagMetric: { name: "Output", unit: "%", target: "100", currentValue: "" },
    weeklyReviews: [],
    scoreboard: [
      { weekNumber: 1, leadCompletionPercent: 90, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 80 },
      { weekNumber: 2, leadCompletionPercent: 90, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 40 },
    ],
    taskInstances: Array.from({ length: 11 }, (_, index) =>
      makeTask({ id: `overload_${index}`, weekNumber: 2, completed: false }),
    ),
  });

  const insights = getWeeklyReflectionInsights(system, 2, { todayDateKey: "2026-05-10" });

  expect(insights).toHaveLength(3);
  expect(insights.map((insight) => insight.id)).toContain("strong_lead_metric");
  expect(insights.filter((insight) => insight.severity === "warning")).toHaveLength(2);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
npm run test:run -- src/features/plan12week/logic/executionInsights.test.ts
```

Expected: FAIL because the current `sortAndCap()` returns the first three warnings.

- [ ] **Step 3: Implement a weekly-only balanced cap**

Change the selector without affecting the Progress-tab call:

```ts
function sortAndCap(
  insights: ExecutionInsight[],
  cap = MAX_INSIGHTS,
  includePositiveWhenAvailable = false,
): ExecutionInsight[] {
  const indexById = new Map(PRIORITY_ORDER.map((id, index) => [id, index] as const));
  const sorted = [...insights].sort(
    (left, right) => (indexById.get(left.id) ?? 99) - (indexById.get(right.id) ?? 99),
  );
  const selected = sorted.slice(0, cap);

  if (
    includePositiveWhenAvailable &&
    selected.length === cap &&
    selected.every((insight) => insight.severity === "warning")
  ) {
    const positive = sorted.find((insight) => insight.severity === "positive");
    if (positive && !selected.some((insight) => insight.id === positive.id)) {
      selected[cap - 1] = positive;
    }
  }

  return selected;
}
```

Keep `getExecutionInsights()` unchanged and update only the weekly call:

```ts
return sortAndCap(detectInsights(aggregate(system, { ...context, weekNumber })), MAX_INSIGHTS, true);
```

- [ ] **Step 4: Verify GREEN and existing insight contracts**

```bash
npm run test:run -- src/features/plan12week/logic/executionInsights.test.ts
```

Expected: all execution insight tests pass, including existing priority/cap tests and the new weekly-balance test.

- [ ] **Step 5: Commit the selection behavior**

```bash
git add src/features/plan12week/logic/executionInsights.ts src/features/plan12week/logic/executionInsights.test.ts
git commit -m "feat: balance weekly review insights"
```

---

### Task 3: Build One Grouped Evidence Panel

**Files:**
- Create: `src/app/components/twelve-week/WeeklyEvidenceSummary.tsx`
- Create: `src/app/components/twelve-week/WeeklyEvidenceInsights.tsx`
- Create: `src/app/components/twelve-week/WeeklyReviewEvidencePanel.tsx`
- Create: `src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx`

**Interfaces:**
- Consumes: `WeeklyReviewEvidence`, `ReadonlyArray<ExecutionInsight>`, and the existing date formatter.
- Produces:

```ts
interface WeeklyReviewEvidencePanelProps {
  evidence: WeeklyReviewEvidence;
  insights: ReadonlyArray<ExecutionInsight>;
  formatCalendarDate: (value: string) => string;
}
```

- [ ] **Step 1: Write failing component tests for normal and empty evidence**

Create `WeeklyReviewEvidencePanel.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExecutionInsight, WeeklyReviewEvidence } from "@/features/plan12week/logic";
import { WeeklyReviewEvidencePanel } from "./WeeklyReviewEvidencePanel";

const evidence: WeeklyReviewEvidence = {
  weekNumber: 4,
  totalWeeks: 12,
  dateRange: { start: "2026-08-03", end: "2026-08-09" },
  completion: { completed: 17, total: 21, percent: 81, isEmpty: false },
  core: { completed: 12, total: 14, percent: 86 },
  optional: { completed: 5, total: 7, percent: 71 },
  checkIns: { days: 5, possibleDays: 7 },
  overdueOpenCount: 3,
  carryOverCount: 1,
  onTime: { completed: 15, total: 17 },
  previousWeek: { completed: 18, total: 25, percent: 72, deltaPoints: 9 },
};

const insights: ExecutionInsight[] = [
  { id: "strong_lead_metric", severity: "positive", headline: "Core đang giữ nhịp", body: "Bằng chứng rõ ràng.", nextActionId: "celebrate_keep_going", metrics: { corePercent: 86 } },
  { id: "overloaded_week", severity: "warning", headline: "Còn việc quá hạn", body: "Ba việc vẫn đang mở.", nextActionId: "reduce_load", metrics: { overdue: 3 } },
];

describe("WeeklyReviewEvidencePanel", () => {
  it("renders one grouped factual summary and deterministic insights", () => {
    render(<WeeklyReviewEvidencePanel evidence={evidence} insights={insights} formatCalendarDate={(value) => value.slice(5)} />);

    expect(screen.getByTestId("weekly-evidence-panel")).toHaveClass("overflow-hidden");
    expect(screen.getByText("17 / 21")).toBeInTheDocument();
    expect(screen.getByText("81%")).toBeInTheDocument();
    expect(screen.getByText(/Core/i)).toBeInTheDocument();
    expect(screen.getByText(/Optional/i)).toBeInTheDocument();
    expect(screen.getByText("5 / 7 ngày")).toBeInTheDocument();
    expect(screen.getByText(/3 việc quá hạn/i)).toBeInTheDocument();
    expect(screen.getByText(/\+9 điểm/i)).toBeInTheDocument();
    expect(screen.getByText("Core đang giữ nhịp")).toBeInTheDocument();
  });

  it("renders neutral no-task and no-check-in states without 0%", () => {
    render(
      <WeeklyReviewEvidencePanel
        evidence={{ ...evidence, completion: { completed: 0, total: 0, percent: 0, isEmpty: true }, core: null, optional: null, checkIns: { days: 0, possibleDays: 7 }, previousWeek: null, onTime: null }}
        insights={[]}
        formatCalendarDate={(value) => value}
      />,
    );

    expect(screen.getByText("Tuần này chưa có việc được lên lịch.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có check-in tuần này")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("defensively renders no more than three insight rows", () => {
    const extraInsights: ExecutionInsight[] = [
      { id: "consistency_improving", severity: "positive", headline: "Trend A", body: "Evidence A", nextActionId: "celebrate_keep_going", metrics: {} },
      { id: "review_missing", severity: "warning", headline: "Trend B", body: "Evidence B", nextActionId: "open_week_review", metrics: {} },
    ];
    render(
      <WeeklyReviewEvidencePanel
        evidence={evidence}
        insights={[...insights, ...extraInsights]}
        formatCalendarDate={(value) => value}
      />,
    );

    expect(screen.getAllByTestId("weekly-evidence-insight")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the UI test and verify RED**

```bash
npm run test:ui -- src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx
```

Expected: FAIL because the evidence components do not exist.

- [ ] **Step 3: Implement the metric summary**

Create `WeeklyEvidenceSummary.tsx` with semantic text and a compact responsive grid:

```tsx
import type { WeeklyReviewEvidence } from "@/features/plan12week/logic";

interface WeeklyEvidenceSummaryProps {
  evidence: WeeklyReviewEvidence;
  formatCalendarDate: (value: string) => string;
}

function ratioText(value: { completed: number; total: number; percent: number } | null): string {
  return value ? `${value.completed} / ${value.total} · ${value.percent}%` : "Chưa lên lịch";
}

export function WeeklyEvidenceSummary({ evidence, formatCalendarDate }: WeeklyEvidenceSummaryProps) {
  const delta = evidence.previousWeek?.deltaPoints;
  const deltaLabel = delta === undefined ? null : `${delta > 0 ? "+" : ""}${delta} điểm so với tuần trước`;

  return (
    <div data-testid="weekly-evidence-summary" className="min-w-0 space-y-4 p-4 sm:p-6">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">
            Tuần {evidence.weekNumber} / {evidence.totalWeeks}
          </p>
          <p className="mt-1 text-xs font-medium text-app-ink-soft">
            {formatCalendarDate(evidence.dateRange.start)} – {formatCalendarDate(evidence.dateRange.end)}
          </p>
        </div>
        {deltaLabel && <p className="text-xs font-semibold text-app-ink-soft">{deltaLabel}</p>}
      </header>

      {evidence.completion.isEmpty ? (
        <p className="rounded-xl border border-dashed border-app-line px-4 py-4 text-sm text-app-ink-soft">
          Tuần này chưa có việc được lên lịch.
        </p>
      ) : (
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-3xl font-bold text-app-ink sm:text-4xl">
            {evidence.completion.completed} / {evidence.completion.total}
          </span>
          <span className="font-mono text-lg font-bold text-app-accent">{evidence.completion.percent}%</span>
        </div>
      )}

      <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div className="min-w-0"><dt className="text-[10px] font-bold uppercase text-app-ink-muted">Core</dt><dd className="mt-1 break-words text-sm font-semibold text-app-ink">{ratioText(evidence.core)}</dd></div>
        <div className="min-w-0"><dt className="text-[10px] font-bold uppercase text-app-ink-muted">Optional</dt><dd className="mt-1 break-words text-sm font-semibold text-app-ink">{ratioText(evidence.optional)}</dd></div>
        <div className="min-w-0"><dt className="text-[10px] font-bold uppercase text-app-ink-muted">Check-in</dt><dd className="mt-1 break-words text-sm font-semibold text-app-ink">{evidence.checkIns.days > 0 ? `${evidence.checkIns.days} / ${evidence.checkIns.possibleDays} ngày` : "Chưa có check-in tuần này"}</dd></div>
      </dl>

      <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 border-t border-app-line/60 pt-3 text-xs text-app-ink-soft">
        <span>{evidence.overdueOpenCount > 0 ? `${evidence.overdueOpenCount} việc quá hạn` : "Không còn việc quá hạn"}</span>
        {evidence.carryOverCount > 0 && <span>{evidence.carryOverCount} việc đã chuyển tuần</span>}
        {evidence.onTime && <span>Đúng hạn {evidence.onTime.completed} / {evidence.onTime.total}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement textual deterministic insights**

Create `WeeklyEvidenceInsights.tsx`:

```tsx
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import type { ExecutionInsight } from "@/features/plan12week/logic";

export function WeeklyEvidenceInsights({ insights }: { insights: ReadonlyArray<ExecutionInsight> }) {
  const visibleInsights = insights.slice(0, 3);
  if (visibleInsights.length === 0) return null;

  return (
    <section aria-labelledby="weekly-evidence-insights-title" className="border-t border-app-line/60 p-4 sm:p-6">
      <h3 id="weekly-evidence-insights-title" className="text-xs font-bold uppercase tracking-[0.16em] text-app-ink-soft">
        Điều đáng chú ý
      </h3>
      <div className="mt-3 space-y-3">
        {visibleInsights.map((insight) => {
          const Icon = insight.severity === "positive" ? CheckCircle2 : insight.severity === "warning" ? AlertTriangle : TrendingUp;
          const semanticLabel = insight.severity === "positive" ? "Điểm đáng giữ" : insight.severity === "warning" ? "Điểm cần chú ý" : "Xu hướng";
          return (
            <article key={insight.id} data-testid="weekly-evidence-insight" className="flex min-w-0 gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">{semanticLabel}</p>
                <h4 className="mt-0.5 break-words text-sm font-semibold text-app-ink">{insight.headline}</h4>
                <p className="mt-1 break-words text-xs leading-relaxed text-app-ink-soft">{insight.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

Create the single grouped container in `WeeklyReviewEvidencePanel.tsx`:

```tsx
import type { ExecutionInsight, WeeklyReviewEvidence } from "@/features/plan12week/logic";
import { WeeklyEvidenceInsights } from "./WeeklyEvidenceInsights";
import { WeeklyEvidenceSummary } from "./WeeklyEvidenceSummary";

interface WeeklyReviewEvidencePanelProps {
  evidence: WeeklyReviewEvidence;
  insights: ReadonlyArray<ExecutionInsight>;
  formatCalendarDate: (value: string) => string;
}

export function WeeklyReviewEvidencePanel({ evidence, insights, formatCalendarDate }: WeeklyReviewEvidencePanelProps) {
  return (
    <section
      data-testid="weekly-evidence-panel"
      aria-label={`Bằng chứng tuần ${evidence.weekNumber}`}
      className="min-w-0 overflow-hidden rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface shadow-[var(--app-shadow-card)]"
    >
      <WeeklyEvidenceSummary evidence={evidence} formatCalendarDate={formatCalendarDate} />
      {!evidence.completion.isEmpty && <WeeklyEvidenceInsights insights={insights} />}
    </section>
  );
}
```

- [ ] **Step 5: Verify GREEN**

```bash
npm run test:ui -- src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx
```

Expected: `3/3` component tests pass.

- [ ] **Step 6: Commit the evidence UI**

```bash
git add src/app/components/twelve-week/WeeklyEvidenceSummary.tsx src/app/components/twelve-week/WeeklyEvidenceInsights.tsx src/app/components/twelve-week/WeeklyReviewEvidencePanel.tsx src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx
git commit -m "feat: add weekly review evidence panel"
```

---

### Task 4: Derive and Pass Week-Scoped Review View Models

**Files:**
- Modify: `src/app/hooks/useTwelveWeekSystemSnapshot.ts`
- Modify: `src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx`
- Modify: `src/features/plan12week/pages/12WeekSystem.tsx`
- Modify: `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`

**Interfaces:**
- Produces from the snapshot:

```ts
weeklyReviewViewModels: Readonly<Record<number, WeeklyReviewViewModel>>;
```

- [ ] **Step 1: Write the failing hook test**

Extend `useTwelveWeekSystemSnapshot.test.tsx`:

```tsx
it("derives a week-scoped evidence and insight view model on the Week tab", async () => {
  const { result } = renderHook(() => useTwelveWeekSystemSnapshot(), {
    wrapper: wrapperFor("/12-week-system?tab=week"),
  });

  await waitFor(() => {
    expect(result.current.weeklyReviewViewModels[1]?.evidence.completion.total).toBe(2);
  });
  expect(result.current.weeklyReviewViewModels[1]?.evidence.dateRange.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(result.current.weeklyReviewViewModels[1]?.insights.length).toBeLessThanOrEqual(3);
});
```

- [ ] **Step 2: Verify RED**

```bash
npm run test:ui -- src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx
```

Expected: FAIL because `weeklyReviewViewModels` is not returned.

- [ ] **Step 3: Build the memoized map in the snapshot**

Add the evidence import and view-model type:

```ts
import {
  getWeeklyReflectionInsights,
  getWeeklyReviewEvidence,
  type WeeklyReviewViewModel,
} from "@/features/plan12week/logic";
```

Replace the current single-week `weeklyReflectionInsights` memo with:

```ts
const weeklyReviewViewModels = useMemo<Readonly<Record<number, WeeklyReviewViewModel>>>(() => {
  if (!effectiveSystem || activeTab !== "week") return {};
  const referenceDate = new Date();

  return Object.fromEntries(
    Array.from({ length: effectiveSystem.totalWeeks }, (_, index) => {
      const weekNumber = index + 1;
      const evidence = getWeeklyReviewEvidence(effectiveSystem, weekNumber, referenceDate);
      const insights = evidence.completion.isEmpty
        ? []
        : getWeeklyReflectionInsights(effectiveSystem, weekNumber, {
            todayDateKey: evidence.dateRange.end,
          });
      return [weekNumber, { evidence, insights } satisfies WeeklyReviewViewModel];
    }),
  );
}, [effectiveSystem, activeTab]);
```

Return `weeklyReviewViewModels` and remove the old `weeklyReflectionInsights` return property.

- [ ] **Step 4: Thread the typed map through the existing tab boundary**

In `12WeekSystem.tsx`, add this property to the snapshot destructuring:

```tsx
weeklyReviewViewModels,
```

Add this exact prop to the existing `TwelveWeekSystemTabs` invocation:

```tsx
weeklyReviewViewModels={weeklyReviewViewModels}
```

In `TwelveWeekSystemTabs.tsx`, replace the `weeklyReflectionInsights` prop with:

```ts
weeklyReviewViewModels: Readonly<Record<number, WeeklyReviewViewModel>>;
```

and add this exact prop to the existing `TwelveWeekWeekTab` invocation:

```tsx
weeklyReviewViewModels={weeklyReviewViewModels}
```

In `TwelveWeekWeekTab.tsx`, add the required prop to the interface but do not render it until Task 5:

```ts
weeklyReviewViewModels: Readonly<Record<number, WeeklyReviewViewModel>>;
```

Delete `_weeklyReflectionInsights` from every interface, destructuring list, and JSX call.

- [ ] **Step 5: Run hook, type, and existing Week-tab tests**

```bash
npm run test:ui -- src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx
npm run typecheck
```

Expected: hook and existing Week tests pass; TypeScript confirms the new prop chain is complete.

- [ ] **Step 6: Commit the snapshot pipeline**

```bash
git add src/app/hooks/useTwelveWeekSystemSnapshot.ts src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx src/features/plan12week/pages/12WeekSystem.tsx src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx src/app/components/twelve-week/TwelveWeekWeekTab.tsx
git commit -m "feat: derive weekly review view models"
```

---

### Task 5: Put Evidence Before Reflection in Open and Completed Reviews

**Files:**
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`
- Modify: `src/app/components/twelve-week/WeeklyReviewForm.tsx`
- Modify: `src/app/components/twelve-week/WeeklyReviewSummary.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx`
- Modify if necessary: `src/app/components/twelve-week/TwelveWeekWeekTab.css`

**Interfaces:**
- `TwelveWeekWeekTab` selects `weeklyReviewViewModels[selectedWeek]`.
- `WeeklyReviewForm` and `WeeklyReviewSummary` receive the same `WeeklyReviewViewModel` for the reviewed week.
- Existing callbacks and form data remain unchanged.

- [ ] **Step 1: Update test fixtures and write failing evidence-order tests**

In `TwelveWeekWeekTab.test.tsx`, add a default `weeklyReviewViewModels` fixture to `makeProps()` using the same factual values as the evidence panel test.

Add:

```tsx
it("renders weekly evidence and supplied insights before human reflection", () => {
  render(<TwelveWeekWeekTab {...makeProps()} />);

  const evidence = screen.getByTestId("weekly-evidence-panel");
  const reflection = screen.getByLabelText(/góc nhìn\/điều học được/i);
  expect(screen.getByText("Core đang giữ nhịp")).toBeInTheDocument();
  expect(evidence.compareDocumentPosition(reflection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("keeps the existing reflection fields and secondary Premium and Emotion content reachable", () => {
  render(<TwelveWeekWeekTab {...makeProps()} />);

  expect(screen.getByLabelText(/góc nhìn\/điều học được/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/cam kết của tuần tới/i)).toBeInTheDocument();
  expect(screen.getByText(/Dòng chảy Cảm xúc Tuần/i)).toBeInTheDocument();
  expect(screen.getByText("Upgrade insight")).toBeInTheDocument();
  expect(screen.getByTestId("weekly-review-mobile-sticky-cta")).toBeInTheDocument();
});

it("shows the shared evidence panel for an already completed review", () => {
  render(<TwelveWeekWeekTab {...makeProps({ currentReview: makeCompletedReview() })} />);

  const summary = screen.getByTestId("weekly-review-summary");
  expect(within(summary).getByTestId("weekly-evidence-panel")).toBeInTheDocument();
  expect(within(summary).getByText("17 / 21")).toBeInTheDocument();
  expect(within(summary).getByText("Core đang giữ nhịp")).toBeInTheDocument();
  expect(within(summary).getByText("Protect morning focus.")).toBeInTheDocument();
});
```

Update the existing no-task test so its view-model evidence is empty and assert:

```tsx
expect(screen.getByText("Tuần này chưa có việc được lên lịch.")).toBeInTheDocument();
expect(screen.queryByText("0%")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the Week-tab UI test and verify RED**

```bash
npm run test:ui -- src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx
```

Expected: FAIL because the new view model is not selected or rendered.

- [ ] **Step 3: Select the reviewed-week view model in `TwelveWeekWeekTab`**

Destructure `weeklyReviewViewModels` and select:

```ts
const reviewViewModel = weeklyReviewViewModels[selectedWeek];
```

Add the selected view model to the existing `WeeklyReviewForm` invocation:

```tsx
reviewViewModel={reviewViewModel}
```

Add the same property to the existing `WeeklyReviewSummary` invocation:

```tsx
reviewViewModel={reviewViewModel}
```

The view model is required for all weeks generated by the snapshot. Tests must provide it; do not add component-local raw-system recalculation as a fallback.

- [ ] **Step 4: Reorder `WeeklyReviewForm` without changing its fields or save contract**

Add:

```ts
reviewViewModel: WeeklyReviewViewModel;
```

Insert the context and evidence panel before the current Review Form Card:

```tsx
<section
  data-testid="weekly-review-context"
  className="rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:p-6"
>
  <div className="flex flex-wrap items-center justify-between gap-2.5">
    <span>Tuần {currentWeekLimit} / {totalWeeks}</span>
    <span>
      {currentWeekRange
        ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
        : "Chu kỳ hiện tại"}
    </span>
  </div>
  {currentPlanFocus && (
    <h2 className="mt-4 max-w-[28ch] font-serif text-xl font-bold text-app-ink sm:text-2xl">
      {currentPlanFocus}
    </h2>
  )}
  <p className="mt-3 text-xs font-semibold text-app-ink-soft">Tiến độ review {reviewReadyCount}/4 bước</p>
</section>

<div data-testid="wam-section-score">
  <WeeklyReviewEvidencePanel
    evidence={reviewViewModel.evidence}
    insights={reviewViewModel.insights}
    formatCalendarDate={formatCalendarDate}
  />
</div>
```

Inside the existing Review Form Card, retain the heading, step-progress indicator, commitment classification (`data-testid="wam-section-commitments"`), reflection textarea (`data-testid="wam-section-insights"`), next-week commitments (`data-testid="wam-section-next-commitments"`), readiness box, and desktop save buttons with their current callbacks and field bindings. Remove only the duplicated execution-score card (`data-testid="weekly-review-step-score"`) because its factual content now lives in the evidence panel. Keep the readiness `score` item marked complete so the four-step validation contract stays unchanged.

Move `TwelveWeekEmotionFlow` and `TwelveWeekPremiumInsightSection` after the closing Review Form Card. Append this factual lag block after those two existing components:

```tsx
{lagScoreValue !== null && (
  <div className="rounded-xl border border-app-line bg-app-bg-subtle/35 px-4 py-3 text-xs text-app-ink-soft">
    <span className="font-semibold text-app-ink">Chỉ số kết quả: {lagScoreValue}%</span>
    {lagMetricValue && <span className="ml-2">{system.lagMetric.name}: {lagMetricValue}</span>}
  </div>
)}
```

Leave the current `weekly-review-mobile-sticky-cta` JSX as the final child of the top-level form wrapper.

- [ ] **Step 5: Reuse the panel in `WeeklyReviewSummary`**

Add the same `reviewViewModel` prop and place the panel immediately after the completed-review header:

```tsx
<WeeklyReviewEvidencePanel
  evidence={reviewViewModel.evidence}
  insights={reviewViewModel.insights}
  formatCalendarDate={formatCalendarDate}
/>
```

Remove the old duplicated focal completion score and generic score-interpretation block. Preserve:

```text
week 12 outcome
lag metric detail
tactic rows
kept/missed commitments
next-week commitments
saved human insight/reflection
edit action
next-week recommendation
```

Move lag and tactic detail below the saved reflection/commitment content and label it as secondary execution detail. Remove now-unused `_leadScoreValue`, `scoreTone`, `scoreInterpretation`, and `weekCompletion` props from `WeeklyReviewSummary` and their calculations in `TwelveWeekWeekTab`; retain `leadScoreValue` only where the pre-review hero still needs it.

- [ ] **Step 6: Verify GREEN and hierarchy regressions**

```bash
npm run test:ui -- src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx
npm run typecheck
```

Expected: panel, open-review, completed-review, existing fields, save confirmation, rail, Premium, Emotion, and sticky CTA tests pass.

- [ ] **Step 7: Run focused write-safety and flow tests**

```bash
npm run test:slow -- src/features/plan12week/pages/twelve-week-write-safety.test.tsx
npm run test:flows -- src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx
```

Expected: canonical review persistence, local-first save, sync failure safety, and existing field behavior remain green.

- [ ] **Step 8: Commit the hierarchy integration**

```bash
git add src/app/components/twelve-week/TwelveWeekWeekTab.tsx src/app/components/twelve-week/WeeklyReviewForm.tsx src/app/components/twelve-week/WeeklyReviewSummary.tsx src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/app/components/twelve-week/TwelveWeekWeekTab.css
git commit -m "feat: surface weekly review evidence and insights"
```

Do not stage `TwelveWeekWeekTab.css` when it has no content diff.

---

### Task 6: Full Verification, Responsive QA, and PR

**Files:**
- Modify only if evidence reveals a task-scoped defect: focused frontend files and tests from Tasks 1-5.
- Do not modify: `backend/**`, storage schemas, sync DTOs, canonical review mutation.

**Interfaces:**
- Produces: verified branch and PR `feat: add weekly review evidence summary`.

- [ ] **Step 1: Inspect the final diff before broad commands**

```bash
git status --short --branch
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
git diff --check origin/main...HEAD
git diff origin/main...HEAD -- src/features/plan12week/persistence/weeklyReviewMutation.ts backend
```

Expected: no diff for canonical mutation or `backend/`; only the spec, plan, evidence logic/tests, snapshot wiring, Week components/tests, and optional scoped CSS change appear.

- [ ] **Step 2: Run focused evidence and Weekly Review suites**

```bash
npm run test:run -- src/features/plan12week/logic/weeklyReviewEvidence.test.ts src/features/plan12week/logic/executionInsights.test.ts src/app/utils/storage-twelve-week.test.ts
npm run test:ui -- src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx
npm run test:slow -- src/features/plan12week/pages/twelve-week-write-safety.test.tsx
npm run test:flows -- src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx
```

Expected: all focused tests pass with zero failure.

- [ ] **Step 3: Run required repository verification**

Run each command separately and record exact counts:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
```

If `test:ui` or `test:sync` fails, create a detached temporary base worktree at exact `BASE_SHA`, run the exact failing command there, classify baseline versus regression, then remove only that temporary worktree. Never reset, clean, or overwrite either primary checkout or feature worktree.

- [ ] **Step 4: Run desktop and mobile browser QA**

Start the local app in demo mode:

```powershell
$env:VITE_APP_MODE='demo'
npm run dev -- --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174/12-week-system?tab=week` and verify at `1440x900` and `390x844`:

```text
normal seeded week
week 1 comparison omission
no-task state through a temporary browser-localStorage fixture
no-check-in neutral copy
positive and negative previous-week delta fixtures
completed-review read-only state
overdue and carry-over fixture
```

For each viewport, capture a screenshot and check:

```text
review context immediately followed by evidence
insights before the reflection textarea
one grouped evidence container
no duplicate overall completion score
Premium and Emotion below the main reflection/save workflow
no horizontal overflow
all metric labels readable without relying on color
existing sticky CTA remains above bottom navigation
```

Stop the dev server after QA. Do not commit temporary localStorage/browser fixtures or screenshot artifacts unless the repository already tracks that exact artifact class.

- [ ] **Step 5: Final safety scans**

```bash
rg -n "Bạn thiếu động lực|Bạn không đủ kỷ luật|Bạn đang stress|buổi sáng tốt hơn buổi tối" src/app/components/twelve-week src/features/plan12week/logic
rg -n "fetch\(|axios|apiClient|localStorage|getUserData" src/app/components/twelve-week/WeeklyEvidenceSummary.tsx src/app/components/twelve-week/WeeklyEvidenceInsights.tsx src/app/components/twelve-week/WeeklyReviewEvidencePanel.tsx src/features/plan12week/logic/weeklyReviewEvidence.ts
git diff --name-only origin/main...HEAD | rg "^(backend/|src/features/plan12week/persistence/weeklyReviewMutation\.ts$|src/app/utils/storage-types\.ts$)"
```

Expected: no new forbidden inference, network/storage access, backend change, schema change, or canonical mutation change. Existing copy outside the new deterministic insight surface must be evaluated in context rather than mechanically rewritten.

- [ ] **Step 6: Create the final feature commit if verification fixes were needed**

```bash
git add -- src/features/plan12week/logic/weeklyReviewEvidence.ts src/features/plan12week/logic/weeklyReviewEvidence.test.ts src/features/plan12week/logic/executionInsights.ts src/features/plan12week/logic/executionInsights.test.ts src/app/hooks/useTwelveWeekSystemSnapshot.ts src/app/hooks/useTwelveWeekSystemSnapshot.test.tsx src/features/plan12week/pages/12WeekSystem.tsx src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx src/app/components/twelve-week/WeeklyEvidenceSummary.tsx src/app/components/twelve-week/WeeklyEvidenceInsights.tsx src/app/components/twelve-week/WeeklyReviewEvidencePanel.tsx src/app/components/twelve-week/WeeklyReviewEvidencePanel.test.tsx src/app/components/twelve-week/TwelveWeekWeekTab.tsx src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/app/components/twelve-week/WeeklyReviewForm.tsx src/app/components/twelve-week/WeeklyReviewSummary.tsx src/app/components/twelve-week/TwelveWeekWeekTab.css
git commit -m "test: cover weekly review evidence states"
```

Skip this commit when no verification fix changed files.

- [ ] **Step 7: Push and open the PR**

```bash
git push -u origin feat/weekly-review-v2-summary-insights
```

After recording the exact verification results from Step 3, assign the complete PR body to a PowerShell here-string and create the PR without a temporary tracked file:

```powershell
$body = @'
## Problem

Weekly Review asks the user to reflect before clearly summarizing what happened during the week, while deterministic reflection insights are already calculated but not surfaced.

## Product decision

Evidence comes before interpretation.

## Changes

- weekly evidence summary
- core/optional breakdown
- check-in, overdue, carry-over, and trustworthy on-time evidence
- direct task-completion week-over-week comparison
- deterministic insights before reflection
- open/completed review hierarchy alignment

## Data semantics

- completion %: completed unskipped tasks / scheduled unskipped tasks
- core/optional %: same calculation inside each category; empty category is neutral
- previous-week delta: direct task-completion percentage points
- overdue: incomplete reviewed-week task scheduled before local reference date
- carry-over: task moved to a later week from a date in the reviewed week
- check-ins: unique normalized dates inside the reviewed week
- on-time: shown only when every completed task has a valid completion date

## Preserved

- canonical review persistence
- sync and local-first save ordering
- Reflection Journal
- existing review fields and validation
- Premium panel and entitlement behavior
- Emotion Flow, rescue, week rail, and mobile sticky CTA

## Out of scope

- three-question redesign
- confirmed next-week handoff
- automatic rescheduling
- mobile sticky CTA redesign
- AI Coach
- backend, API, schema, or storage changes

## Verification

- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm run test:run` - PASS
- `npm run test:ui` - PASS
- `npm run test:sync` - PASS, or baseline failure documented with exact base reproduction
- `npm run test:ops` - PASS
- `npm run build` - PASS
- Browser QA - PASS at `1440x900` and `390x844`, with scenario notes recorded from Step 4

## Follow-up

> Implement Weekly Review V2 Three Questions + Confirmed Next-Week Handoff.
'@

gh pr create --repo anhnhat432/Vision-Board-Web-Platform --base main --head feat/weekly-review-v2-summary-insights --title "feat: add weekly review evidence summary" --body $body
```

Before invoking `gh pr create`, extend the PASS bullets inside `$body` with the literal file/test counts produced by Step 3 and add any exact baseline-reproduction result. The published body must contain observed evidence rather than expected counts.

- [ ] **Step 8: Verify remote branch and PR checks**

```bash
git rev-parse HEAD
git rev-parse origin/feat/weekly-review-v2-summary-insights
gh pr view --repo anhnhat432/Vision-Board-Web-Platform --json number,title,state,isDraft,mergeable,mergeStateStatus,headRefOid,url
gh pr checks --repo anhnhat432/Vision-Board-Web-Platform --watch --interval 10
```

Expected: local/remote HEAD match, PR title is exact, and all required checks reach a terminal state. Do not merge unless the user explicitly requests merge after reviewing the PR.

---

## Completion Report Contract

Report:

```text
BASE_SHA
branch
worktree
BEFORE hierarchy
AFTER hierarchy
evidence source/helper/semantics/edge cases
insight source/ranking/cap
files changed and responsibility
new tests and scenarios
every verification command with PASS/FAIL and exact counts
desktop/mobile QA scenarios and screenshot paths when retained
baseline failures versus new regressions
remaining risks
deferred: three human questions, confirmed next-week handoff, mobile sticky CTA redesign, AI
PR URL
```

End with exactly:

> Implement Weekly Review V2 Three Questions + Confirmed Next-Week Handoff.
