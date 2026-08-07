# Safe Local Data Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the immediate Settings JSON overwrite with a previewed, sanitized, recoverable local-data import transaction that pauses real-mode cloud sync until the user explicitly validates and confirms the supported 12-week upload or restores the previous local state.

**Architecture:** Keep candidate parsing and sanitization in a focused app utility, add an exact storage replacement primitive that bypasses normal mutation-preserving merges, and place owner queue/cursor transaction handling beside the 12-week persistence stores. `useAutoCloudSync` observes an auth-scoped pending marker and blocks every generic sync trigger, while a Settings-owned manager component handles file preview, two-step confirmation, cloud dry-run/import, and recovery.

**Tech Stack:** React 18, TypeScript, Vite 6, localStorage, Firebase auth context, existing 12-week mutation queue/pull cursor/import contracts, Radix `AlertDialog`, Vitest, Testing Library, Biome.

## Global Constraints

- Follow `docs/specs/2026-08-07-safe-local-data-import.md`; requirement IDs `LOCAL-IMPORT-001` through `LOCAL-IMPORT-038` are authoritative.
- Work in the current checkout already approved by the user; do not create a worktree or switch branches.
- Keep existing Dashboard, DashboardHero, ScheduleStep, ops, `.qoder`, UI audit, and unrelated WIP untouched and unstaged.
- Import semantics are replace-only. Do not add merge import, record-level choices, or complete cloud replacement.
- Never restore `subscription`, `entitlements`, `eventLog`, `syncOutbox`, experiment assignments, notification schedules, push subscriptions, privacy consents, Firebase credentials, roles, link stores, mutation queues, or pull cursors from the selected file.
- Preserve the current active `UserData.userId`; ignore the file's `userId` and clear `isHydratedFromDemo`.
- Create the recovery snapshot before the pending marker, queue/cursor clear, or exact UserData replacement.
- In authenticated real mode, persist the auth-scoped pending marker before exact replacement emits `USER_DATA_UPDATED_EVENT_NAME`.
- Demo, signed-out, and unconfigured paths remain local-only and call no protected backend endpoint.
- Backend routes and request types remain unchanged: reuse `post12WeekImportValidation` and `post12WeekImport`.
- Do not introduce dependencies or change the `UserData` shape.
- Every production behavior change follows RED -> verify expected failure -> minimal GREEN -> focused regression verification.

---

### Task 1: Add an exact, rollback-safe UserData replacement primitive

**Files:**
- Create: `src/app/utils/storage-import-replace.test.ts`
- Modify: `src/app/utils/storage.ts:8-13`
- Modify: `src/app/utils/storage.ts:778-812`

**Interfaces:**
- Consumes: `normalizeUserData(data: UserData)`, `readActiveAuthOwnerUid()`, `getScopedUserDataStorageKey(authUid)`, storage cache and existing mutation notifications.
- Produces: `replaceUserData(data: UserData): boolean`.
- Preserves: `saveUserData(data: UserData): boolean` and its current task-mutation merge behavior.

- [ ] **Step 1: Write failing exact-replacement tests**

Create `src/app/utils/storage-import-replace.test.ts` with a current record whose newer task state would normally win in `saveUserData`, then assert exact replacement keeps the imported older state, mirrors only to the active auth scope, and restores active/scoped storage when the scoped write fails:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getScopedUserDataStorageKey } from "./storage-auth-scope";
import { AUTH_OWNER_STORAGE_KEY, USER_DATA_STORAGE_KEY } from "./storage-constants";
import { getUserData, replaceUserData, resetUserDataCache, saveUserData } from "./storage";
import type { Goal, UserData } from "./storage-types";

function createGoal(completed: boolean, updatedAt: string): Goal {
  return {
    id: "goal_import_replace",
    category: "career",
    title: "Safe restore",
    description: "Restore exactly",
    deadline: "2026-12-31",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt,
    tasks: [
      {
        id: "task_import_replace",
        title: "Imported task",
        completed,
        updatedAt,
      },
    ],
  };
}

function withGoal(base: UserData, goal: Goal): UserData {
  return { ...base, goals: [goal] };
}

describe("replaceUserData", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces older imported task state instead of merging the newer local task", () => {
    const base = getUserData();
    saveUserData(withGoal(base, createGoal(true, "2026-08-07T10:00:00.000Z")));

    const imported = withGoal(base, createGoal(false, "2026-08-01T10:00:00.000Z"));

    expect(replaceUserData(imported)).toBe(true);
    expect(getUserData().goals[0]?.tasks[0]?.completed).toBe(false);
  });

  it("mirrors the exact serialized data only to the active auth owner", () => {
    const base = getUserData();
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "owner_a");
    localStorage.setItem(getScopedUserDataStorageKey("owner_b"), JSON.stringify({ owner: "b" }));

    expect(replaceUserData({ ...base, userId: "current_local_identity" })).toBe(true);

    expect(localStorage.getItem(getScopedUserDataStorageKey("owner_a"))).toBe(
      localStorage.getItem(USER_DATA_STORAGE_KEY),
    );
    expect(localStorage.getItem(getScopedUserDataStorageKey("owner_b"))).toBe(JSON.stringify({ owner: "b" }));
  });

  it("rolls active and scoped storage back when exact replacement cannot finish", () => {
    const base = getUserData();
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "owner_a");
    const scopedKey = getScopedUserDataStorageKey("owner_a");
    const activeBefore = localStorage.getItem(USER_DATA_STORAGE_KEY);
    localStorage.setItem(scopedKey, activeBefore ?? "");
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === scopedKey && value.includes("replacement_identity")) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    expect(replaceUserData({ ...base, userId: "replacement_identity" })).toBe(false);
    expect(localStorage.getItem(USER_DATA_STORAGE_KEY)).toBe(activeBefore);
    expect(localStorage.getItem(scopedKey)).toBe(activeBefore);
  });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
npm run test:run -- src/app/utils/storage-import-replace.test.ts
```

Expected: FAIL because `replaceUserData` is not exported.

- [ ] **Step 3: Implement exact replacement without changing normal saves**

Extend the storage-auth imports:

```ts
import {
  activateAuthenticatedUserDataInStorage,
  getScopedUserDataStorageKey,
  mirrorUserDataToActiveAuthScope,
  persistActiveAuthenticatedUserDataInStorage,
  readActiveAuthOwnerUid,
  removeKnownAuxiliaryUserData,
} from "./storage-auth-scope";
```

Add a private storage restore helper and the exact replacement after `saveUserData`:

```ts
function restoreStorageValue(key: string, value: string | null): void {
  if (value === null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

export function replaceUserData(data: UserData): boolean {
  const normalized = normalizeUserData(data);
  const serialized = JSON.stringify(normalized);
  const ownerUid = readActiveAuthOwnerUid();
  const scopedKey = ownerUid ? getScopedUserDataStorageKey(ownerUid) : null;
  const activeBefore = localStorage.getItem(STORAGE_KEY);
  const scopedBefore = scopedKey ? localStorage.getItem(scopedKey) : null;
  const cacheBefore = _cachedUserData;
  const cacheHashBefore = _cachedRawHash;

  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    if (scopedKey) localStorage.setItem(scopedKey, serialized);
    _cachedUserData = normalized;
    _cachedRawHash = serialized;
    postUserDataMutation({ at: Date.now(), source: userDataMutationSource });
    notifyUserDataUpdated();
    return true;
  } catch (error) {
    try {
      restoreStorageValue(STORAGE_KEY, activeBefore);
      if (scopedKey) restoreStorageValue(scopedKey, scopedBefore);
    } finally {
      _cachedUserData = cacheBefore;
      _cachedRawHash = cacheHashBefore;
    }

    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      void import("sonner").then(({ toast }) => {
        toast.error("Bộ nhớ trên thiết bị này đã đầy. Dữ liệu chưa được lưu.", {
          description: "Hãy xóa bớt board hoặc ảnh đã tải lên để giải phóng dung lượng, sau đó thử lại.",
          duration: 8000,
        });
      });
      return false;
    }

    throw error;
  }
}
```

Do not route `saveUserData` through this function; normal writes must retain `mergeUserDataTaskMutations`.

- [ ] **Step 4: Run focused storage tests and verify GREEN**

Run:

```bash
npm run test:run -- src/app/utils/storage-import-replace.test.ts src/app/utils/storage-save-merge.test.ts src/app/hooks/useSyncedUserData.test.tsx
```

Expected: exact replacement tests pass; existing latest-task merge and update-event tests remain green.

- [ ] **Step 5: Commit Task 1**

```bash
git add -- src/app/utils/storage.ts src/app/utils/storage-import-replace.test.ts
git commit -m "refactor(storage): add exact user data replacement"
```

---

### Task 2: Parse, sanitize, summarize, and fingerprint import candidates

**Files:**
- Create: `src/app/utils/local-data-import.ts`
- Create: `src/app/utils/local-data-import.test.ts`
- Modify: `src/app/utils/storage-constants.ts:17-59`

**Interfaces:**
- Consumes: `parseStoredUserData(raw)`, `createSanitizedLocalUserDataBackup(data)`, current `UserData`.
- Produces:
  - `MAX_LOCAL_DATA_IMPORT_BYTES`
  - `LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME`
  - `LocalDataImportSummary`
  - `LocalDataImportCandidate`
  - `LocalDataImportCandidateResult`
  - `summarizeLocalDataImport(data)`
  - `fingerprintLocalDataImport(data)`
  - `prepareLocalDataImportCandidate(input)`
- Adds storage constants:
  - `LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX`
  - `LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX`

- [ ] **Step 1: Write failing candidate tests**

Create tests for the size limit, invalid/partial JSON, summary counts, sanitization, identity rebinding, and stable fingerprints:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createDataExportJson } from "./local-data-backup";
import {
  MAX_LOCAL_DATA_IMPORT_BYTES,
  fingerprintLocalDataImport,
  prepareLocalDataImportCandidate,
  summarizeLocalDataImport,
} from "./local-data-import";
import { getUserData, resetUserDataCache } from "./storage";

describe("local data import candidate", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
  });

  it("rejects an oversized file before parsing", () => {
    const result = prepareLocalDataImportCandidate({
      fileName: "too-large.json",
      sizeBytes: MAX_LOCAL_DATA_IMPORT_BYTES + 1,
      text: "{}",
      currentData: getUserData(),
    });
    expect(result).toEqual({ status: "invalid", reason: "file_too_large" });
  });

  it("rejects invalid JSON and partial account exports", () => {
    const currentData = getUserData();
    expect(
      prepareLocalDataImportCandidate({ fileName: "bad.json", sizeBytes: 4, text: "{bad", currentData }),
    ).toMatchObject({ status: "invalid", reason: "invalid_backup" });
    expect(
      prepareLocalDataImportCandidate({
        fileName: "partial.json",
        sizeBytes: 100,
        text: createDataExportJson(currentData),
        currentData,
      }),
    ).toMatchObject({ status: "invalid", reason: "invalid_backup" });
  });

  it("sanitizes account-bound fields and preserves the current identity", () => {
    const currentData = { ...getUserData(), userId: "current_identity" };
    const fileData = {
      ...currentData,
      userId: "foreign_identity",
      subscription: {
        planCode: "PLUS",
        status: "active",
        billingCycle: "monthly",
        startedAt: "2026-08-01T00:00:00.000Z",
        providerMode: "api_contract",
      },
      entitlements: [
        {
          key: "advanced_analytics",
          sourcePlan: "PLUS",
          grantedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      eventLog: [{ id: "event_1", type: "test", createdAt: "2026-08-07T00:00:00.000Z" }],
      syncOutbox: [],
      isHydratedFromDemo: true,
    };

    const result = prepareLocalDataImportCandidate({
      fileName: "backup.json",
      sizeBytes: 100,
      text: JSON.stringify(fileData),
      currentData,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("candidate not ready");
    expect(result.candidate.data.userId).toBe("current_identity");
    expect(result.candidate.data.subscription).toBeNull();
    expect(result.candidate.data.entitlements).toEqual([]);
    expect(result.candidate.data.eventLog).toEqual([]);
    expect(result.candidate.data.isHydratedFromDemo).not.toBe(true);
  });

  it("summarizes supported product records and creates stable change fingerprints", () => {
    const data = getUserData();
    expect(summarizeLocalDataImport(data)).toMatchObject({ goalCount: data.goals.length });
    expect(fingerprintLocalDataImport(data)).toBe(fingerprintLocalDataImport(JSON.parse(JSON.stringify(data))));
  });
});
```

- [ ] **Step 2: Run candidate tests and verify RED**

Run:

```bash
npm run test:run -- src/app/utils/local-data-import.test.ts
```

Expected: FAIL because the module and exports do not exist.

- [ ] **Step 3: Add storage prefixes and candidate implementation**

Add to `storage-constants.ts`:

```ts
export const LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX = "visionboard_local_file_import_recovery:";
export const LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX = "visionboard_local_file_import_pending:auth:";
```

Add both prefixes to `AUXILIARY_USER_DATA_STORAGE_PREFIXES` so explicit `deleteAllUserData()` removes them. Do not add them to `clearAuthScopedSensitiveData`; unresolved owner-scoped recovery must survive logout/account switching.

Create `local-data-import.ts`:

```ts
import { createSanitizedLocalUserDataBackup } from "./local-data-backup";
import { parseStoredUserData } from "./storage";
import type { TwelveWeekSystem, UserData } from "./storage-types";

export const MAX_LOCAL_DATA_IMPORT_BYTES = 10 * 1024 * 1024;
export const LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME = "visionboard:local-file-import-state-changed";

export interface LocalDataImportSummary {
  goalCount: number;
  twelveWeekSystemCount: number;
  taskCount: number;
  dailyCheckInCount: number;
  weeklyReviewCount: number;
  wheelRecordCount: number;
  reflectionCount: number;
  visionBoardCount: number;
}

export interface LocalDataImportCandidate {
  fileName: string;
  data: UserData;
  fingerprint: string;
  currentFingerprint: string;
  currentSummary: LocalDataImportSummary;
  importedSummary: LocalDataImportSummary;
}

export type LocalDataImportCandidateResult =
  | { status: "ready"; candidate: LocalDataImportCandidate }
  | { status: "invalid"; reason: "file_too_large" | "invalid_backup" };

function getSystems(data: UserData): TwelveWeekSystem[] {
  return data.goals
    .map((goal) => goal.twelveWeekSystem)
    .filter((system): system is TwelveWeekSystem => Boolean(system));
}

export function summarizeLocalDataImport(data: UserData): LocalDataImportSummary {
  const systems = getSystems(data);
  return {
    goalCount: data.goals.length,
    twelveWeekSystemCount: systems.length,
    taskCount:
      data.goals.reduce((total, goal) => total + goal.tasks.length, 0) +
      systems.reduce((total, system) => total + system.taskInstances.length, 0),
    dailyCheckInCount: systems.reduce((total, system) => total + system.dailyCheckIns.length, 0),
    weeklyReviewCount: systems.reduce((total, system) => total + system.weeklyReviews.length, 0),
    wheelRecordCount: data.wheelOfLifeHistory.length + (data.currentWheelOfLife.some((area) => area.score > 0) ? 1 : 0),
    reflectionCount: data.reflections.length,
    visionBoardCount: data.visionBoards.length,
  };
}

export function fingerprintLocalDataImport(data: UserData): string {
  const raw = JSON.stringify(data);
  let hash = 2_166_136_261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${raw.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

export function prepareLocalDataImportCandidate(input: {
  fileName: string;
  sizeBytes: number;
  text: string;
  currentData: UserData;
}): LocalDataImportCandidateResult {
  if (input.sizeBytes > MAX_LOCAL_DATA_IMPORT_BYTES) {
    return { status: "invalid", reason: "file_too_large" };
  }

  const parsed = parseStoredUserData(input.text);
  if (!parsed) return { status: "invalid", reason: "invalid_backup" };

  const sanitized = createSanitizedLocalUserDataBackup(parsed);
  const data: UserData = {
    ...sanitized,
    userId: input.currentData.userId,
    isHydratedFromDemo: undefined,
  };

  return {
    status: "ready",
    candidate: {
      fileName: input.fileName,
      data,
      fingerprint: fingerprintLocalDataImport(data),
      currentFingerprint: fingerprintLocalDataImport(input.currentData),
      currentSummary: summarizeLocalDataImport(input.currentData),
      importedSummary: summarizeLocalDataImport(data),
    },
  };
}
```

- [ ] **Step 4: Run candidate and backup regression tests**

Run:

```bash
npm run test:run -- src/app/utils/local-data-import.test.ts src/app/utils/local-data-backup.test.ts
```

Expected: candidate tests pass and existing sanitized backup behavior remains green.

- [ ] **Step 5: Commit Task 2**

```bash
git add -- src/app/utils/storage-constants.ts src/app/utils/local-data-import.ts src/app/utils/local-data-import.test.ts
git commit -m "feat(import): prepare safe local backup candidates"
```

---

### Task 3: Add owner-safe recovery, replacement, and pending-marker transactions

**Files:**
- Create: `src/features/plan12week/persistence/localDataImportTransaction.ts`
- Create: `src/features/plan12week/persistence/localDataImportTransaction.test.ts`
- Modify: `src/features/plan12week/persistence/pullCursorStore.ts:20-31`
- Modify: `src/features/plan12week/persistence/pullCursorStore.test.ts`

**Interfaces:**
- Consumes: `replaceUserData`, `getUserData`, `resetUserDataCache`, active auth owner/scoped keys, mutation queue key, pull cursor key, candidate summary/fingerprints.
- Produces:
  - `LocalDataImportPendingMarker`
  - `LocalDataImportRecoverySnapshot`
  - `LocalDataImportApplyResult`
  - `LocalDataImportRestoreResult`
  - `getPullCursorStorageKey(authUid)`
  - `getPendingLocalDataImport(ownerUid)`
  - `listLocalDataImportRecoverySnapshots(ownerUid)`
  - `applyLocalDataImportTransaction(options)`
  - `restoreLocalDataImportRecovery(options)`
  - `resolveLocalDataImportAfterCloud(ownerUid, importId)`
  - `cleanupExpiredLocalDataImportRecoveries(now)`

- [ ] **Step 1: Export and test the pull-cursor storage key**

Add a focused test:

```ts
it("exports the encoded auth-scoped storage key", () => {
  expect(getPullCursorStorageKey("user/a")).toBe(
    `${PULL_CURSOR_STORAGE_PREFIX}${encodeURIComponent("user/a")}`,
  );
});
```

Change the private cursor key helper to:

```ts
export function getPullCursorStorageKey(authUid: string): string {
  return `${PULL_CURSOR_STORAGE_PREFIX}${encodeURIComponent(authUid)}`;
}
```

Use it in `readPullCursorState`, `writePullCursorState`, and `clearPullCursor`.

- [ ] **Step 2: Write failing transaction tests**

Create tests with explicit owner A/owner B queue and cursor values:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_OWNER_STORAGE_KEY, LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX } from "@/app/utils/storage-constants";
import type { Goal, UserData } from "@/app/utils/storage-types";
import { fingerprintLocalDataImport, summarizeLocalDataImport } from "@/app/utils/local-data-import";
import * as storageModule from "@/app/utils/storage";
import { getUserData, resetUserDataCache, saveUserData } from "@/app/utils/storage";
import {
  createEmptyMutationQueueStore,
  getMutationQueueStorageKey,
  readMutationQueueStore,
  writeMutationQueueStore,
} from "./mutationQueue";
import { getPullCursorStorageKey, readPullCursorState, recordSuccessfulPull } from "./pullCursorStore";
import {
  applyLocalDataImportTransaction,
  cleanupExpiredLocalDataImportRecoveries,
  getPendingLocalDataImport,
  resolveLocalDataImportAfterCloud,
  restoreLocalDataImportRecovery,
} from "./localDataImportTransaction";

function createGoal(id: string): Goal {
  return {
    id,
    category: "career",
    title: id,
    description: "Import transaction fixture",
    deadline: "2026-12-31",
    createdAt: "2026-08-01T00:00:00.000Z",
    tasks: [],
  };
}

function createCandidate(currentUserId: string, importedGoalId: string) {
  const currentData = { ...getUserData(), userId: currentUserId };
  saveUserData(currentData);
  const importedData: UserData = {
    ...currentData,
    goals: [createGoal(importedGoalId)],
    eventLog: [],
    syncOutbox: [],
    subscription: null,
    entitlements: [],
    experimentAssignments: [],
    emailReminderSchedule: [],
    pushSubscription: null,
    privacyConsents: [],
    isHydratedFromDemo: undefined,
  };
  return {
    fileName: "restore.json",
    data: importedData,
    fingerprint: fingerprintLocalDataImport(importedData),
    currentFingerprint: fingerprintLocalDataImport(currentData),
    currentSummary: summarizeLocalDataImport(currentData),
    importedSummary: summarizeLocalDataImport(importedData),
  };
}

function seedOwnerSyncState(ownerUid: string, mutationId: string, cursor: string): void {
  const empty = createEmptyMutationQueueStore({ ownerUid, deviceId: `device_${ownerUid}` });
  writeMutationQueueStore({
    ...empty,
    items: [
      {
        id: mutationId,
        idempotencyKey: `idempotency_${mutationId}`,
        collapseKey: `task_completed_changed:goal_${ownerUid}:task_${ownerUid}`,
        ownerUid,
        goalId: `goal_${ownerUid}`,
        planId: `plan_${ownerUid}`,
        kind: "task_completed_changed",
        payload: {
          taskId: `task_${ownerUid}`,
          clientTaskId: `task_${ownerUid}`,
          clientPlanId: `plan_${ownerUid}`,
          clientWeekId: `week_${ownerUid}_1`,
          weekNumber: 1,
          completed: true,
          completedAt: "2026-08-07T09:00:00.000Z",
          scheduledDate: "2026-08-07",
          title: "Pending task",
        },
        status: "pending",
        attemptCount: 0,
        maxAttempts: 5,
        createdAt: "2026-08-07T09:00:00.000Z",
        updatedAt: "2026-08-07T09:00:00.000Z",
      },
    ],
  });
  recordSuccessfulPull(ownerUid, cursor, { now: "2026-08-07T09:00:00.000Z" });
}

function captureExpectedState(ownerUid: string) {
  return {
    data: JSON.stringify(getUserData()),
    queueRaw: localStorage.getItem(getMutationQueueStorageKey(ownerUid)),
    cursorRaw: localStorage.getItem(getPullCursorStorageKey(ownerUid)),
    pendingRaw: localStorage.getItem(
      `${LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX}${encodeURIComponent(ownerUid)}`,
    ),
  };
}

describe("local data file import transaction", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
    localStorage.setItem(AUTH_OWNER_STORAGE_KEY, "owner_a");
    saveUserData({ ...getUserData(), userId: "current_identity", goals: [createGoal("current_goal")] });
    seedOwnerSyncState("owner_a", "mutation_a", "cursor_before");
    seedOwnerSyncState("owner_b", "mutation_b", "cursor_b");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates recovery and pending state before exact replacement", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    const result = applyLocalDataImportTransaction({
      candidate,
      ownerUid: "owner_a",
      pauseCloudSync: true,
      now: new Date("2026-08-07T10:00:00.000Z"),
    });

    expect(result.status).toBe("applied");
    expect(getPendingLocalDataImport("owner_a")).toMatchObject({
      ownerUid: "owner_a",
      candidateFingerprint: candidate.fingerprint,
    });
    expect(readMutationQueueStore("owner_a").items).toEqual([]);
    expect(readPullCursorState("owner_a").lastSuccessfulPullCursor).toBeNull();
    expect(getUserData().goals[0]?.id).toBe("imported_goal");
    expect(readMutationQueueStore("owner_b").items).toHaveLength(1);
  });

  it("blocks stale previews and nested pending transactions", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    saveUserData({ ...getUserData(), goals: [createGoal("changed_after_preview")] });
    expect(
      applyLocalDataImportTransaction({ candidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "fingerprint_mismatch" });

    const freshCandidate = createCandidate("current_identity", "first_import_goal");
    expect(
      applyLocalDataImportTransaction({ candidate: freshCandidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "applied" });
    const nestedCandidate = createCandidate("current_identity", "second_import_goal");
    expect(
      applyLocalDataImportTransaction({ candidate: nestedCandidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "pending_exists" });
  });

  it("rejects an owner that is not the active auth scope", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    expect(
      applyLocalDataImportTransaction({ candidate, ownerUid: "owner_b", pauseCloudSync: true }),
    ).toMatchObject({ status: "owner_mismatch" });
    expect(getPendingLocalDataImport("owner_b")).toBeNull();
  });

  it("restores all touched state when replacement fails", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    const before = captureExpectedState("owner_a");
    vi.spyOn(storageModule, "replaceUserData").mockReturnValue(false);

    const result = applyLocalDataImportTransaction({
      candidate,
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });

    expect(result.status).toBe("write_failed");
    expect(captureExpectedState("owner_a")).toEqual(before);
  });

  it("leaves every current value unchanged when the recovery snapshot cannot be written", () => {
    const candidate = createCandidate("current_identity", "imported_goal");
    const before = captureExpectedState("owner_a");
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith("visionboard_local_file_import_recovery:")) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    expect(
      applyLocalDataImportTransaction({ candidate, ownerUid: "owner_a", pauseCloudSync: true }),
    ).toMatchObject({ status: "snapshot_failed" });
    expect(captureExpectedState("owner_a")).toEqual(before);
  });

  it("restores the matching owner's data queue and cursor and rejects another owner", () => {
    const applied = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });
    if (applied.status !== "applied") throw new Error("import not applied");

    expect(
      restoreLocalDataImportRecovery({ recoveryKey: applied.recoveryKey, ownerUid: "owner_b" }),
    ).toMatchObject({ status: "owner_mismatch" });
    expect(
      restoreLocalDataImportRecovery({ recoveryKey: applied.recoveryKey, ownerUid: "owner_a" }),
    ).toMatchObject({ status: "restored" });
    expect(getPendingLocalDataImport("owner_a")).toBeNull();
    expect(readMutationQueueStore("owner_a").items).toHaveLength(1);
    expect(readPullCursorState("owner_a").lastSuccessfulPullCursor).toBe("cursor_before");
  });

  it("rolls the imported state back into place when recovery cannot restore the saved queue", () => {
    const applied = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });
    if (applied.status !== "applied") throw new Error("import not applied");
    const originalSetItem = Storage.prototype.setItem;
    const queueKey = getMutationQueueStorageKey("owner_a");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === queueKey) throw new DOMException("quota", "QuotaExceededError");
      return originalSetItem.call(this, key, value);
    });

    expect(
      restoreLocalDataImportRecovery({ recoveryKey: applied.recoveryKey, ownerUid: "owner_a" }),
    ).toEqual({ status: "write_failed" });
    expect(getUserData().goals[0]?.id).toBe("imported_goal");
    expect(getPendingLocalDataImport("owner_a")?.importId).toBe(applied.importId);
  });

  it("keeps recovery but clears pending only after applied or duplicate cloud resolution", () => {
    const applied = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
    });
    if (applied.status !== "applied") throw new Error("import not applied");
    expect(resolveLocalDataImportAfterCloud("owner_a", "wrong_import_id")).toBe(false);
    expect(resolveLocalDataImportAfterCloud("owner_a", applied.importId)).toBe(true);
    expect(getPendingLocalDataImport("owner_a")).toBeNull();
    expect(localStorage.getItem(applied.recoveryKey)).not.toBeNull();
  });

  it("expires recovery snapshots after seven days", () => {
    const snapshot = applyLocalDataImportTransaction({
      candidate: createCandidate("current_identity", "imported_goal"),
      ownerUid: "owner_a",
      pauseCloudSync: true,
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    if (snapshot.status !== "applied") throw new Error("import not applied");
    cleanupExpiredLocalDataImportRecoveries(new Date("2026-08-08T00:00:00.001Z"));
    expect(localStorage.getItem(snapshot.recoveryKey)).toBeNull();
  });

  it("rejects missing and corrupt recovery snapshots without modifying active data", () => {
    const before = JSON.stringify(getUserData());
    expect(
      restoreLocalDataImportRecovery({ recoveryKey: "missing_recovery", ownerUid: "owner_a" }),
    ).toEqual({ status: "missing" });
    localStorage.setItem("visionboard_local_file_import_recovery:auth:owner_a:corrupt", "{bad");
    expect(
      restoreLocalDataImportRecovery({
        recoveryKey: "visionboard_local_file_import_recovery:auth:owner_a:corrupt",
        ownerUid: "owner_a",
      }),
    ).toEqual({ status: "invalid" });
    expect(JSON.stringify(getUserData())).toBe(before);
  });
});
```

- [ ] **Step 3: Run transaction tests and verify RED**

Run:

```bash
npm run test:run -- src/features/plan12week/persistence/localDataImportTransaction.test.ts src/features/plan12week/persistence/pullCursorStore.test.ts
```

Expected: FAIL because the transaction module and exported cursor-key helper do not exist.

- [ ] **Step 4: Implement typed marker/snapshot parsing and keys**

Create the transaction module with these public shapes:

```ts
import { createSanitizedLocalUserDataBackup } from "@/app/utils/local-data-backup";
import {
  fingerprintLocalDataImport,
  LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME,
  type LocalDataImportCandidate,
  type LocalDataImportSummary,
} from "@/app/utils/local-data-import";
import { getUserData, parseStoredUserData, replaceUserData, resetUserDataCache } from "@/app/utils/storage";
import { readActiveAuthOwnerUid } from "@/app/utils/storage-auth-scope";
import {
  LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX,
  LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX,
} from "@/app/utils/storage-constants";
import type { UserData } from "@/app/utils/storage-types";
import { getMutationQueueStorageKey } from "./mutationQueue";
import { getPullCursorStorageKey } from "./pullCursorStore";

export interface LocalDataImportPendingMarker {
  version: 1;
  importId: string;
  ownerUid: string;
  recoveryKey: string;
  candidateFingerprint: string;
  createdAt: string;
  summary: LocalDataImportSummary;
}

export interface LocalDataImportRecoverySnapshot {
  version: 1;
  importId: string;
  ownerUid: string | null;
  createdAt: string;
  expiresAt: string;
  previousData: UserData;
  mutationQueueRaw: string | null;
  pullCursorRaw: string | null;
}

export type LocalDataImportApplyResult =
  | { status: "applied"; importId: string; recoveryKey: string; pending: LocalDataImportPendingMarker | null }
  | { status: "owner_mismatch" | "fingerprint_mismatch" | "pending_exists" | "snapshot_failed" | "write_failed" };

export type LocalDataImportRestoreResult =
  | { status: "restored" }
  | { status: "missing" | "expired" | "invalid" | "owner_mismatch" | "write_failed" };
```

Use exact auth-scoped keys:

```ts
function getPendingKey(ownerUid: string): string {
  return `${LOCAL_DATA_FILE_IMPORT_PENDING_AUTH_STORAGE_PREFIX}${encodeURIComponent(ownerUid)}`;
}

function getRecoveryKey(ownerUid: string | null, importId: string): string {
  const ownerPart = ownerUid ? `auth:${encodeURIComponent(ownerUid)}` : "anonymous";
  return `${LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX}${ownerPart}:${importId}`;
}
```

Add bounded parsers and storage/event helpers:

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSummary(value: unknown): value is LocalDataImportSummary {
  if (!isRecord(value)) return false;
  return [
    "goalCount",
    "twelveWeekSystemCount",
    "taskCount",
    "dailyCheckInCount",
    "weeklyReviewCount",
    "wheelRecordCount",
    "reflectionCount",
    "visionBoardCount",
  ].every((key) => {
    const field = value[key];
    return typeof field === "number" && Number.isFinite(field) && field >= 0;
  });
}

function parsePendingMarker(raw: string | null): LocalDataImportPendingMarker | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      typeof value.importId !== "string" ||
      typeof value.ownerUid !== "string" ||
      typeof value.recoveryKey !== "string" ||
      typeof value.candidateFingerprint !== "string" ||
      typeof value.createdAt !== "string" ||
      !isSummary(value.summary)
    ) {
      return null;
    }
    return value as unknown as LocalDataImportPendingMarker;
  } catch {
    return null;
  }
}

function parseRecoverySnapshot(raw: string | null): LocalDataImportRecoverySnapshot | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      typeof value.importId !== "string" ||
      !(typeof value.ownerUid === "string" || value.ownerUid === null) ||
      typeof value.createdAt !== "string" ||
      typeof value.expiresAt !== "string" ||
      !(typeof value.mutationQueueRaw === "string" || value.mutationQueueRaw === null) ||
      !(typeof value.pullCursorRaw === "string" || value.pullCursorRaw === null)
    ) {
      return null;
    }
    const previousData = parseStoredUserData(JSON.stringify(value.previousData));
    if (!previousData) return null;
    return {
      version: 1,
      importId: value.importId,
      ownerUid: value.ownerUid,
      createdAt: value.createdAt,
      expiresAt: value.expiresAt,
      previousData,
      mutationQueueRaw: value.mutationQueueRaw,
      pullCursorRaw: value.pullCursorRaw,
    };
  } catch {
    return null;
  }
}

function restoreStorageItem(key: string | null, raw: string | null): void {
  if (!key) return;
  if (raw === null) localStorage.removeItem(key);
  else localStorage.setItem(key, raw);
}

function dispatchLocalDataImportStateChanged(): void {
  window.dispatchEvent(new Event(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME));
}

export function getPendingLocalDataImport(ownerUid: string | null | undefined): LocalDataImportPendingMarker | null {
  const normalized = ownerUid?.trim() ?? "";
  if (!normalized) return null;
  const marker = parsePendingMarker(localStorage.getItem(getPendingKey(normalized)));
  return marker?.ownerUid === normalized ? marker : null;
}

export function listLocalDataImportRecoverySnapshots(
  ownerUid: string | null,
): Array<LocalDataImportRecoverySnapshot & { key: string }> {
  cleanupExpiredLocalDataImportRecoveries();
  const records: Array<LocalDataImportRecoverySnapshot & { key: string }> = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX)) continue;
    const snapshot = parseRecoverySnapshot(localStorage.getItem(key));
    if (snapshot?.ownerUid === ownerUid) records.push({ ...snapshot, key });
  }
  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function cleanupExpiredLocalDataImportRecoveries(now: Date = new Date()): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(LOCAL_DATA_FILE_IMPORT_RECOVERY_STORAGE_PREFIX)) continue;
    const snapshot = parseRecoverySnapshot(localStorage.getItem(key));
    if (!snapshot || Date.parse(snapshot.expiresAt) < now.getTime()) localStorage.removeItem(key);
  }
}
```

Never cast unvalidated recovery JSON directly to the public snapshot type.

- [ ] **Step 5: Implement apply, rollback, restore, cleanup, and cloud resolution**

Implement the apply ordering exactly:

```ts
export function applyLocalDataImportTransaction(options: {
  candidate: LocalDataImportCandidate;
  ownerUid: string | null;
  pauseCloudSync: boolean;
  now?: Date;
}): LocalDataImportApplyResult {
  cleanupExpiredLocalDataImportRecoveries(options.now);
  if ((readActiveAuthOwnerUid() ?? null) !== options.ownerUid) {
    return { status: "owner_mismatch" };
  }
  const current = getUserData();
  if (fingerprintLocalDataImport(current) !== options.candidate.currentFingerprint) {
    return { status: "fingerprint_mismatch" };
  }
  if (options.ownerUid && getPendingLocalDataImport(options.ownerUid)) {
    return { status: "pending_exists" };
  }

  const importId = `local_file_import_${(options.now ?? new Date()).getTime().toString(36)}_${options.candidate.fingerprint}`;
  const recoveryKey = getRecoveryKey(options.ownerUid, importId);
  const queueKey = options.ownerUid ? getMutationQueueStorageKey(options.ownerUid) : null;
  const cursorKey = options.ownerUid ? getPullCursorStorageKey(options.ownerUid) : null;
  const pendingKey = options.ownerUid ? getPendingKey(options.ownerUid) : null;
  const queueRaw = queueKey ? localStorage.getItem(queueKey) : null;
  const cursorRaw = cursorKey ? localStorage.getItem(cursorKey) : null;
  const pendingRaw = pendingKey ? localStorage.getItem(pendingKey) : null;
  const nowIso = (options.now ?? new Date()).toISOString();
  const snapshot: LocalDataImportRecoverySnapshot = {
    version: 1,
    importId,
    ownerUid: options.ownerUid,
    createdAt: nowIso,
    expiresAt: new Date(Date.parse(nowIso) + 7 * 24 * 60 * 60 * 1000).toISOString(),
    previousData: createSanitizedLocalUserDataBackup(current),
    mutationQueueRaw: queueRaw,
    pullCursorRaw: cursorRaw,
  };

  try {
    localStorage.setItem(recoveryKey, JSON.stringify(snapshot));
  } catch {
    return { status: "snapshot_failed" };
  }

  const pending =
    options.pauseCloudSync && options.ownerUid
      ? {
          version: 1 as const,
          importId,
          ownerUid: options.ownerUid,
          recoveryKey,
          candidateFingerprint: options.candidate.fingerprint,
          createdAt: nowIso,
          summary: options.candidate.importedSummary,
        }
      : null;

  try {
    if (pending && pendingKey) localStorage.setItem(pendingKey, JSON.stringify(pending));
    if (queueKey) localStorage.removeItem(queueKey);
    if (cursorKey) localStorage.removeItem(cursorKey);
    if (!replaceUserData(options.candidate.data)) throw new Error("replace_failed");
    dispatchLocalDataImportStateChanged();
    return { status: "applied", importId, recoveryKey, pending };
  } catch {
    try {
      restoreStorageItem(queueKey, queueRaw);
      restoreStorageItem(cursorKey, cursorRaw);
      restoreStorageItem(pendingKey, pendingRaw);
    } catch {
      // The exact UserData writer already rolled active/scoped data back; keep the result failed.
    } finally {
      try {
        localStorage.removeItem(recoveryKey);
      } catch {
        // Expiry cleanup will remove an orphaned snapshot later.
      }
      resetUserDataCache();
      dispatchLocalDataImportStateChanged();
    }
    return { status: "write_failed" };
  }
}
```

Implement recovery with the marker retained until all writes succeed:

```ts
export function restoreLocalDataImportRecovery(options: {
  recoveryKey: string;
  ownerUid: string | null;
  now?: Date;
}): LocalDataImportRestoreResult {
  if ((readActiveAuthOwnerUid() ?? null) !== options.ownerUid) return { status: "owner_mismatch" };
  const raw = localStorage.getItem(options.recoveryKey);
  if (!raw) return { status: "missing" };
  const snapshot = parseRecoverySnapshot(raw);
  if (!snapshot) return { status: "invalid" };
  if (snapshot.ownerUid !== options.ownerUid) return { status: "owner_mismatch" };
  if (Date.parse(snapshot.expiresAt) < (options.now ?? new Date()).getTime()) {
    localStorage.removeItem(options.recoveryKey);
    return { status: "expired" };
  }

  const queueKey = options.ownerUid ? getMutationQueueStorageKey(options.ownerUid) : null;
  const cursorKey = options.ownerUid ? getPullCursorStorageKey(options.ownerUid) : null;
  const pendingKey = options.ownerUid ? getPendingKey(options.ownerUid) : null;
  const currentData = getUserData();
  const currentQueueRaw = queueKey ? localStorage.getItem(queueKey) : null;
  const currentCursorRaw = cursorKey ? localStorage.getItem(cursorKey) : null;
  const currentPendingRaw = pendingKey ? localStorage.getItem(pendingKey) : null;

  try {
    if (!replaceUserData(snapshot.previousData)) throw new Error("restore_data_failed");
    restoreStorageItem(queueKey, snapshot.mutationQueueRaw);
    restoreStorageItem(cursorKey, snapshot.pullCursorRaw);
    if (pendingKey) localStorage.removeItem(pendingKey);
    localStorage.removeItem(options.recoveryKey);
    dispatchLocalDataImportStateChanged();
    return { status: "restored" };
  } catch {
    try {
      if (!replaceUserData(currentData)) throw new Error("rollback_data_failed");
      restoreStorageItem(queueKey, currentQueueRaw);
      restoreStorageItem(cursorKey, currentCursorRaw);
      restoreStorageItem(pendingKey, currentPendingRaw);
    } catch {
      resetUserDataCache();
    }
    dispatchLocalDataImportStateChanged();
    return { status: "write_failed" };
  }
}

export function resolveLocalDataImportAfterCloud(ownerUid: string, importId: string): boolean {
  if (readActiveAuthOwnerUid() !== ownerUid) return false;
  const marker = getPendingLocalDataImport(ownerUid);
  if (!marker || marker.importId !== importId) return false;

  const cursorKey = getPullCursorStorageKey(ownerUid);
  try {
    localStorage.removeItem(cursorKey);
    localStorage.removeItem(getPendingKey(ownerUid));
    dispatchLocalDataImportStateChanged();
    return true;
  } catch {
    return false;
  }
}
```

Leave the recovery snapshot untouched after cloud resolution; the Settings component exposes recovery while the decision is pending or for local-only owner-null imports, not as a post-cloud exact replacement promise.

- [ ] **Step 6: Run transaction, queue, cursor, and storage tests**

Run:

```bash
npm run test:run -- src/features/plan12week/persistence/localDataImportTransaction.test.ts src/features/plan12week/persistence/pullCursorStore.test.ts src/features/plan12week/persistence/mutationQueue.test.ts src/app/utils/storage-import-replace.test.ts
```

Expected: all apply/rollback/owner/expiry tests pass; queue and cursor regressions remain green.

- [ ] **Step 7: Commit Task 3**

```bash
git add -- src/features/plan12week/persistence/localDataImportTransaction.ts src/features/plan12week/persistence/localDataImportTransaction.test.ts src/features/plan12week/persistence/pullCursorStore.ts src/features/plan12week/persistence/pullCursorStore.test.ts
git commit -m "feat(import): add recoverable replace transaction"
```

---

### Task 4: Pause every generic cloud-sync trigger for unresolved imports

**Files:**
- Modify: `src/features/plan12week/hooks/useAutoCloudSync.ts`
- Modify: `src/features/plan12week/hooks/useAutoCloudSync.test.ts`

**Interfaces:**
- Consumes: `getPendingLocalDataImport(ownerUid)` and `LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME`.
- Produces: optional `AutoCloudSyncState.pauseReason?: "local_import_pending" | null`.
- Preserves: existing full-sync, drain-only, reconnect, visibility, interval, conflict, first-login restore, and pending-count behavior when no marker exists.

- [ ] **Step 1: Add failing pause tests to the existing hook harness**

Mock transaction state:

```ts
const localImportMock = vi.hoisted(() => ({ pendingOwnerUid: null as string | null }));

vi.mock("../persistence/localDataImportTransaction", () => ({
  getPendingLocalDataImport: (ownerUid: string | null) =>
    ownerUid && localImportMock.pendingOwnerUid === ownerUid ? { importId: "pending_import" } : null,
}));
```

Add `localImportMock.pendingOwnerUid = null;` to the existing test `beforeEach` so pause state cannot leak between cases.

Add tests:

```ts
it("blocks initial, manual, drain, reconnect, interval, visibility, and mutation-event sync while import is pending", async () => {
  vi.useFakeTimers();
  setSignedIn("owner_pending_import");
  localImportMock.pendingOwnerUid = "owner_pending_import";
  queueMock.pendingCount = 2;

  const { result, unmount } = renderHook(() =>
    useAutoCloudSync({ intervalMs: 1_000, minSyncIntervalMs: 0, mutationDebounceMs: 0 }),
  );
  await flushMicrotasks();

  expect(result.current.pauseReason).toBe("local_import_pending");
  expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.triggerSyncNow();
    await result.current.triggerDrainOnly();
    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));
    networkStatusMock.lastOptions?.onReconnect?.();
    vi.advanceTimersByTime(5_000);
  });
  await flushMicrotasks();
  expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  expect(mutationSenderMock.sendPending12WeekMutations).not.toHaveBeenCalled();
  unmount();
});

it("refreshes pause state from the import-state event and allows immediate convergence after marker clear", async () => {
  setSignedIn("owner_pending_import");
  localImportMock.pendingOwnerUid = "owner_pending_import";
  const { result } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 0 }));
  expect(result.current.pauseReason).toBe("local_import_pending");

  localImportMock.pendingOwnerUid = null;
  await act(async () => {
    window.dispatchEvent(new Event("visionboard:local-file-import-state-changed"));
    await result.current.triggerSyncNow();
  });

  expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(result.current.pauseReason).toBeNull());
});

it("does not carry the pause to another authenticated owner", async () => {
  localImportMock.pendingOwnerUid = "owner_a";
  setSignedIn("owner_a");
  const { result, rerender } = renderHook(() => useAutoCloudSync());
  expect(result.current.pauseReason).toBe("local_import_pending");

  setSignedIn("owner_b");
  rerender();
  await flushMicrotasks();
  expect(result.current.pauseReason).toBeNull();
  expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
});

it("hides stale conflict actions and refuses conflict resolution while import is pending", async () => {
  setSignedIn("owner_pending_import");
  localImportMock.pendingOwnerUid = "owner_pending_import";
  manualSyncMock.useTwelveWeekManualCloudSync.mockReturnValue({
    loading: false,
    lastResult: conflictResultWithMutation,
    syncNow: manualSyncMock.syncNow,
  });
  const { result } = renderHook(() => useAutoCloudSync());

  expect(result.current.conflictPending).toBe(false);
  await act(async () => {
    await result.current.resolveConflictKeepLocal();
    await result.current.resolveConflictUseCloud();
  });
  expect(storageMock.saveUserData).not.toHaveBeenCalled();
  expect(mutationSenderMock.sendPending12WeekMutations).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run hook tests and verify RED**

Run:

```bash
npm run test:run -- src/features/plan12week/hooks/useAutoCloudSync.test.ts
```

Expected: FAIL because the hook does not read pending import state and exposes no pause reason.

- [ ] **Step 3: Implement event-backed UI state and call-time guards**

Add imports and state:

```ts
import { LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME } from "@/app/utils/local-data-import";
import { getPendingLocalDataImport } from "../persistence/localDataImportTransaction";

export type AutoCloudSyncPauseReason = "local_import_pending";

export interface AutoCloudSyncState {
  // existing fields
  pauseReason?: AutoCloudSyncPauseReason | null;
}

function hasPendingLocalImport(ownerUid: string | null): boolean {
  return Boolean(ownerUid && getPendingLocalDataImport(ownerUid));
}
```

Inside the hook:

```ts
const [pausedImportOwnerUid, setPausedImportOwnerUid] = useState<string | null>(() =>
  hasPendingLocalImport(ownerUid) ? ownerUid : null,
);
const localImportPaused = Boolean(ownerUid && pausedImportOwnerUid === ownerUid);

useEffect(() => {
  const refresh = () => setPausedImportOwnerUid(hasPendingLocalImport(ownerUid) ? ownerUid : null);
  refresh();
  window.addEventListener(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME, refresh);
  window.addEventListener("storage", refresh);
  return () => {
    window.removeEventListener(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME, refresh);
    window.removeEventListener("storage", refresh);
  };
}, [ownerUid]);
```

Guard asynchronous entry points with a fresh storage read, not only React state:

```ts
const isImportPausedNow = useCallback(() => hasPendingLocalImport(ownerUid), [ownerUid]);

// First line inside drainPendingMutations and triggerSyncNow:
if (isImportPausedNow()) {
  setPausedImportOwnerUid(ownerUid);
  refreshPendingCount();
  return null;
}
```

Use `!localImportPaused` in the initial-session, interval, visibility, and mutation-event effect conditions. Clear trailing/visibility/mutation timers when the pause becomes active. Return:

```ts
useEffect(() => {
  if (!localImportPaused) return;
  clearTrailingFlushTimer();
  if (mutationDebounceTimerRef.current !== null) {
    window.clearTimeout(mutationDebounceTimerRef.current);
    mutationDebounceTimerRef.current = null;
  }
  if (visibilityDebounceTimerRef.current !== null) {
    window.clearTimeout(visibilityDebounceTimerRef.current);
    visibilityDebounceTimerRef.current = null;
  }
}, [clearTrailingFlushTimer, localImportPaused]);
```

Return:

```ts
pauseReason: localImportPaused ? "local_import_pending" : null,
```

Suppress stale conflict UI and guard both conflict resolvers:

```ts
const conflictPending = !localImportPaused && isBlockingResult(effectiveLastResult);

const resolveConflictKeepLocal = useCallback(async () => {
  if (isImportPausedNow() || !ownerUid) return;
  markConflictMutationsForLocalResolution(ownerUid, effectiveLastResult);
  refreshPendingCount();
  lastDrainStartedAtRef.current = null;
  await drainPendingMutations({ bypassRateLimit: true });
}, [drainPendingMutations, effectiveLastResult, isImportPausedNow, ownerUid, refreshPendingCount]);

const resolveConflictUseCloud = useCallback(async () => {
  if (isImportPausedNow() || !ownerUid) return;
  const pullResponse = effectiveLastResult?.pullResponse;
  if (!pullResponse?.workspace) return;

  const localData = getUserData();
  const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {});
  const didWrite = saveUserData(nextData);
  if (!didWrite) return;

  archiveConflictMutations(ownerUid, effectiveLastResult);
  clearPullCursor(ownerUid);
  refreshPendingCount();
  lastSyncStartedAtRef.current = null;
  await triggerSyncNow();
}, [effectiveLastResult, isImportPausedNow, ownerUid, refreshPendingCount, triggerSyncNow]);
```

The fresh call-time guard is required so `resolveLocalDataImportAfterCloud()` can remove the marker and call the existing `triggerSyncNow()` function immediately, even before React produces a new closure.

- [ ] **Step 4: Run all auto-sync focused tests**

Run:

```bash
npm run test:run -- src/features/plan12week/hooks/useAutoCloudSync.test.ts src/features/plan12week/hooks/AutoCloudSyncProvider.test.tsx src/app/components/root-layout/SyncStatusPill.test.tsx src/app/components/root-layout/AutoCloudConflictDialog.test.tsx
```

Expected: pause tests pass and all existing state consumers remain compatible because `pauseReason` is optional.

- [ ] **Step 5: Commit Task 4**

```bash
git add -- src/features/plan12week/hooks/useAutoCloudSync.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts
git commit -m "feat(sync): pause cloud sync for pending imports"
```

---

### Task 5: Make the existing cloud-import hook reusable by Settings

**Files:**
- Create: `src/app/components/root-layout/useCloudImportActions.test.tsx`
- Modify: `src/app/components/root-layout/useCloudImportActions.ts`

**Interfaces:**
- Consumes: active `getUserData()` and the existing validate/import endpoints.
- Extends `UseCloudImportActionsOptions` with:
  - `trackingSource?: "local_data_migration_prompt" | "settings_file_import"`
  - `recordMigrationCompletion?: boolean`
- Preserves: default behavior for any future `LocalDataMigrationPrompt` consumer.
- Produces: Settings-safe validation/import actions without backend contract changes.

- [ ] **Step 1: Write failing reusable-hook tests**

Mock `getUserData`, feature flags, API config, sync service, analytics, and migration completion:

```tsx
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserData } from "../../utils/storage-types";
import type { LocalDataMigrationCandidate } from "../../utils/local-data-migration";
import { useCloudImportActions } from "./useCloudImportActions";

const mocks = vi.hoisted(() => ({
  createPayload: vi.fn(() => ({ goal: { clientGoalId: "goal_1" } })),
  postValidation: vi.fn(),
  postImport: vi.fn(),
  trackAppEvent: vi.fn(),
  markCloudImportCompleted: vi.fn(),
}));

vi.mock("@/features/plan12week/persistence/twelveWeekImportPayload", () => ({
  createTwelveWeekImportPayload: mocks.createPayload,
}));
vi.mock("@/lib/api/apiClient", () => ({ isApiBaseUrlConfigured: () => true }));
vi.mock("@/services/syncService", () => ({
  post12WeekImportValidation: mocks.postValidation,
  post12WeekImport: mocks.postImport,
}));
vi.mock("../../utils/app-mode", () => ({
  shouldEnable12WeekImportDryRun: () => true,
  shouldEnable12WeekCloudImport: () => true,
}));
vi.mock("../../utils/storage", () => ({
  getUserData: () => ({ goals: [{ id: "goal_1" }] }) as UserData,
  trackAppEvent: mocks.trackAppEvent,
}));
vi.mock("../../utils/local-data-migration", () => ({
  hasCompletedCloudImport: () => false,
  markCloudImportCompleted: mocks.markCloudImportCompleted,
}));

const candidate: LocalDataMigrationCandidate = {
  data: { goals: [] } as UserData,
  fingerprint: "candidate_fp",
  summary: {
    goalCount: 1,
    twelveWeekSystemCount: 1,
    taskCount: 0,
    dailyCheckInCount: 0,
    weeklyReviewCount: 0,
    wheelRecordCount: 0,
    reflectionCount: 0,
    visionBoardCount: 0,
  },
};

const validReport = {
  status: "valid" as const,
  mode: "validate_only" as const,
  dryRun: true as const,
  acceptedEntityCounts: {
    goals: 1,
    plans: 1,
    weeks: 12,
    tasks: 0,
    leadIndicators: 0,
    leadMetrics: 0,
    dailyCheckIns: 0,
    weeklyReviews: 0,
  },
  warnings: [],
  errors: [],
  normalizedClientIdsCount: 0,
};

describe("useCloudImportActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.postValidation.mockResolvedValue(validReport);
    mocks.postImport.mockResolvedValue({ status: "applied", importId: "cloud_import_1" });
  });

it("tracks settings file import without writing migration completion state", async () => {
  const { result } = renderHook(() =>
    useCloudImportActions({
      demoMode: false,
      userUid: "owner_a",
      localDataMigrationCandidate: candidate,
      trackingSource: "settings_file_import",
      recordMigrationCompletion: false,
    }),
  );

  await act(async () => {
    await expect(result.current.handleCloudImport()).resolves.toMatchObject({ status: "applied" });
  });

  expect(mocks.trackAppEvent).toHaveBeenCalledWith("cloud_import_started", undefined, {
    goalCount: "1",
    source: "settings_file_import",
  });
  expect(mocks.markCloudImportCompleted).not.toHaveBeenCalled();
});

it("keeps the marker untouched when validation is invalid or import is partial", async () => {
  mocks.postValidation.mockResolvedValueOnce({
    ...validReport,
    status: "invalid",
    errors: [{ path: "workspace.goals[0]", code: "invalid_goal", message: "Invalid goal" }],
  });
  mocks.postImport.mockResolvedValueOnce({ status: "partial", importId: "cloud_import_1" });
  const { result } = renderHook(() =>
    useCloudImportActions({
      demoMode: false,
      userUid: "owner_a",
      localDataMigrationCandidate: null,
      trackingSource: "settings_file_import",
      recordMigrationCompletion: false,
    }),
  );
  await expect(result.current.handleValidateCloudImport()).resolves.toMatchObject({ status: "invalid" });
  await expect(result.current.handleCloudImport()).resolves.toMatchObject({ status: "partial" });
  expect(mocks.markCloudImportCompleted).not.toHaveBeenCalled();
});

it("keeps migration defaults for the original consumer", async () => {
  const { result } = renderHook(() =>
    useCloudImportActions({ demoMode: false, userUid: "owner_a", localDataMigrationCandidate: candidate }),
  );
  await act(async () => {
    await result.current.handleCloudImport();
  });
  expect(mocks.trackAppEvent).toHaveBeenCalledWith("cloud_import_started", undefined, {
    goalCount: "1",
    source: "local_data_migration_prompt",
  });
  expect(mocks.markCloudImportCompleted).toHaveBeenCalledWith("owner_a", "candidate_fp");
});
});
```

- [ ] **Step 2: Run hook tests and verify RED**

Run:

```bash
npm run test:run -- src/app/components/root-layout/useCloudImportActions.test.tsx
```

Expected: FAIL because the two options are not accepted.

- [ ] **Step 3: Add bounded options without changing request payload contracts**

Update the options and defaults:

```ts
interface UseCloudImportActionsOptions {
  demoMode: boolean;
  userUid: string | null;
  localDataMigrationCandidate: LocalDataMigrationCandidate | null;
  trackingSource?: "local_data_migration_prompt" | "settings_file_import";
  recordMigrationCompletion?: boolean;
}

export function useCloudImportActions({
  demoMode,
  userUid,
  localDataMigrationCandidate,
  trackingSource = "local_data_migration_prompt",
  recordMigrationCompletion = true,
}: UseCloudImportActionsOptions) {
```

Use `trackingSource` only in safe analytics metadata:

```ts
trackAppEvent("cloud_import_started", undefined, {
  goalCount: String(importPayloads.length),
  source: trackingSource,
});
```

Gate migration completion:

```ts
if (succeeded && recordMigrationCompletion && localDataMigrationCandidate) {
  markCloudImportCompleted(userUid, localDataMigrationCandidate.fingerprint);
}
```

Add both options to callback dependency lists. Keep `TwelveWeekImportValidationRequest.source` and `TwelveWeekImportRequest.source` unchanged because the backend type only accepts the current literals.

- [ ] **Step 4: Run hook and existing migration prompt tests**

Run:

```bash
npm run test:run -- src/app/components/root-layout/useCloudImportActions.test.tsx src/app/components/RootLayout.test.tsx
```

Expected: new settings-source behavior passes and the root layout remains green.

- [ ] **Step 5: Commit Task 5**

```bash
git add -- src/app/components/root-layout/useCloudImportActions.ts src/app/components/root-layout/useCloudImportActions.test.tsx
git commit -m "refactor(sync): reuse cloud import actions"
```

---

### Task 6: Add the Settings preview, confirmation, pending-cloud, and recovery UI

**Files:**
- Create: `src/app/components/LocalDataImportManager.tsx`
- Create: `src/app/pages/SettingsPage.local-import.test.tsx`
- Modify: `src/app/pages/SettingsPage.tsx:1-64`
- Modify: `src/app/pages/SettingsPage.tsx:127-240`
- Modify: `src/app/pages/SettingsPage.tsx:677-794`

**Interfaces:**
- Consumes:
  - current `UserData`;
  - `ownerUid`, `demoMode`, `online`;
  - `triggerSyncNow()` and `reloadUserData()`;
  - candidate, transaction, pending/recovery, and cloud-import helpers.
- Produces `LocalDataImportManager` props:

```ts
interface LocalDataImportManagerProps {
  currentData: UserData;
  ownerUid: string | null;
  demoMode: boolean;
  online: boolean;
  onDataChanged: () => void;
  triggerSyncNow: () => Promise<unknown>;
}
```

- Removes the immediate `SettingsPage.handleImport` and its page-owned hidden input.
- Preserves existing migration-backup recovery, account export/delete, generic sync, and Settings layout.

- [ ] **Step 1: Write failing Settings acceptance tests**

Render the real manager and mock only Core transaction/cloud boundaries. Use this complete harness before the cases:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalUserDataBackupJson } from "../utils/local-data-backup";
import { getUserData, resetUserDataCache } from "../utils/storage";
import type { Goal, UserData } from "../utils/storage-types";
import type { LocalDataImportPendingMarker } from "@/features/plan12week/persistence/localDataImportTransaction";
import { LocalDataImportManager } from "../components/LocalDataImportManager";

const transactionMock = vi.hoisted(() => ({
  pending: null as LocalDataImportPendingMarker | null,
  recoveries: [] as Array<Record<string, unknown>>,
  apply: vi.fn(),
  restore: vi.fn(),
  resolveAfterCloud: vi.fn(),
}));

const cloudActionsMock = vi.hoisted(() => ({
  handleValidateCloudImport: vi.fn(),
  handleCloudImport: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/features/plan12week/persistence/localDataImportTransaction", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/plan12week/persistence/localDataImportTransaction")>();
  return {
    ...actual,
    getPendingLocalDataImport: () => transactionMock.pending,
    listLocalDataImportRecoverySnapshots: () => transactionMock.recoveries,
    applyLocalDataImportTransaction: transactionMock.apply,
    restoreLocalDataImportRecovery: transactionMock.restore,
    resolveLocalDataImportAfterCloud: transactionMock.resolveAfterCloud,
  };
});

vi.mock("../components/root-layout/useCloudImportActions", () => ({
  useCloudImportActions: () => ({
    cloudImportDryRunEnabled: true,
    cloudImportEnabled: true,
    cloudImportDryRunUnavailableReason: undefined,
    cloudImportUnavailableReason: undefined,
    cloudImportAlreadyCompleted: false,
    handleValidateCloudImport: cloudActionsMock.handleValidateCloudImport,
    handleCloudImport: cloudActionsMock.handleCloudImport,
  }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

function createGoal(id: string): Goal {
  return {
    id,
    category: "career",
    title: id,
    description: "Settings import fixture",
    deadline: "2026-12-31",
    createdAt: "2026-08-01T00:00:00.000Z",
    tasks: [],
  };
}

function createPendingMarker(ownerUid: string): LocalDataImportPendingMarker {
  return {
    version: 1,
    importId: "local_file_import_test",
    ownerUid,
    recoveryKey: `visionboard_local_file_import_recovery:auth:${ownerUid}:local_file_import_test`,
    candidateFingerprint: "candidate_fp",
    createdAt: "2026-08-07T10:00:00.000Z",
    summary: {
      goalCount: 1,
      twelveWeekSystemCount: 0,
      taskCount: 0,
      dailyCheckInCount: 0,
      weeklyReviewCount: 0,
      wheelRecordCount: 0,
      reflectionCount: 0,
      visionBoardCount: 0,
    },
  };
}

let currentData: UserData;
let validBackupJson: string;
const triggerSyncNowMock = vi.fn().mockResolvedValue(null);
const onDataChangedMock = vi.fn();

function renderPage(options: { demoMode?: boolean; ownerUid?: string | null } = {}) {
  return render(
    <LocalDataImportManager
      currentData={currentData}
      ownerUid={options.ownerUid === undefined ? "owner_a" : options.ownerUid}
      demoMode={options.demoMode ?? false}
      online
      onDataChanged={onDataChangedMock}
      triggerSyncNow={triggerSyncNowMock}
    />,
  );
}

async function importAndConfirm(json: string): Promise<void> {
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText("Chọn file backup JSON"),
    new File([json], "restore.json", { type: "application/json" }),
  );
  await user.click(await screen.findByRole("button", { name: "Tiếp tục" }));
  await user.click(await screen.findByRole("button", { name: "Tạo backup và thay dữ liệu" }));
}

const invalidReport = {
  status: "invalid" as const,
  mode: "validate_only" as const,
  dryRun: true as const,
  acceptedEntityCounts: {
    goals: 0,
    plans: 0,
    weeks: 0,
    tasks: 0,
    leadIndicators: 0,
    leadMetrics: 0,
    dailyCheckIns: 0,
    weeklyReviews: 0,
  },
  warnings: [],
  errors: [{ path: "workspace.goals[0]", code: "invalid_goal", message: "Invalid goal" }],
  normalizedClientIdsCount: 0,
};

describe("Settings local file import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetUserDataCache();
    transactionMock.pending = null;
    transactionMock.recoveries = [];
    currentData = { ...getUserData(), userId: "current_identity", goals: [createGoal("current_goal")] };
    validBackupJson = createLocalUserDataBackupJson({ ...currentData, goals: [createGoal("imported_goal")] });
    transactionMock.apply.mockImplementation(({ pauseCloudSync }: { pauseCloudSync: boolean }) => {
      transactionMock.pending = pauseCloudSync ? createPendingMarker("owner_a") : null;
      return {
        status: "applied",
        importId: "local_file_import_test",
        recoveryKey: "visionboard_local_file_import_recovery:anonymous:local_file_import_test",
        pending: transactionMock.pending,
      };
    });
    transactionMock.restore.mockReturnValue({ status: "restored" });
    transactionMock.resolveAfterCloud.mockReturnValue(true);
    cloudActionsMock.handleValidateCloudImport.mockResolvedValue({
      status: "valid",
      message: "Valid",
      report: { ...invalidReport, status: "valid", errors: [] },
    });
    cloudActionsMock.handleCloudImport.mockResolvedValue({ status: "applied", message: "Applied" });
  });

it("previews current and imported counts before the two-step replace confirmation", async () => {
  const user = userEvent.setup();
  renderPage();
  const file = new File([validBackupJson], "restore.json", { type: "application/json" });

  await user.upload(screen.getByLabelText("Chọn file backup JSON"), file);

  const preview = await screen.findByTestId("local-import-preview-dialog");
  expect(within(preview).getByText("Hiện tại trên thiết bị")).toBeInTheDocument();
  expect(within(preview).getByText("Trong file import")).toBeInTheDocument();
  expect(transactionMock.apply).not.toHaveBeenCalled();

  await user.click(within(preview).getByRole("button", { name: "Tiếp tục" }));
  const confirmation = await screen.findByTestId("local-import-final-dialog");
  expect(within(confirmation).getByText(/bản khôi phục trong 7 ngày/i)).toBeInTheDocument();
  expect(transactionMock.apply).not.toHaveBeenCalled();

  await user.click(within(confirmation).getByRole("button", { name: "Tạo backup và thay dữ liệu" }));
  expect(transactionMock.apply).toHaveBeenCalledTimes(1);
});

it("rejects invalid and oversized files without opening a dialog or writing data", async () => {
  const user = userEvent.setup();
  renderPage();
  await user.upload(screen.getByLabelText("Chọn file backup JSON"), new File(["{bad"], "bad.json"));
  await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("File không hợp lệ hoặc bị hỏng."));
  expect(transactionMock.apply).not.toHaveBeenCalled();

  const oversized = new File(["{}"], "too-large.json", { type: "application/json" });
  Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 });
  await user.upload(screen.getByLabelText("Chọn file backup JSON"), oversized);
  expect(toastMock.error).toHaveBeenCalledWith("File quá lớn. Kích thước tối đa là 10 MiB.");
  expect(transactionMock.apply).not.toHaveBeenCalled();
});

it("persists a visible sync pause and disables another import for a signed-in real-mode owner", async () => {
  transactionMock.pending = createPendingMarker("owner_a");
  renderPage();
  expect(screen.getByText("Đồng bộ đang tạm dừng sau khi nhập dữ liệu")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Nhập dữ liệu" })).toBeDisabled();
  expect(screen.getByTestId("settings-sync-status-copy")).toHaveTextContent(/chưa được đối chiếu với tài khoản/i);
});

it("requires valid dry-run and separate cloud confirmation before resolving the marker", async () => {
  transactionMock.pending = createPendingMarker("owner_a");
  cloudActionsMock.handleValidateCloudImport.mockResolvedValue({
    status: "valid",
    message: "Valid",
    report: { ...invalidReport, status: "valid", errors: [] },
  });
  cloudActionsMock.handleCloudImport.mockResolvedValue({ status: "applied", message: "Applied" });
  const user = userEvent.setup();
  renderPage();

  await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));
  expect(await screen.findByText(/không xóa dữ liệu chỉ có trên tài khoản/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Đồng bộ dữ liệu 12 tuần lên tài khoản" }));
  expect(transactionMock.resolveAfterCloud).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Xác nhận đồng bộ lên tài khoản" }));

  await waitFor(() =>
    expect(transactionMock.resolveAfterCloud).toHaveBeenCalledWith("owner_a", "local_file_import_test"),
  );
  expect(triggerSyncNowMock).toHaveBeenCalledTimes(1);
});

it("keeps pause when cloud validation is invalid", async () => {
  transactionMock.pending = createPendingMarker("owner_a");
  cloudActionsMock.handleValidateCloudImport.mockResolvedValue({
    status: "invalid",
    message: "Invalid",
    report: invalidReport,
  });
  const user = userEvent.setup();
  renderPage();

  await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));

  expect(screen.queryByRole("button", { name: "Đồng bộ dữ liệu 12 tuần lên tài khoản" })).not.toBeInTheDocument();
  expect(transactionMock.resolveAfterCloud).not.toHaveBeenCalled();
  expect(screen.getByText("Đồng bộ đang tạm dừng sau khi nhập dữ liệu")).toBeInTheDocument();
});

it.each(["partial", "failed", "skipped", "error"] as const)(
  "keeps pause when the cloud result is %s",
  async (status) => {
    transactionMock.pending = createPendingMarker("owner_a");
    cloudActionsMock.handleCloudImport.mockResolvedValue({ status, message: status });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));
    await user.click(screen.getByRole("button", { name: "Đồng bộ dữ liệu 12 tuần lên tài khoản" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận đồng bộ lên tài khoản" }));

    expect(transactionMock.resolveAfterCloud).not.toHaveBeenCalled();
    expect(screen.getByText("Đồng bộ đang tạm dừng sau khi nhập dữ liệu")).toBeInTheDocument();
  },
);

it("keeps the pending marker and avoids protected cloud actions while offline", async () => {
  transactionMock.pending = createPendingMarker("owner_a");
  render(
    <LocalDataImportManager
      currentData={currentData}
      ownerUid="owner_a"
      demoMode={false}
      online={false}
      onDataChanged={onDataChangedMock}
      triggerSyncNow={triggerSyncNowMock}
    />,
  );
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));

  expect(cloudActionsMock.handleValidateCloudImport).not.toHaveBeenCalled();
  expect(cloudActionsMock.handleCloudImport).not.toHaveBeenCalled();
  expect(toastMock.error).toHaveBeenCalledWith(
    "Bạn đang mất kết nối. Dữ liệu trên thiết bị vẫn an toàn và đồng bộ tiếp tục tạm dừng.",
  );
});

it("restores the pre-import snapshot only after AlertDialog confirmation", async () => {
  transactionMock.pending = createPendingMarker("owner_a");
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole("button", { name: "Khôi phục dữ liệu trước import" }));
  expect(transactionMock.restore).not.toHaveBeenCalled();
  const dialog = await screen.findByTestId("local-import-recovery-dialog");
  await user.click(within(dialog).getByRole("button", { name: "Khôi phục dữ liệu trước import" }));
  expect(transactionMock.restore).toHaveBeenCalledWith(
    expect.objectContaining({
      ownerUid: "owner_a",
      recoveryKey: "visionboard_local_file_import_recovery:auth:owner_a:local_file_import_test",
    }),
  );
});

it.each([
  { label: "demo", demoMode: true, ownerUid: null },
  { label: "signed-out real mode", demoMode: false, ownerUid: null },
])("keeps $label imports local-only", async ({ demoMode, ownerUid }) => {
  renderPage({ demoMode, ownerUid });
  await importAndConfirm(validBackupJson);
  expect(cloudActionsMock.handleValidateCloudImport).not.toHaveBeenCalled();
  expect(cloudActionsMock.handleCloudImport).not.toHaveBeenCalled();
  expect(toastMock.success).toHaveBeenCalledWith(
    "Đã thay dữ liệu trên thiết bị. Bản khôi phục có hiệu lực trong 7 ngày.",
  );
});
});
```

- [ ] **Step 2: Run Settings tests and verify RED**

Run:

```bash
npm run test:run -- src/app/pages/SettingsPage.local-import.test.tsx
```

Expected: FAIL because the manager and safe flow do not exist.

- [ ] **Step 3: Implement the Settings-owned manager state machine**

Create the component with these states:

```ts
import type { CloudImportDryRunResult } from "../root-layout/LocalDataMigrationPrompt";

type ReplaceDialogStep = "preview" | "final" | null;
type CloudDialogStep = "confirm" | null;

const [candidate, setCandidate] = useState<LocalDataImportCandidate | null>(null);
const [replaceDialogStep, setReplaceDialogStep] = useState<ReplaceDialogStep>(null);
const [cloudDialogStep, setCloudDialogStep] = useState<CloudDialogStep>(null);
const [pending, setPending] = useState(() => (ownerUid ? getPendingLocalDataImport(ownerUid) : null));
const [recoveries, setRecoveries] = useState(() => listLocalDataImportRecoverySnapshots(ownerUid));
const [cloudValidation, setCloudValidation] = useState<CloudImportDryRunResult | null>(null);
const [busy, setBusy] = useState(false);
```

Refresh pending/recovery state on owner changes and `LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME`:

```ts
const refreshImportState = useCallback(() => {
  setPending(ownerUid ? getPendingLocalDataImport(ownerUid) : null);
  setRecoveries(listLocalDataImportRecoverySnapshots(ownerUid));
}, [ownerUid]);

useEffect(() => {
  refreshImportState();
  window.addEventListener(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME, refreshImportState);
  return () => window.removeEventListener(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME, refreshImportState);
}, [refreshImportState]);

const localOnlyRecovery = ownerUid === null ? (recoveries[0] ?? null) : null;
```

Do not expose a signed-in recovery snapshot after cloud resolution; signed-in recovery is offered through the matching pending marker, while owner-null local-only snapshots remain visible for seven days.

Read files with a size check before `file.text()`:

```ts
const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > MAX_LOCAL_DATA_IMPORT_BYTES) {
    toast.error("File quá lớn. Kích thước tối đa là 10 MiB.");
    return;
  }

  try {
    const result = prepareLocalDataImportCandidate({
      fileName: file.name,
      sizeBytes: file.size,
      text: await file.text(),
      currentData,
    });
    if (result.status !== "ready") {
      toast.error("File không hợp lệ hoặc bị hỏng.");
      return;
    }
    setCandidate(result.candidate);
    setReplaceDialogStep("preview");
  } catch {
    toast.error("Không đọc được file.");
  }
};
```

Apply with a marker only for signed-in real mode:

```ts
const handleApply = () => {
  if (!candidate) return;
  setBusy(true);
  try {
    const result = applyLocalDataImportTransaction({
      candidate,
      ownerUid,
      pauseCloudSync: !demoMode && Boolean(ownerUid),
    });
    if (result.status !== "applied") {
      const message =
        result.status === "owner_mismatch"
          ? "Tài khoản hiện tại đã thay đổi. Hãy tải lại trang trước khi nhập dữ liệu."
          : result.status === "fingerprint_mismatch"
          ? "Dữ liệu trên thiết bị đã thay đổi. Hãy chọn lại file và xem trước lần nữa."
          : result.status === "pending_exists"
            ? "Hãy xử lý lần nhập dữ liệu đang chờ trước khi nhập file khác."
            : "Không thể tạo bản khôi phục hoặc thay dữ liệu. Dữ liệu cũ vẫn được giữ.";
      toast.error(message);
      return;
    }
    onDataChanged();
    setCandidate(null);
    setReplaceDialogStep(null);
    refreshImportState();
    toast.success(
      result.pending
        ? "Đã thay dữ liệu trên thiết bị. Đồng bộ tài khoản đang tạm dừng."
        : "Đã thay dữ liệu trên thiết bị. Bản khôi phục có hiệu lực trong 7 ngày.",
    );
  } finally {
    setBusy(false);
  }
};
```

Use `useCloudImportActions` with:

```ts
const cloudActions = useCloudImportActions({
  demoMode,
  userUid: ownerUid,
  localDataMigrationCandidate: null,
  trackingSource: "settings_file_import",
  recordMigrationCompletion: false,
});
```

Before validate/import calls, enforce the offline boundary in the manager:

```ts
if (!online) {
  toast.error("Bạn đang mất kết nối. Dữ liệu trên thiết bị vẫn an toàn và đồng bộ tiếp tục tạm dừng.");
  return;
}
```

Also honor hook availability before calling the backend:

```ts
if (!cloudActions.cloudImportDryRunEnabled) {
  toast.error(cloudActions.cloudImportDryRunUnavailableReason ?? "Không thể kiểm tra dữ liệu tài khoản lúc này.");
  return;
}
```

Disable the final cloud button unless `cloudActions.cloudImportEnabled` and the latest validation status is `valid`; show `cloudImportUnavailableReason` as readable text when import is disabled.

On cloud import:

```ts
const result = await cloudActions.handleCloudImport();
if ((result.status === "applied" || result.status === "duplicate") && pending) {
  if (resolveLocalDataImportAfterCloud(pending.ownerUid, pending.importId)) {
    refreshImportState();
    await triggerSyncNow();
  } else {
    toast.error("Không thể mở lại đồng bộ tự động. Hãy tải lại trang và thử lại.");
  }
}
```

Do not resolve on `partial`, `failed`, `skipped`, or `error`.

- [ ] **Step 4: Render exact accessible controls and copy**

Render:

- button `Nhập dữ liệu` and hidden input with `aria-label="Chọn file backup JSON"`;
- preview `AlertDialog` with `data-testid="local-import-preview-dialog"` and two summary columns;
- final `AlertDialog` with `data-testid="local-import-final-dialog"` and actions `Quay lại` / `Tạo backup và thay dữ liệu`;
- persistent pending panel titled `Đồng bộ đang tạm dừng sau khi nhập dữ liệu`;
- dry-run result with up to three warnings and three errors;
- cloud confirmation stating `Dữ liệu hỗ trợ sẽ được thêm hoặc cập nhật; dữ liệu chỉ có trên tài khoản sẽ không bị xóa.`;
- recovery `AlertDialog` with a distinct final action test ID to avoid selecting the launcher button by accident;
- a local-only recovery panel for the latest owner-null snapshot when no pending marker exists.

All async action buttons must set `disabled` and `aria-busy` while running.

- [ ] **Step 5: Replace the immediate Settings handler with the manager**

In `SettingsPage.tsx`:

- remove `ChangeEvent`, `useRef`, `importFileRef`, `handleImport`, `parseStoredUserData`, and `saveUserData` imports used only by the old flow;
- import `isDemoMode` and `LocalDataImportManager`;
- render inside the Data action group:

```tsx
<LocalDataImportManager
  currentData={userData}
  ownerUid={user?.uid ?? null}
  demoMode={isDemoMode()}
  online={autoSyncState.online}
  onDataChanged={reloadUserData}
  triggerSyncNow={autoSyncState.triggerSyncNow}
/>
```

- prioritize the generic sync status copy when `autoSyncState.pauseReason === "local_import_pending"`:

```ts
const syncStatusMessage =
  autoSyncState.pauseReason === "local_import_pending"
    ? "Dữ liệu import đang an toàn trên thiết bị nhưng chưa được đối chiếu với tài khoản."
    : syncBlockedByEmailVerification
      ? /* existing branch */
      : /* remaining existing branches */;
```

- disable the generic `Đồng bộ ngay` button while the pause reason is active.

Do not remove or merge the existing anonymous migration-backup recovery card; file-import recovery is a distinct contract.

- [ ] **Step 6: Run Settings and adjacent lifecycle tests**

Run:

```bash
npm run test:run -- src/app/pages/SettingsPage.local-import.test.tsx src/app/pages/SettingsPage.account-export.test.tsx src/app/utils/local-data-migration.test.ts src/app/utils/local-data-backup.test.ts
```

Expected: preview/confirm/pause/cloud/recovery tests pass; existing account lifecycle and anonymous migration behavior remain green.

- [ ] **Step 7: Commit Task 6**

```bash
git add -- src/app/components/LocalDataImportManager.tsx src/app/pages/SettingsPage.tsx src/app/pages/SettingsPage.local-import.test.tsx
git commit -m "feat(settings): add safe local data restore"
```

---

### Task 7: Lock storage cleanup, baseline, security scans, and release gates

**Files:**
- Modify: `src/app/utils/local-data-backup.test.ts`
- Modify: `src/test/ux-ui-upgrade/__snapshots__/storage-keys.baseline.json`
- Verify all files from Tasks 1-6.
- Include: `docs/superpowers/plans/2026-08-07-safe-local-data-import.md` only if it was not committed before execution.

**Interfaces:**
- Produces: explicit cleanup coverage for the two new prefixes and fresh L1-L4 verification evidence.
- Preserves: no backend, dependency, Dashboard, Schedule, or unrelated documentation change.

- [ ] **Step 1: Add failing explicit wipe-data coverage**

Extend the existing `deleteAllUserData` test:

```ts
localStorage.setItem("visionboard_local_file_import_recovery:anonymous:test", JSON.stringify({ version: 1 }));
localStorage.setItem("visionboard_local_file_import_pending:auth:user_test", JSON.stringify({ version: 1 }));

deleteAllUserData();

expect(localStorage.getItem("visionboard_local_file_import_recovery:anonymous:test")).toBeNull();
expect(localStorage.getItem("visionboard_local_file_import_pending:auth:user_test")).toBeNull();
```

- [ ] **Step 2: Run cleanup and storage-key properties to verify the expected RED**

Run:

```bash
npm run test:run -- src/app/utils/local-data-backup.test.ts src/test/ux-ui-upgrade/property-9-storage-keys.test.ts src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts
```

Expected: cleanup passes once Task 2 prefixes are in `AUXILIARY_USER_DATA_STORAGE_PREFIXES`; storage properties fail because the committed baseline still has 89 keys.

- [ ] **Step 3: Update the storage baseline intentionally**

Change `keyCount` from `89` to `91` and add these sorted entries:

```json
"visionboard_local_file_import_pending:auth:",
"visionboard_local_file_import_recovery:",
```

Do not regenerate or accept any unrelated storage-key change.

- [ ] **Step 4: Run the complete focused feature suite**

Run:

```bash
npm run test:run -- src/app/utils/storage-import-replace.test.ts src/app/utils/local-data-import.test.ts src/features/plan12week/persistence/localDataImportTransaction.test.ts src/features/plan12week/persistence/pullCursorStore.test.ts src/features/plan12week/hooks/useAutoCloudSync.test.ts src/app/components/root-layout/useCloudImportActions.test.tsx src/app/pages/SettingsPage.local-import.test.tsx src/app/pages/SettingsPage.account-export.test.tsx src/app/utils/local-data-migration.test.ts src/app/utils/local-data-backup.test.ts src/test/ux-ui-upgrade/property-9-storage-keys.test.ts src/test/ux-ui-upgrade/global-property-11-storage-keys.test.ts
```

Expected: all focused files pass with zero failures.

- [ ] **Step 5: Run security-specific source checks**

Run:

```bash
rg -n "firebase_id_token|Authorization|subscription|entitlements|pushSubscription|privacyConsents" src/app/utils/local-data-import.ts src/features/plan12week/persistence/localDataImportTransaction.ts src/app/components/LocalDataImportManager.tsx src/app/pages/SettingsPage.local-import.test.tsx
rg -n "local_file_import|pending_cloud_decision|visionboard_local_file_import" src
rg -n "DashboardDataBackupCard|ScheduleStepLab" src/app/components/LocalDataImportManager.tsx src/app/utils/local-data-import.ts src/features/plan12week/persistence/localDataImportTransaction.ts
```

Expected:

- sensitive field names appear only in sanitization assertions/assignments, never copied from the file into active state;
- no token/header logging or persistence exists;
- new import code has no Dashboard/Schedule dependency.

- [ ] **Step 6: Run shared frontend gates**

Run:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Expected: all commands exit 0. Existing lint information outside the scoped files may remain, but no error is allowed.

- [ ] **Step 7: Run manual browser acceptance when credentials are available**

Use an authenticated real-mode staging/preview account and follow the seven browser scenarios in spec Section 12. Record route, owner state, file fixture, network state, cloud response, and expected transition for each scenario.

If no accessible real-mode deployment/credentials are available, do not substitute demo mode as cloud proof; report the exact missing target/credentials and keep this as residual acceptance risk.

- [ ] **Step 8: Review bounded Git scope and commit final test/baseline changes**

Review:

```bash
git diff --check
git status --short
git diff -- src/app/utils/local-data-backup.test.ts src/test/ux-ui-upgrade/__snapshots__/storage-keys.baseline.json
```

Stage only the Task 7 files and the plan if still untracked:

```bash
git add -- src/app/utils/local-data-backup.test.ts src/test/ux-ui-upgrade/__snapshots__/storage-keys.baseline.json docs/superpowers/plans/2026-08-07-safe-local-data-import.md
git commit -m "test(import): lock safe restore contract"
```

If the plan was already committed, omit it from `git add`. Verify every unrelated WIP path remains unstaged.

## Plan Self-Review

- Spec coverage:
  - Task 1 covers exact non-merge persistence for `LOCAL-IMPORT-016/017/020`.
  - Task 2 covers file validation, normalization, preview data, sanitization, identity, and unsupported-file rules `LOCAL-IMPORT-001` through `LOCAL-IMPORT-011`.
  - Task 3 covers snapshot ordering, rollback, queue/cursor ownership, retention, pending markers, recovery, cloud resolution, account switching, and nested-import blocking `LOCAL-IMPORT-012` through `LOCAL-IMPORT-022` and `LOCAL-IMPORT-030` through `LOCAL-IMPORT-038`.
  - Task 4 covers every generic sync pause path `LOCAL-IMPORT-023/024` and owner isolation.
  - Task 5 preserves backend contracts while making validate/import actions safe for Settings `LOCAL-IMPORT-026` through `LOCAL-IMPORT-031`.
  - Task 6 covers the approved AlertDialog Shell, visible pending state, demo/offline behavior, explicit cloud copy, and recovery actions.
  - Task 7 covers explicit wipe cleanup, storage baseline, security scans, automated gates, and acceptance evidence.
- Type consistency:
  - `LocalDataImportCandidate.importedSummary` is persisted into `LocalDataImportPendingMarker.summary`.
  - `LocalDataImportApplyResult.recoveryKey/importId` feed the pending/recovery UI and exact cloud resolver.
  - `AutoCloudSyncState.pauseReason` is optional, so existing context fixtures remain source-compatible.
  - Cloud request source literals remain the existing backend-approved values.
- Scope:
  - no backend, dependency, Dashboard, Schedule, UserData-shape, merge-import, or full-cloud-delete task is included;
  - the unused Dashboard backup card remains untouched;
  - anonymous migration remains separate.
- No implementation step depends on an undefined function or type; each produced interface is introduced before its consumer task.
