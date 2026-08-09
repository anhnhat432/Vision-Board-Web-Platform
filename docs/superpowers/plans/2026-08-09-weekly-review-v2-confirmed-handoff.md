# Weekly Review V2 Confirmed Handoff Implementation Plan

**Goal:** Replace the fragmented Weekly Review input surface with three human questions and add a truthful preview/select/confirm handoff that mutates only the next week after review persistence succeeds.

**Architecture:** Keep weekly review persistence and next-week plan application as separate commands. Add a pure next-week handoff domain helper, preserve canonical review patch merging, orchestrate local-first plan persistence and snapshot sync in the existing execution action hook, and render confirmation/closure through focused React components.

**Tech stack:** React 18, TypeScript, Tailwind/project tokens, Vitest, Testing Library, existing local-first persistence/sync helpers.

---

## Task 1: Freeze the next-week handoff domain contract with RED tests

**Files:**
- Create: `src/features/plan12week/logic/nextWeekHandoff.ts`
- Create: `src/features/plan12week/logic/nextWeekHandoff.test.ts`
- Modify: `src/features/plan12week/logic/index.ts`

1. Add tests for priority preview/apply, reduce optional workload, restore skipped optional workload, no confirmation/no mutation, duplicate apply/noop, early review current-week preservation, historical unavailability, no-task week, and Week 12.
2. Run the focused test and record RED because the helper does not exist.
3. Implement a pure helper that returns exact preview effects and a new system only for explicitly selected effects.
4. Reuse optional-task `skipped` semantics; never delete tasks or generate new ones.
5. Run focused tests GREEN.

## Task 2: Make review form initialization target any selected review safely

**Files:**
- Modify: `src/features/plan12week/pages/12WeekSystem/useWeeklyReviewFormState.ts`
- Create/modify focused tests for form-state mapping.

1. Extract a pure builder from existing initialization.
2. Preserve direct mappings for `keepTactic`, `mainObstacle`, `reduceTactic`, commitments, priority, and workload.
3. Preserve legacy `insights`/`biggestOutputThisWeek` in state without presenting them as new required questions.
4. Expose an explicit loader/reset path for historical edits.
5. Prove selected historical review and previous commitments initialize correctly.

## Task 3: Orchestrate separate review save and confirmed plan apply with RED tests

**Files:**
- Modify: `src/features/plan12week/pages/12WeekSystem/useTwelveWeekExecutionActions.ts`
- Modify: `src/features/plan12week/pages/12WeekSystem/useTwelveWeekExecutionActions.test.tsx`

1. Add result types for review save and next-week apply.
2. Add tests proving review save calls only `commitTwelveWeekWeeklyReview()` and leaves plan unchanged.
3. Add tests for selected target week, hidden legacy preservation, local save failure, duplicate save, confirmed apply, no-confirm path, local apply failure, sync failure, and duplicate apply.
4. Refactor review save to submit a patch, not a destructive full replacement.
5. Add in-flight locks for both commands.
6. Apply confirmed handoff through the pure helper -> `commitSystemUpdate()` -> `enqueuePlanSnapshotUpdatedMutation()` -> `syncLocalSnapshot()`.
7. Keep raw reflection text out of analytics.

## Task 4: Replace the current review form with three questions

**Files:**
- Modify: `src/app/components/twelve-week/WeeklyReviewForm.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.test.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekWeekTab.css` only if required.

1. Add UI tests for the exact three labels and evidence-before-reflection order.
2. Add adaptive copy tests for perfect/no-task/Week 12.
3. Move commitment classification into optional progressive disclosure and remove it from submit gating.
4. Limit next-week commitments to three.
5. Make Question 3 the normal current-week save gate; allow meaningful Week 12 reflection without requiring a nonexistent next-week plan.
6. Make mobile CTA say `Lưu review` and retain the existing safe-area placement.
7. Keep early-review confirmation and pass the selected week into save.
8. Keep the form open when save returns failure.

## Task 5: Add confirmed next-week preview and truthful closure

**Files:**
- Create: `src/app/components/twelve-week/WeeklyReviewNextWeekHandoff.tsx`
- Create: `src/app/components/twelve-week/WeeklyReviewNextWeekHandoff.test.tsx`
- Modify: `src/app/components/twelve-week/WeeklyReviewSummary.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekPremiumInsightSection.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekNextWeekRecommendationCard.tsx` or retire its duplicate apply surface.

1. Render `Review đã lưu. Kế hoạch tuần sau chưa thay đổi.` before confirmation.
2. Show exact priority, workload preference, and optional-task counts.
3. Let the user select effects, decline, or open an `AlertDialog` confirmation.
4. Disable duplicate confirmation while applying.
5. Render applied, already-matching, local-failure, and sync-pending states truthfully.
6. For Week 12 and historical review, render closure only with no apply CTA.
7. Rename suggestion actions to prefill language and say the plan has not changed.

## Task 6: Wire selected review editing and handoff through the page

**Files:**
- Modify: `src/features/plan12week/pages/12WeekSystem.tsx`
- Modify: `src/features/plan12week/pages/12WeekSystem/TwelveWeekSystemTabs.tsx`
- Modify: related prop/types tests.

1. Pass target week into review save.
2. Load the selected completed review before editing.
3. Pass apply result/action to the summary handoff.
4. Remove fallback wiring that treats form prefill as plan application.
5. Preserve current Today/Week/Progress navigation and no duplicate CTA.

## Task 7: Cross-device and write-safety regression coverage

**Files:**
- Modify: `src/features/plan12week/pages/twelve-week-write-safety.test.tsx`
- Modify: `src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx`
- Modify: persistence/sync tests only where contract coverage is missing.

1. Prove review fields round-trip through existing canonical sync fields.
2. Prove review save without apply leaves the next-week system unchanged.
3. Prove confirmed apply syncs the changed plan/task snapshot and applies once.
4. Prove historical edit cannot mutate a started/past week.
5. Prove Week 12 has no next-week apply.

## Task 8: Verification, browser QA, self-review, and publish

1. Run focused tests after each RED/GREEN cycle.
2. Run `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run test:sync`, `npm run test:ops`, and `npm run build`.
3. Compare any full-suite failure against exact `8c3d023ceb3e310316e03f6c490322c3f47f4665` base when necessary.
4. Run deterministic browser QA at `390x844` and `1440x900` for the required states.
5. Self-review the full diff for silent mutation, fake success, data loss, wrong-week targeting, Week 12, duplicate CTA, schema drift, and unnecessary backend work.
6. Commit, push, open one focused PR, wait for all CI/security/deployment gates, and merge only when clean.
