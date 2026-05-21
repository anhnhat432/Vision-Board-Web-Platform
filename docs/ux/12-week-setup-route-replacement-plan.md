# 12-Week Setup — Route Replacement Plan

## 1. Current decision state

- Current recommendation: **Full GO** for the 12-week setup route replacement.
- Route replacement is complete: `/12-week-setup` now renders `TwelveWeekSetupLab` as the primary new setup flow.
- Temporary reference routes remain: `/12-week-setup-old` is rollback/reference; `/12-week-setup-lab` is QA/reference.
- Product-owner approval, user validation, accessible monitoring closeout, and latest green `main` checks are recorded in `docs/ux/12-week-setup-limited-rollout-monitoring.md`.
- Route cleanup is a future follow-up, not immediate work.

## 2. Scope of the route replacement

Completed route-level behavior:

- `/12-week-setup` renders the new setup flow through `TwelveWeekSetupLab`.
- `/12-week-setup-old` preserves the previous setup implementation temporarily for rollback/reference.
- `/12-week-setup-lab` stays temporarily available as a QA/reference route.
- Storage schema, submit behavior, backend sync, auth, billing, dashboard behavior, plan generation logic, and weekly execution logic were not part of the route replacement.

## 3. Completed implementation touchpoints

Known route/page/test surfaces from the completed implementation:

- `src/app/routes.tsx` — route registration and path mapping.
- `src/app/routes.test.tsx` — route expectation updates where route mapping is asserted.
- `src/app/pages/12WeekSetupLab.ts` — page export used by the new setup route and QA/reference route.
- Previous setup page/module remains reachable through `/12-week-setup-old`.

No source code or route changes are part of this documentation status update.

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

Current behavior after route replacement:

| Path                 | Current behavior                                                            |
| -------------------- | --------------------------------------------------------------------------- |
| `/12-week-setup`     | Primary new setup flow; renders `TwelveWeekSetupLab`.                       |
| `/12-week-setup-old` | Temporary rollback/reference; renders the previous setup implementation.    |
| `/12-week-setup-lab` | Temporary QA/reference; renders `TwelveWeekSetupLab`.                       |

Decision deferred: route cleanup and eventual retirement or redirect of temporary routes is a future follow-up, not immediate work.

## 6. Pre-change checklist

Before editing routes later, confirm:

- Product owner approved **Full GO** for the route replacement.
- Target branch has current passing verification for the lab state.
- The previous `/12-week-setup` implementation can be imported/rendered under `/12-week-setup-old` without changing its internals.
- The lab implementation can be rendered at `/12-week-setup` without storage or submit changes.
- Manual smoke test on current `/12-week-setup-lab` passes on desktop and mobile.
- Known remaining risks are tracked as follow-ups after Full GO.
- Rollback owner and rollback trigger threshold are agreed before merge.

## 7. Implementation status

1. Route replacement branch completed and merged.
2. Previous `/12-week-setup` implementation remains reachable at `/12-week-setup-old`.
3. `/12-week-setup` renders `TwelveWeekSetupLab` as the primary new setup flow.
4. `/12-week-setup-lab` remains available temporarily for QA/reference.
5. Route mapping and manual smoke checks passed.
6. Full GO evidence is recorded in `docs/ux/12-week-setup-limited-rollout-monitoring.md`.
7. Route cleanup remains deferred as a future follow-up.

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
- Confirm CTA visibility and tap targets remain usable after Full GO.
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

- Setup completion rate drops materially after Full GO.
- Users cannot save or transition into weekly execution / Today.
- Validation blocks valid users from reaching Step 4.
- Route registration causes blank screen, navigation loop, or production-only crash.
- Support reports show repeated confusion around Step 1 outcome or Step 4 destination.

## 11. Post-replacement monitoring notes

After Full GO, monitor:

- Setup start → Step 4 completion.
- Save success and transition into weekly execution / Today.
- Validation friction, especially Step 2 and Step 3.
- Console/runtime errors and route-level blank screens.
- Support/contact reports about confusing setup copy.
- Mobile usability issues: blocked CTA, overflow, or unreadable preview.
- Any `net::ERR_ABORTED` pattern that becomes user-visible or correlates with failed saves/navigation.

Decision after monitoring:

- Full GO for the route replacement is approved and documented.
- Roll back to previous `/12-week-setup` only if a later rollback trigger fires.
- Keep the route replacement and schedule route cleanup as a future follow-up.

## 12. Explicit non-goals

This route replacement plan/status document does not include:

- Claiming paid subscription is live.
- Claiming cloud sync is complete.
- Changing source code, tests, app routes, storage, sync, auth, billing, or backend behavior now.
- Redesigning the lab UI or rewriting setup copy beyond already completed must-fix polish.
- Changing dashboard, Today, weekly execution, reflection, or review flows.
- Adding new analytics providers, billing logic, or production environment requirements.
- Running account/data migrations.
- Cleaning up `/12-week-setup-old` or `/12-week-setup-lab` immediately.
- Resolving the separate `/billing/plan` smoke-timeout follow-up.
