# Canonical Weekly Review Sync Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the complete Weekly Review contract across every local-first sync boundary and route manual and Assistant writes through one canonical commit.

**Architecture:** Add a non-React `weeklyReviewMutation.ts` persistence authority modeled after canonical task completion. Extend the backend model, handler, repository, import, pull DTO, and frontend hydration additively. Keep UI feedback and legacy direct sync in adapters.

**Tech Stack:** React 18, TypeScript, Vitest, Express, Mongoose, Node test runner.

## Global Constraints

- Base `12a442fd30b118427846428a60b0e9cda69911dd` on branch `fix/canonical-weekly-review-sync-parity`.
- No UI redesign or unrelated AI/analytics/pet work.
- No frontend storage-version bump or destructive migration.
- New backend fields are optional and indexes remain unchanged.
- No `as any` in production code.
- Use test-first RED/GREEN cycles.
- Preserve local-first save, mutation-sync gating, legacy direct sync, Reflection Journal, and scoreboard semantics.

---

### Task 1: Define Backend Canonical Persistence Parity

**Files:**
- Modify: `backend/src/tests/syncSchemaModels.test.ts`
- Modify: `backend/src/tests/syncMutationRoutes.test.ts`
- Modify: `backend/src/models/WeekReviewModel.ts`
- Modify: `backend/src/services/sync-mutations/handlers/WeeklyReviewUpsertHandler.ts`
- Modify: `backend/src/services/sync-mutations/repositories/SyncWorkspaceMutationRepository.ts`
- Modify: `backend/src/services/sync-mutations/repositories/MongoSyncWorkspaceMutationRepository.ts`

**Interfaces:**
- Produces optional string arrays, canonical strings, legacy aliases, and `lastReviewAt?: Date` on `WeeklyReviewUpsertApplyInput`.
- Preserves execution score priority: payload, nested review, lead completion, legacy ratings, zero.

- [ ] **Step 1: Write failing schema and mutation route tests**

Add assertions for:

```ts
assert.deepEqual(review?.commitmentsKept, ["Deep work"]);
assert.deepEqual(review?.commitmentsMissed, ["Exercise"]);
assert.equal(review?.insights, "Morning work was more reliable");
assert.deepEqual(review?.nextWeekCommitments, ["Finish portfolio", "Train twice"]);
assert.equal(review?.keepTactic, "Morning deep work");
assert.equal(review?.reduceTactic, "Optional evening work");
assert.equal(review?.reflection, "Legacy reflection");
assert.equal(review?.adjustments, "Legacy adjustments");
assert.equal(review?.executionScore, 20);
```

- [ ] **Step 2: Run focused backend tests and confirm RED**

Run after backend build with safe test env:

```powershell
npm run build
node --test dist/tests/syncMutationRoutes.test.js dist/tests/syncSchemaModels.test.js
```

Expected: failures show missing schema paths and dropped handler fields, while existing tests remain green.

- [ ] **Step 3: Implement additive model and handler/repository parity**

Use optional fields:

```ts
commitmentsKept?: string[];
commitmentsMissed?: string[];
insights?: string;
nextWeekCommitments?: string[];
keepTactic?: string;
reduceTactic?: string;
reflection?: string;
adjustments?: string;
lastReviewAt?: Date;
```

Normalize arrays with a maximum of five items and build Mongo `$set` values only for fields whose value is not `undefined`, preserving explicit empty strings/arrays.

- [ ] **Step 4: Run focused backend tests and confirm GREEN**

Run the command from Step 2. Expected: all selected tests pass.

### Task 2: Preserve Import And Pull DTO Parity

**Files:**
- Modify: `backend/src/services/twelve-week-import/types.ts`
- Modify: `backend/src/services/twelve-week-import/validators.ts`
- Modify: `backend/src/services/twelve-week-import/payload-builders/weeklyReview.ts`
- Modify: `backend/src/services/twelve-week-import/repository.ts`
- Modify: `backend/src/services/twelveWeekImportValidationService.ts`
- Modify: `backend/src/services/twelveWeekPullService.ts`
- Modify: `backend/src/tests/syncPullRoutes.test.ts`
- Modify: `backend/src/tests/syncMutationRoutes.test.ts`

**Interfaces:**
- Import and pull accept/return the same canonical optional fields as the mutation contract.
- Pull serializes `lastReviewAt` as ISO text and normalizes arrays to at most five strings.

- [ ] **Step 1: Write failing import and pull tests**

Extend fixtures with the complete Week 4 review and assert the pull DTO returns arrays, insight/tactic fields, legacy aliases, explicit execution score, and ISO `lastReviewAt`.

- [ ] **Step 2: Run focused tests and confirm RED**

```powershell
npm run build
node --test dist/tests/syncMutationRoutes.test.js dist/tests/syncPullRoutes.test.js
```

Expected: pull/import assertions fail because current DTO/builders omit canonical fields.

- [ ] **Step 3: Implement import and pull mapping**

Add strict import validation for optional arrays and safe pull normalization:

```ts
function optionalStringArray(value: unknown, fieldPath: string, maxItems = 5): string[] | undefined;
```

Persist `reflection` and `adjustments` from their own fields instead of deriving them from biggest output and next priority.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run the Step 2 command. Expected: all selected tests pass.

### Task 3: Restore Canonical Fields On Frontend Pull

**Files:**
- Modify: `src/services/syncService.ts`
- Modify: `src/features/plan12week/persistence/pulledWorkspaceApply.ts`
- Modify: `src/app/utils/storage-types.ts`
- Modify: `src/app/utils/storage-twelve-week.ts`
- Modify: `src/features/plan12week/persistence/pulledWorkspaceApply.test.ts`
- Modify: `src/features/plan12week/persistence/roundTripSync.test.ts`

**Interfaces:**
- `TwelveWeekPulledWeeklyReview` exposes the complete canonical contract.
- `buildWeeklyReviews()` restores canonical fields with fallback order `insights -> reflection` and `nextWeekCommitments -> nextWeekPriority -> adjustments`.

- [ ] **Step 1: Write failing pull/apply and data-loss regression tests**

Use the canonical Week 4 fixture and assert:

```ts
expect(reconstructed).toEqual(expect.objectContaining({
  executionScore: 81,
  commitmentsKept: ["Deep work"],
  commitmentsMissed: ["Exercise"],
  insights: "Morning work was more reliable",
  nextWeekCommitments: ["Finish portfolio", "Train twice"],
  keepTactic: "Morning deep work",
  reduceTactic: "Optional evening work",
}));
```

Also assert `reflection` does not replace `biggestOutputThisWeek`, and `adjustments` supplies commitments only when canonical priority/array data is absent.

- [ ] **Step 2: Run sync tests and confirm RED**

```powershell
npx vitest run --config vitest.sync.config.ts src/features/plan12week/persistence/pulledWorkspaceApply.test.ts src/features/plan12week/persistence/roundTripSync.test.ts
```

- [ ] **Step 3: Implement DTO and normalization parity**

Normalize arrays with:

```ts
values
  .filter((value): value is string => typeof value === "string")
  .map((value) => value.trim())
  .filter(Boolean)
  .slice(0, 5);
```

Make legacy rating fields optional so Assistant-created reviews can omit them without fake values.

- [ ] **Step 4: Run sync tests and confirm GREEN**

Run the Step 2 command. Expected: both files pass.

### Task 4: Add Canonical Local Review Commit

**Files:**
- Create: `src/features/plan12week/persistence/weeklyReviewMutation.ts`
- Create: `src/features/plan12week/persistence/weeklyReviewMutation.test.ts`
- Modify: `src/features/plan12week/persistence/reviewExecutionScore.ts`
- Create or modify: `src/features/plan12week/persistence/reviewExecutionScore.test.ts`

**Interfaces:**
- Produces `commitTwelveWeekWeeklyReview(input): TwelveWeekWeeklyReviewCommitResult`.
- Reads `getUserData()`, saves through `saveUserData()`, rebuilds scoreboard, and queues through `enqueueStoredMutation()`.

- [ ] **Step 1: Write failing canonical commit tests**

Cover applied save, latest-state merge, exact duplicate no-op, invalid week, local save failure, lag metric update, array normalization, one queue item, and canonical execution-score derivation.

- [ ] **Step 2: Run tests and confirm RED**

```powershell
npx vitest run --config vitest.sync.config.ts src/features/plan12week/persistence/weeklyReviewMutation.test.ts src/features/plan12week/persistence/reviewExecutionScore.test.ts
```

- [ ] **Step 3: Implement the primitive**

Use the public API:

```ts
export interface CommitTwelveWeekWeeklyReviewInput {
  goalId: string;
  review: Pick<UniversalWeeklyReview, "weekNumber"> & Partial<Omit<UniversalWeeklyReview, "weekNumber">>;
  lagMetricCurrentValue?: string;
  now?: number | Date;
}
```

Queue the complete merged review with top-level `executionScore`. Compare normalized persisted state before generating automatic `lastReviewAt`, so exact duplicates remain no-ops.

- [ ] **Step 4: Run tests and confirm GREEN**

Run the Step 2 command. Expected: all canonical commit tests pass.

### Task 5: Route Manual Review And Assistant Through The Canonical Commit

**Files:**
- Modify: `src/features/plan12week/pages/12WeekSystem/useTwelveWeekExecutionActions.ts`
- Modify: `src/features/plan12week/pages/12WeekSystem/useTwelveWeekExecutionActions.test.tsx`
- Modify: `src/app/features/assistant/executeAction.ts`
- Modify: `src/app/features/assistant/__tests__/executeAction.test.ts`

**Interfaces:**
- Manual UI passes the full review and lag metric, updates React state from the result, then performs Reflection Journal/feedback/legacy sync.
- Assistant passes only supplied fields plus canonical aliases and relies on the primitive for latest-state merge and score derivation.

- [ ] **Step 1: Write failing adapter tests**

Manual test asserts one canonical review queue item, persisted Reflection Journal, updated scoreboard, one feedback call, and no duplicate queue write. Assistant tests assert `saveUserData` is not the review authority, one mutation is queued, no fake ratings are added, and unrelated existing fields survive a partial update.

- [ ] **Step 2: Run tests and confirm RED**

```powershell
npx vitest run --config vitest.ui.config.ts src/features/plan12week/pages/12WeekSystem/useTwelveWeekExecutionActions.test.tsx
npx vitest run --config vitest.fast.config.ts src/app/features/assistant/__tests__/executeAction.test.ts
```

- [ ] **Step 3: Implement thin adapters**

Remove the hook-local `enqueueWeeklyReviewUpsertedMutation` and Assistant direct array mutation. Stop side effects on `not_found` or `local_save_failed`; preserve current feedback and direct-sync behavior after local success.

- [ ] **Step 4: Run tests and confirm GREEN**

Run the Step 2 commands. Expected: both adapter suites pass.

### Task 6: Prove Two-Device Meaning Preservation

**Files:**
- Modify: `src/test/twoDeviceHarness.ts`
- Modify: `src/features/plan12week/hooks/twoDeviceSync.e2e.test.tsx`

**Interfaces:**
- Harness echo includes every canonical review field.
- Device B receives the exact Week 4 meaning saved on Device A.

- [ ] **Step 1: Write the failing two-device test**

Seed Device A with the canonical Week 4 fixture, drain, hydrate Device B, and assert commitments, insight, next commitments, obstacle, workload, tactics, and execution score.

- [ ] **Step 2: Run and confirm RED**

```powershell
npx vitest run --config vitest.sync.config.ts src/features/plan12week/hooks/twoDeviceSync.e2e.test.tsx
```

- [ ] **Step 3: Extend the harness serializer**

Carry all canonical fields through `workspaceFromUserData()` and use `review.executionScore ?? review.leadCompletionPercent` in queued test mutations.

- [ ] **Step 4: Run and confirm GREEN**

Run the Step 2 command. Expected: the two-device suite passes.

### Task 7: Full Verification And Integration

**Files:**
- Review all branch changes.
- Update this plan checkboxes only if useful; no unrelated docs.

- [ ] **Step 1: Run focused tests again**

Run all commands from Tasks 1-6.

- [ ] **Step 2: Run frontend verification**

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
```

- [ ] **Step 3: Run backend verification**

```powershell
npm --prefix backend run check
npm --prefix backend test
```

Provide safe test env variables when required; do not use production secrets.

- [ ] **Step 4: Review scope and acceptance traceability**

Confirm every `WR-*` rule maps to code/tests and confirm no visual redesign, storage-version bump, migration, or unrelated work entered the diff.

- [ ] **Step 5: Commit, push, and create PR**

Use focused commits and PR title:

```text
fix: preserve weekly reviews across sync
```

The PR body must describe problem, root cause, canonical local commit, additive parity, score semantics, backward compatibility, exact verification, and the follow-up:

> Weekly Review V2 Auto Summary + Deterministic Insights can now be built on a trustworthy round-trip review contract.

