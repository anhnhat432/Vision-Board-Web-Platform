# No-Visual Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve public landing, core app, and system smoothness through background-work reductions without visual changes.

**Architecture:** Keep behavior gates close to the existing hooks that schedule background work. Public landing optimization gates root-shell route prefetch by auth state. Core/system optimization gates auto-sync network listeners by authenticated owner readiness.

**Tech Stack:** React 18, Vite 6, TypeScript, Vitest, Testing Library, Playwright for measurement.

---

## File Structure

- Modify: `src/app/components/root-layout/hooks/useUiBootstrap.ts`
  - Add an `enabled` option to `useWarmPrefetch` so route warming can be disabled without changing callers' UI.
- Modify: `src/app/components/root-layout/AppShellLayout.tsx`
  - Call `useWarmPrefetch({ enabled: Boolean(user) })` so signed-out landing visitors do not prefetch heavy app routes.
- Create: `src/app/components/root-layout/hooks/useUiBootstrap.test.ts`
  - Verify disabled warm prefetch does not schedule route imports, and enabled warm prefetch still works.
- Modify: `src/app/hooks/useNetworkStatus.ts`
  - Add an `enabled` option that skips browser online/offline listeners when false, and refreshes browser status when tracking is enabled after mount.
- Modify: `src/app/hooks/useNetworkStatus.test.ts`
  - Verify disabled mode does not attach listeners, still exposes current status, and refreshes status when tracking is enabled later.
- Modify: `src/features/plan12week/hooks/useAutoCloudSync.ts`
  - Pass `enabled: Boolean(ownerUid) && (fullSyncEnabled || drainSyncEnabled)` to `useNetworkStatus`.

## Task 1: Public Landing Warm-Prefetch Gate

- [x] Write failing tests in `src/app/components/root-layout/hooks/useUiBootstrap.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWarmPrefetch } from "./useUiBootstrap";
import { WARM_PREFETCH_ROUTE_PATHS, prefetchRoute } from "../navConfig";

vi.mock("../navConfig", () => ({
  WARM_PREFETCH_ROUTE_PATHS: ["/12-week-system", "/goals"],
  prefetchRoute: vi.fn(),
}));

describe("useWarmPrefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "4g" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not schedule route prefetch when disabled", () => {
    renderHook(() => useWarmPrefetch({ enabled: false }));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(prefetchRoute).not.toHaveBeenCalled();
  });

  it("prefetches warm routes when enabled", () => {
    renderHook(() => useWarmPrefetch({ enabled: true }));

    act(() => {
      vi.advanceTimersByTime(901);
    });

    for (const path of WARM_PREFETCH_ROUTE_PATHS) {
      expect(prefetchRoute).toHaveBeenCalledWith(path);
    }
  });
});
```

- [x] Run: `npx vitest run src/app/components/root-layout/hooks/useUiBootstrap.test.ts --config vitest.fast.config.ts`
  - Expected before implementation: FAIL because `useWarmPrefetch` does not accept the options object.
- [x] Implement the `enabled` option in `useWarmPrefetch`.
- [x] Update `AppShellLayout.tsx` to call `useWarmPrefetch({ enabled: Boolean(user) })`.
- [x] Run the same focused test.
  - Expected after implementation: PASS.

## Task 2: Auto-Sync Network Listener Gate

- [x] Add failing test to `src/app/hooks/useNetworkStatus.test.ts`:

```ts
it("does not attach browser listeners when disabled", () => {
  const { result } = renderHook(() => useNetworkStatus({ enabled: false }));

  expect(result.current.status).toBe("online");
  expect(listeners.get("online")?.size ?? 0).toBe(0);
  expect(listeners.get("offline")?.size ?? 0).toBe(0);
});

it("refreshes browser status when tracking is enabled after mount", () => {
  const { rerender, result } = renderHook(({ enabled }) => useNetworkStatus({ enabled }), {
    initialProps: { enabled: false },
  });

  expect(result.current.status).toBe("online");
  Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });

  rerender({ enabled: true });

  expect(result.current.status).toBe("offline");
  expect(listeners.get("online")?.size ?? 0).toBeGreaterThan(0);
  expect(listeners.get("offline")?.size ?? 0).toBeGreaterThan(0);
});
```

- [x] Run: `npx vitest run src/app/hooks/useNetworkStatus.test.ts --config vitest.fast.config.ts`
  - Expected before implementation: FAIL because listeners are still attached.
- [x] Implement `enabled?: boolean` in `UseNetworkStatusOptions`; when false, do not add listeners and cancel reconnect timers; when enabled after mount, refresh current browser status before attaching listeners.
- [x] Update `useAutoCloudSync.ts` so `useNetworkStatus` is enabled only when `ownerUid` exists and sync feature flags are active.
- [x] Run the focused test.
  - Expected after implementation: PASS.

## Task 3: Browser Measurement and Guard Verification

- [x] Run `npm.cmd run build`.
- [x] Start preview with `npx vite preview --host 127.0.0.1 --port 4173`.
- [x] Measure `/` with Playwright using a fresh context and record resources, long tasks, animation count, and blur/backdrop-filter count.
- [x] Run focused tests from Tasks 1 and 2.
- [x] Run `npm.cmd run typecheck`.
- [x] Run `npm.cmd run build`.
- [x] Report before/after measurements and any limits.
