# GA4 Production Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the configured Firebase GA4 measurement id when the dedicated GA id is absent, while preserving all existing real/demo and privacy gates.

**Architecture:** Add one pure measurement-id resolver shared by the startup script loader and analytics event gate. Keep event names, payloads, storage, and provider behavior unchanged.

**Tech Stack:** React 18, Vite 6, TypeScript, Vitest.

## Global Constraints

- `VITE_GA_MEASUREMENT_ID` has precedence over `VITE_FIREBASE_MEASUREMENT_ID`.
- Only valid `G-[A-Z0-9]+` ids may enable GA4.
- Remote analytics remains limited to `VITE_APP_MODE=real` and `VITE_ANALYTICS_MODE=ga4`.
- Do not add events, dependencies, storage fields, account identifiers, or free-text metadata.

---

### Task 1: Add the shared measurement-id resolver

**Files:**
- Create: `src/app/utils/analytics-config.ts`
- Create: `src/app/utils/analytics-config.test.ts`

**Interfaces:**
- Produces: `resolveGaMeasurementId(primaryId, firebaseId): string`, `getConfiguredGaMeasurementId(): string`, and `isGaMeasurementId(value): boolean`.

- [ ] **Step 1: Write failing resolver tests**

```ts
expect(resolveGaMeasurementId(" G-PRIMARY1 ", "G-FIREBASE1")).toBe("G-PRIMARY1");
expect(resolveGaMeasurementId("", " G-FIREBASE1 ")).toBe("G-FIREBASE1");
expect(isGaMeasurementId("G-FIREBASE1")).toBe(true);
expect(isGaMeasurementId("firebase-measurement")).toBe(false);
```

- [ ] **Step 2: Run the resolver test and confirm it fails**

Run: `npx vitest run --config vitest.fast.config.ts src/app/utils/analytics-config.test.ts`

Expected: fail because `analytics-config.ts` does not exist.

- [ ] **Step 3: Implement the resolver**

```ts
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export function resolveGaMeasurementId(primaryId?: string, firebaseId?: string): string {
  return primaryId?.trim() || firebaseId?.trim() || "";
}

export function getConfiguredGaMeasurementId(): string {
  return resolveGaMeasurementId(
    import.meta.env.VITE_GA_MEASUREMENT_ID,
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  );
}

export function isGaMeasurementId(value: string): boolean {
  return GA_MEASUREMENT_ID_PATTERN.test(value);
}
```

- [ ] **Step 4: Run the resolver test and confirm it passes**

Run: `npx vitest run --config vitest.fast.config.ts src/app/utils/analytics-config.test.ts`

Expected: all resolver tests pass.

### Task 2: Use the same resolved id for loading and event delivery

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/app/utils/analytics.ts`
- Modify: `src/app/utils/analytics.test.ts`

**Interfaces:**
- Consumes: `getConfiguredGaMeasurementId()` and `isGaMeasurementId()` from Task 1.
- Produces: consistent startup loading and event gating with Firebase fallback.

- [ ] **Step 1: Add a failing remote-event fallback test**

```ts
vi.stubEnv("VITE_APP_MODE", "real");
vi.stubEnv("VITE_ANALYTICS_MODE", "ga4");
vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");
vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-FIREBASE1");

trackAnalyticsEvent("progress_viewed", { source: "dashboard" });
expect(canSendRemoteAnalytics()).toBe(true);
expect(window.dataLayer).toContainEqual(expect.objectContaining({ event: "progress_viewed" }));
```

- [ ] **Step 2: Run the analytics tests and confirm the fallback test fails**

Run: `npx vitest run --config vitest.fast.config.ts src/app/utils/analytics-config.test.ts src/app/utils/analytics.test.ts`

Expected: the new Firebase fallback test fails before runtime wiring.

- [ ] **Step 3: Replace duplicated GA id lookup in both runtime paths**

```ts
import { getConfiguredGaMeasurementId, isGaMeasurementId } from "./app/utils/analytics-config";

const gaMeasurementId = getConfiguredGaMeasurementId();
```

Use the equivalent relative import in `analytics.ts`, remove its private id resolver/validator, and retain the existing mode checks.

- [ ] **Step 4: Run focused and broad verification**

Run:

```bash
npx vitest run --config vitest.fast.config.ts src/app/utils/analytics-config.test.ts src/app/utils/analytics.test.ts
npm run typecheck
npm run lint
npm run build
```

Expected: tests, typecheck, lint, and build exit `0`; existing unrelated lint info may remain.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/app/utils/analytics-config.ts src/app/utils/analytics-config.test.ts src/app/utils/analytics.ts src/app/utils/analytics.test.ts src/main.tsx
git commit -m "fix: reuse Firebase GA4 measurement id"
```
