# Admin Classification Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make explicit real-user classifications visible and distinguish updated, unchanged, and failed bulk outcomes.

**Architecture:** Keep the backend contract unchanged. Render explicit real classifications in the existing badge component and derive three result counters in `AdminUsersPage` from the existing per-target statuses.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Biome.

## Global Constraints

- Do not change backend classification, audit, idempotency, or persistence behaviour.
- Do not show a confirmed-real badge for the `source: "default"` fallback.
- Preserve retry request ids and retry only `admin_audit_commit_unknown` failures.
- Do not add dependencies.

---

### Task 1: Render Explicit Real Classification

**Files:**
- Modify: `src/app/components/admin/AdminOperationalClassificationBadge.tsx`
- Test: `src/app/components/admin/AdminOperationalClassification.test.tsx`

**Interfaces:**
- Consumes: `AdminOperationalClassificationSummary` with `effectiveCategory` and `source`.
- Produces: `AdminOperationalClassificationBadge` rendering `Dữ liệu thật · Đã xác nhận` for `{ effectiveCategory: "real", source: "user" }`.

- [ ] **Step 1: Write the failing test**

Render both `{ effectiveCategory: "real", source: "user" }` and `{ effectiveCategory: "real", source: "default" }`. Assert that only the explicit user classification renders `Dữ liệu thật · Đã xác nhận`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx`

Expected: FAIL because the current badge returns `null` for all real classifications.

- [ ] **Step 3: Write minimal implementation**

Handle the explicit real case before the existing test/internal branch:

```tsx
if (effectiveCategory === "real") {
  return classification?.source === "user"
    ? <AdminStatusBadge tone="confirmed">Dữ liệu thật · Đã xác nhận</AdminStatusBadge>
    : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx`

Expected: the focused component test file passes.

### Task 2: Report Bulk Result Statuses Separately

**Files:**
- Modify: `src/app/pages/AdminUsersPage.tsx`
- Test: `src/app/pages/AdminUsersPage.test.tsx`

**Interfaces:**
- Consumes: `AdminClassifyUsersResult.results` statuses `updated | unchanged | failed`.
- Produces: `BulkResult` counters `updated`, `unchanged`, and `failed` and Vietnamese status copy.

- [ ] **Step 1: Write the failing test**

Return one `updated`, one `unchanged`, and one `failed` result from `adminClassifyUsers`. Assert the page announces `1 đã cập nhật, 1 không thay đổi, 1 thất bại`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:ui -- src/app/pages/AdminUsersPage.test.tsx`

Expected: FAIL because the current page announces a combined success count.

- [ ] **Step 3: Write minimal implementation**

Replace `BulkResult.succeeded` with separate counters and derive them from the response:

```ts
const updated = result.results.filter((item) => item.status === "updated").length;
const unchanged = result.results.filter((item) => item.status === "unchanged").length;
setBulkResult({ updated, unchanged, failed });
```

Render:

```tsx
`${bulkResult.updated} đã cập nhật, ${bulkResult.unchanged} không thay đổi, ${bulkResult.failed.length} thất bại...`
```

Transport failures keep all counters at zero.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.test.tsx`

Expected: both test files pass.

### Task 3: Verify Frontend Quality Gates

**Files:**
- Verify only; no additional production scope.

- [ ] **Step 1: Run typecheck**

Run: `npm.cmd run typecheck`

Expected: exit code 0.

- [ ] **Step 2: Run targeted lint**

Run: `npx.cmd biome lint src/app/components/admin/AdminOperationalClassificationBadge.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.tsx src/app/pages/AdminUsersPage.test.tsx`

Expected: exit code 0.

- [ ] **Step 3: Run build**

Run: `npm.cmd run build`

Expected: exit code 0.

- [ ] **Step 4: Review scope**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and only the two production files, two tests, design, and plan are changed.
