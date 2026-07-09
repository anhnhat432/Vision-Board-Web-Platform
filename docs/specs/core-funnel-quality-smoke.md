# Core Funnel Quality Smoke Spec

## 1. Context & Goal

- Feature / bug: launch proof needs one local-first smoke plus one deploy-target proof path that exercises the main product loop beyond route-open checks.
- Why now: production readiness is defined around the core funnel, so the team needs repeatable local preflight and deployed D-2 proof before spending payment-provider time or opening beta.
- User impact: regressions in SMART goal output, feasibility recommendation, 12-week plan quality, Today execution, daily check-in, weekly review, and progress view are caught earlier, and launch evidence no longer depends on ad hoc manual browsing.
- Modes affected: local-first browser flow plus accessible demo/staging deployed proof target. Real-mode production proof is covered by production smoke.

## 2. Surface Classification

- Type: Core verification.
- Touched domains: local-first core funnel smoke, staging proof workflow, soft-launch runbook, status docs.
- Existing invariants that must not break: no backend/Firebase/payment requirement for local preflight; no localStorage key or shape change; local preflight remains separate from real-mode production smoke.

## 3. Functional Requirements

1. WHEN a developer runs core-funnel preflight locally, THE system SHALL verify SMART goal metric, baseline, target, and time fields.
2. WHEN feasibility output is seeded, THE system SHALL verify a non-empty actionable recommendation.
3. WHEN the 12-week system is seeded, THE system SHALL verify week-12 outcome, lag metric, at least two lead indicators, week-1 tasks, milestones, and review cadence.
4. WHEN the Today tab renders, THE system SHALL verify the primary Today hero and persist a task toggle locally.
5. WHEN daily and weekly execution are exercised, THE system SHALL verify daily check-in and weekly review persistence.
6. WHEN the Progress tab renders, THE system SHALL verify a trend/next-action surface.
7. WHERE D-2 launch evidence is required, THE system SHALL keep local preflight, accessible demo/staging core-quality proof, and real-mode production smoke proof separate.
8. WHEN an operator wants deployed core-flow proof for the local-first funnel, THE repository SHALL provide a manual GitHub Actions workflow that runs `npm run smoke:core-quality` against a supplied accessible demo/staging URL.
9. WHERE deployed core-flow proof is requested, THE workflow SHALL reject `localhost` / `127.0.0.1` targets so D-2 evidence cannot be filled with local-only URLs.
10. WHERE `scripts/smoke-core-quality.mjs` runs inside GitHub Actions, THE script SHALL require an explicit non-local `CORE_QUALITY_URL` before browser launch.
11. WHERE `scripts/smoke-core-quality.mjs` runs against the production real-mode domain, THE script SHALL fail fast and point operators to `production-smoke-e2e.yml`.
12. WHERE the supplied target is Vercel-protected or real-mode auth-gated, THE script SHALL report that target mismatch explicitly instead of timing out.

## 4. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: existing smoke writes `visionboard_user_data`, `pending_smart_goal`, `pending_feasibility_result`, and latest 12-week goal markers, then clears browser storage after the run.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no remote sync proof; local-first persistence only.
- rollback / restore concerns: smoke storage is browser-session scoped and cleared in `finally`.

## 5. Acceptance Criteria

- [x] `npm run smoke:core-quality` exists.
- [x] runbook names it as a local preflight, not launch evidence.
- [x] soft-launch checklist tells operators to run it before remote proof.
- [x] current status records the local proof and keeps staging/manual core-flow proof pending.
- [x] local run passes against a dev server.
- [x] a manual workflow exists for deployed core-flow proof against a supplied accessible demo/staging URL.
- [x] deployed core-flow proof workflow rejects local-only targets.
- [x] shared core-funnel smoke script refuses missing/local deployed targets when `GITHUB_ACTIONS=true`.
- [x] shared core-funnel smoke script refuses the production real-mode URL and diagnoses Vercel-protected/auth-gated targets.

## 6. Verification Plan

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 4173
$env:CORE_QUALITY_URL="http://127.0.0.1:4173"; npm.cmd run smoke:core-quality
npm.cmd run test:ops
node --check scripts/smoke-core-quality.mjs
git diff --check
```

Use the dev server for local preflight. `vite preview` serves the production build, and this repo's `.env.production` sets `VITE_APP_MODE=real`, so a no-backend local preview can redirect protected core routes to `/login` and produce a false local-preflight failure.

## 7. Batch Evidence - 2026-06-26

- Local target: `http://127.0.0.1:4173`.
- `npm.cmd run smoke:core-quality` passed.
- Evidence covered SMART goal metric/target/time, feasibility recommendation, 12-week plan quality, Today primary hero, task toggle persistence, daily check-in persistence, weekly review persistence, and Progress trend hero.
- This is local preflight only. D-2 accessible demo/staging core-flow evidence remains required before launch.

## 7.1. Batch Evidence - 2026-06-26

- Added `.github/workflows/core-funnel-quality-staging.yml` so D-2 deployed local-first core-flow evidence can be run against a supplied accessible demo/staging URL instead of relying on ad hoc manual browsing.
- The workflow uses `.nvmrc`, installs Playwright Chromium, runs `npm run smoke:core-quality`, and rejects `localhost` / `127.0.0.1` so local preflight cannot be mistaken for deployed proof.
- `docs/ops/staging-proof-runbook.md`, `guidelines/SOFT_LAUNCH_CHECKLIST.md`, and `guidelines/CURRENT_PROJECT_STATUS.md` now point operators to this workflow and keep the manual core-flow ledger row tied to a real target URL and run evidence.

## 7.2. Batch Evidence - 2026-06-26

- `scripts/smoke-core-quality.mjs` now has a second guard inside the shared script: when `GITHUB_ACTIONS=true`, it requires `CORE_QUALITY_URL` and refuses `localhost` / `127.0.0.1` before launching the browser.
- `scripts/core-funnel-quality-harness.test.mjs` keeps that guard in `npm.cmd run test:ops`, so deployed proof cannot silently regain the local fallback if workflow wiring drifts.

## 7.3. Local Preflight Evidence - 2026-06-27

- A local `vite preview` attempt against `http://127.0.0.1:4173` failed because the production preview build ran in real mode and redirected `/12-week-system` to `/login`.
- The intended local preflight target is the Vite dev server, which loads `.env.development.local` and keeps the local-first demo/no-backend path available.
- Verification passed with `npm.cmd run dev -- --host 127.0.0.1 --port 4173` plus `$env:CORE_QUALITY_URL="http://127.0.0.1:4173"; npm.cmd run smoke:core-quality`.
- Evidence covered SMART goal metric/target/time, feasibility recommendation, 12-week plan quality, Today primary hero, task toggle persistence, daily check-in persistence, weekly review persistence, and Progress trend hero.

## 7.4. Target Guard Evidence - 2026-07-08

- Workflow run `28899920950` against `https://vision-board-web-platform.vercel.app` failed because production real mode correctly redirected `/12-week-system` to `/login?next=%2F12-week-system`.
- A Vercel preview recheck against `https://vision-board-web-platform-pf7fds9vr-anhnhat432s-projects.vercel.app` failed before app render because Deployment Protection redirected to `https://vercel.com/login`.
- `scripts/smoke-core-quality.mjs` now fails fast for the production real-mode URL in GitHub Actions and reports Vercel-protected/auth-gated targets explicitly after browser navigation.
- `.github/workflows/core-funnel-quality-staging.yml`, `docs/ops/staging-proof-runbook.md`, `guidelines/SOFT_LAUNCH_CHECKLIST.md`, and `guidelines/CURRENT_PROJECT_STATUS.md` now state that this proof needs an accessible demo/staging target; real-mode production proof remains `production-smoke-e2e.yml`.

## 8. Out of Scope

- Replacing production smoke.
- Running staging account deletion, email verification, or LWW proof.
- Verifying real payment provider/webhook behavior.
