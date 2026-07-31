# 12-Week Release Gates Follow-up

## 1. Context & Goal

- Feature / bug: the merged 12-week UI release still has a failing production-dependency audit, while its Vercel preview cannot initialize Firebase because the client variables are scoped to an older preview branch.
- Why now: preview proof for authentication, account deletion, and LWW sync cannot run until the release target is both security-gated and configured as a real-mode staging target.
- User impact: do not promote another production change until the current code passes local/CI gates and the preview proofs have recorded evidence.
- Modes affected: `real` preview/staging; production behavior must remain unchanged by this follow-up.

## 2. Surface Classification

- Type: `Core`
- Touched domains: dependency security, Vercel preview environment metadata, auth/sync proof gates.
- Existing invariants that must not break: no secrets in source or logs; no localStorage, API, entitlement, auth, sync, or route contract changes; no production redeploy before preview proof passes.

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
14. WHEN publishing the LWW bootstrap, THE harness SHALL import and verify the complete baseline without invoking a rate-limited manual full sync; the second context SHALL authenticate only after the verified import and use its initial pull to load the proof goal.
15. WHEN the LWW bootstrap task is not visible on Today, THE harness SHALL report only stage-labeled snapshots of the current route, proof goal/task presence, task count, current-week/today counts, proof tactic/title match counts, current week, scheduled-date match, latest-goal pointer match, auth-scoped snapshot match, active-proof-goal visibility, and visible checkbox count; it SHALL NOT report raw snapshots, titles, payloads, headers, credentials, or secret values.
16. WHEN the LWW harness cannot open a requested 12-week tab or render the bootstrap settings control, THE harness SHALL report only the current route, system-tab counts, requested/active tab state, tab-panel visibility, settings-control visibility, and the safe proof-presence diagnostics allowed by requirement 15; it SHALL NOT report raw snapshots, titles, payloads, headers, credentials, or secret values.
17. WHILE exercising local-wins, cloud-wins, and tombstone resolution after baseline import, THE harness SHALL create task state changes through the real checkbox UI and publish them through the real mutation queue; direct API import SHALL NOT replace any conflict mutation under proof.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: unchanged.
- rollback / restore concerns: dependency changes are isolated to manifests and lockfiles; Vercel environment scope changes must not overwrite secret values.

## 6. Non-functional Requirements

- performance / latency: no intentional runtime behavior change.
- accessibility: existing UI test coverage must remain green.
- observability / logging: record only environment variable names, scope, target URL, commit SHA, and workflow URLs.
- security / privacy: keep secret values concealed; use disposable or marker-safe QA accounts required by each workflow; keep the React Router exception package-, advisory-, and frontend-specific.

## 7. Out of Scope

- Billing provider selection between PayOS and Casso.
- UI redesign, storage/sync semantics, auth behavior, or production deployment.

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
- [ ] LWW bootstrap storage already contains the normalized 12-week task set, including the week-one proof task on the current local date
- [ ] local-wins, cloud-wins, and tombstone proof mutations still originate from the real task checkbox UI and drain through the real mutation queue
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
```

Then run the four deployed workflows from `docs/ops/staging-proof-runbook.md` only after the preview metadata check passes.

## 10. Open Questions / Follow-ups

- Confirm whether Vercel should broaden the existing branch-specific Preview variables or maintain a dedicated long-lived staging branch.
- Keep provider billing selection as a separate production decision.
