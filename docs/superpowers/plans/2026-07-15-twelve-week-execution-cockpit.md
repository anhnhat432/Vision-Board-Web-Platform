# Twelve-Week Execution Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/12-week-system` as a focus-first execution cockpit that shows the active task early, unifies navigation and status, and makes Today, Week, Progress, and Settings visually coherent on desktop and mobile.

**Architecture:** Keep `12WeekSystem.tsx` as the state and handler orchestrator, extract a compact command bar and reusable cycle rail, and refactor each tab's presentation without changing its domain props or persistence handlers. Route-level notices become a single prioritized slot inside the tab shell; app-mode, storage, sync, billing, review, rescue, and destructive-action contracts remain unchanged.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS 4, Radix Tabs/AlertDialog/Select, Lucide icons, Motion, Vitest, Testing Library, Playwright.

## Global Constraints

- Do not add dependencies.
- Do not change routes, query-string tab behavior, localStorage keys, stored shapes, migrations, API contracts, outbox behavior, sync authority, billing authority, or entitlement logic.
- Preserve local-first task completion, check-in, weekly review, rescue, reentry, and destructive-action handlers.
- Demo mode must not call protected sync paths; signed-in real-mode users must retain visible sync state and actionable sync errors.
- Use existing tokens: `--app-bg`, `--app-surface`, `--app-ink`, `--app-accent`, and `--app-highlight`.
- Use `Bricolage Grotesque` only for goal titles and key metrics; use `Be Vietnam Pro` for controls and body copy.
- Mobile body copy must be at least 15px; form controls must be at least 16px; touch targets must be at least 44x44px.
- Keep exactly one page `h1`; tab sections start at `h2`.
- Do not create horizontal body overflow from 360px through 767px.
- Respect `prefers-reduced-motion`; animate only transform and opacity for non-essential transitions.
- Hide both public and signed-in account footers on `/12-week-system`; keep existing legal links in Settings and account navigation.
- Capture and compare 1440x900 and 390x844 screenshots for all four tabs.

---

## File Structure

### Create

- `src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.tsx` — compact goal, cycle, sync, guide, exit, and primary-action header.
- `src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.test.tsx` — command-bar semantics, hierarchy, status, and action tests.
- `src/app/components/twelve-week/TwelveWeekCycleRail.tsx` — reusable 12-week reviewed/current/checkpoint rail.
- `src/app/components/twelve-week/TwelveWeekCycleRail.test.tsx` — rail state, accessible labels, selection, and reduced-motion tests.
- `src/app/components/twelve-week/TwelveWeekSettingsTab.test.tsx` — settings grouping and danger-zone coverage.

### Modify

- `src/features/plan12week/pages/12WeekSystem.tsx` — compose command bar, prioritized notice slot, and wider cockpit shell; remove full core-flow chrome.
- `src/features/plan12week/pages/12WeekSystem/components.tsx` — remove the retired dashboard hero while retaining empty state, goal switcher, notices, and rescue helpers.
- `src/features/plan12week/pages/12WeekSystem/components.test.tsx` — remove old hero assertions or retarget remaining helper tests.
- `src/features/plan12week/pages/12WeekSystem/sync-indicator.test.tsx` — move sync-visibility assertions to the command bar.
- `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.tsx` — render one highest-priority notice.
- `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.test.tsx` — lock priority and one-alert behavior.
- `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx` — sticky equal-width navigation, notice slot, and tab-panel transition.
- `src/app/components/TabErrorBoundary.tsx` — optional secondary action back to Today from a failed non-Today tab.
- `src/app/components/TabErrorBoundary.test.tsx` — retry and secondary-action coverage.
- `src/app/components/twelve-week/TwelveWeekTodayTab.tsx` — primary-task-first hierarchy and 7/5 desktop grid.
- `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx` — hierarchy, heading, status-row, sticky check-in, and preserved behavior.
- `src/app/components/twelve-week/TwelveWeekWeekTab.tsx` — use cycle rail, flatten tactic rows, and retain review CTA behavior.
- `src/app/components/twelve-week/TwelveWeekWeekTab.css` — cockpit rail and responsive week layout; remove decorative-only styling.
- `src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx` — rail, row, review, mobile CTA, and empty-state contracts.
- `src/app/components/twelve-week/WeeklyRail.tsx` — adapt Week's selector to the shared cycle rail.
- `src/app/components/twelve-week/WeeklyHeroBeforeReview.tsx` — flatten the current-week summary and tactic rows.
- `src/app/components/twelve-week/WeeklyReviewSummary.tsx` — apply the same flat tactic treatment after review.
- `src/app/components/twelve-week/TwelveWeekProgressTab.tsx` — narrative, three metrics, cycle rail, and collapsible analytics.
- `src/app/components/twelve-week/TwelveWeekProgressTab.test.tsx` — metric count, heading hierarchy, rail, progressive disclosure, and reduced motion.
- `src/app/components/twelve-week/TwelveWeekSettingsTab.tsx` — three settings groups and flat rows.
- `src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.tsx` — remove nested hero/card decoration while retaining controls and confirmation dialog.
- `src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.test.tsx` — preserve review-day confirmation and control callbacks.
- `src/app/components/root-layout/AppShellLayout.tsx` — suppress route footers on the execution workspace.
- `src/app/components/RootLayout.test.tsx` — verify `/12-week-system` has no footer while Settings retains legal links.
- `e2e/visual-qa.spec.ts` — capture and assert all cockpit tabs at desktop/mobile viewports.
- `docs/superpowers/specs/2026-07-15-twelve-week-execution-cockpit-design.md` — mark implementation status and record any approved deviation after final QA.

---

### Task 1: Add the compact command bar

**Files:**
- Create: `src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.tsx`
- Create: `src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.test.tsx`
- Read: `src/features/plan12week/pages/12WeekSystem/components.tsx:181-385`

**Interfaces:**
- Consumes: `Goal`, `TwelveWeekSystem`, `PricingPlanCode`, the existing `InlineGoalTitleEdit`, and render slots for goal switching and guide control.
- Produces: `TwelveWeekCommandBar` and `TwelveWeekCommandBarProps` for Task 2.

- [ ] **Step 1: Confirm the current visual baseline exists**

Run:

```bash
node scripts/capture-baseline-screenshots.mjs --mode check --screen 12-week-system
```

Expected: exit `0` with baseline present for desktop and mobile. If the repository baseline is missing, run:

```bash
node scripts/capture-baseline-screenshots.mjs --screen 12-week-system
```

Expected: two screenshots saved under `docs/specs/core-flow-ui-upgrade/screenshots/baseline`.

- [ ] **Step 2: Write the failing command-bar tests**

Create `TwelveWeekCommandBar.test.tsx` with focused fixtures and these assertions:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";
import { TwelveWeekCommandBar } from "./TwelveWeekCommandBar";

const system: TwelveWeekSystem = {
  goalType: "Project Completion",
  vision12Week: "Ra mắt portfolio",
  lagMetric: { name: "Đơn chất lượng", unit: "đơn", target: "20", currentValue: "4" },
  leadIndicators: [],
  milestones: { week4: "Draft", week8: "Publish", week12: "Apply" },
  successEvidence: "20 đơn chất lượng",
  reviewDay: "Sunday",
  week12Outcome: "Portfolio live",
  startDate: "2026-05-25",
  endDate: "2026-08-16",
  timezone: "Asia/Ho_Chi_Minh",
  weekStartsOn: "Monday",
  status: "active",
  currentWeek: 8,
  totalWeeks: 12,
  weeklyPlans: [],
  taskInstances: [],
  dailyCheckIns: [],
  weeklyReviews: [],
  scoreboard: [],
};

const goal = {
  id: "goal_1",
  category: "Career",
  title: "Ra mắt portfolio mới và nộp 20 đơn ứng tuyển chất lượng",
  description: "",
  deadline: "2026-08-16",
  tasks: [],
  createdAt: "2026-05-25T00:00:00.000Z",
  twelveWeekSystem: system,
} satisfies Goal;

function renderBar(overrides: Partial<ComponentProps<typeof TwelveWeekCommandBar>> = {}) {
  const props: ComponentProps<typeof TwelveWeekCommandBar> = {
    activeGoal: goal,
    system,
    activePlanCode: "FREE",
    currentWeek: 8,
    syncBadgeClassName: "text-app-accent",
    syncBadgeLabel: "Đã đồng bộ",
    weekCompletion: { completed: 3, total: 5, percent: 60 },
    todayCompletedCount: 1,
    todayRemainingCount: 2,
    reviewDueToday: false,
    onPrimaryAction: vi.fn(),
    onOpenGoals: vi.fn(),
    onExit: vi.fn(),
    onRenameGoal: vi.fn(),
    ...overrides,
  };
  render(<TwelveWeekCommandBar {...props} />);
  return props;
}

describe("TwelveWeekCommandBar", () => {
  it("owns the only page heading and exposes cycle progress", () => {
    renderBar();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ra mắt portfolio");
    expect(screen.getByLabelText("Tiến độ chu kỳ: tuần 8 trên 12")).toBeInTheDocument();
    expect(screen.getByText("60% tuần này")).toBeInTheDocument();
    expect(screen.getByText("1/3 việc hôm nay")).toBeInTheDocument();
  });

  it("keeps sync, exit, guide slot, and primary action reachable", async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    const onPrimaryAction = vi.fn();
    renderBar({
      onExit,
      onPrimaryAction,
      guideControl: <button type="button">Cách dùng</button>,
      goalSwitcher: <button type="button">Đổi mục tiêu</button>,
    });
    const bar = screen.getByTestId("twelve-week-command-bar");
    expect(within(bar).getByRole("status")).toHaveTextContent("Đã đồng bộ");
    expect(within(bar).getByRole("button", { name: "Cách dùng" })).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Đổi mục tiêu" })).toBeInTheDocument();
    await user.click(within(bar).getByRole("button", { name: "Thoát cockpit" }));
    await user.click(within(bar).getByRole("button", { name: "Xem việc hôm nay" }));
    expect(onExit).toHaveBeenCalledOnce();
    expect(onPrimaryAction).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run the new test and verify RED**

Run:

```bash
npx vitest run --config vitest.ui.config.ts src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.test.tsx
```

Expected: FAIL because `./TwelveWeekCommandBar` does not exist.

- [ ] **Step 4: Implement the command-bar interface and semantic skeleton**

Create `TwelveWeekCommandBar.tsx` with this public interface and structure:

```tsx
import type { ReactNode } from "react";
import { ArrowLeft, Target } from "lucide-react";
import { InlineGoalTitleEdit } from "@/app/components/twelve-week/InlineGoalTitleEdit";
import type { Goal, PricingPlanCode, TwelveWeekSystem } from "@/app/utils/storage-types";
import { getPlanLabel } from "@/app/utils/twelve-week-premium";

export interface TwelveWeekCommandBarProps {
  activeGoal: Goal;
  system: TwelveWeekSystem;
  activePlanCode: PricingPlanCode;
  currentWeek: number;
  syncBadgeClassName: string;
  syncBadgeLabel: string;
  weekCompletion: { completed: number; total: number; percent: number };
  todayCompletedCount: number;
  todayRemainingCount: number;
  reviewDueToday: boolean;
  onPrimaryAction: () => void;
  onOpenGoals: () => void;
  onExit: () => void;
  onRenameGoal?: (title: string) => void | Promise<void>;
  goalSwitcher?: ReactNode;
  guideControl?: ReactNode;
}

export function TwelveWeekCommandBar({
  activeGoal,
  system,
  activePlanCode,
  currentWeek,
  syncBadgeClassName,
  syncBadgeLabel,
  weekCompletion,
  todayCompletedCount,
  todayRemainingCount,
  reviewDueToday,
  onPrimaryAction,
  onOpenGoals,
  onExit,
  onRenameGoal,
  goalSwitcher,
  guideControl,
}: TwelveWeekCommandBarProps) {
  const cyclePercent = Math.round((currentWeek / Math.max(1, system.totalWeeks)) * 100);
  const todayTotal = todayCompletedCount + todayRemainingCount;

  return (
    <header
      data-testid="twelve-week-command-bar"
      id="twelve-week-header-card"
      className="rounded-[22px] border border-app-line/70 bg-app-surface px-4 py-4 shadow-app-sm sm:px-6 sm:py-5"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-app-ink-soft">
            <span className="font-mono tabular-nums">Tuần {currentWeek}/{system.totalWeeks}</span>
            <span aria-hidden="true">·</span>
            <span>{cyclePercent}% chu kỳ</span>
            <span aria-hidden="true">·</span>
            <span>Gói {getPlanLabel(activePlanCode)}</span>
          </div>
          <InlineGoalTitleEdit
            title={activeGoal.title}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={1}
            titleClassName="max-w-[34ch] break-words font-serif text-2xl font-bold leading-tight tracking-[-0.02em] text-app-ink sm:text-3xl"
            inputClassName="h-auto rounded-control border border-app-line-strong bg-app-surface px-2 py-1 font-serif text-2xl font-bold text-app-ink sm:text-3xl"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold ${syncBadgeClassName}`} role="status" aria-live="polite">
              {syncBadgeLabel}
            </span>
            {goalSwitcher}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-center">
          <div className="grid grid-cols-3 gap-2" aria-label={`Tiến độ chu kỳ: tuần ${currentWeek} trên ${system.totalWeeks}`}>
            <span className="rounded-control bg-app-bg-subtle px-3 py-2 text-center text-xs font-semibold text-app-ink-soft">
              <strong className="block font-serif text-lg text-app-ink tabular-nums">{currentWeek}/{system.totalWeeks}</strong>
              chu kỳ
            </span>
            <span className="rounded-control bg-app-bg-subtle px-3 py-2 text-center text-xs font-semibold text-app-ink-soft">
              <strong className="block font-serif text-lg text-app-accent tabular-nums">{weekCompletion.percent}%</strong>
              tuần này
            </span>
            <span className="rounded-control bg-app-bg-subtle px-3 py-2 text-center text-xs font-semibold text-app-ink-soft">
              <strong className="block font-serif text-lg text-app-ink tabular-nums">{todayCompletedCount}/{todayTotal}</strong>
              việc hôm nay
            </span>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={onPrimaryAction} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-app-accent px-4 text-sm font-bold text-app-ink-on-accent hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40">
              <Target className="h-4 w-4" aria-hidden="true" />
              {reviewDueToday ? "Review tuần này" : "Xem việc hôm nay"}
            </button>
            <button type="button" onClick={onOpenGoals} className="inline-flex min-h-11 items-center justify-center rounded-control border border-app-line-strong bg-app-surface px-4 text-sm font-semibold text-app-ink hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30">
              Mở mục tiêu
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-app-line pt-3">
        <button type="button" onClick={onExit} aria-label="Thoát cockpit" className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-app-ink-soft hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Thoát
        </button>
        {guideControl}
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Run command-bar tests and verify GREEN**

Run the command from Step 3.

Expected: all tests in `TwelveWeekCommandBar.test.tsx` PASS.

- [ ] **Step 6: Commit the isolated component**

```bash
git add src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.tsx src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.test.tsx
git commit -m "feat(12-week): add execution command bar"
```

---

### Task 2: Integrate the cockpit shell and sticky tab navigation

**Files:**
- Modify: `src/features/plan12week/pages/12WeekSystem.tsx:1-65,1008-1205`
- Modify: `src/features/plan12week/pages/12WeekSystem/components.tsx:181-385`
- Modify: `src/features/plan12week/pages/12WeekSystem/components.test.tsx`
- Modify: `src/features/plan12week/pages/12WeekSystem/sync-indicator.test.tsx`
- Modify: `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx:1-70,331-410`
- Modify: `src/app/components/TabErrorBoundary.tsx`
- Modify: `src/app/components/TabErrorBoundary.test.tsx`

**Interfaces:**
- Consumes: `TwelveWeekCommandBar` from Task 1 and existing `TwelveWeekGoalSwitcher`, `ScreenGuide`, tab props, handlers, and sync label/class.
- Produces: `noticeSlot?: ReactNode` on `TwelveWeekSystemTabsProps`, `secondaryAction?: { label: string; onClick: () => void }` on `TabErrorBoundary`, and the new route shell consumed by later tab tasks.

- [ ] **Step 1: Add failing shell-composition assertions**

In `TwelveWeekCommandBar.test.tsx`, add a mobile-class contract:

```tsx
it("uses a compact responsive surface instead of a full-screen hero", () => {
  renderBar();
  const bar = screen.getByTestId("twelve-week-command-bar");
  expect(bar).toHaveClass("rounded-[22px]", "px-4", "py-4", "sm:px-6", "sm:py-5");
  expect(bar).not.toHaveClass("bg-gradient-to-br", "text-white");
});
```

In `TabErrorBoundary.test.tsx`, add:

```tsx
it("offers a secondary route action without exposing raw error details", async () => {
  const user = userEvent.setup();
  const onBack = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(
    <TabErrorBoundary secondaryAction={{ label: "Quay về Hôm nay", onClick: onBack }}>
      <ThrowingTab message="temporary crash" />
    </TabErrorBoundary>,
  );
  await user.click(screen.getByRole("button", { name: "Quay về Hôm nay" }));
  expect(onBack).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
npx vitest run --config vitest.ui.config.ts src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.test.tsx src/features/plan12week/pages/12WeekSystem/components.test.tsx src/app/components/TabErrorBoundary.test.tsx
```

Expected: FAIL because the shell still renders `CoreFlowProgress`, the old hero, and non-sticky tabs.

- [ ] **Step 3: Replace the route composition**

In `12WeekSystem.tsx`:

- Remove imports of `CoreFlowProgress` and the old `TwelveWeekDashboardHeader`.
- Add `TwelveWeekCommandBar`.
- Keep `ScreenGuide` but pass it as `guideControl`.
- Pass `TwelveWeekGoalSwitcher` as `goalSwitcher`.
- Keep the `TwelveWeekSystemDialogs` element at the top of the route return.
- Delete the separate `CoreFlowProgress`, standalone `ScreenGuide`, old hero, standalone goal switcher, and standalone notices wrapper.
- Insert this command bar immediately after `TwelveWeekSystemDialogs`:

```tsx
<TwelveWeekCommandBar
  activeGoal={activeGoal}
  system={system}
  activePlanCode={activePlanCode}
  currentWeek={currentWeek}
  syncBadgeClassName={syncBadgeClass}
  syncBadgeLabel={syncBadgeLabel}
  reviewDueToday={reviewDueToday}
  todayRemainingCount={todayRemainingCount}
  todayCompletedCount={todayCompletedCount}
  weekCompletion={weekCompletion}
  onPrimaryAction={() => handleTabChange(reviewDueToday ? "week" : "today")}
  onOpenGoals={() => navigate("/goals")}
  onExit={() => navigate("/")}
  onRenameGoal={handleRenameActiveGoal}
  goalSwitcher={
    <TwelveWeekGoalSwitcher allGoals={allGoals} activeGoalId={activeGoal.id} onLoadGoal={loadGoalData} />
  }
  guideControl={<ScreenGuide {...SCREEN_GUIDES.twelveWeekSystem} />}
/>
```

Change the route wrapper class exactly to:

```tsx
className="mx-auto flex w-full max-w-[1180px] min-w-0 flex-col gap-4 px-4 pb-16 pt-4 sm:px-6 lg:px-8"
```

Add this prop to the existing `TwelveWeekSystemTabs` call, using the complete notice props already present on the removed standalone call:

```tsx
noticeSlot={
  <TwelveWeekSystemNotices
    navigate={navigate}
    handleTabChange={handleTabChange}
    setActiveTab={setActiveTab}
    activePlanCode={activePlanCode}
    shouldShowWeeklyReviewBanner={shouldShowWeeklyReviewBanner}
    handleSnoozeWeeklyReview={handleSnoozeWeeklyReview}
    hasIncompletePlanStructure={hasIncompletePlanStructure}
    planHasNoLeadMetrics={planHasNoLeadMetrics}
    planHasNoTasks={planHasNoTasks}
    hasBackendSyncIssue={hasBackendSyncIssue}
    backendSyncIssueMessage={backendSyncIssueMessage}
    isBackendSyncing={isBackendSyncing}
    handleRunOutboxSync={handleRunOutboxSync}
    activeTriggers={activeTriggers}
    dismissedTriggerKind={dismissedTriggerKind}
    setDismissedTriggerKind={setDismissedTriggerKind}
    handleOpenUpgradeDialog={handleOpenUpgradeDialog}
  />
}
```

- [ ] **Step 4: Add the notice slot and sticky equal-width tabs**

Update the tabs interface:

```tsx
import type { ReactNode } from "react";

interface TwelveWeekSystemTabsProps {
  noticeSlot?: ReactNode;
}
```

Append `noticeSlot?: ReactNode` to the real interface without removing any current prop.

Update the navigation and panel wrapper:

```tsx
<nav
  id="twelve-week-tabs-nav"
  className="sticky top-[calc(var(--app-header-height,64px)+0.5rem)] z-30 rounded-[18px] border border-app-line/70 bg-app-bg/[0.92] p-1 shadow-app-sm backdrop-blur-md"
  aria-label="Điều hướng hệ 12 tuần"
>
  <Tabs value={activeTab} onValueChange={handleTabChange}>
    <TabsList aria-label="Điều hướng hệ 12 tuần" className="grid w-full grid-cols-4 gap-1 rounded-[14px] bg-app-surface p-1">
      {TWELVE_WEEK_SECTION_TABS.map(({ value, label, icon: Icon }) => {
        const hasDot = (value === "today" && showTodayDot) || (value === "week" && showWeekDot);
        return (
          <TabsTrigger
            key={value}
            data-tour-id={`twelve-week-tab-${value}`}
            id={`${tabPanelId}-${value}-tab`}
            value={value}
            aria-controls={tabPanelId}
            aria-label={`Mở tab ${label}`}
            className="relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-control px-2 text-xs font-bold text-app-ink-soft data-[state=active]:bg-app-accent data-[state=active]:text-app-ink-on-accent sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
            {hasDot ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-app-status-warning" /> : null}
          </TabsTrigger>
        );
      })}
    </TabsList>
  </Tabs>
</nav>

<div data-testid="twelve-week-notice-slot" className="min-w-0" aria-live="polite">
  {noticeSlot}
</div>
```

Keep the current tab panel and active-tab branches directly after the notice slot. Apply the transition separately to each current branch by adding `className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-reduce:animate-none"` to its top-level wrapper; do not add a second `role="tabpanel"`. Replace `overflow-x-auto` and `w-fit` with the four-column grid. Update the `TWELVE_WEEK_SYSTEM_TOUR_STEPS` overview description from the old large summary card to the compact command bar while retaining all target IDs.

- [ ] **Step 5: Add the optional tab fallback action and skeleton fallback**

Extend the error-boundary props and render the secondary button next to Retry:

```tsx
interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  secondaryAction?: { label: string; onClick: () => void };
}
```

```tsx
<div className="mt-2 flex flex-wrap justify-center gap-2">
  <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
    Thử lại
  </Button>
  {this.props.secondaryAction ? (
    <Button variant="ghost" size="sm" onClick={this.props.secondaryAction.onClick}>
      {this.props.secondaryAction.label}
    </Button>
  ) : null}
</div>
```

For Week, Progress, and Settings boundaries in `TwelveWeekSystemTabs.tsx`, pass:

```tsx
secondaryAction={{ label: "Quay về Hôm nay", onClick: () => setActiveTab("today") }}
```

Replace `TwelveWeekTabFallback`'s spinner card with three `Skeleton` rows and retain the title/description in the status text. Gate any remaining spinner animation with `motion-safe:animate-spin`.

- [ ] **Step 6: Retire the old hero without deleting unrelated helpers**

Remove only `TwelveWeekDashboardHeader`, its private prop interface, and unused imports/helpers from `components.tsx`. Keep `TwelveWeekDashboardState`, `TwelveWeekDashboardNotice`, `TwelveWeekGoalSwitcher`, and `TwelveWeekRescueTriggerBanner`.

Delete old header-only cases from `components.test.tsx`; move sync-visible coverage to `TwelveWeekCommandBar.test.tsx` and preserve any remaining notice/state tests.

- [ ] **Step 7: Run focused tests**

```bash
npx vitest run --config vitest.ui.config.ts src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.test.tsx src/features/plan12week/pages/12WeekSystem/components.test.tsx src/features/plan12week/pages/12WeekSystem/sync-indicator.test.tsx src/app/components/TabErrorBoundary.test.tsx
```

Expected: PASS with no duplicate `h1` from the route shell and no missing sync assertions.

- [ ] **Step 8: Commit the shell integration**

```bash
git add src/features/plan12week/pages/12WeekSystem.tsx src/features/plan12week/pages/12WeekSystem/components.tsx src/features/plan12week/pages/12WeekSystem/components.test.tsx src/features/plan12week/pages/12WeekSystem/sync-indicator.test.tsx src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx src/app/components/TabErrorBoundary.tsx src/app/components/TabErrorBoundary.test.tsx
git commit -m "feat(12-week): integrate execution cockpit shell"
```

---

### Task 3: Prioritize notices and remove workspace footers

**Files:**
- Modify: `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.tsx`
- Modify: `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.test.tsx`
- Modify: `src/app/components/root-layout/AppShellLayout.tsx:1595-1665`
- Modify: `src/app/components/RootLayout.test.tsx`

**Interfaces:**
- Consumes: current notice props and existing notice/rescue components.
- Produces: a single visible notice with priority `sync > review > incomplete plan > rescue/upgrade`; route shell without public/account footer.

- [ ] **Step 1: Replace the old notice-count test with priority tests**

Replace the fixed `renderNotices` helper with:

```tsx
import type { ComponentProps } from "react";

type NoticeProps = ComponentProps<typeof TwelveWeekSystemNotices>;

function makeProps(overrides: Partial<NoticeProps> = {}): NoticeProps {
  return {
    navigate: vi.fn() as unknown as NavigateFunction,
    handleTabChange: vi.fn(),
    setActiveTab: vi.fn(),
    activePlanCode: "FREE",
    shouldShowWeeklyReviewBanner: true,
    handleSnoozeWeeklyReview: vi.fn(),
    hasIncompletePlanStructure: true,
    planHasNoLeadMetrics: true,
    planHasNoTasks: false,
    hasBackendSyncIssue: true,
    backendSyncIssueMessage: "Mất kết nối mạng",
    isBackendSyncing: false,
    handleRunOutboxSync: vi.fn(),
    activeTriggers: [],
    dismissedTriggerKind: null,
    setDismissedTriggerKind: vi.fn(),
    handleOpenUpgradeDialog: vi.fn(),
    ...overrides,
  };
}

function renderNotices(overrides: Partial<NoticeProps> = {}) {
  return render(<TwelveWeekSystemNotices {...makeProps(overrides)} />);
}
```

Add these cases:

```tsx
it("shows only the sync notice when every notice is active", () => {
  renderNotices();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByText("Chưa sao lưu được dữ liệu đám mây")).toBeInTheDocument();
  expect(screen.queryByText("Đến lúc chốt review tuần")).not.toBeInTheDocument();
  expect(screen.queryByText("Chu kỳ chưa đầy đủ cấu trúc")).not.toBeInTheDocument();
});

it("falls through from review to incomplete plan", () => {
  const { rerender } = renderNotices({ hasBackendSyncIssue: false });
  expect(screen.getByText("Đến lúc chốt review tuần")).toBeInTheDocument();
  rerender(
    <TwelveWeekSystemNotices
      {...makeProps({ hasBackendSyncIssue: false, shouldShowWeeklyReviewBanner: false })}
    />,
  );
  expect(screen.getByText("Chu kỳ chưa đầy đủ cấu trúc")).toBeInTheDocument();
});
```

Add a `RootLayout.test.tsx` case using the existing `renderAppShell` helper:

```tsx
it("does not render a footer inside the 12-week execution workspace", async () => {
  renderAppShell("/12-week-system");
  expect(await screen.findByTestId("twelve-week-system-page")).toBeInTheDocument();
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify RED**

```bash
npx vitest run --config vitest.ui.config.ts src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.test.tsx src/app/components/RootLayout.test.tsx
```

Expected: notice test sees three alerts and the route still renders a footer.

- [ ] **Step 3: Implement one-notice priority**

After resolving `activeTrigger`, derive one kind:

```tsx
type VisibleNoticeKind = "sync" | "review" | "plan" | "rescue" | null;

const visibleNoticeKind: VisibleNoticeKind = hasBackendSyncIssue
  ? "sync"
  : shouldShowWeeklyReviewBanner
    ? "review"
    : hasIncompletePlanStructure
      ? "plan"
      : activeTrigger
        ? "rescue"
        : null;
```

Keep the existing JSX for each notice intact and change only its outer condition:

- Review notice: render only when `visibleNoticeKind === "review"`.
- Incomplete-plan notice: render only when `visibleNoticeKind === "plan"`.
- Sync notice: render only when `visibleNoticeKind === "sync"`.
- Rescue/upgrade banner: render only when `visibleNoticeKind === "rescue"`.

Do not change the existing props, children, callbacks, analytics, copy branching, or disabled states inside those branches. Replace `transition-all` with explicit color/opacity/shadow transitions while touching their buttons.

- [ ] **Step 4: Suppress footers only on the execution route**

In `AppShellLayout.tsx`, derive:

```tsx
const isTwelveWeekExecutionWorkspace = location.pathname.startsWith("/12-week-system");
```

Change the footer conditions:

```tsx
{isSignedOutVisitor && !isPublicLanding && !isTwelveWeekExecutionWorkspace ? <AppPublicFooter /> : null}
```

Change the signed-in footer opening condition from `user ? (` to:

```tsx
user && !isTwelveWeekExecutionWorkspace ? (
```

Do not remove the account-menu legal links around the existing Terms and Privacy controls or the Settings legal links.

- [ ] **Step 5: Run tests and verify GREEN**

Run the command from Step 2.

Expected: PASS; the notice surface has at most one alert and `/12-week-system` has no `contentinfo` footer.

- [ ] **Step 6: Commit notice and footer behavior**

```bash
git add src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.tsx src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.test.tsx src/app/components/root-layout/AppShellLayout.tsx src/app/components/RootLayout.test.tsx
git commit -m "feat(12-week): prioritize cockpit notices"
```

---

### Task 4: Make Today primary-task-first

**Files:**
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.tsx:428-1140`
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`

**Interfaces:**
- Consumes: the existing `TwelveWeekTodayTabProps` unchanged.
- Produces: primary task first, compact status row, desktop 7/5 work/check-in grid, and preserved sticky unsaved check-in CTA.

- [ ] **Step 1: Change hierarchy tests to the approved order**

Replace the old status-before-hero assertion with:

```tsx
it("renders the primary action before secondary status and work regions", () => {
  render(<TwelveWeekTodayTab {...makeProps()} />);
  const hero = screen.getByTestId("today-primary-hero");
  const status = screen.getByTestId("today-dashboard-cards");
  const grid = screen.getByTestId("today-main-work-grid");
  expect(hero.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(status.compareDocumentPosition(grid)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

it("uses h2 for the primary task because the command bar owns h1", () => {
  render(<TwelveWeekTodayTab {...makeProps()} />);
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Viết draft 800 từ" })).toBeInTheDocument();
});

it("uses a 7/5 cockpit grid and sticky desktop check-in", () => {
  render(<TwelveWeekTodayTab {...makeProps()} />);
  expect(screen.getByTestId("today-main-work-grid")).toHaveClass(
    "lg:grid-cols-[minmax(0,7fr)_minmax(320px,5fr)]",
  );
  expect(screen.getByTestId("today-check-in-column")).toHaveClass("lg:sticky", "lg:top-28");
});
```

- [ ] **Step 2: Run Today tests and verify RED**

```bash
npx vitest run --config vitest.ui.config.ts src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
```

Expected: order, `h2`, grid, and sticky-column assertions fail.

- [ ] **Step 3: Reorder the current JSX blocks without changing handlers**

Keep the shell opening exactly as:

```tsx
<div
  data-twelve-week-today-shell
  className={`flex min-w-0 flex-col gap-4 sm:gap-[18px] ${
    showMobileStickyCheckIn ? "pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:pb-0" : ""
  }`}
>
```

Cut and paste complete current JSX blocks in this exact document order:

1. The block carrying `data-testid="today-primary-hero"`; when no primary task exists, place the complete `data-testid="today-next-action-panel"` branch in the same position.
2. `reviewDuePrompt`.
3. The complete block carrying `data-testid="today-dashboard-cards"`.
4. The complete block carrying `data-testid="today-main-work-grid"`.
5. The current mobile sticky check-in branch.

Change the work-grid opening tag to:

```tsx
<div
  data-testid="today-main-work-grid"
  className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(320px,5fr)] lg:items-start"
>
```

Add this attribute/class pair to the current wrapper that directly contains the check-in card:

```tsx
data-testid="today-check-in-column"
className="min-w-0 lg:sticky lg:top-28"
```

Change the primary task title tag only:

```tsx
<h2 className="font-serif text-[19px] font-bold leading-snug tracking-tight text-app-ink sm:text-2xl">
  {firstPriorityTask.title}
</h2>
```

Keep `today-primary-hero`, `today-dashboard-cards`, `today-main-work-grid`, current check-in test IDs, optimistic completion, celebration, haptic, sound, reschedule, skip, review, and sticky-save handlers unchanged. Flatten task rows by removing their outer shadow classes and retaining the existing border plus a subtle `hover:bg-app-bg-subtle/60` state.

- [ ] **Step 4: Normalize touched typography and transitions**

In touched Today blocks:

```tsx
// Utility labels
className="text-xs font-bold uppercase tracking-[0.12em]"

// Body/helper copy
className="text-[15px] leading-relaxed text-app-ink-soft"

// Form controls on mobile
className="text-base sm:text-sm"

// Interactive transitions
className="transition-[background-color,color,box-shadow,transform] duration-200"
```

Do not mechanically change untouched compact metadata that already passes contrast and is not user-critical.

- [ ] **Step 5: Run Today tests and verify GREEN**

Run the command from Step 2.

Expected: all existing behavior tests and the new layout tests PASS.

- [ ] **Step 6: Commit Today redesign**

```bash
git add src/app/components/twelve-week/TwelveWeekTodayTab.tsx src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
git commit -m "feat(12-week): focus the Today cockpit"
```

---

### Task 5: Add the reusable cycle rail and simplify Week

**Files:**
- Create: `src/app/components/twelve-week/TwelveWeekCycleRail.tsx`
- Create: `src/app/components/twelve-week/TwelveWeekCycleRail.test.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.css`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx`
- Modify: `src/app/components/twelve-week/WeeklyRail.tsx`
- Modify: `src/app/components/twelve-week/WeeklyHeroBeforeReview.tsx`
- Modify: `src/app/components/twelve-week/WeeklyReviewSummary.tsx`

**Interfaces:**
- Produces: `CycleRailWeek`, `buildCycleRailWeeks`, and `TwelveWeekCycleRail` for Week and Progress.
- `TwelveWeekCycleRailProps`: `{ weeks, selectedWeek?, onSelectWeek?, label, compact? }`.

- [ ] **Step 1: Write cycle-rail tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildCycleRailWeeks, TwelveWeekCycleRail } from "./TwelveWeekCycleRail";

describe("TwelveWeekCycleRail", () => {
  it("builds reviewed, current, checkpoint, and upcoming states", () => {
    const weeks = buildCycleRailWeeks({
      totalWeeks: 12,
      currentWeek: 5,
      reviewedWeeks: [1, 2, 3],
      scoreByWeek: { 1: 80, 2: 70, 3: 90, 5: 40 },
      checkpoints: [4, 8, 12],
    });
    expect(weeks[0]).toMatchObject({ weekNumber: 1, state: "reviewed", score: 80 });
    expect(weeks[3]).toMatchObject({ weekNumber: 4, checkpoint: true });
    expect(weeks[4]).toMatchObject({ weekNumber: 5, state: "current", score: 40 });
    expect(weeks[5]).toMatchObject({ weekNumber: 6, state: "upcoming" });
  });

  it("announces state and selects a week", async () => {
    const user = userEvent.setup();
    const onSelectWeek = vi.fn();
    const weeks = buildCycleRailWeeks({
      totalWeeks: 3,
      currentWeek: 2,
      reviewedWeeks: [1],
      scoreByWeek: { 1: 80, 2: 50 },
      checkpoints: [],
    });
    render(
      <TwelveWeekCycleRail
        weeks={weeks}
        selectedWeek={2}
        onSelectWeek={onSelectWeek}
        label="Nhịp độ chu kỳ 12 tuần"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Tuần 1, đã chốt review, 80%" }));
    expect(onSelectWeek).toHaveBeenCalledWith(1);
    expect(screen.getByRole("button", { name: "Tuần 2, tuần hiện tại, 50%" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});
```

- [ ] **Step 2: Run rail tests and verify RED**

```bash
npx vitest run --config vitest.ui.config.ts src/app/components/twelve-week/TwelveWeekCycleRail.test.tsx
```

Expected: FAIL because the rail module does not exist.

- [ ] **Step 3: Implement the rail contract**

```tsx
export interface CycleRailWeek {
  weekNumber: number;
  state: "reviewed" | "current" | "upcoming";
  score: number | null;
  checkpoint: boolean;
}

export function buildCycleRailWeeks(input: {
  totalWeeks: number;
  currentWeek: number;
  reviewedWeeks: number[];
  scoreByWeek: Record<number, number>;
  checkpoints: number[];
}): CycleRailWeek[] {
  const reviewed = new Set(input.reviewedWeeks);
  const checkpoints = new Set(input.checkpoints);
  return Array.from({ length: input.totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    return {
      weekNumber,
      state: weekNumber === input.currentWeek
        ? "current"
        : reviewed.has(weekNumber)
          ? "reviewed"
          : "upcoming",
      score: input.scoreByWeek[weekNumber] ?? null,
      checkpoint: checkpoints.has(weekNumber),
    };
  });
}

export function TwelveWeekCycleRail({
  weeks,
  selectedWeek,
  onSelectWeek,
  label,
  compact = false,
}: {
  weeks: CycleRailWeek[];
  selectedWeek?: number;
  onSelectWeek?: (weekNumber: number) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <section aria-label={label} data-testid="twelve-week-cycle-rail" className="min-w-0 overflow-x-auto overscroll-x-contain pb-2">
      <ol className="grid min-w-[680px] grid-cols-12 gap-2 p-0">
        {weeks.map((week) => {
          const stateLabel = week.state === "reviewed" ? "đã chốt review" : week.state === "current" ? "tuần hiện tại" : "sắp tới";
          const scoreLabel = week.score === null ? "" : `, ${week.score}%`;
          const checkpointLabel = week.checkpoint ? ", checkpoint" : "";
          const labelText = `Tuần ${week.weekNumber}, ${stateLabel}${checkpointLabel}${scoreLabel}`;
          const className = week.state === "current"
            ? "border-app-accent bg-app-accent text-app-ink-on-accent"
            : week.state === "reviewed"
              ? "border-app-accent/40 bg-app-accent-soft text-app-accent"
              : "border-app-line-strong bg-app-surface text-app-ink-soft";
          const content = (
            <>
              <span className="font-mono text-sm font-bold tabular-nums">{week.weekNumber}</span>
              {!compact && week.score !== null ? <span className="text-xs tabular-nums">{week.score}%</span> : null}
              {week.checkpoint ? <span className="sr-only">checkpoint</span> : null}
            </>
          );
          return (
            <li key={week.weekNumber} className="min-w-0 list-none">
              {onSelectWeek ? (
                <button
                  type="button"
                  aria-label={labelText}
                  aria-current={week.state === "current" ? "step" : undefined}
                  data-selected={selectedWeek === week.weekNumber || undefined}
                  onClick={() => onSelectWeek(week.weekNumber)}
                  className={`flex min-h-11 w-full flex-col items-center justify-center rounded-control border px-2 transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.98] ${className}`}
                >
                  {content}
                </button>
              ) : (
                <div role="listitem" aria-label={labelText} aria-current={week.state === "current" ? "step" : undefined} className={`flex min-h-11 flex-col items-center justify-center rounded-control border px-2 ${className}`}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Run rail tests and verify GREEN**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Adapt `WeeklyRail` to the shared rail**

Replace `WeeklyRail.tsx` with a thin adapter that preserves its current prop interface:

```tsx
import { buildCycleRailWeeks, TwelveWeekCycleRail } from "./TwelveWeekCycleRail";

interface WeeklyRailProps {
  totalWeeks: number;
  currentWeek: number;
  selectedWeek: number;
  reviews: Array<{ weekNumber: number; reviewCompleted?: boolean }>;
  getCompletion: (weekNo: number) => { completed: number; total: number; percent: number; isEmpty: boolean };
  onSelectWeek: (weekNo: number) => void;
}

export function WeeklyRail({
  totalWeeks,
  currentWeek,
  selectedWeek,
  reviews,
  getCompletion,
  onSelectWeek,
}: WeeklyRailProps) {
  const weeks = buildCycleRailWeeks({
    totalWeeks,
    currentWeek,
    reviewedWeeks: reviews.filter((review) => review.reviewCompleted).map((review) => review.weekNumber),
    scoreByWeek: Object.fromEntries(
      Array.from({ length: totalWeeks }, (_, index) => index + 1).map((weekNumber) => [
        weekNumber,
        getCompletion(weekNumber).percent,
      ]),
    ),
    checkpoints: [4, 8, 12].filter((weekNumber) => weekNumber <= totalWeeks),
  });

  return (
    <div data-testid="weekly-week-selector" className="rounded-card border border-app-line bg-app-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-app-ink">Nhịp độ chu kỳ 12 tuần</h2>
        <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent">
          Tuần {currentWeek}
        </span>
      </div>
      <TwelveWeekCycleRail
        weeks={weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={onSelectWeek}
        label="Nhịp độ chu kỳ 12 tuần"
      />
    </div>
  );
}
```

Keep the `WeeklyRail` call in `TwelveWeekWeekTab.tsx` unchanged. Keep `data-testid="weekly-review-shell"`, weekly review readiness, early-review confirmation, and mobile sticky CTA behavior unchanged.

- [ ] **Step 6: Flatten the pre-review tactic list**

In `WeeklyHeroBeforeReview.tsx`, remove the decorative pin, washi tape, radial glow, card-lift classes, and two-column tactic card grid. Replace the tactic container and map with:

```tsx
<div className="rounded-card border border-app-line bg-app-surface">
  <div className="flex items-center justify-between border-b border-app-line px-4 py-4 sm:px-5">
    <h3 className="text-lg font-bold text-app-ink">Hành động cam kết</h3>
    <span className="text-sm font-semibold text-app-accent">{mergedIndicators.length} việc</span>
  </div>
  {mergedIndicators.length === 0 ? (
    <p className="px-4 py-8 text-center text-[15px] leading-relaxed text-app-ink-soft">
      Chưa có hành động cam kết nào cho tuần này.
    </p>
  ) : (
    <div data-testid="weekly-tactics-list" className="divide-y divide-app-line">
      {mergedIndicators.map((indicator) => {
        const { total, completed, percent, status } = getTacticProgress(indicator);
        const statusInfo = tacticStatusStyle(status);
        return (
          <div
            key={indicator.id || indicator.name}
            className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5"
          >
            <div className="min-w-0">
              <p className="break-words text-[15px] font-semibold text-app-ink">{indicator.name}</p>
              <p className="mt-1 text-sm text-app-ink-soft">
                {completed}/{total || indicator.target || 1} {indicator.unit || "lần"}
              </p>
            </div>
            <span className="text-sm font-semibold text-app-ink-soft">
              {indicator.isCore ? "Cốt lõi" : "Tùy chọn"}
            </span>
            <span className={`text-sm font-bold ${statusInfo.badge}`}>
              <span className="font-mono tabular-nums">{percent}%</span> · {statusInfo.label}
            </span>
          </div>
        );
      })}
    </div>
  )}
</div>
```

Keep the current score calculation, empty-week copy, focus, milestone, date range, and early-review callback. Use the same `divide-y` row treatment for the tactic section in `WeeklyReviewSummary.tsx`, retaining `data-testid="weekly-review-summary"`, summary copy, commitments, next-week recommendation, and edit callback.

- [ ] **Step 7: Update Week tests**

Add assertions:

```tsx
expect(screen.getByTestId("twelve-week-cycle-rail")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /Tuần 8, tuần hiện tại/i })).toHaveAttribute("aria-current", "step");
expect(screen.getByTestId("weekly-tactics-list")).toHaveClass("divide-y", "divide-app-line");
```

Retain all existing tests for empty week, WAM fields, future-week blocking, early confirmation, commitment classification, review summary, and sticky mobile CTA.

- [ ] **Step 8: Run Week and rail tests**

```bash
npx vitest run --config vitest.ui.config.ts src/app/components/twelve-week/TwelveWeekCycleRail.test.tsx src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit Week redesign**

```bash
git add src/app/components/twelve-week/TwelveWeekCycleRail.tsx src/app/components/twelve-week/TwelveWeekCycleRail.test.tsx src/app/components/twelve-week/TwelveWeekWeekTab.tsx src/app/components/twelve-week/TwelveWeekWeekTab.css src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx src/app/components/twelve-week/WeeklyRail.tsx src/app/components/twelve-week/WeeklyHeroBeforeReview.tsx src/app/components/twelve-week/WeeklyReviewSummary.tsx
git commit -m "feat(12-week): simplify the Week cockpit"
```

---

### Task 6: Rebuild Progress around narrative, three metrics, and disclosure

**Files:**
- Modify: `src/app/components/twelve-week/TwelveWeekProgressTab.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekProgressTab.test.tsx`
- Consume: `src/app/components/twelve-week/TwelveWeekCycleRail.tsx`

**Interfaces:**
- Consumes: existing `TwelveWeekProgressTabProps`, `getProgressNextActionSuggestion`, and `TwelveWeekCycleRail`.
- Produces: one narrative `h2`, exactly three top metrics, one cycle rail, and collapsible advanced analytics.

- [ ] **Step 1: Write failing Progress hierarchy tests**

Add `import userEvent from "@testing-library/user-event";` to `TwelveWeekProgressTab.test.tsx`, then add:

```tsx
it("renders one narrative h2 and no nested page h1", () => {
  render(<TwelveWeekProgressTab {...makeProps()} />);
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/nhịp|tuần/i);
});

it("shows exactly three primary metrics and the shared cycle rail", () => {
  render(<TwelveWeekProgressTab {...makeProps()} />);
  expect(screen.getAllByTestId("progress-primary-metric")).toHaveLength(3);
  expect(screen.getByTestId("twelve-week-cycle-rail")).toBeInTheDocument();
});

it("keeps advanced analytics collapsed until requested", async () => {
  const user = userEvent.setup();
  render(
    <TwelveWeekProgressTab
      {...makeProps({
        executionHeatmap: [{ weekNumber: 1, dayOfWeek: 0, dateKey: "2026-05-04", total: 2, completed: 1, percent: 50 }],
      })}
    />,
  );
  expect(screen.queryByRole("button", { name: "2026-05-04: hoàn thành 1 trên 2 việc" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Mở phân tích nâng cao" }));
  expect(screen.getByRole("button", { name: "2026-05-04: hoàn thành 1 trên 2 việc" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run Progress tests and verify RED**

```bash
npx vitest run --config vitest.ui.config.ts src/app/components/twelve-week/TwelveWeekProgressTab.test.tsx
```

Expected: current `h1`, four-card grid, and always-visible analytics fail the new tests.

- [ ] **Step 3: Replace the top hero and four-card grid**

Use this structure while preserving existing derived values and callbacks:

Add imports:

```tsx
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { buildCycleRailWeeks, TwelveWeekCycleRail } from "./TwelveWeekCycleRail";
```

Add before the component return:

```tsx
const cycleRailWeeks = buildCycleRailWeeks({
  totalWeeks: system.totalWeeks,
  currentWeek,
  reviewedWeeks: system.weeklyReviews
    .filter((review) => review.reviewCompleted)
    .map((review) => review.weekNumber),
  scoreByWeek: Object.fromEntries(
    system.scoreboard.map((week) => [week.weekNumber, week.leadCompletionPercent]),
  ),
  checkpoints: [4, 8, 12].filter((weekNumber) => weekNumber <= system.totalWeeks),
});
```

Add this file-local component above `TwelveWeekProgressTab`:

```tsx
function ProgressMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article data-testid="progress-primary-metric" className="rounded-control border border-app-line bg-app-surface p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-ink-muted">{label}</p>
      <p className="mt-3 font-serif text-2xl font-bold text-app-ink tabular-nums">{value}</p>
      <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">{detail}</p>
    </article>
  );
}
```

```tsx
<div className="min-w-0 space-y-5 pt-1">
  <section className="grid min-w-0 gap-4 rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm md:grid-cols-[minmax(0,1fr)_280px] md:items-end sm:p-6">
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-accent">Trạng thái nhịp tuần này</p>
      <h2 className="mt-2 max-w-[24ch] font-serif text-2xl font-bold leading-tight text-app-ink sm:text-3xl">
        {trend.headline}
      </h2>
      <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-app-ink-soft">{trend.advice}</p>
    </div>
    {nextActionHandler ? (
      <div className="rounded-control bg-app-bg-subtle p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-ink-muted">Tiếp theo nên làm</p>
        <p className="mt-2 text-[15px] font-semibold text-app-ink">{nextActionSuggestion.label}</p>
        <Button onClick={nextActionHandler} className="mt-3 min-h-11 w-full bg-app-accent text-white hover:bg-app-accent-hover">
          {nextActionSuggestion.buttonLabel}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    ) : null}
  </section>

  <section aria-label="Ba chỉ số chính" className="grid gap-3 sm:grid-cols-3">
    <ProgressMetric
      label="Tuần đang chạy"
      value={`Tuần ${currentWeek}`}
      detail={
        currentWeekRange
          ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
          : "Đang cập nhật phạm vi tuần"
      }
    />
    <ProgressMetric label="Chỉ số cam kết" value={`${averageLeadScore}%`} detail={`Trung bình chu kỳ ${averageScore}%`} />
    <ProgressMetric label="Review đã khóa" value={`${reviewDoneCount}/${system.totalWeeks}`} detail={`${weekCompletion.completed}/${weekCompletion.total} việc tuần này`} />
  </section>

  <TwelveWeekCycleRail weeks={cycleRailWeeks} label="Đường chạy 12 tuần" />
</div>
```

Define a file-local `ProgressMetric` that renders `data-testid="progress-primary-metric"`, uses no shadow, and accepts `{ label: string; value: string; detail: string }`.

- [ ] **Step 4: Add progressive disclosure for analytics**

Import `Collapsible`, `CollapsibleContent`, and `CollapsibleTrigger` from `../ui/collapsible`. Add:

```tsx
const [advancedOpen, setAdvancedOpen] = useState(false);
```

Render the trigger immediately before the current heatmap/trend/tactic-breakdown blocks:

```tsx
<Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="outline" className="min-h-11 w-full justify-between">
      {advancedOpen ? "Đóng phân tích nâng cao" : "Mở phân tích nâng cao"}
      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`} aria-hidden="true" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-4 space-y-5" />
</Collapsible>
```

Replace the self-closing `CollapsibleContent` in the snippet with an opening and closing pair around the complete current JSX blocks whose headings are `Bản đồ thực thi`, `Xu hướng thực thi theo tuần`, and `Phân tích theo việc lặp lại`. Do not move the scoreboard or milestone summary into the advanced section. Remove PaperPin, WashiTape, glow circles, the four equal cards, and `transition-all` from touched sections. Keep heatmap button labels, target tooltip, long-content wrapping, and reduced-motion behavior.

- [ ] **Step 5: Run Progress tests and verify GREEN**

Run the command from Step 2.

Expected: all legacy data/accessibility tests plus the new hierarchy/disclosure tests PASS.

- [ ] **Step 6: Commit Progress redesign**

```bash
git add src/app/components/twelve-week/TwelveWeekProgressTab.tsx src/app/components/twelve-week/TwelveWeekProgressTab.test.tsx
git commit -m "feat(12-week): clarify the Progress cockpit"
```

---

### Task 7: Group Settings into three calm sections

**Files:**
- Modify: `src/app/components/twelve-week/TwelveWeekSettingsTab.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.tsx`
- Create: `src/app/components/twelve-week/TwelveWeekSettingsTab.test.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.test.tsx`

**Interfaces:**
- Consumes: `TwelveWeekSettingsTabProps` unchanged.
- Produces: regions `Chu kỳ`, `Nhắc nhở & đồng bộ`, and `Dữ liệu & nguy hiểm`; all callbacks remain wired to current handlers.

- [ ] **Step 1: Write the Settings grouping test**

Create a presentation-only test that mocks deep settings children so the test covers grouping without rebuilding the full sync/billing fixture:

```tsx
import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TwelveWeekSettingsTab } from "./TwelveWeekSettingsTab";

vi.mock("./TwelveWeekCycleSettingsPanel", () => ({
  TwelveWeekCycleSettingsPanel: () => <div>Cycle controls</div>,
}));
vi.mock("./WeeklyTimeBlocksPanel", () => ({ WeeklyTimeBlocksPanel: () => <div>Time blocks</div> }));
vi.mock("./TwelveWeekPlanAccessSection", () => ({ TwelveWeekPlanAccessSection: () => <div>Plan access</div> }));
vi.mock("./TwelveWeekLocalStatusSection", () => ({ TwelveWeekLocalStatusSection: () => <div>Sync status</div> }));
vi.mock("./TwelveWeekDeviceDetailsSection", () => ({
  TwelveWeekRemindersSettings: () => <div>Reminders</div>,
  TwelveWeekExecutionPreferences: () => <div>Execution preferences</div>,
  TwelveWeekDataSafety: () => <div>Data safety</div>,
  TwelveWeekQuickShortcuts: () => <div>Quick shortcuts</div>,
  TwelveWeekDangerZone: () => (
    <div>
      <button type="button">Đặt lại chu kỳ</button>
      <button type="button">Xóa dữ liệu</button>
    </div>
  ),
}));
vi.mock("../FeedbackDialog", () => ({ FeedbackDialog: () => <button type="button">Góp ý</button> }));
vi.mock("../../utils/app-mode", () => ({ isRealMode: () => false }));

const props = {
  system: { weeklyTimeBlocks: [] },
} as unknown as ComponentProps<typeof TwelveWeekSettingsTab>;

it("groups settings into cycle, sync, and data regions", () => {
  render(<TwelveWeekSettingsTab {...props} />);
  expect(screen.getByRole("region", { name: "Chu kỳ" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Nhắc nhở và đồng bộ" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Dữ liệu và nguy hiểm" })).toBeInTheDocument();
  expect(screen.getByText("Cycle controls")).toBeInTheDocument();
  expect(screen.getByText("Sync status")).toBeInTheDocument();
});

it("keeps destructive actions inside the danger region", () => {
  render(<TwelveWeekSettingsTab {...props} />);
  const danger = screen.getByRole("region", { name: "Dữ liệu và nguy hiểm" });
  expect(within(danger).getByRole("button", { name: /reset|đặt lại/i })).toBeInTheDocument();
  expect(within(danger).getByRole("button", { name: /xóa/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run Settings tests and verify RED**

```bash
npx vitest run --config vitest.ui.config.ts src/app/components/twelve-week/TwelveWeekSettingsTab.test.tsx src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.test.tsx
```

Expected: new file fails to import or cannot find the three named regions.

- [ ] **Step 3: Add a semantic settings-group wrapper**

Define this file-local component above `TwelveWeekSettingsTab`:

```tsx
import type { ReactNode } from "react";

function SettingsGroup({
  id,
  title,
  description,
  children,
  warning = false,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-card border bg-app-surface p-4 sm:p-6 ${
        warning ? "border-app-status-warning/30" : "border-app-line"
      }`}
    >
      <h2 id={id} className="font-serif text-xl font-bold text-app-ink">{title}</h2>
      <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed text-app-ink-soft">{description}</p>
      <div className="mt-5 min-w-0 space-y-5">{children}</div>
    </section>
  );
}
```

Replace the current seven `SectionBlock` surfaces with three `SettingsGroup` regions and map complete current child components as follows:

- `cycle-settings-heading` / `Chu kỳ`: `TwelveWeekCycleSettingsPanel`, `WeeklyTimeBlocksPanel`, and `TwelveWeekExecutionPreferences`.
- `sync-settings-heading` / `Nhắc nhở & đồng bộ`: real-mode `TwelveWeekPlanAccessSection`, `TwelveWeekRemindersSettings`, and `TwelveWeekLocalStatusSection`.
- `danger-settings-heading` / `Dữ liệu & nguy hiểm`: `TwelveWeekDataSafety` and `TwelveWeekDangerZone`, with `warning` set to `true`.

Render `TwelveWeekQuickShortcuts` and `FeedbackDialog` after the three groups in one flat utility row. Preserve every current prop, `isRealMode()` condition, callback, entitlement display, sync status, and destructive-dialog trigger.

- [ ] **Step 4: Flatten `TwelveWeekCycleSettingsPanel`**

Keep its `AlertDialog` and prop interface. Replace the outer Card, decorative hero, animated pulse, gradient tiles, and info-card grid with:

```tsx
function SettingsControlRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)] sm:items-center sm:p-5">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-app-ink">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
```

Wrap the current Review Day Select, reminder-time Input, load Select, and status Select in `SettingsControlRow` in that order. Add `className="text-base sm:text-sm"` to the time Input. After those rows, render the current tactic priority/type controls in a `divide-y divide-app-line` list with one indicator per row. Remove the outer Card, decorative hero, animated pulse, gradient tiles, date/reentry display cards, hover translation, and `transition-all`; retain the review-day `AlertDialog` and every handler.

- [ ] **Step 5: Preserve destructive confirmation tests**

Run and update only selectors/classes as necessary; keep assertions that changing review day opens `AlertDialog`, cancel does not call the handler, and confirmation calls it once.

- [ ] **Step 6: Run Settings tests and verify GREEN**

Run the command from Step 2.

Expected: PASS with all existing callback and destructive-dialog behavior preserved.

- [ ] **Step 7: Commit Settings redesign**

```bash
git add src/app/components/twelve-week/TwelveWeekSettingsTab.tsx src/app/components/twelve-week/TwelveWeekSettingsTab.test.tsx src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.tsx src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.test.tsx
git commit -m "feat(12-week): simplify cockpit settings"
```

---

### Task 8: Run full accessibility, responsive, and visual verification

**Files:**
- Modify: `e2e/visual-qa.spec.ts`
- Modify: `docs/superpowers/specs/2026-07-15-twelve-week-execution-cockpit-design.md`
- Verify: every file changed in Tasks 1-7.

**Interfaces:**
- Consumes: stable tab accessible names `Mở tab Hôm nay`, `Mở tab Tuần`, `Mở tab Tiến độ`, and `Mở tab Cài đặt`.
- Produces: desktop/mobile screenshots and final evidence that the design acceptance criteria pass.

- [ ] **Step 1: Extend visual QA to assert first-viewport content**

Add a helper to `e2e/visual-qa.spec.ts`:

```ts
async function expectCockpitFirstViewport(page: Page) {
  const tabs = page.getByRole("navigation", { name: "Điều hướng hệ 12 tuần" });
  const primary = page.locator('[data-testid="today-primary-hero"], [data-testid="today-next-action-panel"]');
  await expect(tabs).toBeVisible();
  await expect(primary).toBeVisible();
  const tabBox = await tabs.boundingBox();
  const primaryBox = await primary.boundingBox();
  expect(tabBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);
  expect(primaryBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);
}
```

Import `Page` and `expect` from `@playwright/test`. Run this helper in the 390x844 Today case after navigation and data load. For each tab, click its exact accessible name, wait for the selected state, and save both desktop and mobile screenshots.

- [ ] **Step 2: Add browser-level overflow and heading assertions**

```ts
const metrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  h1Count: document.querySelectorAll("main h1").length,
}));
expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
expect(metrics.h1Count).toBe(1);
```

Run these at 390x844 for all four tabs.

- [ ] **Step 3: Run all focused UI tests**

```bash
npx vitest run --config vitest.ui.config.ts \
  src/features/plan12week/pages/12WeekSystem/TwelveWeekCommandBar.test.tsx \
  src/features/plan12week/pages/12WeekSystem/components.test.tsx \
  src/features/plan12week/pages/12WeekSystem/sync-indicator.test.tsx \
  src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemNotices.test.tsx \
  src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx \
  src/app/components/twelve-week/TwelveWeekCycleRail.test.tsx \
  src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx \
  src/app/components/twelve-week/TwelveWeekProgressTab.test.tsx \
  src/app/components/twelve-week/TwelveWeekSettingsTab.test.tsx \
  src/app/components/twelve-week/TwelveWeekCycleSettingsPanel.test.tsx \
  src/app/components/RootLayout.test.tsx
```

Expected: all listed test files PASS with zero failures.

- [ ] **Step 4: Run static verification**

```bash
npm run typecheck
npm run lint
```

Expected: both exit `0`. Fix only issues caused by this feature; do not reformat unrelated files.

- [ ] **Step 5: Run browser visual QA**

With the existing local dev server running at `http://localhost:5173`:

```bash
npx playwright test e2e/visual-qa.spec.ts
```

Expected: all visual QA tests PASS and screenshots exist for Today, Week, Progress, and Settings at desktop/mobile sizes.

- [ ] **Step 6: Capture final comparison screenshots**

```bash
node scripts/capture-baseline-screenshots.mjs \
  --screen 12-week-system \
  --output docs/specs/core-flow-ui-upgrade/screenshots/after
```

Expected: `12-week-system_desktop.png` and `12-week-system_mobile.png` are regenerated. Use the visual QA screenshots for non-default tabs.

- [ ] **Step 7: Run broad frontend verification**

```bash
npm run check
npm run smoke:core-quality
```

Expected: typecheck, lint, fast tests, build, and local core-funnel smoke all PASS. If smoke is blocked by the local server or environment, report the exact prerequisite and keep the successful static/test evidence.

- [ ] **Step 8: Inspect the final diff and design criteria**

```bash
git diff --check
git status --short
```

Manually confirm:

- no route/storage/API changes;
- only one visible notice;
- one `h1`;
- primary content appears in the first viewport when no data-safety notice is active;
- sync remains visible;
- footer is absent only on `/12-week-system`;
- reduced motion removes decorative translation/pulse;
- no unexpected generated or unrelated files are staged.

- [ ] **Step 9: Record implementation status in the design spec**

Change the metadata line to:

```markdown
- Trạng thái: Đã triển khai và xác minh
```

Append a short `## 19. Kết quả triển khai` section listing final screenshots, verification commands, and any approved deviation. Do not claim deployed production proof unless a deployed smoke actually ran.

- [ ] **Step 10: Commit final QA and documentation**

```bash
git add e2e/visual-qa.spec.ts docs/superpowers/specs/2026-07-15-twelve-week-execution-cockpit-design.md
git commit -m "test(12-week): verify execution cockpit"
```

---

## Final Acceptance Checklist

- [ ] Command bar replaces the large green hero and full core-flow progress block.
- [ ] Sticky four-column tab bar fits at 390px without horizontal body overflow.
- [ ] Highest-priority notice is the only route-level notice visible.
- [ ] Today starts with the primary task and uses a 7/5 desktop grid.
- [ ] Week uses the shared cycle rail and flat tactic rows.
- [ ] Progress has one narrative, three metrics, the cycle rail, and collapsed advanced analytics.
- [ ] Settings has three semantic groups and unchanged destructive confirmations.
- [ ] Signed-in and signed-out footers are hidden only in the execution workspace.
- [ ] Legal links remain in Settings/account navigation.
- [ ] One `h1`, sequential headings, visible focus, 44px touch targets, 16px mobile inputs.
- [ ] Reduced motion, dark mode, long content, empty state, offline state, and sync-error state remain usable.
- [ ] Targeted UI tests, typecheck, lint, build, visual QA, and core-quality smoke have fresh evidence.
