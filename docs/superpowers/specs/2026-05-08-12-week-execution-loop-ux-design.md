# 12-Week Execution Loop UX Upgrade

**Date:** 2026-05-08
**Scope:** `/12-week-system` Today, Week, and Progress tabs
**Recommended approach:** Guided Execution Loop
**Goal:** Make the 12-week command center feel like one clear loop: do today's work, close the day, review the week, read progress, then return to the next action.

## 1. Context

The MVP promise is a local-first public demo where a visitor can turn a goal into a 12-week execution system and understand what to do next. Recent UI work improved the dashboard and entry points. The next highest-impact surface is `/12-week-system`, because it is where users receive daily and weekly value after setup.

Current implementation already has good boundaries:

- `src/features/plan12week/pages/12WeekSystem.tsx` owns route state, tab selection, persistence callbacks, and sync wiring.
- `src/app/components/twelve-week/TwelveWeekTodayTab.tsx` owns Today execution UI.
- `src/app/components/twelve-week/TwelveWeekWeekTab.tsx` owns weekly review UI.
- `src/app/components/twelve-week/ProgressSummaryCard.tsx` owns the default Progress summary before full details are opened.

The upgrade should keep those boundaries. It should not change localStorage shape, backend sync behavior, billing behavior, or plan generation.

## 2. Design Direction

Use the Guided Execution Loop:

1. Today tells the user the next concrete action for the current state.
2. Check-in confirms the day was closed and gives a clear next step.
3. Week Review acts like a short decision flow, not a long form.
4. Progress explains cycle health and points back to Today or Week.

This is preferred over a visual-only polish because it improves comprehension and flow without expanding product scope. It is also preferred over deeper analytics because MVP 1 should prove execution clarity before advanced reporting.

## 3. Today Tab

### Outcome

The Today tab should answer one question immediately: "What should I do now?"

### UI Changes

- Add a compact next-action panel near the top of Today, below the mobile status strip and before the main work grid.
- The panel should adapt to state:
  - Open primary task: show that task as the next move and keep the existing primary CTA.
  - Primary task completed but check-in not saved: ask the user to save check-in.
  - Check-in saved and review is not due: show that the day is closed and point back to tomorrow's execution rhythm.
  - Review due today: point the user to the Week tab after work or check-in.
  - No tasks but plan exists: point to Week if review is due, otherwise explain the day is clear.
  - No tasks or missing plan structure: keep the existing setup recovery CTA.
- Keep secondary tasks de-emphasized. They should remain behind the existing details disclosure unless the primary task is already completed.
- Improve the check-in card state:
  - If a latest check-in exists for today, show a saved status with date and mood.
  - Keep the save button available so the user can update the note or mood.
  - When review is due, show a secondary action to open Week after check-in.

### Component Boundaries

All Today UI changes stay inside `TwelveWeekTodayTab.tsx`. The page already passes the required state: task queue, primary task, review due status, latest check-in, and tab navigation callbacks.

## 4. Week Review Tab

### Outcome

The Week tab should feel like a short weekly closeout, not a dense report plus a form.

### UI Changes

- Add a review flow header inside the review card with three visible steps:
  1. Result
  2. Load decision
  3. Next priority
- Keep the required visible inputs:
  - Biggest output this week
  - Workload decision
  - Next week priority
- Move less urgent reflection fields behind the existing `SecondaryPanel`:
  - Main obstacle
  - Keep tactic
  - Reduce tactic
- Add a small readiness summary above the CTA:
  - Result captured
  - Load decision selected
  - Next priority captured
- Preserve the existing weekly review CTA copy in the component. Disabled and saving behavior must remain unchanged.
- Fix mobile sticky CTA behavior so it does not compete with the app bottom navigation:
  - Keep sticky CTA only when the review form is in view or add enough bottom spacing inside the tab.
  - Ensure it does not cover the bottom nav actions.

### Component Boundaries

All Week changes stay inside `TwelveWeekWeekTab.tsx`. Save behavior remains delegated through `onSaveWeeklyReview`. No new stored fields are added.

## 5. Progress Tab

### Outcome

The Progress tab should explain where the user is in the 12-week cycle and what to do next.

### UI Changes

- Add a compact 12-week timeline to `ProgressSummaryCard`.
- The timeline should show:
  - Weeks 1 through `system.totalWeeks`
  - Current week
  - Completed review weeks
  - Milestone weeks 4, 8, and 12 when within the cycle
- Keep the existing trend hero as the main narrative card.
- Add a milestone summary block:
  - Current week range
  - Next milestone label
  - Whether the next action should be Today or Week
- Keep the "View full scoreboard" affordance. The summary card remains the default so Progress does not become visually heavy on first open.

### Component Boundaries

Most Progress changes stay inside `ProgressSummaryCard.tsx`. If the timeline needs richer milestone data that is already computed in `12WeekSystem.tsx`, pass it as props rather than recomputing unrelated state. Do not change scoreboard persistence.

## 6. Data Flow

No stored data shape changes are planned.

Inputs already available:

- Today:
  - `todayQueue`
  - `firstPriorityTask`
  - `todayCompletedCount`
  - `todayRemainingCount`
  - `latestCheckIn`
  - `reviewDueToday`
- Week:
  - `weeklyForm`
  - `currentReview`
  - `reviewDueToday`
  - `weekCompletion`
  - `currentScoreValue`
- Progress:
  - `system.scoreboard`
  - `currentWeek`
  - `currentWeekRange`
  - `reviewDoneCount`
  - `weekCompletion`
  - `reviewDueToday`

Persistence and sync stay untouched:

- Task toggles continue through `handleToggleTask`.
- Daily check-ins continue through `handleSaveCheckIn`.
- Weekly reviews continue through `handleSaveWeeklyReview`.
- Local save remains the primary source of truth for the demo path.

## 7. Error Handling And Empty States

- Existing empty states remain in place.
- The new next-action panel must not render misleading action copy when there is no active task and no plan structure.
- If `latestCheckIn` is from a previous date, do not show it as today's saved state.
- If `system.totalWeeks` is not 12, the timeline should still respect `system.totalWeeks` and only mark milestone weeks that exist within the range.

## 8. Testing

Add or update focused tests:

- `TwelveWeekTodayTab.test.tsx`
  - Renders next-action guidance for an open primary task.
  - Renders check-in saved state only when latest check-in date matches today.
  - Shows Week CTA when review is due.
- `TwelveWeekWeekTab` tests, or route flow tests if no direct test file exists:
  - Shows review readiness summary.
  - Keeps optional fields inside details.
  - Does not remove existing weekly review save behavior.
- `ProgressSummaryCard` tests, or route flow tests if no direct test file exists:
  - Renders 12-week timeline.
  - Marks current week.
  - Marks reviewed weeks from scoreboard/review count data.
  - Keeps next-action CTA behavior.

Run verification after implementation:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Use `npm run check` if the implementation touches shared tab/page behavior beyond these three components.

## 9. Acceptance Criteria

- A returning user opening `/12-week-system` can tell the next action from the first visible Today content.
- A user who completed the main task sees a clear prompt to save check-in.
- A user with today's check-in saved sees that state clearly.
- A review due day naturally points the user from Today to Week.
- Weekly Review reads as a short closeout flow with required decisions visible.
- Optional weekly reflection details remain available but do not dominate the page.
- Progress shows where the user is in the 12-week cycle and what to open next.
- No localStorage schema, migration, backend sync, billing, or auth behavior changes.

## 10. Risks

- The Today tab is already content-rich. The next-action panel must replace confusion, not add another competing card.
- Mobile bottom navigation can conflict with sticky CTAs. Test mobile layout and add bottom spacing if needed.
- Some tests contain older mojibake text. Prefer regex or test IDs when adding assertions to avoid encoding churn.
- The timeline should stay compact; Progress must not become a dense analytics dashboard in the MVP path.
