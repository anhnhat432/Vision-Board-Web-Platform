# Weekly Review V2 - Three Questions and Confirmed Next-Week Handoff

## 1. Context & Goal

- Feature: complete the Weekly Review V2 loop from automatic evidence to a short human reflection and an explicitly confirmed next-week plan adjustment.
- Why now: evidence and deterministic insights already exist, but the current form still emphasizes legacy commitment classification and the existing "apply" actions only prefill review state while communicating success too optimistically.
- User impact: a review should normally take 3-5 minutes, preserve old review data, never silently mutate the plan, and leave the user with a truthful next step.
- Modes affected: both `real` and `demo`; protected sync remains real-mode/auth dependent.

## 2. Surface Classification

- Type: `Mixed`.
- Core domains: weekly review persistence, historical review targeting, plan mutation authority, task skip state, sync ordering, duplicate-write protection.
- Shell domains: three-question form, progressive disclosure, preview/confirmation UI, closure copy, mobile sticky CTA.
- Existing invariants:
  - `commitTwelveWeekWeeklyReview()` remains the only weekly-review local persistence authority.
  - local review save succeeds before best-effort remote sync.
  - hidden legacy review fields are preserved unless the new form explicitly edits their canonical replacement.
  - current-week and next-week tasks remain separate, especially during early review.
  - plan changes save locally before `syncLocalSnapshot()` attempts cloud continuity.

## 3. Actors & Entry Points

- Primary actor: a user reviewing the current week in the 12-week execution surface.
- Secondary actor: a user reading or editing a completed historical review.
- Route: `/12-week-system`, Week tab.
- Touchpoints:
  - `WeeklyReviewForm`
  - `TwelveWeekWeekTab`
  - `WeeklyReviewSummary`
  - `useWeeklyReviewFormState`
  - `useTwelveWeekExecutionActions`
  - `commitTwelveWeekWeeklyReview()`
  - `commitSystemUpdate()`
  - `enqueuePlanSnapshotUpdatedMutation()`
  - `syncLocalSnapshot()`

## 4. Three Human Questions

The evidence panel and deterministic insights stay before human input. The core form contains no more than these three questions:

1. `Điều gì đã giúp bạn tiến lên tuần này?`
   - canonical field: `keepTactic`
   - no-task copy: `Tuần này có điều gì đáng ghi lại?`
2. `Điều gì khiến kế hoạch lệch khỏi dự kiến?`
   - canonical field: `mainObstacle`
   - perfect-week copy avoids failure language
   - neutral quick answer: `Không có trở ngại đáng kể.`
3. `Tuần sau bạn muốn thay đổi điều gì?`
   - canonical fields: `nextWeekCommitments`, `nextWeekPriority`, `reduceTactic`, `workloadDecision`
   - maximum three commitments/adjustments
   - Week 12 copy refers to what should carry into the next cycle, not a nonexistent Week 13.

Legacy commitment kept/missed classification is not reliably derivable from free-text commitments. It remains optional secondary detail, is collapsed by default, and never blocks saving.

## 5. Functional Requirements

- `WRV2-01` - WHEN the review form opens, THE system SHALL show factual evidence and deterministic insights before human questions.
- `WRV2-02` - THE system SHALL present no more than three core human questions and SHALL NOT ask the user to re-enter completion, overdue, check-in, or score facts.
- `WRV2-03` - WHEN a week has no scheduled tasks or is perfect, THE system SHALL use neutral/adaptive question copy and SHALL NOT manufacture failure.
- `WRV2-04` - WHERE previous commitments exist, THE system SHALL expose classification as optional secondary detail because no stable ID mapping proves automatic kept/missed status.
- `WRV2-05` - WHEN a review is saved, THE system SHALL call `commitTwelveWeekWeeklyReview()` and SHALL NOT mutate any weekly plan or task schedule in that save operation.
- `WRV2-06` - WHEN an existing review is edited, THE system SHALL load the selected review's meaningful canonical values, save the selected week, and preserve hidden legacy fields through patch merge semantics.
- `WRV2-07` - WHEN a review save fails locally, THE form SHALL remain open and SHALL report failure without claiming closure.
- `WRV2-08` - WHEN a premium or rescue suggestion is chosen before save, THE system SHALL only prefill Question 3 and SHALL explicitly say the plan has not changed yet.
- `WRV2-09` - AFTER a successful current-week review save, THE system SHALL show a next-week preview with independently selectable priority and workload effects.
- `WRV2-10` - BEFORE plan mutation, THE user SHALL see exact effects, choose what to apply, and confirm in an in-app dialog.
- `WRV2-11` - WHEN confirmation is absent or declined, THE review SHALL remain saved and the next-week plan SHALL remain byte-for-byte unchanged.
- `WRV2-12` - WHEN priority is confirmed, THE system SHALL update only the next week's `weeklyPlans[].focus` using the first canonical next-week commitment/priority.
- `WRV2-13` - WHEN `reduce slightly` is confirmed, THE system SHALL set load preference to `lighter` and skip only unfinished optional tasks in the next week; core tasks and current-week tasks SHALL remain unchanged.
- `WRV2-14` - WHEN `increase slightly` is confirmed, THE system SHALL set load preference to `push` and restore only already-skipped optional tasks in the next week; it SHALL NOT invent or generate new tasks.
- `WRV2-15` - WHEN `keep same` is confirmed, THE system SHALL leave workload and task state unchanged.
- `WRV2-16` - WHEN the reviewed week is historical, already followed by the current week, or is Week 12, THE system SHALL save reflection only and SHALL NOT offer next-week mutation.
- `WRV2-17` - WHEN local plan apply succeeds, THE system SHALL persist through `commitSystemUpdate()`, enqueue the existing plan snapshot mutation, and call `syncLocalSnapshot()` best-effort.
- `WRV2-18` - WHEN local plan apply fails after review save, THE system SHALL say `Review đã lưu. Thay đổi kế hoạch tuần sau chưa áp dụng được.` and offer retry.
- `WRV2-19` - WHEN local plan apply succeeds but remote sync fails, THE system SHALL say the plan is applied on this device and pending sync; it SHALL NOT report local apply failure.
- `WRV2-20` - DOUBLE save or DOUBLE confirm SHALL produce at most one logical review mutation and one logical plan application.
- `WRV2-21` - AFTER closure, THE system SHALL state whether the next-week plan changed and provide a clear route back to execution.

## 6. Confirmed Handoff Contract

### Previewed effects

- priority: current next-week focus -> proposed focus
- workload: current preference -> proposed preference
- optional task effect: count of next-week optional tasks that will be skipped or restored
- non-effects: review notes, `keepTactic`, and free-text `reduceTactic` are not heuristically mapped to task IDs

### Mutation boundary

```text
save review
-> canonical review commit
-> show saved closure + preview
-> user selects effects
-> confirmation dialog
-> apply next-week-only mutation
-> local save
-> queue/sync snapshot
```

### Safe workload semantics

- Reduce: reuse the existing optional-task `skipped` semantics; do not delete tasks.
- Increase: only restore existing optional tasks; do not generate new tasks.
- Detailed task editing remains in the existing planning/settings surfaces.

## 7. Data, Storage, and Sync Constraints

- localStorage keys/shapes touched: none.
- migrations: none.
- backend models/API fields: none.
- review fields used: existing `keepTactic`, `mainObstacle`, `reduceTactic`, `nextWeekPriority`, `nextWeekCommitments`, `workloadDecision`.
- legacy fields preserved: `biggestOutputThisWeek`, `insights`, `reflection`, scores, and any other defined fields not directly edited.
- sync order:
  1. review local commit
  2. review mutation queue / review sync
  3. optional explicit plan apply local commit
  4. plan snapshot queue / local snapshot sync
- rollback: plan local save failure keeps the already-saved review and leaves the prior plan intact.

## 8. Non-functional Requirements

- Accessibility: real labels, semantic headings, visible focus, `aria-busy`, disabled reason/status text, keyboard-operable disclosure and confirmation dialog.
- Mobile: usable at `390x844`, CTA at least 44px, no duplicate fixed CTA, no bottom-nav collision, no horizontal overflow.
- Desktop: usable at `1440x900` with evidence -> questions -> closure hierarchy.
- Privacy: analytics contain counts/enums only, never raw reflection text.
- Performance: no new dependencies, no new network round trips before local save.

## 9. Out of Scope

- AI/LLM interpretation or coaching.
- generic workflow/form engines.
- new backend schema or API.
- automatic mapping from free-text reflections to tactic IDs.
- full next-week plan editor or arbitrary task creation.
- Cycle Review V2.

## 10. Acceptance Scenarios

- [x] normal week shows evidence, insights, three questions, saves review, previews changes, and applies selected effects once after confirmation
- [x] perfect week uses sensible non-failure copy
- [x] low-completion week supports a lighter workload preview
- [x] no-task week uses neutral copy and never manufactures failure
- [x] Week 1 does not require previous commitment classification
- [x] Week 12 saves reflection and shows cycle-closure copy without apply CTA
- [x] early review leaves remaining current-week future tasks unchanged
- [x] historical review renders and edits the selected week without offering plan apply
- [x] existing review edit preserves hidden legacy fields
- [x] review save failure leaves form open
- [x] review saved without confirmation leaves next-week system unchanged
- [x] confirmed priority/workload apply changes only next week
- [x] plan local apply failure reports partial success and supports retry
- [x] plan sync failure reports local success plus pending sync
- [x] duplicate save/apply clicks cause one logical mutation
- [x] mobile sticky CTA reflects `Lưu review`, confirmation, or closure accurately

## 11. Verification Plan

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:sync
npm run test:ops
npm run build
```

Focused tests cover domain mutation, hook orchestration, form/UI behavior, persistence preservation, sync, Week 12, early review, historical edit, and duplicate clicks.

Browser QA:

```text
390x844
1440x900
```

No-task, perfect, low-completion, Week 1, Week 12, early, historical, already-reviewed, preview, apply success, and failure copy are inspected with deterministic local data where practical.
