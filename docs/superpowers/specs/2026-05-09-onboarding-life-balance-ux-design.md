# Onboarding and Life Balance UX Upgrade

**Date:** 2026-05-09
**Scope:** `/onboarding` and `/life-balance`
**Recommended approach:** Deepen the first two steps before changing Life Insight or SMART Goal
**Goal:** Make the start of the MVP journey feel clear, low-friction, and connected to the 12-week system without changing localStorage, sync, billing, or backend behavior.

## 1. Context

MVP 1 should prove that a visitor can move from a vague life priority to a usable 12-week execution system. The previous UX upgrade improved the execution end of the flow: Today, Week Review, and Progress. The next highest-impact area is the beginning of the journey, where users decide whether to trust the flow and complete the life-balance assessment.

The current product already has working routes and tests:

- `src/app/pages/Onboarding.tsx` owns the welcome and first life-balance scoring step.
- `src/app/pages/LifeBalance.tsx` owns the full wheel review, score editing, history, and handoff to Life Insight.
- `src/app/components/CoreFlowProgress.tsx` gives the shared flow context.
- `src/app/utils/storage.ts` and `src/app/utils/core-flow-guard.ts` own persisted wheel state and readiness detection.

This upgrade should keep those boundaries. It should not change storage keys, stored data shapes, route order, backend sync, billing, or the Life Insight / SMART Goal domain logic.

## 2. Design Direction

Use a "clear first commitment" design:

1. Onboarding should answer: "What am I doing, how long will it take, and what happens next?"
2. The assessment step should show live feedback while the user scores the eight areas.
3. Life Balance should answer: "What signal did the scores reveal, and should I save or continue?"
4. The handoff to Life Insight should feel like the next step in one flow, not a separate tool.

This is preferred over redesigning every early-flow page at once because it keeps scope tight and improves the first major drop-off point. It is preferred over starting with Life Insight / SMART Goal because those screens depend on the user first understanding and trusting the Life Balance input.

## 3. Onboarding

### Outcome

Onboarding should feel like the first step of the product, not a marketing page. It should quickly set expectations and then move the user into scoring.

### Welcome Step Changes

- Make the first-screen message shorter and more operational:
  - The user is about to score eight life areas.
  - This step takes about three minutes.
  - The result will feed Life Insight, SMART Goal, and the 12-week plan.
- Keep one dominant CTA for new users:
  - "Bat dau cham 8 linh vuc" or the existing Vietnamese equivalent.
- Keep the return/draft action secondary and visually quiet.
- For returning users with existing life-balance data, change the framing:
  - This is an update, not a reset.
  - Existing scores are loaded.
  - Continuing will refresh the current wheel and downstream insight.
- Keep `CoreFlowProgress` visible so the user understands this is step 1 of the core journey.

### Assessment Step Changes

- Add a compact live summary near the top of the scoring step:
  - Average score.
  - Lowest area.
  - Highest area.
  - Number of areas reviewed.
- Add a clear state near the CTA:
  - If all eight areas were touched in the current assessment session, tell the user the wheel is ready to save.
  - If some areas were not touched yet, tell the user how many areas remain to review.
- Keep the current sliders and stored `LifeArea[]` shape unchanged.
- Do not add a new "reviewed" field. If a completion count is needed, derive it from local component interaction state only.
- Preserve the current save behavior: completing onboarding writes through `updateWheelOfLife(lifeAreas)` and navigates to `/life-insight`.

### Component Boundary

All Onboarding changes stay in `Onboarding.tsx` unless a tiny presentational helper removes obvious duplication. Do not introduce a new shared abstraction unless both Onboarding and Life Balance need the exact same summary UI.

## 4. Life Balance

### Outcome

Life Balance should become a decision screen: the user sees the signal from their scores, can adjust if needed, and has one obvious next step to Life Insight.

### Top Summary Changes

- Add a prominent "signal" summary above the detailed wheel content:
  - Weakest area and score.
  - Average score.
  - Strongest area.
  - Suggested next action: save changes or continue to Life Insight.
- The summary should use real computed data from the current in-memory `lifeAreas`, including unsaved edits.
- If there are unsaved changes, the primary CTA should be "Save and view Life Insight".
- If there are no changes, the primary CTA should be "Open Life Insight".
- Keep a secondary save-only action for users who want to stay on the page.

### Editing Experience

- Keep sliders as the main editing surface.
- Keep the existing unsaved-changes blocker and save behavior.
- Improve the copy around editing so the user understands that changing scores updates the signal used by Life Insight.
- On mobile, keep the highest-signal content first:
  1. CoreFlowProgress
  2. Signal summary
  3. Sliders/editing
  4. Chart/history/details
- History and chart content should remain available but should not compete with the main CTA.

### Handoff to Life Insight

- `handleContinueToInsight` remains the owner of the save-then-navigate behavior.
- If there are changes, save locally first, then navigate.
- If there are no changes, navigate directly.
- The CTA copy and nearby helper text should make that behavior explicit.

### Component Boundary

Most Life Balance changes stay in `LifeBalance.tsx`. The route already computes `averageScore`, `strongestArea`, `weakestArea`, `hasChanges`, and `hasLifeBalanceData`, which are enough for the new summary. No storage or sync changes are required.

## 5. Out of Scope

Do not change in this pass:

- Life Insight layout or SMART Goal wizard layout beyond preserving the existing handoff.
- Feasibility Check.
- 12-week setup or 12-week execution screens.
- LocalStorage keys or persisted shapes.
- Backend sync rules.
- Firebase, login, billing, paywall, or admin surfaces.
- Real analytics changes beyond existing event tracking that already fires for life-balance start and completion.

## 6. Data Flow

No stored data shape changes are planned.

Existing flow remains:

1. User scores areas in Onboarding or Life Balance.
2. `updateWheelOfLife(lifeAreas)` stores the current wheel and history.
3. Core-flow guard helpers detect that real life-balance data exists.
4. Life Insight reads `currentWheelOfLife` and recommends or allows a focus area.

The only new state should be local UI state, such as a set of indices adjusted during the current Onboarding assessment. That state must not be persisted.

## 7. Tests

Add focused tests around the behavior that could regress:

- Onboarding welcome renders the shorter first-step framing and the primary assessment CTA.
- Onboarding assessment shows live summary values after slider changes.
- Onboarding returning-user copy is shown when real life-balance data already exists.
- Life Balance summary uses in-memory edited scores before saving.
- Life Balance primary CTA copy changes based on `hasChanges`.
- Life Balance save-and-continue still saves local wheel data before navigating to Life Insight.

Existing route-level and smoke coverage should continue to pass:

- `src/app/pages/Onboarding.test.tsx`
- `src/app/pages/LifeBalance.test.tsx`
- existing core flow e2e tests that touch onboarding/life-balance
- `npm run smoke:mvp1` after implementation

## 8. Acceptance Criteria

- A new user can understand within the first screen that they are starting with an eight-area Life Balance score.
- The user sees live feedback while scoring, not only after leaving the screen.
- A returning user is told that existing scores are being updated rather than reset.
- Life Balance clearly names the weakest area, strongest area, and average score.
- The primary CTA on Life Balance reflects whether unsaved changes will be saved before opening Life Insight.
- The flow remains local-first and works without login, Firebase, backend, or billing.
- No localStorage migration is required.
- Typecheck, lint, targeted tests, full frontend check, and MVP1 smoke pass after implementation.
