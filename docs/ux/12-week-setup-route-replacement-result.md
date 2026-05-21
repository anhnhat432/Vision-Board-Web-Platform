# 12-Week Setup Route Replacement Result

## 1. Summary

Route-level replacement has been completed for the 12-week setup experience:

- `/12-week-setup` now renders the lab implementation.
- `/12-week-setup-old` preserves access to the previous setup implementation.
- `/12-week-setup-lab` remains available as a QA/reference route and also renders the lab implementation.

This is a controlled route replacement result, not a broad release-readiness sign-off.

## 2. Files changed

Source changes were completed before this result document. No source code or route changes were made as part of the route replacement documentation task.

Known route replacement touchpoints from the completed implementation:

- `src/app/routes.tsx`
- `src/app/pages/12WeekSetupLab.ts`
- Existing 12-week setup/lab implementation files under `src/features/plan12week/`

This document added:

- `docs/ux/12-week-setup-route-replacement-result.md`

Follow-up smoke documentation update added:

- Final manual smoke confirmation section in this file.
- `scripts/manual-smoke-12-week-route-replacement.cjs` as a focused local Playwright smoke helper for this confirmation.

## 3. Final route behavior

| Route                | Final behavior                                                        |
| -------------------- | --------------------------------------------------------------------- |
| `/12-week-setup`     | Renders the lab 12-week setup implementation.                         |
| `/12-week-setup-old` | Renders the previous setup implementation for rollback/reference.     |
| `/12-week-setup-lab` | Remains available as QA/reference and renders the lab implementation. |

## 4. Verification results

Reported verification passed after the route-level replacement:

- `npm run test:run` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.

Focused manual smoke confirmation was run later with a local demo Vite server and seeded local demo state. No source code, route mapping, UX copy/layout, storage/backend/dashboard, or weekly execution code was changed.

## 5. Manual smoke results

Manual/headless smoke summary after the save-destination investigation:

- `/12-week-setup` lab flow smoke passes in demo-mode seeded smoke.
- `/12-week-setup-old` passes route inspection and continues to render the previous setup implementation.
- `/12-week-setup-lab` passes route inspection and continues to render the lab QA/reference implementation.
- Save interaction on `/12-week-setup` now reaches `/12-week-system` in the focused smoke after correcting the smoke seed shape.

## 6. Final manual smoke confirmation

Run time: 2026-05-21 UTC / Asia-Saigon local day.

Environment used:

- Local Vite dev server started in demo mode with `VITE_APP_MODE=demo`.
- Served URL observed from Vite: `http://127.0.0.1:5175/`.
- Browser: Playwright Chromium headless.
- State: seeded local demo/auth-free funnel state with onboarding complete, wheel data, selected focus area, pending SMART goal, and pending feasibility result so setup routes could render normally.

Commands run:

- `cmd /c "set VITE_APP_MODE=demo&& npm run dev -- --host 127.0.0.1 --port 5174"` — started successfully; Vite auto-selected port `5175` because the requested port was unavailable.
- `cmd /c "set SMOKE_BASE_URL=http://127.0.0.1:5175&& node scripts\manual-smoke-12-week-route-replacement.cjs"` — completed and printed smoke results.

Route results:

- `/12-week-setup-old` passed route inspection and rendered the previous setup implementation. Distinguishing marker observed: old copy includes `Outcome statement`; lab-only copy was not present.
- `/12-week-setup` passed route inspection and rendered the lab setup implementation. Distinguishing marker observed: lab copy includes `Đích đến sau 12 tuần`; old `Outcome statement` copy was not present.
- `/12-week-setup-lab` passed route inspection and rendered the lab setup implementation as the QA/reference route. Distinguishing markers observed: lab copy includes `Đích đến sau 12 tuần` and QA/reference link copy `Quay lại bản hiện tại`; old `Outcome statement` copy was not present.

Step 1 → Step 4 result:

- `/12-week-setup` Step 1 → Step 4 completed with valid seeded/manual input.
- Step 4 preview included the expected outcome, lag metric, why statement, three recurring actions, and Week 1 content.

Step 2 validation result:

- Final finding: the immediate Step 2 error was a validation timing issue in the lab setup wrapper and Step 2 field/warning rendering, not a route replacement issue.
- Root cause: Step-level validation was computed on every render and used as visible shell state before a continue attempt. Step 2 also rendered field warnings for empty draft indicators immediately, so the body text contained `Đặt tên cho việc lặp lại này.` on first entry even though the user had not attempted Step 2 yet.
- Fix: the lab setup now keeps raw validation for blocking navigation, but only exposes shell, field, and warning validation after Step 2 has been attempted. Saved draft hydration also resets the per-session attempted-step map so stale attempted state does not leak into first entry.
- Verified behavior after fix: Step 2 no longer shows `Đặt tên cho việc lặp lại này.` immediately on entry in the focused smoke; the valid Step 1 → Step 4 path and save destination remain passing.
- Rollback recommendation: no route rollback recommended for Step 2 validation; the issue was fixed with a minimal attempted-step gating patch.

Save destination result:

- Final finding: the earlier no-navigation result was a smoke-script seed limitation, not a route replacement or setup submit regression.
- Root cause: the smoke seed wrote `visionboard_user_data` without required `UserData` arrays such as `wheelOfLifeHistory`, `visionBoards`, `achievements`, and `reflections`. `parseStoredUserData()` rejected that shape, so `initializeUserData()` hydrated demo data instead. The demo data already had three goals and one active 12-week cycle, so the save path hit the free-tier limit branch and stayed on `/12-week-setup` without creating a new goal.
- Fix: the smoke helper now seeds a valid local `UserData` shape with empty required arrays and treats `saveDestination.passed === false` as a smoke failure.
- Verified behavior: completing `/12-week-setup` Step 1 → Step 4 and clicking `Lưu kế hoạch` creates one local 12-week goal, sets the latest 12-week goal key, and navigates to `/12-week-system` with `Hôm nay` content visible.
- Rollback recommendation: no route rollback recommended for save destination; the confirmed issue was in the smoke harness.

Console/runtime errors:

- No `console.error` entries were recorded.
- No uncaught page exceptions were recorded.
- Failed requests were recorded as Vite module `net::ERR_ABORTED` entries during route changes/lazy loading. These are consistent with navigation-cancelled dev-server module requests and were not observed as user-visible request failures in this smoke.

Current decision state after final smoke:

**LIMITED ROLLOUT / MONITOR**

This is still not a full GO. Route replacement, Step 2 first-entry validation timing, and post-save navigation are confirmed in the seeded local demo smoke.

## 7. Smoke caveats / limitations

- `/12-week-setup` lab flow passed route, Step 2 first-entry validation timing, Step 1 → Step 4, and save destination smoke in seeded local demo state, not broad production-like real-user testing.
- Step 2 immediate validation behavior is fixed in the focused smoke, but this does not replace broader manual QA for every invalid-input combination.
- Save destination is verified for the local demo/auth-free smoke path after correcting the smoke seed, but this does not replace authenticated real-mode QA.
- Smoke results do not prove full browser/device coverage, production auth behavior, backend sync behavior, or real user readiness.

## 8. Behavior explicitly not changed

The route replacement did not intentionally change:

- Core 12-week setup business logic beyond route selection.
- Data persistence model or localStorage shapes.
- Backend sync behavior.
- Auth/login guards.
- Billing, entitlement, or paywall behavior.
- `/12-week-setup-old` implementation behavior.
- `/12-week-setup-lab` implementation behavior beyond remaining available as QA/reference.
- Production launch status.

## 9. Current decision state

**LIMITED ROLLOUT / MONITOR**

This is not a full GO.

The lab implementation is now the primary `/12-week-setup` route, with the previous setup still available at `/12-week-setup-old`. The current evidence supports limited rollout and close monitoring, not broad release readiness or completion of real user testing.

## 10. Rollback path

If issues appear after replacement:

1. Repoint `/12-week-setup` to the previous setup implementation.
2. Keep `/12-week-setup-lab` available for continued QA/reference if useful.
3. Keep `/12-week-setup-old` available until confidence is restored or the old implementation is intentionally retired.
4. Re-run the smallest relevant verification set after rollback:
   - `npm run typecheck`
   - `npm run test:run`
   - `npm run build`
5. Repeat targeted manual smoke for `/12-week-setup`, `/12-week-setup-old`, and `/12-week-setup-lab`.

## 11. Monitoring checklist

Monitor during limited rollout:

- Users can enter `/12-week-setup` from the intended product flow.
- Step navigation works across the full lab setup flow.
- Validation messages are clear and do not block valid input.
- Save behavior reaches the intended destination in normal authenticated/demo flows.
- No console errors during setup or save.
- Existing saved 12-week data remains intact.
- Login/core guard behavior is expected for protected routes.
- Mobile layout remains usable on common viewport sizes.
- No unexpected redirects from `/12-week-setup`, `/12-week-setup-old`, or `/12-week-setup-lab`.
- Support/error reports do not increase after the route replacement.

## 12. Recommended next steps

1. Recheck save destination in authenticated real-mode QA as part of normal production verification, not because the local demo smoke still fails.
2. Keep the focused smoke helper in CI/manual release checks so save destination and validation-timing regressions fail explicitly.
3. Monitor early usage and error reports before considering broader rollout.
4. Decide later whether to retire `/12-week-setup-old` only after stable usage evidence and explicit release approval.
