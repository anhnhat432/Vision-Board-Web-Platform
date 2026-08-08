# Daily Home V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. This repository task forbids subagent execution, so run every step inline in the existing worktree and stop at each review checkpoint.

**Goal:** Turn signed-in `/` into an action-first Daily Home where active-plan users can complete the one scheduled primary task through the canonical local-first mutation contract, then see the next task, truthful week/overdue context, and secondary content below the daily execution surface.

**Architecture:** Add one pure Dashboard daily derivation helper around existing twelve-week storage utilities, then compose a compact context strip, `DailyFocusCard`, preview-only `TodayMiniCard`, and factual `WeeklyPulseCard`. `DashboardContent` owns the canonical completion lock and result handling; presentation components never write storage or call network APIs.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, Lucide, Sonner, Vitest, Testing Library, existing localStorage and 12-week persistence modules.

## Global Constraints

- Base commit is `4712893829c519ccfcdf5c1d6378595a82e3cb29`; canonical completion comes from PR #159.
- Work only in `D:\Projects\Vision Board Web Platform\.worktrees\daily-home-v2` on `feat/daily-home-v2`.
- `/` remains Home; do not add or redirect routes.
- Do not change backend, auth, billing, sync protocol, localStorage schema, migrations, AI, pet logic, dependencies, fonts, or analytics libraries.
- Home completion must call `commitTwelveWeekTaskCompletion()` and must not call `updateGoal`, `toggleTwelveWeekTask`, or `saveUserData` for task completion.
- Local save and queue mutation happen before remote sync; do not fetch plan details or wait for network after completion.
- Home primary task is restricted to open tasks scheduled for the current date. Overdue or unscheduled weekly tasks must not be relabeled as today's task.
- Secondary Home queue is preview-only and excludes the primary task.
- All new behavior follows TDD: write the focused test, run it and observe the expected failure, then write minimal production code.
- Preserve existing public visitor, fresh workspace, active goals, guide/tour, local data notice, billing banners, Dashboard footer, and secondary analytics access.
- Desktop acceptance viewport is `1440x900`; mobile acceptance viewport is `390x844`.

---

## File Structure

### Create

- `src/features/dashboard/helpers/dashboardDailyExecution.ts` - pure Home-specific date/week derivation.
- `src/features/dashboard/helpers/dashboardDailyExecution.test.ts` - scheduled-today and overdue semantics.
- `src/features/dashboard/v2/DailyFocusCard.tsx` - primary task, all-done, no-task, and review-primary states.
- `src/features/dashboard/v2/DailyFocusCard.test.tsx` - component behavior and accessibility.
- `src/features/dashboard/v2/WeeklyPulseCard.tsx` - factual weekly completion, overdue, and review context.
- `src/features/dashboard/v2/WeeklyPulseCard.test.tsx` - no-invented-status and overdue tests.
- `src/features/dashboard/v2/DashboardHero.test.tsx` - compact identity/context contract.
- `src/features/dashboard/v2/TodayMiniCard.test.tsx` - preview-only remaining queue contract.

### Modify

- `src/app/pages/Dashboard.tsx` - canonical completion orchestration and action-first composition.
- `src/app/pages/Dashboard.active-system.test.tsx` - end-to-end Home state and canonical mutation coverage.
- `src/features/dashboard/v2/DashboardHero.tsx` - compact context strip.
- `src/features/dashboard/v2/TodayMiniCard.tsx` - remaining-task preview without duplicate completion.
- `docs/superpowers/specs/2026-08-08-daily-home-v2-design.md` - remove the impossible overdue-primary statement and keep spec aligned with scheduled-today semantics.

### Preserve Unmodified Unless A Failing Test Proves Otherwise

- `src/features/plan12week/persistence/taskCompletionMutation.ts`
- `src/app/hooks/useSyncedUserData.ts`
- `src/app/hooks/useBackendProgressOverlay.ts`
- `src/app/hooks/useTwelveWeekSystemSnapshot.ts`
- `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`
- Backend, auth, billing, sync sender, mutation queue, storage schema, and migration files.

---

### Task 1: Lock Baseline And Add Pure Daily Derivation

**Files:**

- Create: `src/features/dashboard/helpers/dashboardDailyExecution.ts`
- Create: `src/features/dashboard/helpers/dashboardDailyExecution.test.ts`
- Read-only baseline: `src/app/pages/Dashboard.active-system.test.tsx`
- Read-only baseline: `src/features/plan12week/persistence/taskCompletionMutation.test.ts`

**Interfaces:**

- Consumes: `getTwelveWeekTodayTasks`, `getTwelveWeekMissedTasks`, `getTwelveWeekCurrentWeek`, `getTwelveWeekWeekCompletion`, `isTwelveWeekReviewDueToday`.
- Produces:

```ts
export interface DashboardDailyExecutionSnapshot {
  scheduledTodayTasks: TwelveWeekTaskInstance[];
  openScheduledTodayTasks: TwelveWeekTaskInstance[];
  homePrimaryTask: TwelveWeekTaskInstance | null;
  homeSecondaryTasks: TwelveWeekTaskInstance[];
  todayCompletedCount: number;
  todayRemainingCount: number;
  todayTotalCount: number;
  overdueOpenCount: number;
  currentWeek: number;
  weekCompletion: ReturnType<typeof getTwelveWeekWeekCompletion>;
  reviewDueToday: boolean;
  hasReviewedCurrentWeek: boolean;
}

export function buildDashboardDailyExecutionSnapshot(
  system: TwelveWeekSystem,
  referenceDate?: Date,
): DashboardDailyExecutionSnapshot;
```

- [ ] **Step 1: Run the existing focused baseline before adding tests**

Run:

```bash
npm run test:ui -- src/app/pages/Dashboard.active-system.test.tsx src/app/pages/Dashboard.fresh-state.test.tsx src/app/pages/Dashboard.test.tsx
npm run test:run -- src/features/plan12week/persistence/taskCompletionMutation.test.ts
```

Expected: existing Dashboard and canonical completion tests pass. Record exact counts. If a command fails, capture the failure before editing and determine whether it is a baseline blocker.

- [ ] **Step 2: Write the failing pure derivation tests**

Create `src/features/dashboard/helpers/dashboardDailyExecution.test.ts` with deterministic reference date `2026-08-08T10:00:00+07:00`. Include these exact behaviors:

```ts
import { describe, expect, it } from "vitest";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { buildDashboardDailyExecutionSnapshot } from "./dashboardDailyExecution";

const REFERENCE_DATE = new Date("2026-08-08T10:00:00+07:00");

function task(
  id: string,
  title: string,
  scheduledDate: string,
  completed = false,
): TwelveWeekTaskInstance {
  return {
    id,
    weekNumber: 1,
    scheduledDate,
    title,
    leadIndicatorName: "Deep work",
    isCore: true,
    completed,
  };
}

function system(tasks: TwelveWeekTaskInstance[]): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship Daily Home V2",
    lagMetric: { name: "Release", unit: "%", target: "100", currentValue: "25" },
    leadIndicators: [{ name: "Deep work", target: "3", unit: "sessions/week" }],
    milestones: { week4: "Alpha", week8: "Beta", week12: "Release" },
    successEvidence: "Daily action is obvious",
    reviewDay: "Saturday",
    week12Outcome: "Daily Home shipped",
    startDate: "2026-08-03",
    endDate: "2026-10-25",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: tasks,
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

describe("buildDashboardDailyExecutionSnapshot", () => {
  it("uses only open tasks scheduled today for Home primary and secondary work", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([
        task("overdue", "Overdue task", "2026-08-07"),
        task("primary", "Primary today", "2026-08-08"),
        task("secondary", "Secondary today", "2026-08-08"),
        task("future", "Future task", "2026-08-09"),
      ]),
      REFERENCE_DATE,
    );

    expect(snapshot.homePrimaryTask?.id).toBe("primary");
    expect(snapshot.homeSecondaryTasks.map((item) => item.id)).toEqual(["secondary"]);
    expect(snapshot.overdueOpenCount).toBe(1);
  });

  it("does not fallback an unfinished weekly task into Home when today has no scheduled task", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([task("future", "Future task", "2026-08-09")]),
      REFERENCE_DATE,
    );

    expect(snapshot.homePrimaryTask).toBeNull();
    expect(snapshot.todayTotalCount).toBe(0);
  });

  it("separates unfinished-today count from true overdue count", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([
        task("one", "Today one", "2026-08-08"),
        task("two", "Today two", "2026-08-08"),
        task("three", "Today three", "2026-08-08"),
      ]),
      REFERENCE_DATE,
    );

    expect(snapshot.todayRemainingCount).toBe(3);
    expect(snapshot.overdueOpenCount).toBe(0);
  });

  it("removes completed tasks from primary selection and reports all-done counts", () => {
    const snapshot = buildDashboardDailyExecutionSnapshot(
      system([
        task("one", "Today one", "2026-08-08", true),
        task("two", "Today two", "2026-08-08", true),
      ]),
      REFERENCE_DATE,
    );

    expect(snapshot.homePrimaryTask).toBeNull();
    expect(snapshot.todayCompletedCount).toBe(2);
    expect(snapshot.todayTotalCount).toBe(2);
  });
});
```

- [ ] **Step 3: Run the new test and verify RED**

Run:

```bash
npm run test:run -- src/features/dashboard/helpers/dashboardDailyExecution.test.ts
```

Expected: FAIL because `./dashboardDailyExecution` does not exist. A syntax/configuration error is not an acceptable RED; fix the test until the failure is specifically the missing implementation.

- [ ] **Step 4: Implement the minimal pure helper**

Create `src/features/dashboard/helpers/dashboardDailyExecution.ts`:

```ts
import {
  getTwelveWeekCurrentWeek,
  getTwelveWeekMissedTasks,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  isTwelveWeekReviewDueToday,
} from "@/app/utils/storage";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";

export interface DashboardDailyExecutionSnapshot {
  scheduledTodayTasks: TwelveWeekTaskInstance[];
  openScheduledTodayTasks: TwelveWeekTaskInstance[];
  homePrimaryTask: TwelveWeekTaskInstance | null;
  homeSecondaryTasks: TwelveWeekTaskInstance[];
  todayCompletedCount: number;
  todayRemainingCount: number;
  todayTotalCount: number;
  overdueOpenCount: number;
  currentWeek: number;
  weekCompletion: ReturnType<typeof getTwelveWeekWeekCompletion>;
  reviewDueToday: boolean;
  hasReviewedCurrentWeek: boolean;
}

export function buildDashboardDailyExecutionSnapshot(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): DashboardDailyExecutionSnapshot {
  const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
  const scheduledTodayTasks = getTwelveWeekTodayTasks(system, referenceDate);
  const openScheduledTodayTasks = scheduledTodayTasks.filter((task) => !task.completed);
  const todayCompletedCount = scheduledTodayTasks.length - openScheduledTodayTasks.length;
  const missedTasks = getTwelveWeekMissedTasks(system, referenceDate);
  const hasReviewedCurrentWeek =
    system.weeklyReviews.some((review) => review.weekNumber === currentWeek && review.reviewCompleted) ||
    system.scoreboard.some((week) => week.weekNumber === currentWeek && week.reviewDone);

  return {
    scheduledTodayTasks,
    openScheduledTodayTasks,
    homePrimaryTask: openScheduledTodayTasks[0] ?? null,
    homeSecondaryTasks: openScheduledTodayTasks.slice(1),
    todayCompletedCount,
    todayRemainingCount: openScheduledTodayTasks.length,
    todayTotalCount: scheduledTodayTasks.length,
    overdueOpenCount: missedTasks.filter((task) => !task.completed).length,
    currentWeek,
    weekCompletion: getTwelveWeekWeekCompletion(system, currentWeek),
    reviewDueToday: isTwelveWeekReviewDueToday(system, referenceDate),
    hasReviewedCurrentWeek,
  };
}
```

- [ ] **Step 5: Run the helper tests and verify GREEN**

Run:

```bash
npm run test:run -- src/features/dashboard/helpers/dashboardDailyExecution.test.ts
```

Expected: PASS with all four tests green.

- [ ] **Step 6: Commit the pure contract**

```bash
git add src/features/dashboard/helpers/dashboardDailyExecution.ts src/features/dashboard/helpers/dashboardDailyExecution.test.ts
git commit -m "test: define dashboard daily execution state"
```

---

### Task 2: Build The Primary Daily Focus State Machine

**Files:**

- Create: `src/features/dashboard/v2/DailyFocusCard.tsx`
- Create: `src/features/dashboard/v2/DailyFocusCard.test.tsx`

**Interfaces:**

- Consumes:

```ts
interface DailyFocusCardProps {
  task: TwelveWeekTaskInstance | null;
  goalTitle: string;
  completedCount: number;
  totalCount: number;
  reviewDueToday: boolean;
  completing: boolean;
  onComplete: (taskId: string) => void;
}
```

- Produces stable selectors:

```text
dashboard-primary-action-card
dashboard-daily-focus
dashboard-primary-mark-done
dashboard-daily-closure
```

- [ ] **Step 1: Write failing component tests**

Create `src/features/dashboard/v2/DailyFocusCard.test.tsx` with `MemoryRouter` and these assertions:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { DailyFocusCard } from "./DailyFocusCard";

const primaryTask: TwelveWeekTaskInstance = {
  id: "task_primary",
  weekNumber: 1,
  scheduledDate: "2026-08-08",
  title: "Hoàn thành Daily Home V2",
  leadIndicatorName: "Deep work",
  isCore: true,
  completed: false,
};

function renderCard(overrides: Partial<ComponentProps<typeof DailyFocusCard>> = {}) {
  const props: ComponentProps<typeof DailyFocusCard> = {
    task: primaryTask,
    goalTitle: "Ra mắt sản phẩm",
    completedCount: 0,
    totalCount: 2,
    reviewDueToday: false,
    completing: false,
    onComplete: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter>
      <DailyFocusCard {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe("DailyFocusCard", () => {
  it("renders one accessible primary completion action", async () => {
    const user = userEvent.setup();
    const props = renderCard();
    const button = screen.getByRole("button", { name: "Đánh dấu xong: Hoàn thành Daily Home V2" });

    expect(screen.getAllByText("Hoàn thành Daily Home V2")).toHaveLength(1);
    await user.click(button);
    expect(props.onComplete).toHaveBeenCalledWith("task_primary");
  });

  it("disables duplicate interaction while canonical completion is pending", () => {
    renderCard({ completing: true });
    expect(screen.getByTestId("dashboard-primary-mark-done")).toBeDisabled();
    expect(screen.getByTestId("dashboard-primary-mark-done")).toHaveAttribute("aria-busy", "true");
  });

  it("renders closure instead of a completed task hero", () => {
    renderCard({ task: null, completedCount: 2, totalCount: 2 });
    expect(screen.getByTestId("dashboard-daily-closure")).toHaveTextContent("Hôm nay đã hoàn thành 2/2");
    expect(screen.queryByTestId("dashboard-primary-mark-done")).not.toBeInTheDocument();
  });

  it("promotes weekly review only when no daily task remains", () => {
    renderCard({ task: null, completedCount: 2, totalCount: 2, reviewDueToday: true });
    expect(screen.getByRole("link", { name: "Review tuần" })).toHaveAttribute("href", "/12-week-system?tab=week");
  });

  it("renders the true no-schedule state", () => {
    renderCard({ task: null, completedCount: 0, totalCount: 0 });
    expect(screen.getByText("Hôm nay không có việc được lên lịch")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```bash
npm run test:ui -- src/features/dashboard/v2/DailyFocusCard.test.tsx
```

Expected: FAIL because `DailyFocusCard` does not exist.

- [ ] **Step 3: Implement the minimal component**

Create `src/features/dashboard/v2/DailyFocusCard.tsx`:

```tsx
import { CalendarDays, Check, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/app/components/ui/button";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage-types";

interface DailyFocusCardProps {
  task: TwelveWeekTaskInstance | null;
  goalTitle: string;
  completedCount: number;
  totalCount: number;
  reviewDueToday: boolean;
  completing: boolean;
  onComplete: (taskId: string) => void;
}

export function DailyFocusCard({
  task,
  goalTitle,
  completedCount,
  totalCount,
  reviewDueToday,
  completing,
  onComplete,
}: DailyFocusCardProps) {
  if (task) {
    return (
      <section
        data-testid="dashboard-primary-action-card"
        data-tour-id="dashboard-next-card"
        className="relative overflow-hidden rounded-card-lg border border-app-accent/20 bg-app-surface p-5 shadow-app-md sm:p-7"
        aria-labelledby="dashboard-daily-focus-title"
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-app-accent" aria-hidden="true" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
          Việc quan trọng nhất hôm nay
        </p>
        <h2
          id="dashboard-daily-focus-title"
          data-testid="dashboard-daily-focus"
          className="mt-3 max-w-[28ch] break-words font-serif text-2xl font-bold leading-tight text-app-ink sm:text-3xl"
        >
          {task.title}
        </h2>
        <p className="mt-3 text-sm text-app-ink-soft">
          Mục tiêu: <span className="font-semibold text-app-ink">{goalTitle}</span>
        </p>
        <Button
          data-testid="dashboard-primary-mark-done"
          size="lg"
          loading={completing}
          className="mt-6 min-h-11 w-full sm:w-auto"
          aria-label={`Đánh dấu xong: ${task.title}`}
          onClick={() => onComplete(task.id)}
        >
          <Check aria-hidden="true" />
          Đánh dấu xong
        </Button>
      </section>
    );
  }

  const allDone = totalCount > 0 && completedCount >= totalCount;
  const title = allDone ? `Hôm nay đã hoàn thành ${completedCount}/${totalCount}` : "Hôm nay không có việc được lên lịch";
  const description = allDone
    ? "Bạn đã khép lại toàn bộ việc được lên lịch hôm nay."
    : "Giữ ngày trống đúng nghĩa hoặc mở tuần để xem việc sắp tới.";

  return (
    <section
      data-testid="dashboard-primary-action-card"
      data-tour-id="dashboard-next-card"
      className="rounded-card-lg border border-app-accent/20 bg-app-accent-subtle/45 p-5 shadow-app-sm sm:p-7"
      aria-labelledby="dashboard-daily-closure-title"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
        {allDone ? <CheckCircle2 aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
      </span>
      <h2
        id="dashboard-daily-closure-title"
        data-testid="dashboard-daily-closure"
        className="mt-4 font-serif text-2xl font-bold text-app-ink"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-[48ch] text-sm leading-6 text-app-ink-soft">{description}</p>
      <Link
        to="/12-week-system?tab=week"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-control border border-app-line bg-app-surface px-4 py-2 text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
      >
        {reviewDueToday ? "Review tuần" : "Xem tuần này"}
      </Link>
    </section>
  );
}
```

Keep this component free of confetti, sound, pet, reschedule, checkbox, storage, and secondary completion controls.

- [ ] **Step 4: Run component tests and verify GREEN**

Run:

```bash
npm run test:ui -- src/features/dashboard/v2/DailyFocusCard.test.tsx
```

Expected: PASS with five tests green.

- [ ] **Step 5: Commit the focus state machine**

```bash
git add src/features/dashboard/v2/DailyFocusCard.tsx src/features/dashboard/v2/DailyFocusCard.test.tsx
git commit -m "feat: add dashboard daily focus card"
```

---

### Task 3: Compact The Context Strip And Add Factual Weekly Pulse

**Files:**

- Create: `src/features/dashboard/v2/DashboardHero.test.tsx`
- Create: `src/features/dashboard/v2/WeeklyPulseCard.tsx`
- Create: `src/features/dashboard/v2/WeeklyPulseCard.test.tsx`
- Modify: `src/features/dashboard/v2/DashboardHero.tsx`

**Interfaces:**

- `DashboardHero` becomes:

```ts
interface DashboardHeroProps {
  caption: string;
  currentWeek: number | null;
  totalWeeks: number;
  displayName: string;
  lastSavedLabel: string;
}
```

- `WeeklyPulseCard` becomes:

```ts
interface WeeklyPulseCardProps {
  currentWeek: number;
  totalWeeks: number;
  completedCount: number;
  totalCount: number;
  percent: number;
  overdueOpenCount: number;
  reviewDueToday: boolean;
}
```

- [ ] **Step 1: Write RED tests for the compact hero**

Create `DashboardHero.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHero } from "./DashboardHero";

describe("DashboardHero", () => {
  it("renders compact identity and local-save context without motivational competition", () => {
    render(
      <DashboardHero
        caption="THỨ BẢY, 08/08/2026"
        currentWeek={4}
        totalWeeks={12}
        displayName="An"
        lastSavedLabel="vừa xong"
      />,
    );

    expect(screen.getByTestId("dashboard-context-strip")).toHaveTextContent("Chào An");
    expect(screen.getByText("Tuần 4 / 12")).toBeInTheDocument();
    expect(screen.getByText("Đã lưu cục bộ · vừa xong")).toBeInTheDocument();
    expect(screen.queryByText("Mở kế hoạch 12 tuần")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Bảng tầm nhìn")).not.toBeInTheDocument();
  });
});
```

Run:

```bash
npm run test:ui -- src/features/dashboard/v2/DashboardHero.test.tsx
```

Expected: FAIL because the current hero still renders the large goal panel and does not accept `lastSavedLabel`.

- [ ] **Step 2: Replace the large hero with the compact context strip**

Replace `DashboardHero.tsx` with:

```tsx
import { CalendarDays, Save } from "lucide-react";

interface DashboardHeroProps {
  caption: string;
  currentWeek: number | null;
  totalWeeks: number;
  displayName: string;
  lastSavedLabel: string;
}

export function DashboardHero({
  caption,
  currentWeek,
  totalWeeks,
  displayName,
  lastSavedLabel,
}: DashboardHeroProps) {
  return (
    <header
      data-testid="dashboard-context-strip"
      className="flex flex-col gap-4 rounded-card border border-app-line bg-app-surface/85 px-5 py-4 shadow-app-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">{caption}</p>
        <h1 className="mt-1 truncate font-serif text-2xl font-bold text-app-ink">Chào {displayName}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-app-ink-soft">
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-app-accent/20 bg-app-accent-subtle px-3 py-2 text-app-accent">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Tuần {currentWeek ?? "--"} / {totalWeeks}
        </span>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-app-line bg-app-bg-subtle px-3 py-2">
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Đã lưu cục bộ · {lastSavedLabel}
        </span>
      </div>
    </header>
  );
}
```

Run the hero test again and expect PASS.

- [ ] **Step 3: Write RED tests for factual weekly context**

Create `WeeklyPulseCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeeklyPulseCard } from "./WeeklyPulseCard";

describe("WeeklyPulseCard", () => {
  it("shows factual completion without inventing an on-track label", () => {
    render(
      <WeeklyPulseCard
        currentWeek={4}
        totalWeeks={12}
        completedCount={6}
        totalCount={9}
        percent={67}
        overdueOpenCount={0}
        reviewDueToday={false}
      />,
    );

    expect(screen.getByText("6/9 việc")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.queryByText(/Đúng nhịp|Đang chậm|Cần chú ý/)).not.toBeInTheDocument();
    expect(screen.queryByText(/việc đang trễ/)).not.toBeInTheDocument();
  });

  it("shows overdue and review context only from true sources", () => {
    render(
      <WeeklyPulseCard
        currentWeek={4}
        totalWeeks={12}
        completedCount={6}
        totalCount={9}
        percent={67}
        overdueOpenCount={2}
        reviewDueToday
      />,
    );

    expect(screen.getByText("2 việc đang trễ")).toBeInTheDocument();
    expect(screen.getByText("Review tuần đến hạn")).toBeInTheDocument();
  });
});
```

Run:

```bash
npm run test:ui -- src/features/dashboard/v2/WeeklyPulseCard.test.tsx
```

Expected: FAIL because `WeeklyPulseCard` does not exist.

- [ ] **Step 4: Implement `WeeklyPulseCard` minimally**

Create `WeeklyPulseCard.tsx`:

```tsx
import { AlertTriangle, CalendarCheck2 } from "lucide-react";

interface WeeklyPulseCardProps {
  currentWeek: number;
  totalWeeks: number;
  completedCount: number;
  totalCount: number;
  percent: number;
  overdueOpenCount: number;
  reviewDueToday: boolean;
}

export function WeeklyPulseCard({
  currentWeek,
  totalWeeks,
  completedCount,
  totalCount,
  percent,
  overdueOpenCount,
  reviewDueToday,
}: WeeklyPulseCardProps) {
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;

  return (
    <section
      data-tour-id="dashboard-plan-card"
      className="flex h-full flex-col rounded-card-lg border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-6"
      aria-labelledby="dashboard-weekly-pulse-title"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-ink-muted">
        Tuần {currentWeek} / {totalWeeks}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <h2 id="dashboard-weekly-pulse-title" className="font-serif text-xl font-bold text-app-ink">
          Tuần này
        </h2>
        <span className="font-mono text-2xl font-bold tabular-nums text-app-accent">{safePercent}%</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-app-ink-soft">
        {completedCount}/{totalCount} việc
      </p>
      <div
        role="progressbar"
        aria-label={`Tiến độ tuần ${currentWeek}: ${safePercent}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safePercent}
        className="mt-4 h-2 overflow-hidden rounded-full bg-app-accent-soft"
      >
        <div className="h-full rounded-full bg-app-accent" style={{ width: `${safePercent}%` }} />
      </div>
      <div className="mt-5 space-y-2 text-xs font-semibold">
        {overdueOpenCount > 0 ? (
          <p className="flex items-center gap-2 rounded-control border border-app-warm-border bg-app-warm-soft px-3 py-2 text-app-warm-strong">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {overdueOpenCount} việc đang trễ
          </p>
        ) : null}
        {reviewDueToday ? (
          <p className="flex items-center gap-2 rounded-control border border-app-line bg-app-bg-subtle px-3 py-2 text-app-ink-soft">
            <CalendarCheck2 className="h-4 w-4 text-app-accent" aria-hidden="true" />
            Review tuần đến hạn
          </p>
        ) : null}
      </div>
    </section>
  );
}
```

Do not add a review CTA here; review stays below daily execution unless it is promoted by `DailyFocusCard`.

- [ ] **Step 5: Verify both components GREEN**

Run:

```bash
npm run test:ui -- src/features/dashboard/v2/DashboardHero.test.tsx src/features/dashboard/v2/WeeklyPulseCard.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit compact context components**

```bash
git add src/features/dashboard/v2/DashboardHero.tsx src/features/dashboard/v2/DashboardHero.test.tsx src/features/dashboard/v2/WeeklyPulseCard.tsx src/features/dashboard/v2/WeeklyPulseCard.test.tsx
git commit -m "feat: add compact dashboard context"
```

---

### Task 4: Convert Today Mini Card Into A Remaining-Queue Preview

**Files:**

- Create: `src/features/dashboard/v2/TodayMiniCard.test.tsx`
- Modify: `src/features/dashboard/v2/TodayMiniCard.tsx`

**Interfaces:**

Keep the existing public props to minimize Dashboard churn:

```ts
interface TodayMiniCardProps {
  title?: string;
  tasks: TwelveWeekTaskInstance[];
  completedCount: number;
  totalCount: number;
  companion?: ReactNode;
}
```

The caller is responsible for passing only `homeSecondaryTasks`.

- [ ] **Step 1: Write failing preview-only tests**

Create `TodayMiniCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import { TodayMiniCard } from "./TodayMiniCard";

const secondaryTask: TwelveWeekTaskInstance = {
  id: "secondary",
  weekNumber: 1,
  scheduledDate: "2026-08-08",
  title: "Secondary task",
  leadIndicatorName: "Deep work",
  isCore: true,
  completed: false,
};

function renderCard(tasks: TwelveWeekTaskInstance[], completedCount: number, totalCount: number) {
  render(
    <MemoryRouter>
      <TodayMiniCard tasks={tasks} completedCount={completedCount} totalCount={totalCount} />
    </MemoryRouter>,
  );
}

describe("TodayMiniCard", () => {
  it("renders only the preview rows supplied by Dashboard", () => {
    renderCard([secondaryTask], 1, 3);

    expect(screen.getByRole("heading", { name: "Hôm nay" })).toBeInTheDocument();
    expect(screen.getByText("Secondary task")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Secondary task/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở Today workspace" })).toHaveAttribute(
      "href",
      "/12-week-system?tab=today",
    );
  });

  it("renders the no-schedule state", () => {
    renderCard([], 0, 0);
    expect(screen.getByText("Hôm nay không có việc được lên lịch")).toBeInTheDocument();
  });

  it("renders the all-done queue state", () => {
    renderCard([], 2, 2);
    expect(screen.getByText("Không còn việc mở cho hôm nay")).toBeInTheDocument();
  });

  it("explains when only the primary task remains", () => {
    renderCard([], 0, 1);
    expect(screen.getByText("Sau việc ưu tiên này, hôm nay không còn việc nào khác")).toBeInTheDocument();
  });
});
```

Run:

```bash
npm run test:ui -- src/features/dashboard/v2/TodayMiniCard.test.tsx
```

Expected: FAIL on the new copy and link name.

- [ ] **Step 2: Implement the preview-only copy and hierarchy**

Replace `TodayMiniCard.tsx` with:

```tsx
import { ArrowRight, ListChecks, ListTodo } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage";

interface TodayMiniCardProps {
  title?: string;
  tasks: TwelveWeekTaskInstance[];
  completedCount: number;
  totalCount: number;
  companion?: ReactNode;
}

export function TodayMiniCard({
  title = "Hôm nay",
  tasks,
  completedCount,
  totalCount,
  companion,
}: TodayMiniCardProps) {
  const visibleTasks = tasks.slice(0, 3);
  const hiddenTaskCount = Math.max(0, tasks.length - visibleTasks.length);
  const emptyMessage =
    totalCount === 0
      ? "Hôm nay không có việc được lên lịch"
      : completedCount >= totalCount
        ? "Không còn việc mở cho hôm nay"
        : "Sau việc ưu tiên này, hôm nay không còn việc nào khác";

  return (
    <section className="overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-sm" aria-labelledby="dashboard-today-mini-title">
      <div className="flex flex-col gap-3 border-b border-app-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="dashboard-today-mini-title" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-app-accent">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-xs text-app-ink-soft">Các việc còn lại sau ưu tiên đầu tiên.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-app-accent-subtle px-3 py-1 font-mono text-xs font-bold text-app-accent">
            {completedCount}/{totalCount} việc
          </span>
          {companion}
        </div>
      </div>

      <div className="space-y-2.5 px-5 py-4">
        {visibleTasks.length > 0 ? (
          <>
            {visibleTasks.map((task, index) => (
              <div key={task.id} className="flex items-start gap-3 rounded-control border border-app-line bg-app-bg-subtle/50 px-4 py-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-app-accent-soft font-mono text-[11px] font-bold text-app-accent">
                  {index + 2}
                </span>
                <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-5 text-app-ink">{task.title}</p>
              </div>
            ))}
            {hiddenTaskCount > 0 ? (
              <p className="text-xs text-app-ink-muted">+ {hiddenTaskCount} việc khác trong Today workspace</p>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-control border border-dashed border-app-line bg-app-bg-subtle/30 p-5 text-center">
            <ListTodo className="h-5 w-5 text-app-ink-muted" aria-hidden="true" />
            <p className="max-w-[34ch] text-xs font-semibold leading-5 text-app-ink-muted">{emptyMessage}</p>
          </div>
        )}

        <Link
          to="/12-week-system?tab=today"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-app-line px-4 py-2.5 text-xs font-bold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Mở Today workspace
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
```

This preserves the optional pet companion below the primary focus without changing pet logic and removes the exaggerated count animation.

- [ ] **Step 3: Run preview tests and verify GREEN**

Run:

```bash
npm run test:ui -- src/features/dashboard/v2/TodayMiniCard.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit the queue preview**

```bash
git add src/features/dashboard/v2/TodayMiniCard.tsx src/features/dashboard/v2/TodayMiniCard.test.tsx
git commit -m "feat: make dashboard queue preview-only"
```

---

### Task 5: Wire Canonical Completion And Action-First Dashboard Composition

**Files:**

- Modify: `src/app/pages/Dashboard.active-system.test.tsx`
- Modify: `src/app/pages/Dashboard.tsx`

**Interfaces:**

- Dashboard imports:

```ts
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildDashboardDailyExecutionSnapshot } from "@/features/dashboard/helpers/dashboardDailyExecution";
import { DailyFocusCard } from "@/features/dashboard/v2/DailyFocusCard";
import { WeeklyPulseCard } from "@/features/dashboard/v2/WeeklyPulseCard";
import { commitTwelveWeekTaskCompletion } from "@/features/plan12week/persistence/taskCompletionMutation";
```

- `useDashboardDerivedData()` returns:

```ts
localActiveSystem: TwelveWeekSystem | null;
dailyExecution: DashboardDailyExecutionSnapshot | null;
invalidateBackendProgressOverlay: () => void;
```

- `DashboardActiveLayout` receives:

```ts
completingTaskId: string | null;
onCompletePrimaryTask: (taskId: string) => void;
lastSavedLabel: string;
```

- [ ] **Step 1: Expand active-system fixtures before assertions**

In `Dashboard.active-system.test.tsx`:

- Import `userEvent`, `listStoredPendingMutations`, and `USER_DATA_UPDATED_EVENT_NAME`.
- Change `seedActiveDashboard()` to accept task and system overrides and return the goal id.
- Add a `REVIEW_DAYS` array indexed by `new Date().getDay()` for deterministic review-due setup.
- Add route fixtures for `/12-week-system?tab=today`, `/12-week-system?tab=week`, `/goals`, and existing billing/life-balance routes.

Use this fixture shape:

```ts
const REVIEW_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

interface SeedActiveDashboardOptions {
  tasks?: TwelveWeekTaskInstance[];
  reviewDay?: string;
  weeklyReviews?: TwelveWeekSystem["weeklyReviews"];
}

function makeSystem(
  tasks: TwelveWeekTaskInstance[],
  overrides: Partial<TwelveWeekSystem> = {},
): TwelveWeekSystem {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 83);

  const base: TwelveWeekSystem = {
    goalType: "Project Completion",
    vision12Week: "Ship a clearer dashboard.",
    lagMetric: { name: "Portfolio", unit: "%", target: "100", currentValue: "20" },
    leadIndicators: [{ name: "Deep work", target: "5", unit: "sessions/week" }],
    milestones: { week4: "Draft ready", week8: "Portfolio public", week12: "Applications sent" },
    successEvidence: "The user knows what to do today.",
    reviewDay: "Sunday",
    week12Outcome: "Dashboard is clear and actionable.",
    startDate: formatDateInputValue(today),
    endDate: formatDateInputValue(endDate),
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: tasks,
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };

  return { ...base, ...overrides, taskInstances: tasks };
}

function seedActiveDashboard(options: SeedActiveDashboardOptions = {}): string {
  const data = getUserData();
  const goalId = "goal_dashboard_active";
  const tasks = options.tasks ?? [
    makeTask("task_primary", "Finish the dashboard primary card"),
    makeTask("task_done", "Draft the dashboard copy", true),
  ];
  const twelveWeekSystem = makeSystem(tasks, {
    reviewDay: options.reviewDay ?? "Sunday",
    weeklyReviews: options.weeklyReviews ?? [],
  });

  data.goals = [
    {
      id: goalId,
      category: "Career",
      focusArea: "Career",
      title: "Launch a focused dashboard",
      description: "Keep the dashboard focused on today.",
      deadline: "2026-10-31",
      feasibilityResult: "Khả thi",
      readinessScore: 16,
      tasks: [],
      createdAt: "2026-05-08T00:00:00.000Z",
      twelveWeekSystem,
    },
  ];
  data.currentWheelOfLife = [
    { name: "Career", score: 7, color: "#0f172a" },
    { name: "Health", score: 5, color: "#059669" },
  ];
  data.onboardingCompleted = true;
  saveUserData(data);
  return goalId;
}
```

- [ ] **Step 2: Write RED integration tests for hierarchy and canonical completion**

Add these focused tests before production edits:

```tsx
it("puts the primary task before guide, goals, and secondary analytics", async () => {
  seedActiveDashboard();
  renderDashboard();

  const focus = await screen.findByTestId("dashboard-daily-focus");
  const goals = screen.getByRole("heading", { name: "Mục tiêu chu kỳ" });
  const analytics = screen.getByText("Phân tích & nhịp độ");

  expect(focus.compareDocumentPosition(goals)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(focus.compareDocumentPosition(analytics)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

it("completes the primary task through the canonical mutation and advances to the next task", async () => {
  const user = userEvent.setup();
  const goalId = seedActiveDashboard({
    tasks: [
      makeTask("task_a", "Task A"),
      makeTask("task_b", "Task B"),
    ],
  });
  renderDashboard();

  await user.click(await screen.findByRole("button", { name: "Đánh dấu xong: Task A" }));

  expect(await screen.findByText("Task B")).toBeInTheDocument();
  expect(getUserData().goals.find((goal) => goal.id === goalId)?.twelveWeekSystem?.taskInstances[0].completed).toBe(true);
  expect(
    listStoredPendingMutations(null).filter((mutation) => mutation.kind === "task_completed_changed"),
  ).toHaveLength(1);
});

it("does not expose a second completion action or duplicate primary task in the queue", async () => {
  seedActiveDashboard({ tasks: [makeTask("task_a", "Task A"), makeTask("task_b", "Task B")] });
  renderDashboard();

  expect(await screen.findAllByText("Task A")).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: "Đánh dấu xong: Task A" })).toHaveLength(1);
});

it("locks duplicate clicks to one canonical task mutation", async () => {
  const user = userEvent.setup();
  seedActiveDashboard({ tasks: [makeTask("task_a", "Task A")] });
  renderDashboard();

  await user.dblClick(await screen.findByRole("button", { name: "Đánh dấu xong: Task A" }));

  await screen.findByTestId("dashboard-daily-closure");
  expect(
    listStoredPendingMutations(null).filter((mutation) => mutation.kind === "task_completed_changed"),
  ).toHaveLength(1);
});

it("shows closure after the last scheduled task completes", async () => {
  const user = userEvent.setup();
  seedActiveDashboard({ tasks: [makeTask("task_last", "Last task")] });
  renderDashboard();

  await user.click(await screen.findByRole("button", { name: "Đánh dấu xong: Last task" }));
  expect(await screen.findByText("Hôm nay đã hoàn thành 1/1")).toBeInTheDocument();
});
```

- [ ] **Step 3: Write RED tests for empty, overdue, review, and external refresh states**

Add:

```tsx
it("does not treat three unfinished-today tasks as overdue", async () => {
  seedActiveDashboard({
    tasks: [makeTask("one", "One"), makeTask("two", "Two"), makeTask("three", "Three")],
  });
  renderDashboard();

  await screen.findByTestId("dashboard-daily-focus");
  expect(screen.queryByText("3 việc đang trễ")).not.toBeInTheDocument();
});

it("shows true overdue count without promoting an overdue task as today's primary", async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  seedActiveDashboard({
    tasks: [
      { ...makeTask("overdue", "Overdue task"), scheduledDate: formatDateInputValue(yesterday) },
      makeTask("today", "Today task"),
    ],
  });
  renderDashboard();

  expect(await screen.findByText("Today task")).toBeInTheDocument();
  expect(screen.getByText("1 việc đang trễ")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Đánh dấu xong: Overdue task" })).not.toBeInTheDocument();
});

it("renders a true no-schedule state instead of falling back to weekly work", async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  seedActiveDashboard({
    tasks: [{ ...makeTask("future", "Future weekly task"), scheduledDate: formatDateInputValue(tomorrow) }],
  });
  renderDashboard();

  expect(await screen.findByText("Hôm nay không có việc được lên lịch")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Đánh dấu xong: Future weekly task" })).not.toBeInTheDocument();
});

it("keeps review contextual while a task remains and promotes it after daily work closes", async () => {
  const user = userEvent.setup();
  seedActiveDashboard({
    tasks: [makeTask("review_task", "Finish before review")],
    reviewDay: REVIEW_DAYS[new Date().getDay()],
  });
  renderDashboard();

  const taskButton = await screen.findByRole("button", { name: "Đánh dấu xong: Finish before review" });
  expect(screen.getByRole("link", { name: /Mở review/ })).toBeInTheDocument();
  await user.click(taskButton);
  expect(await screen.findByRole("link", { name: "Review tuần" })).toBeInTheDocument();
});

it("refreshes from the shared local truth after an external user-data update event", async () => {
  const goalId = seedActiveDashboard({ tasks: [makeTask("external", "External task")] });
  renderDashboard();
  await screen.findByText("External task");

  const data = getUserData();
  const goal = data.goals.find((item) => item.id === goalId)!;
  goal.twelveWeekSystem!.taskInstances[0] = {
    ...goal.twelveWeekSystem!.taskInstances[0],
    completed: true,
    completedAt: new Date().toISOString(),
    lastModifiedAt: Date.now(),
  };
  saveUserData(data);
  window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));

  expect(await screen.findByText("Hôm nay đã hoàn thành 1/1")).toBeInTheDocument();
});
```

Run all active tests:

```bash
npm run test:ui -- src/app/pages/Dashboard.active-system.test.tsx
```

Expected: FAIL because the action-first components and canonical Dashboard handler are not wired.

- [ ] **Step 4: Replace Dashboard's duplicate daily derivation**

In `useDashboardDerivedData()`:

```ts
const localActiveSystem = visibleActiveTwelveWeekGoal?.twelveWeekSystem ?? null;
const {
  effectiveSystem,
  invalidateOverlay: invalidateBackendProgressOverlay,
} = useBackendProgressOverlay(visibleActiveTwelveWeekGoal?.id ?? null, localActiveSystem);

const dailyExecution = useMemo(
  () => (localActiveSystem ? buildDashboardDailyExecutionSnapshot(localActiveSystem) : null),
  [localActiveSystem],
);
```

Return both `localActiveSystem` and `effectiveSystem`. Daily action derives from `localActiveSystem`, the local-first source of truth; the existing backend overlay may continue serving broader analytics/context until cloud sync applies into local storage. Remove the old `activeSystemTodayOpenTasks`, weekly fallback preview, `todayPreviewUsesToday`, `todayPreviewTitle`, duplicate `hasReviewedCurrentWeek`, and unfinished-today `overdueCount` calculations. Use `dailyExecution` for Dashboard counts, review state, primary/secondary task, week completion, and rescue input.

Pass `dailyExecution?.overdueOpenCount ?? 0` to `evaluateRescueTriggers({ missedTasksCount })`.

- [ ] **Step 5: Add the canonical completion lock and structured result handling**

In `DashboardContent`:

```ts
const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
const completingTaskIdRef = useRef<string | null>(null);

const releaseCompletionLock = useCallback(() => {
  completingTaskIdRef.current = null;
  setCompletingTaskId(null);
}, []);

useEffect(() => {
  if (!completingTaskId) return;
  const task = dashboardData.localActiveSystem?.taskInstances.find((item) => item.id === completingTaskId);
  if (!task || task.completed) releaseCompletionLock();
}, [completingTaskId, dashboardData.localActiveSystem, releaseCompletionLock]);

const handleCompletePrimaryTask = (taskId: string) => {
  if (!visibleActiveTwelveWeekGoal || completingTaskIdRef.current) return;

  completingTaskIdRef.current = taskId;
  setCompletingTaskId(taskId);
  const result = commitTwelveWeekTaskCompletion({
    goalId: visibleActiveTwelveWeekGoal.id,
    taskId,
    completed: true,
  });

  if (result.status === "local_save_failed") {
    releaseCompletionLock();
    toast.error("Không thể cập nhật, vui lòng thử lại");
    return;
  }

  dashboardData.invalidateBackendProgressOverlay();
  onReload();

  if (result.status === "applied") {
    toast.success("Đã chốt việc hôm nay.");
    return;
  }

  if (result.status === "not_found") {
    toast.error("Việc này vừa thay đổi. Trang chính đang cập nhật lại.");
  }
};
```

Keep the lock until `useSyncedUserData` reloads a completed/missing task. Do not call a remote sync method or `refreshBackendProgressOverlay()`.

- [ ] **Step 6: Replace active Dashboard composition**

In `DashboardActiveLayout` render this order:

```tsx
<DashboardHero
  caption={caption}
  currentWeek={data.dailyExecution?.currentWeek ?? data.dashboardKpiCurrentWeek}
  totalWeeks={data.dashboardKpiTotalWeeks}
  displayName={displayName}
  lastSavedLabel={lastSavedLabel}
/>

<DashboardPlanStateNotice
  planLoading={planLoading}
  hasPlan={hasPlan}
  planError={planError}
  onRetry={onRetryPlanLoad}
/>

<div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)] lg:items-stretch">
  <DailyFocusCard
    task={data.dailyExecution?.homePrimaryTask ?? null}
    goalTitle={data.dashboardGoalTitle}
    completedCount={data.dailyExecution?.todayCompletedCount ?? 0}
    totalCount={data.dailyExecution?.todayTotalCount ?? 0}
    reviewDueToday={Boolean(data.dailyExecution?.reviewDueToday)}
    completing={completingTaskId === data.dailyExecution?.homePrimaryTask?.id}
    onComplete={onCompletePrimaryTask}
  />
  <WeeklyPulseCard
    currentWeek={data.dailyExecution?.currentWeek ?? 1}
    totalWeeks={data.dashboardKpiTotalWeeks}
    completedCount={data.dailyExecution?.weekCompletion.completed ?? 0}
    totalCount={data.dailyExecution?.weekCompletion.total ?? 0}
    percent={data.dailyExecution?.weekCompletion.percent ?? 0}
    overdueOpenCount={data.dailyExecution?.overdueOpenCount ?? 0}
    reviewDueToday={Boolean(data.dailyExecution?.reviewDueToday)}
  />
</div>

<TodayMiniCard
  tasks={data.dailyExecution?.homeSecondaryTasks ?? []}
  completedCount={data.dailyExecution?.todayCompletedCount ?? 0}
  totalCount={data.dailyExecution?.todayTotalCount ?? 0}
  companion={<LazyMamCompanion initialEvent={data.dailyExecution?.todayRemainingCount ? "gentleNudge" : "welcomeBack"} />}
/>

{data.dailyExecution?.reviewDueToday && data.dailyExecution.homePrimaryTask ? (
  <ReflectionPrompt currentWeek={data.dailyExecution.currentWeek} reviewHref="/12-week-system?tab=week" />
) : null}

{topTrigger ? (
  <RescueAlert
    trigger={topTrigger}
    ctaLabel={topTrigger.kind === "trial_ending" ? "Mở Plus" : "Xem ngay"}
    onAction={onTriggerAction}
    onDismiss={onTriggerDismiss}
  />
) : null}

<Suspense fallback={null}>
  <NewUserGuideBanner userData={userData} variant="compact" />
</Suspense>

<ActiveGoalsCard goals={data.dashboardActiveGoals} onSelectGoal={onSelectGoal} onAddGoal={onAddGoal} />
```

Place the existing `Collapsible` block from the current `DashboardActiveLayout` immediately after `ActiveGoalsCard` without changing its secondary analytics contents.

Additional cleanup:

- Delete `NextBestAction` because it duplicates the new primary focus.
- Remove the now-unused `ArrowRight`, `Award`, `CheckCircle2`, `Compass`, and `AlertCircle` imports from `Dashboard.tsx` after deleting `NextBestAction`.
- Keep only secondary widget ids (`week_rhythm`, `twelve_week_trend`, `balance`, `daily_stoic`, `quote`) in the analytics registry rendered by Dashboard.
- Keep Active Goals outside analytics but below daily execution.
- Remove the fixed mobile `Mở Today` sticky CTA; the primary completion button and `TodayMiniCard` link remain reachable without a competing fixed action.
- Remove `showMobileStickyCTA` from `useDashboardDerivedData`, `DashboardContent`, the root padding branch, and the fixed mobile JSX so no unused state remains.
- Update `DASHBOARD_TOUR_STEPS`: `dashboard-next-card` describes the primary daily task; `dashboard-plan-card` describes factual weekly context.
- Keep billing/free banners, local-data notice, feedback controls, footer, and public/fresh branching unchanged.

- [ ] **Step 7: Run focused Dashboard and component tests**

Run:

```bash
npm run test:run -- src/features/dashboard/helpers/dashboardDailyExecution.test.ts
npm run test:ui -- src/features/dashboard/v2/DailyFocusCard.test.tsx src/features/dashboard/v2/DashboardHero.test.tsx src/features/dashboard/v2/WeeklyPulseCard.test.tsx src/features/dashboard/v2/TodayMiniCard.test.tsx src/app/pages/Dashboard.active-system.test.tsx src/app/pages/Dashboard.fresh-state.test.tsx src/app/pages/Dashboard.test.tsx
```

Expected: PASS. If a canonical integration assertion fails, fix Dashboard wiring rather than mocking the canonical module.

- [ ] **Step 8: Search for forbidden completion paths and request bursts**

Run:

```bash
rg -n "commitTwelveWeekTaskCompletion|updateGoal|toggleTwelveWeekTask|saveUserData|refreshBackendProgressOverlay|loadPlan|getPlan\(" src/app/pages/Dashboard.tsx src/features/dashboard
```

Expected:

- One Dashboard call site for `commitTwelveWeekTaskCompletion`.
- No Dashboard completion call to `updateGoal`, `toggleTwelveWeekTask`, or `saveUserData`.
- Existing mount-time plan loading may remain; no new completion-time `loadPlan`, `getPlan`, or overlay refresh.

- [ ] **Step 9: Commit Dashboard integration**

```bash
git add src/app/pages/Dashboard.tsx src/app/pages/Dashboard.active-system.test.tsx
git commit -m "feat: make dashboard action-first"
```

---

### Task 6: Align Spec, Run Full Verification, And Capture Visual Proof

**Files:**

- Modify: `docs/superpowers/specs/2026-08-08-daily-home-v2-design.md`
- Verify only: all changed frontend files
- Generated but do not commit unless repository convention requires: screenshots and Playwright artifacts

**Interfaces:**

- Produces final traceability from `DHV2-001` through `DHV2-019` to tests/browser evidence.
- Produces PR-ready command results and desktop/mobile screenshots.

- [ ] **Step 1: Fix the spec wording and self-review docs**

Ensure `DailyFocusCard` does not claim it can show an overdue primary badge. The final statement must be:

```markdown
- Hien task title va goal title; overdue warning nam o weekly pulse vi Home primary chi lay task duoc len lich hom nay.
```

Run:

```bash
rg -n "TBD|TODO|implement later|overdue badge|task that su overdue" docs/superpowers/specs/2026-08-08-daily-home-v2-design.md docs/superpowers/plans/2026-08-08-daily-home-v2.md
git diff --check
```

Expected: no placeholders, no contradictory overdue-primary wording, no whitespace errors.

- [ ] **Step 2: Run required repository verification in order**

Run each command separately and record exit code and test counts:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
```

If `test:sync` or another broad suite fails:

1. Capture the exact failing test and assertion.
2. Check whether the failing file is changed by this branch.
3. If unrelated and plausibly baseline, run the same focused failing command from a temporary clean checkout at `4712893829c519ccfcdf5c1d6378595a82e3cb29` without modifying the active worktree.
4. Do not fix unrelated baseline behavior in this PR.

- [ ] **Step 3: Load the local web-testing instructions before browser QA**

Read `C:\Users\admin\.agents\skills\webapp-testing\SKILL.md` completely. Follow its server startup, browser console, screenshot, and cleanup instructions.

- [ ] **Step 4: Start the local app without changing dependencies**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Use the existing installed `node_modules`. Do not run installers or generate committed assets. If real-mode local auth/env is unavailable, report the exact blocker and use the closest existing signed-in test harness only if it exercises the real Dashboard components without modifying production routing.

- [ ] **Step 5: Perform desktop QA at 1440x900**

Verify and capture screenshots for:

1. Active task: primary title/button above fold; compact context and week pulse visible.
2. Complete first task: task B becomes primary; no full-page reload or duplicate action.
3. Complete all: closure state replaces task hero.
4. No scheduled tasks: true no-schedule copy; weekly task not promoted.
5. Review due: contextual CTA while task remains; primary review after daily closure.
6. True overdue: overdue count visible, unfinished-today count not mislabeled.
7. Secondary content: Active Goals, guide, review handoff, analytics disclosure remain reachable.

Check browser console for React errors, failed requests caused by the change, and accessibility warnings.

- [ ] **Step 6: Perform mobile QA at 390x844**

Repeat active/complete/all-done/no-task/review/overdue checks and verify:

- Primary task and CTA appear near top viewport.
- CTA is at least 44px high and thumb-friendly.
- Task/goal titles wrap without clipping.
- No horizontal overflow.
- No fixed `Mở Today` CTA competes with completion.
- Feedback and mobile navigation do not cover the primary action.
- Secondary disclosure remains operable by keyboard/touch.

- [ ] **Step 7: Review the final diff against scope and spec**

Run:

```bash
git status --short --branch
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
git diff --check origin/main...HEAD
$changedFiles = git diff --name-only origin/main...HEAD
$changedFiles | ForEach-Object { rg -n "backend/|billing|AuthContext|mutationQueueSender|storageVersion" -- $_ }
```

Expected changed source scope is Dashboard, Dashboard v2 components, one Dashboard helper, tests, spec, and plan only. The PowerShell loop is read-only and inspects each literal changed path for accidental out-of-scope references.

- [ ] **Step 8: Commit documentation alignment if it is not already included**

```bash
git add docs/superpowers/specs/2026-08-08-daily-home-v2-design.md docs/superpowers/plans/2026-08-08-daily-home-v2.md
git commit -m "docs: align daily home implementation evidence"
```

If there is no uncommitted documentation change, skip the empty commit.

- [ ] **Step 9: Push and open the draft PR after all gates pass**

Run:

```bash
git push -u origin feat/daily-home-v2
@'
## Problem

Dashboard currently surfaces broad context before the action a returning user needs today.

## Product decision

`/` remains Home and becomes an action-first thin composition over the existing 12-week execution system.

## Changes

- Compact identity and week context
- One primary scheduled-today completion action
- Preview-only remaining queue without duplicate primary task
- Factual weekly progress, overdue semantics, review handoff, and empty states
- Secondary Dashboard content preserved below daily execution

## Canonical completion

Home reuses `commitTwelveWeekTaskCompletion()` and relies on the existing local save, mutation queue, and auto-sync drain.

## Preserved

- 12WeekSystem workspace
- GoalTracker
- local-first behavior and auto sync
- secondary Dashboard modules and fresh-user flows

## Verification

- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm run test:run` - PASS
- `npm run test:ui` - PASS
- `npm run test:sync` - PASS
- `npm run test:ops` - PASS
- `npm run build` - PASS

## Visual proof

- Desktop `1440x900` verified locally
- Mobile `390x844` verified locally

## Out of scope

AI, pet redesign, Weekly Insights, backend changes, auth, billing, sync protocol, and full-app redesign.
'@ | gh pr create --draft --base main --head feat/daily-home-v2 --title "feat: make dashboard a true daily home" --body-file -
```

Run this exact PR command only when every listed command and both visual checks passed. If an accepted baseline failure remains, do not use the static PASS body: issue `gh pr create` interactively with the same sections and paste the exact failing command, assertion, unchanged file evidence, and base-commit reproduction.

---

## Plan Self-Review

- Spec coverage: Tasks 1-5 map scheduled-today derivation, canonical completion, no duplicate, next task, all done, overdue, review, empty states, cross-tab/local refresh, hierarchy, accessibility, performance, and preserved secondary modules.
- Core boundary: only the Dashboard calls the already-merged canonical contract; no storage schema or sync protocol change is planned.
- Type consistency: `DashboardDailyExecutionSnapshot`, `DailyFocusCardProps`, and `WeeklyPulseCardProps` are defined once and consumed with matching fields.
- TDD order: every new helper/component and Dashboard integration behavior has an explicit RED command before production edits.
- Placeholder scan: execution-only values such as actual test counts, screenshot paths, and PR URL are intentionally produced by verification; no implementation behavior is left unspecified.
- Scope check: one frontend vertical slice; no independent subsystem is bundled into this plan.
