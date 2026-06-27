# Production Core SDD Audit - 2026-06-25

Purpose: apply the Hybrid SDD/ADD method from `Spec-Driven & Agent-Driven Development` to current Vision Board production readiness.

## Method

- Classify touched surfaces as Core, Shell, or Mixed.
- Freeze Core contracts in specs before broad work.
- Use EARS-style requirements for billing, auth/account lifecycle, sync, and real/demo boundary.
- Let agents execute bounded fixes only after invariants are named.

## Current Evidence

### Billing entitlement authority

Status: mostly aligned, keep under spec.

- Frontend billing provider documents that checkout response must not unlock entitlement directly.
- Backend checkout has fast-fail paths for disabled or unconfigured providers before provider handoff.
- Casso webhook has atomic claim pattern before side effects.
- Discount model duplicate `code` unique index has been reduced to one schema source in this task.

Remaining risk:

- Live Render/provider env must be checked outside repo.
- Full backend route tests should be run after local build.

### Auth and account lifecycle

Status: production baseline improved in this task.

- Login/signup/reset/email verification flows exist in codebase.
- Settings already exposed cloud account export.
- Settings now exposes signed-in account deletion with a two-step AlertDialog and local cleanup only after backend delete succeeds.

Remaining risk:

- Need staging smoke for real Firebase account deletion behavior.
- Subscription cancellation/provider-side account closure remains operational policy unless backend supports it.

### Sync trust

Status: visible trust surface exists, field coverage remains P1.

- Settings shows local/cloud/pending sync state and last result.
- Sync flow keeps local-first behavior and blocks protected paths when auth is unavailable.
- LWW E2E tests exist but require staging env credentials.

Remaining risk:

- Field-complete 12-week sync coverage still needs a focused audit against `guidelines/CURRENT_PROJECT_STATUS.md`.

### Real/demo boundary

Status: route boundary appears aligned, deployment env still external.

- Mock checkout route is not registered in current app routes for real production flow.
- Real-mode billing must use `api_contract`; demo/mock provider stays preview-only.

Remaining risk:

- Vercel production env `VITE_APP_MODE=real` must be confirmed in provider dashboard.
- Copy audit for demo-only phrases should be re-run before release.

## Fixes Landed In This Pass

- Added Hybrid SDD/ADD workflow rules to `AGENTS.md` and `CLAUDE.md`.
- Added production roadmap and Core/Shell/Mixed map.
- Added feature spec template and four Core specs.
- Removed duplicate `DiscountModel` code index declaration.
- Replaced admin role native `window.confirm` with in-app `AlertDialog`.
- Added general Settings account deletion entry with two-step confirmation.

## Verification Checklist

Run before merge:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run test
```

Run with staging credentials before launch:

```bash
npm run smoke:prod
npm run test:e2e:lww
```
