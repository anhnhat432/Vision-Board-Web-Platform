# Canonical 12-Week Task Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route Today and GoalTracker 12-week task complete/reopen actions through one reusable local-first persistence and mutation contract.

**Architecture:** Add a non-React persistence module that reads the latest auth-scoped state, applies task timestamps, saves locally, enqueues task and lead-metric mutations, and returns a structured result. Today retains its existing mutation-sync/legacy-sync orchestration and analytics; GoalTracker retains its own presentation feedback and standard-goal branch.

**Tech Stack:** React 18, TypeScript, localStorage storage helpers, mutation queue, Vitest, Testing Library.

## Global Constraints

- Base: `origin/main` at worktree creation; never merge/rebase/reset the user's dirty checkout.
- No layout, visual style, Dashboard, backend API, schema, dependency, auth, billing, AI, or pet changes.
- Local persistence is authoritative and must complete before remote work.
- Mutation-sync failures do not roll back local progress; legacy Today direct-sync failure retains its guarded rollback.
- Standard-goal tasks remain outside the canonical 12-week contract.

---

### Task 1: Canonical persistence and queue primitive

**Files:**
- Create: `src/features/plan12week/persistence/taskCompletionMutation.ts`
- Create: `src/features/plan12week/persistence/taskCompletionMutation.test.ts`

**Interfaces:**
- Produces: `commitTwelveWeekTaskCompletion(input): TwelveWeekTaskCompletionResult`
- Produces: `rollbackTwelveWeekTaskCompletion(input): TwelveWeekTaskCompletionResult`
- Result statuses: `applied`, `noop`, `not_found`, `local_save_failed`

- [ ] **Step 1: Write failing complete/reopen tests**

Cover persisted `completed`, `completedAt`, `lastModifiedAt`, one logical `task_completed_changed`, and current lead metric for complete and reopen.

- [ ] **Step 2: Run RED**

```bash
npm run test:sync -- src/features/plan12week/persistence/taskCompletionMutation.test.ts
```

Expected: fail because the module/contract does not exist.

- [ ] **Step 3: Implement minimal commit contract**

The implementation must:

```ts
const latest = getUserData();
const previousTask = latestGoal?.twelveWeekSystem?.taskInstances.find(...);
if (previousTask?.completed === input.completed) return { status: "noop", ... };
toggleTwelveWeekTask(input.goalId, input.taskId, input.completed, nowMs);
const updatedSystem = getUserData().goals.find(...)?.twelveWeekSystem;
enqueueTaskCompletionChangedMutation(...);
enqueueLeadMetricUpsertedMutations(..., "task_progress", ...);
```

Queue failures remain sidecars and are reflected in result metadata.

- [ ] **Step 4: Add no-op, queue failure, rapid sequence, and rollback tests**

Prove duplicate same-state calls do not enqueue twice, complete->reopen collapses to final state, queue failure keeps local data, and rollback restores the exact previous task snapshot without overwriting a newer conflicting state.

- [ ] **Step 5: Run GREEN**

```bash
npm run test:sync -- src/features/plan12week/persistence/taskCompletionMutation.test.ts
```

Expected: all canonical tests pass.

### Task 2: Integrate Today without changing sync policy

**Files:**
- Modify: `src/features/plan12week/pages/12WeekSystem/useTwelveWeekExecutionActions.ts`
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.tsx`
- Modify: `src/features/plan12week/pages/twelve-week-write-safety.test.tsx`
- Modify: `src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx`

**Interfaces:**
- Consumes: canonical commit/rollback result from Task 1.
- Preserves: `syncTaskToggle`, mutation-sync no-rollback, legacy guarded rollback, Today analytics.

- [ ] **Step 1: Write failing Today regression tests**

Add complete/reopen assertions for local timestamps and queue state, plus a focused assertion that one Today click produces one surface feedback sequence.

- [ ] **Step 2: Run RED**

```bash
npm run test:slow -- src/features/plan12week/pages/twelve-week-write-safety.test.tsx
npm run test:ui -- src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
```

Expected: new contract/feedback assertions fail against the duplicate implementation.

- [ ] **Step 3: Replace Today domain writes with canonical results**

Use `result.previousTask`, `result.updatedTask`, and `result.updatedSystem` for analytics, progress, and state refresh. Remove the private task mutation builder and duplicate lead-metric enqueue from the hook.

- [ ] **Step 4: Preserve legacy rollback**

On legacy direct-sync failure, call the canonical rollback primitive and update active React state only when rollback status is `applied`. Mutation-sync mode continues to keep local state and avoids immediate plan refresh.

- [ ] **Step 5: Keep one Today feedback owner**

Remove the extra optimistic sound/haptic/sparkle layer from the component while keeping task dispatch immediate and retaining post-success pet event behavior. The hook remains the single Today success toast/sound/haptic/confetti owner.

- [ ] **Step 6: Run GREEN**

Run the two focused commands from Step 2 and confirm no regression.

### Task 3: Integrate GoalTracker and preserve standard goals

**Files:**
- Modify: `src/app/pages/GoalTracker.tsx`
- Modify: `src/app/pages/GoalTracker.multi-tab.test.tsx`

**Interfaces:**
- Consumes: `commitTwelveWeekTaskCompletion`.
- Preserves: GoalTracker optimistic presentation, completion celebration, standard-goal branch, cross-tab reload.

- [ ] **Step 1: Write failing GoalTracker tests**

Add tests that complete and reopen a 12-week task, assert exact timestamps and pending task/lead mutations, repeat a rapid click without duplicate logical mutation, and confirm standard-goal task completion remains unchanged.

- [ ] **Step 2: Run RED**

```bash
npm run test:ui -- src/app/pages/GoalTracker.multi-tab.test.tsx
```

Expected: task/lead mutation assertions fail because GoalTracker currently only saves local state.

- [ ] **Step 3: Replace only the 12-week branch**

Call the canonical commit contract after the optimistic view update. Reconcile `viewUserData` from persisted storage, emit GoalTracker feedback only for `applied` completion, and restore the prior view on local-save failure. Leave the `goal.tasks` branch unchanged.

- [ ] **Step 4: Run GREEN**

Run the GoalTracker focused command and confirm all existing and new tests pass.

### Task 4: Full validation and publication

**Files:**
- Review all changed spec, source, and test files only.

- [ ] **Step 1: Run focused combined verification**

```bash
npm run test:ui -- src/app/pages/GoalTracker.multi-tab.test.tsx src/app/components/twelve-week/TwelveWeekTodayTab.test.tsx
npm run test:sync -- src/features/plan12week/persistence/taskCompletionMutation.test.ts src/features/plan12week/persistence/mutationQueue.test.ts src/features/plan12week/persistence/leadMetricMutation.test.ts
npm run test:slow -- src/features/plan12week/pages/twelve-week-write-safety.test.tsx
```

- [ ] **Step 2: Run required repository verification**

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:sync
npm run test:ops
npm run build
```

- [ ] **Step 3: Inspect diff and acceptance traceability**

Confirm every `CTC-*` rule maps to code/tests, no backend or Dashboard files changed, and no generated artifact is staged.

- [ ] **Step 4: Commit and publish**

Stage only confirmed paths, commit as `fix: canonicalize 12-week task completion`, push `fix/canonical-12week-task-completion`, and create one draft PR against `main` with Problem, Root cause, Solution, Preserved behavior, Verification, and Follow-up sections.
