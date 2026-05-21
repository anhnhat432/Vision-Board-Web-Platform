# 12-Week Setup — Route Replacement Plan

## 1. Current decision state

- Current candidate: `/12-week-setup-lab`.
- Current recommendation: **LIMITED GO candidate only — not full GO**.
- Must-fix polish for the lab flow has been completed and post-polish verification is reported as passing.
- This plan does **not** approve immediate broad release. It defines a small, reversible route replacement to run only after an explicit product decision.
- Known remaining risks: no completed real-user validation round, small click-target findings, `net::ERR_ABORTED` QA log noise to monitor, and possible Step 4 preview density.

## 2. Scope of the route replacement

The future change should be route-level only:

- Preserve the previous `/12-week-setup` implementation under `/12-week-setup-old`.
- Make `/12-week-setup` render the current lab implementation.
- Keep `/12-week-setup-lab` temporarily available as a QA/reference route, or redirect it to `/12-week-setup` if the final product decision prefers one canonical URL.
- Avoid changing storage schema, submit behavior, backend sync, auth, billing, dashboard behavior, plan generation logic, or weekly execution logic.

## 3. Files likely to be touched

Likely route/page/test surfaces for the future implementation:

- `src/app/routes.tsx` — route registration and path mapping.
- `src/app/routes.test.tsx` — route expectation updates, if existing route tests assert page mappings.
- `src/app/pages/12WeekSetupLab.ts` — likely page export used by the lab route.
- Current previous setup page/module referenced by `/12-week-setup` — preserve and expose as the old route.
- Any route constants/sitemap/navigation references only if they explicitly list setup paths and must remain consistent.

Keep the diff as small as possible and avoid opportunistic cleanup.

## 4. Files that must not be touched

Do not touch these in the route replacement change unless a separate approved task explicitly requires it:

- Storage and migration files such as `src/app/utils/storage.ts`, `src/app/utils/storage-types.ts`, and `src/app/utils/storage-twelve-week.ts`.
- Backend sync, API, auth, billing, entitlement, and paywall modules.
- Dashboard, Today, weekly execution, reflection, and review pages/components.
- Lab copy/layout files, unless a blocking defect is found during pre-change smoke testing.
- Backend files under `backend/`.
- Deployment config, env files, or secret-related files.
- QA artifacts and unrelated documentation.

## 5. Exact intended route behavior

Target behavior after the future route replacement:

| Path                 | Intended behavior                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/12-week-setup-old` | Renders the previous implementation exactly as it existed before replacement. This is the fast rollback/reference path.                                                                                                                      |
| `/12-week-setup`     | Renders the current lab implementation. This becomes the canonical setup entry route for the limited replacement window.                                                                                                                     |
| `/12-week-setup-lab` | Temporarily stays as a QA/reference route **or** redirects to `/12-week-setup`, depending on final release decision. Prefer keeping it temporarily if QA needs side-by-side checks; prefer redirecting if product wants one canonical route. |

Decision required before implementation: choose whether `/12-week-setup-lab` stays available temporarily or redirects.

## 6. Pre-change checklist

Before editing routes later, confirm:

- Product owner explicitly approves **limited replacement**, not full GO.
- Target branch has current passing verification for the lab state.
- The previous `/12-week-setup` implementation can be imported/rendered under `/12-week-setup-old` without changing its internals.
- The lab implementation can be rendered at `/12-week-setup` without storage or submit changes.
- Manual smoke test on current `/12-week-setup-lab` passes on desktop and mobile.
- Known remaining risks are accepted for a limited rollout window.
- Rollback owner and rollback trigger threshold are agreed before merge.

## 7. Implementation steps

1. Create a small route-only branch.
2. Identify the current component used by `/12-week-setup` and keep it available as the old implementation.
3. Register `/12-week-setup-old` to render the previous implementation.
4. Change `/12-week-setup` to render the lab implementation.
5. Apply the final decision for `/12-week-setup-lab`:
   - Option A: keep it rendering the lab implementation for QA/reference.
   - Option B: redirect it to `/12-week-setup`.
6. Update only route tests that fail because the expected route mapping changed.
7. Do not edit copy, layout, storage, sync, submit, dashboard, or backend code in the same change.
8. Run verification commands and complete manual smoke tests before merge.

## 8. Verification commands

Run the smallest required set first, then broaden if route tests or shared routing behavior changed:

```bash
npm run typecheck
npm run test:run
npm run build
```

If route behavior has dedicated tests or broad routing changes were made, also run:

```bash
npm run lint
npm run check
```

For production-readiness confidence after merge candidate creation, consider:

```bash
npm run smoke:prod
```

If `npm run smoke:prod` cannot run because deployment credentials, preview URL, or production env are unavailable, record that blocker in the release note.

## 9. Manual smoke test checklist

### Desktop

- Open `/12-week-setup-old` and confirm the previous implementation renders.
- Open `/12-week-setup` and confirm it renders the lab implementation.
- Open `/12-week-setup-lab` and confirm it follows the final decision: QA/reference route or redirect.
- Complete Step 1 → Step 4 using valid data.
- Confirm Step 2 validation appears only after attempting to continue with missing required data.
- Confirm Step 3 can continue after valid data is present.
- Confirm Step 4 explains save destination into weekly execution / Today.
- Save the setup and confirm the transition still lands in the expected execution surface.
- Check console for uncaught exceptions or user-visible request failures.

### Mobile

- Repeat the route checks at a narrow mobile viewport.
- Complete Step 1 → Step 4 without horizontal overflow blocking primary actions.
- Confirm CTA visibility and tap targets are usable enough for the limited rollout.
- Confirm validation messages are readable and not shown prematurely.
- Confirm Step 4 preview remains understandable despite known density risk.
- Save the setup and confirm the post-save transition works.

## 10. Rollback plan

Rollback must be route-level and data-safe:

1. Revert `/12-week-setup` to the previous implementation.
2. Keep `/12-week-setup-old` temporarily or remove it only after rollback verification, depending on release owner preference.
3. Keep `/12-week-setup-lab` available for debugging if it helps reproduce the regression; otherwise redirect it away from user-facing paths.
4. Do not clear localStorage, mutate stored data, or run migrations as part of rollback.
5. Run `npm run typecheck`, `npm run test:run`, and `npm run build` after rollback.
6. Smoke test `/12-week-setup` on desktop and mobile to confirm the previous implementation is restored.
7. Document the trigger, affected route, and observed regression in the release notes or incident log.

Suggested rollback triggers:

- Setup completion rate drops materially during the limited rollout window.
- Users cannot save or transition into weekly execution / Today.
- Validation blocks valid users from reaching Step 4.
- Route registration causes blank screen, navigation loop, or production-only crash.
- Support reports show repeated confusion around Step 1 outcome or Step 4 destination.

## 11. Post-replacement monitoring notes

During the limited rollout window, monitor:

- Setup start → Step 4 completion.
- Save success and transition into weekly execution / Today.
- Validation friction, especially Step 2 and Step 3.
- Console/runtime errors and route-level blank screens.
- Support/contact reports about confusing setup copy.
- Mobile usability issues: blocked CTA, overflow, or unreadable preview.
- Any `net::ERR_ABORTED` pattern that becomes user-visible or correlates with failed saves/navigation.

Decision after monitoring should be one of:

- Continue limited rollout and collect real-user validation.
- Roll back to previous `/12-week-setup`.
- Keep the route replacement but schedule targeted follow-up polish.

## 12. Explicit non-goals

This route replacement plan does not include:

- Declaring full GO for the lab implementation.
- Replacing routes immediately in this documentation task.
- Changing source code, tests, app routes, storage, sync, auth, billing, or backend behavior now.
- Redesigning the lab UI or rewriting setup copy beyond already completed must-fix polish.
- Changing dashboard, Today, weekly execution, reflection, or review flows.
- Adding new analytics providers, billing logic, or production environment requirements.
- Running account/data migrations.
