# Production Smoke Today Task Toggle Fix

## 1. Context & Goal

- Feature / bug: Production smoke failed after merge commit `f6b4f94f` while waiting for a Today task completion to persist in localStorage.
- Why now: The launch proof workflow must verify that the real 12-week execution loop can save local progress before backend sync.
- User impact: A signed-in user clicking a Today task must not lose the local completion when the UI rerenders, hydrates, or unmounts during sync.
- Modes affected: `real` primarily; demo/local mode should keep the same local-first behavior.

## 2. Surface Classification

- Type: `Core`
- Touched domains: 12-week execution, localStorage persistence, smoke coverage.
- Existing invariants that must not break:
  - Local task completion saves before remote sync.
  - Remote sync failure must not destroy local progress.
  - Task completion mutations are still enqueued for backend sync.

## 3. Functional Requirements

1. WHEN a user clicks an open Today task checkbox, THE system SHALL call the task-toggle persistence handler during the same interaction instead of relying on a later timer.
2. WHILE the page rerenders, hydrates, or unmounts after the click, THE system SHALL preserve the already-dispatched local task update.
3. WHERE backend sync is pending or fails, THE system SHALL keep the locally saved completed task unless the established rollback path explicitly applies.

## 4. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: no key or shape changes.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: local save remains first; backend mutation enqueue follows the local update path.
- rollback / restore concerns: keep existing failure rollback behavior in `handleToggleTask`.

## 5. Acceptance Criteria

- [ ] Production-like Today task click dispatches `onToggleTask` before unmount/timer cleanup can cancel it.
- [ ] Existing Today tab task toggle tests still pass.
- [ ] 12-week write-path task persistence tests still pass.
- [ ] Production smoke harness guard remains aligned with the failure scenario.

## 6. Verification Plan

Commands to run:

```bash
npm exec vitest -- --config vitest.fast.config.ts src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
npm exec vitest -- --config vitest.fast.config.ts src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx src/features/plan12week/pages/twelve-week-write-safety.test.tsx
npm run typecheck
```

Run `npm run smoke:prod` only when production smoke credentials are available in the shell.
