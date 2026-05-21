# 12-Week Setup Lab — Post-polish Check

## 1. Purpose of this check

This document records the post-polish decision state for `/12-week-setup-lab` after the must-fix copy and clarity items were completed. It is historical context for the route replacement decision; the replacement is now Full GO and the current source of truth is `docs/ux/12-week-setup-limited-rollout-monitoring.md`.

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

## 5. Historical post-polish state

At the time of the post-polish check, no route behavior was changed.

Current state supersedes that historical snapshot:

- `/12-week-setup` is now replaced by `TwelveWeekSetupLab` as the primary new setup flow.
- `/12-week-setup-lab` remains a separate temporary QA/reference route.
- Dashboard behavior was not changed by the route replacement.
- Storage schema, backend sync, auth, paywall, billing, and submit behavior were not changed by the route replacement.
- No source-code changes are part of this documentation status update.

## 6. Remaining risks

Remaining risks after Full GO:

- Click target findings below 40px still need product/design judgment, especially around secondary navigation/footer links.
- `net::ERR_ABORTED` entries from browser QA logs should remain documented as likely dev-server/navigation noise unless they reproduce as user-visible failures.
- Step 4 preview may still feel dense for some users, even after copy clarification.
- Continue monitoring setup conversion, comprehension, completion quality, support reports, runtime errors, and sync failures after Full GO.
- Cloud sync is not claimed complete, and paid subscription is not claimed live by this route replacement decision.

## 7. Updated recommendation: Full GO route replacement

Updated recommendation: **Full GO** for the 12-week setup route replacement.

`/12-week-setup` now renders `TwelveWeekSetupLab` as the primary new setup flow. `/12-week-setup-old` remains temporary rollback/reference, and `/12-week-setup-lab` remains temporary QA/reference. Route cleanup is a future follow-up, not immediate work.

## 8. Replacement approval evidence

Replacement approval is complete:

1. Product-owner approval is recorded.
2. Latest monitored `main` checks are green.
3. Manual and production route smoke passed for the setup route mapping.
4. User validation confirmed `/12-week-setup` Step 1 -> Step 4 -> save -> `/12-week-system` as acceptable.
5. Rollback path remains documented while `/12-week-setup-old` stays available.
6. Monitoring focus after Full GO: setup completion, validation friction, save-to-execution transition, support reports, runtime errors, and sync failures.

## 9. Rollback-aware route replacement option

Current route replacement behavior:

- `/12-week-setup` renders `TwelveWeekSetupLab` as the primary new setup flow.
- `/12-week-setup-old` preserves the previous setup implementation temporarily for rollback/reference.
- `/12-week-setup-lab` remains temporarily available as a direct QA/reference route.
- If regressions appear, roll back by restoring `/12-week-setup` to the previous implementation without changing stored user data.
- Route cleanup is a future follow-up; do not retire or redirect temporary routes immediately.
- The separate `/billing/plan` smoke timeout remains an ops follow-up and does not change this Full GO decision.

Decision state: **Full GO** for 12-week setup route replacement.
