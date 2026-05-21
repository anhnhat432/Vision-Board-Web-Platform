# 12-Week Setup Lab — Post-polish Check

## 1. Purpose of this check

This document records the post-polish decision state for `/12-week-setup-lab` after the must-fix copy and clarity items were completed. It is meant to support a route replacement decision later, not to approve an immediate replacement now.

## 2. Previous status: POLISH

Previous recommendation: **POLISH**.

Reason: the lab flow passed the main QA path, but copy clarity, mental-model guidance, Step 4 destination clarity, and release-readiness confidence were not yet strong enough to replace `/12-week-setup`.

## 3. What polish was completed

Completed polish was limited to the lab setup flow:

- Step 1 now frames the main outcome as the **12-week destination**, not a daily task.
- Step 2 copy was simplified to distinguish recurring actions from result metrics in plainer language.
- Step 3 terms were made more everyday and less framework-heavy.
- Step 4 now clarifies that saving leads into weekly execution / Today.
- Step 4 scorecard copy now clarifies that execution points track repeated action completion, not overall ability or success.
- Step 1 field order / label expectations were rechecked as part of the post-polish validation.

## 4. Verification results

Current verification reported as passing:

- `npm run test:run` — PASS.
- `npm run typecheck` — PASS.
- `npm run build` — PASS.

Additional context:

- The previous transient route test failure no longer reproduces.
- Post-polish QA confirmed the main Step 1 → Step 4 flow can complete.
- Step 2 validation timing remains intentional: errors appear after attempting to continue with missing data, not immediately on entry.
- Step 3 disabled-state concern was traced to QA automation behavior, not an app UX blocker.

## 5. What was not changed

No route behavior was changed.

Specifically:

- `/12-week-setup` was **not** replaced.
- `/12-week-setup-lab` remains a separate lab route.
- Dashboard behavior was not changed.
- Storage schema, backend sync, auth, paywall, billing, and submit behavior were not changed.
- No source-code changes are part of this documentation task.

## 6. Remaining risks

Remaining risks before a broader replacement decision:

- No real user testing has been completed or claimed for this post-polish state.
- Click target findings below 40px still need product/design judgment, especially around secondary navigation/footer links.
- `net::ERR_ABORTED` entries from browser QA logs should remain documented as likely dev-server/navigation noise unless they reproduce as user-visible failures.
- Step 4 preview may still feel dense for some users, even after copy clarification.
- The lab route has passed automated and local QA checks, but it has not yet proven conversion, comprehension, or completion quality with real users.

## 7. Updated recommendation: LIMITED GO candidate

Updated recommendation: **LIMITED GO candidate only**.

This is **not full GO**.

`/12-week-setup-lab` is now a candidate for limited exposure or a controlled replacement plan because must-fix clarity issues are resolved and verification is passing. It should not be treated as fully approved for broad release until the replacement conditions below are satisfied.

## 8. Conditions required before replacing `/12-week-setup`

Before replacing `/12-week-setup`, require:

1. A deliberate product decision approving limited rollout scope.
2. Confirmation that the current passing verification remains valid on the target branch.
3. A short manual smoke check of the full setup path on mobile and desktop.
4. Explicit acknowledgment that real user testing is still pending, or completion of a small real-user validation round.
5. A rollback plan that can restore `/12-week-setup` quickly if completion, comprehension, or route stability regresses.
6. Monitoring focus after replacement: setup completion, validation friction, save-to-execution transition, and error reports.

## 9. Rollback-aware route replacement option

Recommended route replacement approach, if approved later:

- Keep the existing `/12-week-setup` implementation available during the first replacement window.
- Swap route registration so `/12-week-setup` renders the lab implementation.
- Preserve `/12-week-setup-lab` temporarily as a direct QA/reference route if safe for the deployment mode.
- Use a small, easily reversible route-level diff only; avoid combining replacement with unrelated UI, storage, sync, or dashboard changes.
- If regressions appear, roll back by restoring `/12-week-setup` to the previous implementation without changing stored user data.

Decision state: **LIMITED GO candidate only — not full GO**.
