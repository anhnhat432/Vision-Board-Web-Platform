# 12-Week Execution Loop UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/12-week-system` so Today, Week Review, and Progress form one guided execution loop without changing persisted data or backend behavior.

**Architecture:** Keep route orchestration in `src/features/plan12week/pages/12WeekSystem.tsx`. Make UI-only changes inside the existing tab components: `TwelveWeekTodayTab.tsx`, `TwelveWeekWeekTab.tsx`, and `ProgressSummaryCard.tsx`. Add focused component tests that assert state, test IDs, navigation callbacks, and compact layout behavior instead of brittle full-copy assertions.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Testing Library, Vitest, existing Radix/Lucide UI primitives.

---

## File Structure

- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`
  - Owns the Today next-action panel, same-day check-in saved state, and review-due handoff CTA.
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`
  - Extends existing Today tests with next-action and saved check-in coverage.
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`
  - Owns weekly review flow steps, readiness summary, and mobile sticky CTA spacing.
- Create: `src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx`
  - Adds direct component coverage for review flow/readiness and sticky CTA layout class.
- Modify: `src/app/components/twelve-week/ProgressSummaryCard.tsx`
  - Owns compact 12-week timeline and milestone summary in the Progress summary view.
- Create: `src/app/components/twelve-week/ProgressSummaryCard.test.tsx`
  - Adds direct component coverage for current week, reviewed weeks, milestone weeks, and next-action callbacks.

No changes are planned for localStorage types, migrations, backend sync, billing, auth, or route-level persistence callbacks.

---

### Task 1: Today Next-Action And Check-In State

**Files:**
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`

- [ ] **Step 1: Add failing Today tests**

In `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`, extend the import type line:

```ts
import type { TwelveWeekTaskInstance, TwelveWeekSystem, UniversalDailyCheckIn } from "@/app/utils/storage-types";
```

Add this helper after `makeSystem()`:

```ts
function makeCheckIn(overrides: Partial<UniversalDailyCheckIn> = {}): UniversalDailyCheckIn {
  return {
    date: overrides.date ?? "2026-05-02",
    didWorkToday: overrides.didWorkToday ?? true,
    whichLeadIndicatorWorkedOn: overrides.whichLeadIndicatorWorkedOn ?? "Viet blog",
    amountDone: overrides.amountDone ?? "1 draft",
    outputCreated: overrides.outputCreated ?? "Draft",
    obstacleOrIssue: overrides.obstacleOrIssue ?? "",
    dailySelfRating: overrides.dailySelfRating ?? 4,
    optionalNote: overrides.optionalNote ?? "",
    mood: overrides.mood ?? "steady",
  };
}
```

Add these tests under `describe("TwelveWeekTodayTab - completion nudge & check-in", () => { ... })`:

```ts
it("shows a next-action panel for the open primary task", () => {
  render(<TwelveWeekTodayTab {...makeProps()} />);

  const panel = screen.getByTestId("today-next-action-panel");
  expect(panel).toHaveTextContent("800");
  expect(panel).toHaveAttribute("data-state", "primary-task");
});

it("shows same-day check-in as saved and ignores older check-ins", () => {
  const { rerender } = render(
    <TwelveWeekTodayTab
      {...makeProps({
        latestCheckIn: makeCheckIn({ date: "2026-05-02", mood: "high" }),
      })}
    />,
  );

  expect(screen.getByTestId("today-check-in-saved")).toHaveTextContent("2026");

  rerender(
    <TwelveWeekTodayTab
      {...makeProps({
        latestCheckIn: makeCheckIn({ date: "2026-05-01", mood: "high" }),
      })}
    />,
  );

  expect(screen.queryByTestId("today-check-in-saved")).toBeNull();
});

it("offers a Week handoff from the check-in card when review is due", async () => {
  const onOpenWeekTab = vi.fn();
  render(
    <TwelveWeekTodayTab
      {...makeProps({
        reviewDueToday: true,
        onOpenWeekTab,
        latestCheckIn: makeCheckIn(),
      })}
    />,
  );

  await userEvent.click(screen.getByTestId("today-check-in-open-week"));
  expect(onOpenWeekTab).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run Today tests and confirm failure**

Run:

```bash
npm run test:run -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
```

Expected: FAIL because `today-next-action-panel`, `today-check-in-saved`, and `today-check-in-open-week` are not implemented yet.

- [ ] **Step 3: Implement Today next-action state**

In `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`, update the Lucide import:

```ts
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Crown,
  Gauge,
  Inbox,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
```

Inside `TwelveWeekTodayTab`, after the `handleSaveCheckInClick` function, add:

```ts
  const todayCheckIn = latestCheckIn?.date === todayDateKey ? latestCheckIn : null;
  const hasSavedTodayCheckIn = Boolean(todayCheckIn);
  const nextActionState = (() => {
    if (!hasPlanTasks) {
      return {
        key: "setup-needed",
        title: "Chu kỳ này cần được tạo lại",
        description: hasLeadMetrics
          ? "Kế hoạch có chỉ số lặp lại nhưng chưa có việc để chạy. Mở Setup để tạo lại hàng việc."
          : "Chu kỳ chưa có việc lặp lại. Mở Setup để thêm 2-4 việc cốt lõi trước.",
        actionLabel: hasLeadMetrics ? "Mở Setup để chỉnh" : "Đi tới Setup",
        onAction: onNavigateToSetup,
      };
    }

    if (reviewDueToday && hasSavedTodayCheckIn) {
      return {
        key: "review-due",
        title: "Hôm nay nên chốt review tuần",
        description: "Check-in đã lưu. Mở tab Tuần để khóa lại bài học và ưu tiên tuần sau.",
        actionLabel: "Mở tab Tuần",
        onAction: onOpenWeekTab,
      };
    }

    if (primaryTask) {
      return {
        key: "primary-task",
        title: "Bước tiếp theo: việc ưu tiên số 1",
        description: primaryTask.title,
        actionLabel: "Đánh dấu xong",
        onAction: () => onToggleTask(primaryTask.id, true),
      };
    }

    if (!hasSavedTodayCheckIn && (primaryTaskCompletedToday || todayCompletedCount > 0 || todayQueue.length === 0)) {
      return {
        key: "check-in",
        title: "Chốt ngày hôm nay bằng check-in ngắn",
        description: "Việc chính đã đi qua. Lưu năng lượng và một ghi chú ngắn để ngày mai tiếp tục nhanh hơn.",
        actionLabel: "Lưu check-in",
        onAction: handleSaveCheckInClick,
      };
    }

    if (hasSavedTodayCheckIn) {
      return {
        key: "day-closed",
        title: "Hôm nay đã được chốt",
        description: reviewDueToday
          ? "Bước tiếp theo là mở tab Tuần để review."
          : "Giữ nhịp như vậy. Lần tới quay lại tab Hôm nay để tiếp tục việc mới.",
        actionLabel: reviewDueToday ? "Mở tab Tuần" : "Xem tiến độ",
        onAction: reviewDueToday ? onOpenWeekTab : undefined,
      };
    }

    return {
      key: "clear-day",
      title: reviewDueToday ? "Hôm nay là ngày review" : "Hôm nay đang gọn",
      description: reviewDueToday
        ? "Nếu không còn việc cần làm, mở tab Tuần để chốt review."
        : "Không có việc nào đang chờ. Bạn có thể lưu check-in hoặc xem lại tuần.",
      actionLabel: reviewDueToday ? "Mở tab Tuần" : "Lưu check-in",
      onAction: reviewDueToday ? onOpenWeekTab : handleSaveCheckInClick,
    };
  })();
```

Render the panel immediately after the mobile compact strip:

```tsx
      <div
        data-testid="today-next-action-panel"
        data-state={nextActionState.key}
        className="order-1 rounded-xl border border-slate-200 bg-white/92 p-4 shadow-sm sm:rounded-2xl sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              Bước tiếp theo
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950 sm:text-lg">{nextActionState.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{nextActionState.description}</p>
          </div>
          {nextActionState.onAction ? (
            <Button className="w-full shrink-0 sm:w-auto" onClick={nextActionState.onAction}>
              {nextActionState.actionLabel}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
```

Change the existing primary hero wrapper from `order-1` to `order-2`, and change the existing main grid wrapper from `order-2` to `order-3`. Keep overdue recovery at `order-4`.

- [ ] **Step 4: Implement same-day check-in saved state**

In the check-in card content, before the mood radio group, render:

```tsx
              {todayCheckIn && (
                <div
                  data-testid="today-check-in-saved"
                  className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-semibold">Check-in hôm nay đã lưu</p>
                    <p className="mt-1 leading-6">
                      {formatCalendarDate(todayCheckIn.date)} - năng lượng{" "}
                      {getMoodLabel((todayCheckIn.mood as DailyMood | undefined) ?? "steady")}
                    </p>
                  </div>
                </div>
              )}
```

After the existing save check-in button, render the review handoff button:

```tsx
              {reviewDueToday && onOpenWeekTab && (
                <Button
                  data-testid="today-check-in-open-week"
                  variant="outline"
                  className="w-full bg-white sm:w-auto"
                  onClick={onOpenWeekTab}
                >
                  Mở tab Tuần để review
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
```

- [ ] **Step 5: Run Today tests and confirm pass**

Run:

```bash
npm run test:run -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Today changes**

Run:

```bash
git add src/app/components/twelve-week/TwelveWeekTodayTab.tsx src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
git commit -m "style: guide today execution loop"
```

---

### Task 2: Weekly Review Flow And Mobile CTA Spacing

**Files:**
- Create: `src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`

- [ ] **Step 1: Add failing Week tab tests**

Create `src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TwelveWeekWeekTab } from "./TwelveWeekWeekTab";
import type { ComponentProps } from "react";
import type { TwelveWeekSystem } from "@/app/utils/storage-types";

type WeekTabProps = ComponentProps<typeof TwelveWeekWeekTab>;

function makeSystem(): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship execution UX",
    lagMetric: { name: "Completion", unit: "%", target: "100", currentValue: "25" },
    leadIndicators: [],
    milestones: { week4: "First checkpoint", week8: "Second checkpoint", week12: "Final outcome" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-05-04",
    endDate: "2026-07-26",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 3,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

function makeProps(overrides: Partial<WeekTabProps> = {}): WeekTabProps {
  return {
    system: makeSystem(),
    currentWeekRange: { start: "2026-05-04", end: "2026-05-10" },
    currentPlanFocus: "Ship the command center",
    currentPlanMilestone: "Week 4 checkpoint",
    reviewDueToday: true,
    reviewStatusLabel: "Review due",
    currentScoreValue: 60,
    weekCompletion: { completed: 3, total: 5, percent: 60 },
    currentLagMetricValue: "25%",
    coreIndicators: [],
    optionalIndicators: [],
    currentPlanCode: "FREE",
    hasPremiumInsights: false,
    premiumInsight: {
      headline: "Upgrade insight",
      summary: "Premium summary",
      recommendedAdjustment: "Keep the load stable",
      coachNote: "Protect one priority",
      badgeLabel: "Plus",
    },
    suggestedNextWeekPlan: {
      focus: "Protect the first priority",
      rationale: "The current load is workable.",
      workloadDecision: "keep same",
      protectTactics: ["Deep work"],
      secondaryTrackLabel: "Optional",
      secondaryTrackItems: ["Stretch task"],
      firstMove: "Open Today",
    },
    weeklyForm: {
      lagProgressValue: "",
      biggestOutputThisWeek: "",
      mainObstacle: "",
      keepTactic: "",
      reduceTactic: "",
      nextWeekPriority: "",
      workloadDecision: "",
    },
    onWeeklyFormChange: vi.fn(),
    onApplySuggestedPlan: vi.fn(),
    onOpenPremiumInsights: vi.fn(),
    onSaveWeeklyReview: vi.fn(),
    ...overrides,
  };
}

describe("TwelveWeekWeekTab review flow", () => {
  it("shows three review steps and a readiness summary", () => {
    render(
      <TwelveWeekWeekTab
        {...makeProps({
          weeklyForm: {
            lagProgressValue: "",
            biggestOutputThisWeek: "Shipped a usable Today tab.",
            mainObstacle: "",
            keepTactic: "",
            reduceTactic: "",
            nextWeekPriority: "Keep the core loop simple.",
            workloadDecision: "keep same",
          },
        })}
      />,
    );

    expect(screen.getByTestId("weekly-review-step-result")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-step-load")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-step-priority")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("weekly-review-readiness")).toHaveTextContent("3/3");
  });

  it("keeps optional review fields collapsed by default", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    expect(screen.getByRole("button", { name: /review/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/^2\./i)).toBeNull();
  });

  it("keeps the mobile sticky CTA above the bottom navigation", () => {
    render(<TwelveWeekWeekTab {...makeProps()} />);

    expect(screen.getByTestId("weekly-review-mobile-sticky-cta")).toHaveClass("bottom-20");
  });
});
```

- [ ] **Step 2: Run Week tab tests and confirm failure**

Run:

```bash
npm run test:run -- src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx
```

Expected: FAIL because the direct test file is new and the component does not yet render `weekly-review-flow`, `weekly-review-readiness`, or `weekly-review-mobile-sticky-cta`.

- [ ] **Step 3: Implement review readiness state**

In `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`, after `const [isSavingReview, setIsSavingReview] = useState(false);`, add:

```ts
  const reviewReadinessItems = [
    {
      key: "result",
      label: "Kết quả",
      done: weeklyForm.biggestOutputThisWeek.trim().length > 0,
    },
    {
      key: "load",
      label: "Mức tải",
      done: weeklyForm.workloadDecision.trim().length > 0,
    },
    {
      key: "priority",
      label: "Ưu tiên",
      done: weeklyForm.nextWeekPriority.trim().length > 0,
    },
  ];
  const reviewReadyCount = reviewReadinessItems.filter((item) => item.done).length;
```

Inside the review card `CardContent`, after the review due status box and before `summaryReview`, render:

```tsx
            <div data-testid="weekly-review-flow" className="grid gap-2 sm:grid-cols-3">
              {reviewReadinessItems.map((item, index) => (
                <div
                  key={item.key}
                  data-testid={`weekly-review-step-${item.key}`}
                  data-done={item.done ? "true" : "false"}
                  className={`rounded-lg border px-3 py-3 text-sm ${
                    item.done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {index + 1}. {item.label}
                  </p>
                  <p className="mt-1 font-medium">{item.done ? "Đã có" : "Đang mở"}</p>
                </div>
              ))}
            </div>
```

- [ ] **Step 4: Implement readiness summary above CTA and mobile spacing**

Above the existing review CTA wrapper, render:

```tsx
            <div
              data-testid="weekly-review-readiness"
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">Mức sẵn sàng review</p>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {reviewReadyCount}/3
                </span>
              </div>
              <p className="mt-1 leading-6">
                Chốt kết quả, mức tải và ưu tiên tuần sau trước khi đóng review.
              </p>
            </div>
```

Change the root wrapper:

```tsx
    <div className="space-y-6 pt-4 pb-24 md:pb-0">
```

Change the sticky CTA wrapper:

```tsx
      <div
        data-testid="weekly-review-mobile-sticky-cta"
        className="md:hidden sticky bottom-20 z-40 border-t bg-white/95 p-4 backdrop-blur-sm"
      >
```

- [ ] **Step 5: Run Week tab tests and route flow tests**

Run:

```bash
npm run test:run -- src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx
```

Expected: PASS. Existing route flow tests continue to save weekly reviews and linked reflections.

- [ ] **Step 6: Commit Week changes**

Run:

```bash
git add src/app/components/twelve-week/TwelveWeekWeekTab.tsx src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx
git commit -m "style: streamline weekly review flow"
```

---

### Task 3: Progress Timeline And Milestone Summary

**Files:**
- Create: `src/app/components/twelve-week/ProgressSummaryCard.test.tsx`
- Modify: `src/app/components/twelve-week/ProgressSummaryCard.tsx`

- [ ] **Step 1: Add failing Progress tests**

Create `src/app/components/twelve-week/ProgressSummaryCard.test.tsx`:

```ts
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProgressSummaryCard } from "./ProgressSummaryCard";
import type { TwelveWeekSystem } from "@/app/utils/storage-types";

function makeSystem(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ship execution UX",
    lagMetric: { name: "Completion", unit: "%", target: "100", currentValue: "25" },
    leadIndicators: [],
    milestones: { week4: "First checkpoint", week8: "Second checkpoint", week12: "Final outcome" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-05-04",
    endDate: "2026-07-26",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 5,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [{ id: "task_1", weekNumber: 5, scheduledDate: "2026-06-01", title: "Ship", leadIndicatorName: "Work", isCore: true, completed: false }],
    dailyCheckIns: [],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 80,
        lagProgressValue: "10%",
        biggestOutputThisWeek: "Started",
        mainObstacle: "",
        nextWeekPriority: "Continue",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 7,
        disciplineScore: 7,
        focusScore: 7,
        improvementScore: 7,
        outputQualityScore: 7,
      },
    ],
    scoreboard: [{ weekNumber: 1, leadCompletionPercent: 80, weeklyScore: 72, mainMetricProgress: "10%" }],
    ...overrides,
  };
}

describe("ProgressSummaryCard cycle timeline", () => {
  it("renders a compact cycle timeline with current, reviewed, and milestone weeks", () => {
    render(
      <ProgressSummaryCard
        system={makeSystem()}
        currentWeek={5}
        currentWeekRange={{ start: "2026-06-01", end: "2026-06-07" }}
        currentWeekScoreValue={62}
        averageScore={70}
        reviewDoneCount={1}
        weekCompletion={{ completed: 2, total: 5, percent: 40 }}
      />,
    );

    const timeline = screen.getByTestId("progress-12-week-timeline");
    expect(within(timeline).getByTestId("progress-week-5")).toHaveAttribute("aria-current", "step");
    expect(within(timeline).getByTestId("progress-week-1")).toHaveAttribute("data-reviewed", "true");
    expect(within(timeline).getByTestId("progress-week-4")).toHaveAttribute("data-milestone", "true");
    expect(screen.getByTestId("progress-next-milestone")).toHaveTextContent("8");
  });

  it("routes the progress next action to Week when review is due", async () => {
    const onOpenWeekTab = vi.fn();
    render(
      <ProgressSummaryCard
        system={makeSystem()}
        currentWeek={5}
        currentWeekRange={{ start: "2026-06-01", end: "2026-06-07" }}
        currentWeekScoreValue={62}
        averageScore={70}
        reviewDoneCount={1}
        weekCompletion={{ completed: 2, total: 5, percent: 40 }}
        reviewDueToday
        onOpenWeekTab={onOpenWeekTab}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /tab/i }));
    expect(onOpenWeekTab).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run Progress tests and confirm failure**

Run:

```bash
npm run test:run -- src/app/components/twelve-week/ProgressSummaryCard.test.tsx
```

Expected: FAIL because the timeline and milestone summary are not implemented yet.

- [ ] **Step 3: Implement timeline state**

In `src/app/components/twelve-week/ProgressSummaryCard.tsx`, update the Lucide import:

```ts
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Flag,
  Minus,
  Sparkles,
  Target,
} from "lucide-react";
```

Inside `ProgressSummaryCard`, after `const isEarlyState = trend.level === "early" || trend.level === "no_data";`, add:

```ts
  const reviewedWeeks = new Set(
    system.weeklyReviews.filter((review) => review.reviewCompleted).map((review) => review.weekNumber),
  );
  const milestoneWeeks = new Set([4, 8, 12].filter((weekNumber) => weekNumber <= system.totalWeeks));
  const cycleWeeks = Array.from({ length: system.totalWeeks }, (_, index) => index + 1);
  const nextMilestoneWeek = cycleWeeks.find((weekNumber) => milestoneWeeks.has(weekNumber) && weekNumber >= currentWeek);
  const nextMilestoneLabel = nextMilestoneWeek
    ? `Week ${nextMilestoneWeek}`
    : `Week ${system.totalWeeks}`;
```

- [ ] **Step 4: Render timeline and milestone summary**

After the existing three metric cards grid and before the `onViewFull` button block, render:

```tsx
      <Card interactive={false} className="border border-slate-200/80 bg-white/92 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Target className="h-3.5 w-3.5" />
              Bản đồ chu kỳ
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">Đường chạy 12 tuần</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tuần hiện tại, review đã chốt và các mốc checkpoint được gom lại trong một hàng.
              </p>
            </div>
            <div data-testid="progress-next-milestone" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Mốc tiếp theo: <span className="font-semibold text-slate-950">{nextMilestoneLabel}</span>
            </div>
          </div>

          <div
            data-testid="progress-12-week-timeline"
            className="grid grid-cols-6 gap-2 sm:grid-cols-12"
          >
            {cycleWeeks.map((weekNumber) => {
              const isCurrent = weekNumber === currentWeek;
              const isReviewed = reviewedWeeks.has(weekNumber);
              const isMilestone = milestoneWeeks.has(weekNumber);

              return (
                <div
                  key={weekNumber}
                  data-testid={`progress-week-${weekNumber}`}
                  data-reviewed={isReviewed ? "true" : "false"}
                  data-milestone={isMilestone ? "true" : "false"}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`min-h-14 rounded-lg border px-2 py-2 text-center text-xs ${
                    isCurrent
                      ? "border-slate-950 bg-slate-950 text-white"
                      : isReviewed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : isMilestone
                          ? "border-violet-200 bg-violet-50 text-violet-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <p className="font-semibold">W{weekNumber}</p>
                  <p className="mt-1 flex items-center justify-center gap-1">
                    {isReviewed && <CheckCircle2 className="h-3 w-3" />}
                    {isMilestone ? "M" : isReviewed ? "Xong" : isCurrent ? "Nay" : ""}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {reviewDueToday
              ? "Bước tiếp theo: mở tab Tuần và chốt review trước khi thêm việc mới."
              : "Bước tiếp theo: quay lại Hôm nay và giữ một việc cụ thể trước mắt."}
          </div>
        </CardContent>
      </Card>
```

- [ ] **Step 5: Run Progress tests and route tab test**

Run:

```bash
npm run test:run -- src/app/components/twelve-week/ProgressSummaryCard.test.tsx src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Progress changes**

Run:

```bash
git add src/app/components/twelve-week/ProgressSummaryCard.tsx src/app/components/twelve-week/ProgressSummaryCard.test.tsx
git commit -m "style: map 12-week progress loop"
```

---

### Task 4: Final Verification

**Files:**
- Verify all touched frontend files.

- [ ] **Step 1: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. Existing Vite chunk or dynamic import warnings are acceptable if the build exits with code 0.

- [ ] **Step 5: Inspect git state**

Run:

```bash
git status --short
git log --oneline -4
```

Expected: clean worktree after the task commits, with the three implementation commits visible above the plan/spec commits.

---

## Self-Review Notes

- Spec coverage:
  - Today next-action guidance is covered by Task 1.
  - Same-day check-in saved state and Week handoff are covered by Task 1.
  - Weekly Review flow/readiness and optional details are covered by Task 2.
  - Mobile sticky CTA bottom-nav conflict is covered by Task 2.
  - Progress timeline, reviewed weeks, milestones, and next action are covered by Task 3.
  - Final verification is covered by Task 4.
- Persistence coverage:
  - No task changes storage types, storage keys, migrations, backend sync, billing, or auth.
- Test strategy:
  - Component tests cover the new UI states directly.
  - Existing `twelve-week-flows.e2e.test.tsx` remains the guard for local save and weekly review behavior.
