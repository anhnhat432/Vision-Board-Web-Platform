# Presentation Release-Gate Stabilization

## 1. Context & Goal

- Feature / bug: the final presentation release gates no longer match the current landing copy, current calendar date, and persistent production QA account state.
- Why now: the product will be presented on 2026-07-21 and the last local/production verification found three deterministic gate failures.
- User impact: the presentation team needs a repeatable demo rehearsal without weakening production safety checks or changing end-user behavior.
- Modes affected: `demo` for local presentation smoke; `real` for production smoke verification. Runtime behavior in both modes remains unchanged.

## 2. Surface Classification

- Type: `Mixed` with a frozen Core contract and QA-only Shell changes.
- Touched domains: local demo smoke, production smoke harness, 12-week pull/apply test determinism.
- Existing invariants that must not break:
  - `VITE_APP_MODE` missing or malformed still resolves to `real`.
  - `/billing/mock-checkout` remains registered only in demo mode.
  - No storage key, persisted shape, migration, API contract, entitlement rule, or sync merge behavior changes.
  - Local-first saves remain authoritative and backend failures never erase local progress.

## 3. Actors & Entry Points

- Primary actor: presentation team rehearsing the local demo.
- Secondary actor: release operator reading production smoke evidence.
- Routes: `/`, `/12-week-system`, `/12-week-system?tab=week`, and existing routes exercised by the two smoke scripts.
- Test / script touchpoints:
  - `scripts/smoke-mvp1-local-demo.mjs`
  - `scripts/smoke-production-e2e.mjs`
  - `scripts/production-smoke-harness.test.mjs`
  - `src/features/plan12week/persistence/pulledWorkspaceApply.test.ts`

## 4. Functional Requirements

1. `WHEN the local demo smoke opens the signed-out landing page, THE harness SHALL accept the current Dear Our Future hero and onboarding CTA without requiring retired demo-marketing phrases.`
2. `WHEN the production smoke opens a weekly review that contains unanswered previous commitments, THE harness SHALL classify every visible unanswered commitment before attempting to submit the review.`
3. `WHEN the pulled-workspace test evaluates a scenario at baseNow, THE test SHALL freeze the system clock at baseNow so date-derived cycle status cannot change as wall-clock time advances.`
4. `WHERE a release gate is unable to find the expected semantic control, THE harness SHALL fail with bounded diagnostics instead of silently skipping the step.`
5. `WHILE these fixes are applied, THE system SHALL preserve all real/demo, storage, billing, auth, and sync runtime contracts unchanged.`

## 5. Design

### Local Demo Smoke

Keep the existing end-to-end flow and replace only the retired signed-out landing text candidates. The accepted signals will be the current product promise and visible onboarding CTA, using the script's existing accent-insensitive normalization. This preserves a meaningful landing-page assertion without tying the smoke to obsolete “free trial/demo” wording.

### Production Weekly Review Smoke

Add a bounded helper that scans the visible previous-commitment section and clicks each enabled, unpressed `Đã giữ` button. Call it after the weekly review form is visible and before filling/submitting the review. The helper returns a count for diagnostics and leaves the application code untouched.

The existing production-smoke harness test will first assert that this helper and call site exist. The observed GitHub Actions failure is the red end-to-end evidence: the submit button contained the expected label but remained disabled because the prior commitments were unanswered.

### Sync Test Clock

Use Vitest fake timers around the pulled-workspace test file, set system time to `baseNow`, and restore real timers after each test. The scenario already passes `baseNow` to the apply function; freezing `Date` makes the date-derived normalization match that declared scenario and prevents the fixture from expiring again.

## 6. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: unchanged.
- rollback: revert the QA/test-only commit; no user data repair is required.

## 7. Non-functional Requirements

- Performance: no runtime bundle or user-path performance change.
- Accessibility: smoke interactions use visible controls and existing accessible button text.
- Observability: retain existing bounded smoke diagnostics and GitHub Actions logging.
- Security / privacy: do not print credentials, raw user identifiers, review text from real users, or secret values.

## 8. Out of Scope

- New product features or visual polish.
- Runtime changes to weekly review validation.
- Storage/schema migration, sync conflict policy, auth, billing, or deployment configuration changes.
- Dispatching or mutating GitHub workflows before local verification is green.

## 9. Acceptance Criteria

- [ ] `npm run smoke:mvp1` passes against a locally served `VITE_APP_MODE=demo` build.
- [ ] `npm run smoke:core-quality` still passes through Today, daily check-in, weekly review, Progress, and browser-error scan.
- [ ] The production smoke harness test proves previous commitments are classified before submit.
- [ ] The focused pulled-workspace test remains stable after 2026-07-19 and passes with a frozen `baseNow`.
- [ ] `npm run test:production-core:frontend`, `npm run check`, and `npm --prefix backend run check` pass.
- [ ] Real-mode route/copy guards remain green and no runtime source file changes.

## 10. Verification Plan

```powershell
npm run test:ops -- scripts/production-smoke-harness.test.mjs
npm run test:sync -- src/features/plan12week/persistence/pulledWorkspaceApply.test.ts
$env:VITE_APP_MODE='demo'; python 'C:/Users/admin/.agents/skills/webapp-testing/scripts/with_server.py' --server "npm run dev -- --host 127.0.0.1" --port 5173 --timeout 60 -- npm.cmd run smoke:mvp1
$env:VITE_APP_MODE='demo'; python 'C:/Users/admin/.agents/skills/webapp-testing/scripts/with_server.py' --server "npm run dev -- --host 127.0.0.1" --port 5173 --timeout 60 -- npm.cmd run smoke:core-quality
npm run test:production-core:frontend
npm run check
npm --prefix backend run check
npm run env:check
```

Production proof remains separate: after the relevant commit is pushed and deployed, rerun the existing production smoke workflow and record its URL/status.

## 11. Presentation Checklist Deliverable

The final handoff shall include:

- the recommended route order for the live narrative;
- a deterministic local demo startup command;
- pre-presentation browser/data checks;
- an offline fallback using local-first data;
- known deployment/proof risks and items requiring a human owner.

## 12. Decisions & Assumptions

- Primary presentation target is the locally configured demo mode because `npm run env:check` resolves `VITE_APP_MODE=demo`.
- Production safety remains a release gate, but no push, deployment, or workflow dispatch is implied by this QA-only change.
- The user's blanket approval on 2026-07-20 authorizes this recommended design and its bounded implementation.
