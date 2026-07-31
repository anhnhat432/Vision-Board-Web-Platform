# 12-Week Release Gates Follow-up

## 1. Context & Goal

- Feature / bug: the merged 12-week UI release still has a failing production-dependency audit, while its Vercel preview cannot initialize Firebase because the client variables are scoped to an older preview branch.
- Why now: preview proof for authentication, account deletion, and LWW sync cannot run until the release target is both security-gated and configured as a real-mode staging target.
- User impact: do not promote another production change until the current code passes local/CI gates and the preview proofs have recorded evidence.
- Modes affected: `real` preview/staging; production behavior must remain unchanged by this follow-up.

## 2. Surface Classification

- Type: `Core`
- Touched domains: dependency security, Vercel preview environment metadata, auth/sync proof gates.
- Existing invariants that must not break: no secrets in source or logs; no localStorage key/shape, public API, entitlement, auth, or route contract changes; local saves remain available offline; no production redeploy before preview proof passes.

## 3. Actors & Entry Points

- Primary actor: release operator.
- Secondary actor(s): reviewer evaluating the launch gate.
- Route(s): `/login`, `/settings`, `/12-week-system`, and deployed core-funnel routes exercised by the proof workflows.
- API / hook / store touchpoints: existing Firebase client initialization and existing GitHub Actions proof workflows only.

## 4. Functional Requirements

1. WHEN the frontend and backend production dependency audits run, THE system SHALL fail on every high or critical advisory except the exact frontend-only `GHSA-qwww-vcr4-c8h2` exception, which applies only to unstable RSC APIs that this Vite SPA does not use.
2. WHEN a real-mode proof preview is built, THE deployment SHALL receive the required `VITE_FIREBASE_*`, API, billing-mode, and sync configuration without exposing values in the repository, terminal output, screenshots, or workflow inputs.
3. WHEN preview environment metadata is incomplete, THE release process SHALL stop before dispatching destructive account-deletion or LWW workflows.
4. WHEN all local gates and preview proofs pass, THE release process MAY open a focused follow-up PR; it SHALL NOT merge or trigger production deployment automatically.
5. WHEN the account-deletion proof first enters Settings, THE harness SHALL mark the Settings guide as seen before navigation so responsive guide hydration cannot intercept the destructive-flow controls.
6. WHEN an LWW proof scenario starts, THE harness SHALL bootstrap a normalized 12-week goal from the authenticated local snapshot with deterministic task instances for all 12 weeks and the week-one proof task scheduled on the current local date, mirror it to the active auth-scoped key, and use the authenticated `/sync/12-week/import` API only to create the server-side Goal, Plan, Week, Task, and lead-metric baseline with matching client IDs before exercising conflict resolution.
7. WHILE exercising LWW resolution, THE harness SHALL use the real task checkbox and cloud-sync UI; it SHALL NOT depend on the product's first-time goal-creation route or broad text locators.
8. WHEN the account-deletion proof seeds its local marker, THE harness SHALL preserve the authenticated snapshot, mirror the marker to the active auth-scoped key, reload Settings, and verify the marker still exists before destructive confirmation.
9. WHEN account deletion succeeds in real mode, THE harness SHALL accept `/`, `/onboarding`, `/login?next=/onboarding`, or the observed auth-gated `/login?next=/settings` route while still requiring the remote `DELETE` response to succeed before local marker cleanup.
10. WHEN an LWW scenario bootstraps its proof goal, THE harness SHALL require a successful `/api/sync/12-week/import` response and verify only safe entity counts and expected client-ID links before allowing the second context to pull the baseline.
11. WHEN the account-deletion proof enters Settings, THE harness SHALL suppress both the contextual Settings guide and the global new-user guide before authentication so neither dialog can intercept the destructive-flow controls.
12. WHEN the expected LWW bootstrap import fails, THE harness SHALL report only backend API status plus safe entity counts and client-ID match booleans; it SHALL NOT log request or response bodies, headers, credentials, local snapshots, titles, or secret values.
13. WHEN an LWW context authenticates, THE harness SHALL wait for its initial successful 12-week pull before writing a proof snapshot so login-time auto-sync cannot overwrite the bootstrap state.
14. WHEN publishing the LWW bootstrap, THE harness SHALL import the complete baseline, reload the first authenticated context to hydrate and verify it without invoking a rate-limited manual full sync, and authenticate the second context only afterward so its initial pull loads the proof goal.
15. WHEN the LWW bootstrap task is not visible on Today, THE harness SHALL report only stage-labeled snapshots of the current route, proof goal/task presence, task count, current-week/today counts, proof tactic/title match counts, current week, scheduled-date match, latest-goal pointer match, auth-scoped snapshot match, active-proof-goal visibility, and visible checkbox count; it SHALL NOT report raw snapshots, titles, payloads, headers, credentials, or secret values.
16. WHEN the LWW harness cannot open a requested 12-week tab or render the bootstrap settings control, THE harness SHALL report only the current route, system-tab counts, requested/active tab state, tab-panel visibility, settings-control visibility, and the safe proof-presence diagnostics allowed by requirement 15; it SHALL NOT report raw snapshots, titles, payloads, headers, credentials, or secret values.
17. WHILE exercising local-wins, cloud-wins, and tombstone resolution after baseline import, THE harness SHALL create task state changes through the real checkbox UI and publish them through the real mutation queue; direct API import SHALL NOT replace any conflict mutation under proof.
18. WHEN an authenticated 12-week import is accepted, THE backend SHALL persist the resolved `importId` as both the mutation ID and mutation-log idempotency key so repeated imports do not depend on legacy nullable-index behavior.
19. WHILE an LWW proof context is authenticating, THE harness SHALL isolate the unrelated legacy `GET /api/plans` hydration list with an empty success response; all `/api/sync/12-week/*` requests SHALL continue to use the deployed backend.
20. BEFORE an LWW proof context authenticates, THE harness SHALL defer the first-time onboarding redirect for that browser session so the requested `/settings` destination remains available after login.
21. WHEN an authenticated LWW context enters `/settings` or `/12-week-system`, THE harness SHALL use in-app navigation without reloading the document so the active auto-sync provider and its sync-floor state are preserved.
22. WHEN the staging workflow runs LWW proof, THE workflow SHALL execute local-wins, cloud-wins, and tombstone as separate sequential Playwright invocations with `--retries=0` so a failed attempt cannot reuse an already-mutated import baseline.
23. BETWEEN LWW scenarios, THE workflow SHALL wait at least 65 seconds to respect the protected API's per-user request window, SHALL continue to later scenarios after an earlier failure, and SHALL return a failing job after all three scenarios if any scenario failed.
24. WHEN the LWW workflow succeeds or fails, THE workflow SHALL upload both `playwright-report/` and `test-results/` with `if: always()` so screenshots, video, and error context remain available after the runner exits.
25. WHILE an LWW proof context is active, THE harness SHALL return deterministic proof-only success responses for the legacy execution transport under `/api/plans`, `/api/plans/*`, `/api/weeks/*`, `/api/tasks/*`, and `/api/metrics/*`; it SHALL NOT intercept, mock, or fulfill any `/api/sync/12-week/*` request.
26. WHEN manual sync or final convergence fails, THE harness SHALL expose only the scenario/stage label, HTTP status, `Retry-After`, pending/retry-scheduled counts, and final context A/B booleans; it SHALL NOT expose credentials, payloads, response bodies, snapshots, titles, arbitrary headers, or PII.
27. WHEN `task_completed_changed` mutations arrive out of order, THE backend SHALL compare their validated `clientTimestamp` values using a task-level client LWW timestamp, break equal-timestamp ties by `mutationId`, apply only the winning mutation, and return a successful `noop` result for a losing mutation without changing task state or revision.
28. AFTER a task mutation drain succeeds, THE next pull SHALL remain authoritative for that task; the frontend SHALL NOT preserve a recently applied task through the temporary skip-entity compatibility window used by check-ins, reviews, and metrics.
29. WHEN the tombstone proof opens the cloud-workspace deletion dialog, THE harness SHALL complete both irreversible confirmation controls (checkbox and exact `XOACLOUD` text) before waiting for the real `/api/sync/12-week/workspace` delete response.
30. WHEN a task mutation is accepted or rejected by LWW, THE task's `syncUpdatedAt` SHALL remain a server processing timestamp used by delta pull, separate from the client timestamp used for winner selection, so a mutation processed after a pull cursor cannot disappear because the client clock lags the server clock.
31. WHERE an existing task has no client LWW timestamp, THE first post-migration mutation SHALL be accepted and establish that timestamp because legacy `syncUpdatedAt` values may contain either server time or client time.
32. WHEN an authoritative task pull is converted back to local execution data, THE frontend SHALL map the task `syncUpdatedAt` to the existing local `lastModifiedAt` field so the generic stale-save guard does not restore the pre-pull task state.
33. WHEN a mutation drain ends with no pending mutations and every failure is `failed_not_found`, THE manual sync SHALL continue to pull the authoritative cloud snapshot so a remote tombstone can remove stale local data; any retryable, validation, conflict, or mixed failure SHALL still stop before pull.
34. WHEN a new LWW workflow starts after a previous tombstone scenario emptied the QA workspace, THE harness SHALL seed and import the next proof goal before navigating to a 12-week tab.
35. BETWEEN sequential LWW scenarios, THE harness SHALL use short scenario-specific goal, plan, lead-indicator, and task client IDs so earlier baselines cannot collide with the current scenario's merge keys or diagnostics and every derived ID remains within backend validation limits.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none; authoritative pulled tasks reuse the existing `lastModifiedAt` field.
- migration or normalization needed: none.
- backend models or API contracts touched: add an optional internal task client-LWW timestamp and an internal frontend drain diagnostic count; the public mutation response shape remains unchanged.
- sync ordering guarantees: client time selects the task winner; server time controls delta visibility.
- rollback / restore concerns: dependency changes are isolated to manifests and lockfiles; Vercel environment scope changes must not overwrite secret values.

## 6. Non-functional Requirements

- performance / latency: no new request or retry; only authoritative pull application after a terminal remote-not-found drain.
- accessibility: existing UI test coverage must remain green.
- observability / logging: record only environment variable names, scope, target URL, commit SHA, and workflow URLs.
- security / privacy: keep secret values concealed; use disposable or marker-safe QA accounts required by each workflow; keep the React Router exception package-, advisory-, and frontend-specific.

## 7. Out of Scope

- Billing provider selection between PayOS and Casso.
- UI redesign, storage schema changes, broader sync architecture changes, auth behavior, or production deployment.

## 8. Acceptance Criteria

- [ ] frontend and backend production audit guard passes, with no exception beyond frontend `react-router` advisory `GHSA-qwww-vcr4-c8h2`
- [ ] `typecheck`, `lint`, `test:run`, and `build` pass on the clean branch
- [ ] preview metadata contains the required real-mode auth/sync variable names for the proof branch
- [ ] core funnel, email verification, account deletion, and LWW proof results are recorded
- [ ] account deletion and LWW harness regressions no longer depend on responsive guide timing or the removed inline goal-creation UI
- [ ] account deletion marker survives authenticated Settings hydration before deletion and is absent after a successful remote delete
- [ ] account deletion proof suppresses the contextual and global welcome guides before authentication
- [ ] account deletion post-delete allowlist includes only observed safe public or auth-gated routes
- [ ] LWW bootstrap failures expose only safe import status, entity counts, and client-ID match diagnostics without payloads, headers, credentials, titles, or secrets
- [ ] LWW bootstrap waits for login-time auto-sync before seeding, imports a complete authenticated baseline, and verifies it before the second context authenticates
- [ ] LWW scenarios run separately with Playwright retries disabled so failed attempts never reuse a mutated baseline
- [ ] LWW bootstrap storage already contains the normalized 12-week task set, including the week-one proof task on the current local date
- [ ] local-wins, cloud-wins, and tombstone proof mutations still originate from the real task checkbox UI and drain through the real mutation queue
- [ ] accepted 12-week imports persist `importId` as the mutation-log idempotency key, avoiding production `idempotencyKey:null` duplicate-index failures
- [ ] LWW proof contexts isolate only the legacy plan/week/task/metric execution transport while leaving every 12-week sync endpoint live
- [ ] LWW scenarios run sequentially with at least 65 seconds between them and preserve the aggregate failing exit code
- [ ] LWW workflow always uploads per-scenario `playwright-report/` and `test-results/` artifacts
- [ ] LWW failures report only safe scenario/stage, status, `Retry-After`, queue-count, and final boolean diagnostics
- [ ] out-of-order task mutations use client-timestamp LWW and stale mutations return `noop` without another write
- [ ] task LWW client timestamps are stored separately from server `syncUpdatedAt`, and lagging client clocks do not hide accepted mutations from delta pull
- [ ] legacy tasks without the new client-LWW field accept one deterministic migration write before normal LWW comparison resumes
- [ ] a post-drain task pull applies the authoritative cloud state instead of restoring a recent local task value
- [ ] tombstone proof completes both production delete confirmations before submitting the real delete request
- [ ] authoritative pulled tasks carry a comparable `lastModifiedAt` value and survive the generic stale-save merge guard
- [ ] an all-`failed_not_found`, zero-pending drain continues to pull tombstones while all other drain failures remain blocking
- [ ] a fresh workflow run can bootstrap after the previous run deleted the entire QA workspace
- [ ] sequential LWW scenarios use distinct task and lead-indicator client IDs
- [ ] LWW login defers the first-time onboarding redirect before authentication
- [ ] LWW Settings and 12-week execution entry use in-app navigation and do not reload the auto-sync provider before manual sync
- [ ] missing LWW proof tasks expose only safe boolean/count diagnostics at the Today boundary
- [ ] missing LWW tabs or settings controls expose only safe route/count/state diagnostics at the system-tab boundary
- [ ] no secret value is read, copied, committed, or logged

## 9. Verification Plan

```bash
npm run audit:prod
npm run audit:prod:backend
npm run typecheck
npm run lint
npm run test:run
npm run build
npm --prefix backend run check
npm run proof:readiness
npx vitest run scripts/github-workflow-guards.test.mjs
npx playwright test e2e/sync-lww.spec.ts --list
```

Then run the four deployed workflows from `docs/ops/staging-proof-runbook.md` only after the preview metadata check passes.

## 10. Open Questions / Follow-ups

- Confirm whether Vercel should broaden the existing branch-specific Preview variables or maintain a dedicated long-lived staging branch.
- Keep provider billing selection as a separate production decision.
