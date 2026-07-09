# Production Audit & Optimization Plan

Goal: audit and optimize Vision Board Web Platform for production users while preserving existing user data, payment authority, storage formats, core flows, branding, and production behavior.

Tech stack inspected: React 18, Vite 6, TypeScript, Express, MongoDB/Mongoose, Firebase Auth/Admin, PayOS/Casso billing, Vercel, Render, Vitest, Playwright, Biome.

## Current Evidence Snapshot

### Code and Runtime Surfaces Inspected

- Core user flow: onboarding, life balance, life insight, SMART goal setup, feasibility, 12-week setup/system, settings.
- Public and auth routes: landing, login, billing plan/FAQ/confirm/checkout, privacy, terms, contact, 12-week protected redirect.
- Backend/API: auth middleware, account export/delete, billing entitlement/checkout/claim/customer portal/cancel, PayOS/Casso webhooks, sync mutation/import/pull/export/delete, admin payment recovery, error middleware.
- Deployment and operations: Vercel rewrites/security headers, production metadata/sitemap/service worker, GitHub proof workflows, runtime env checks, staging proof runbooks.
- Monitoring and logging: frontend/backend Sentry scrubbing, assistant telemetry redaction, provider error redaction, production runtime env fail-loud behavior.

### Verified Commands

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass, Biome checked 961 files.
- `npm.cmd run test:run`: pass, 124 files / 1309 tests.
- `npm.cmd run test:ops`: pass, 11 files / 84 tests.
- `npm.cmd run build`: pass.
- `npm.cmd --prefix backend run check`: pass.
- `npm.cmd run test:production-core:unit`: pass, 11 files / 45 tests.
- `npm.cmd run test:production-core:ui`: pass, 14 files / 130 tests.
- `npm.cmd run test:production-core:sync`: pass, 11 files / 156 tests.
- `npm.cmd run test:production-core:slow`: pass, 2 files / 8 tests.
- `npm.cmd run test:production-core:backend`: pass, 607 backend tests.
- `npm.cmd run test:production-core:backend:account`: pass, 607 backend tests.
- Manual Playwright sweep on Vite preview with complete dummy-safe real-mode env: pass, 12 desktop/mobile route checks, no page errors, no console errors, no horizontal overflow.

## Prioritized Findings

### Critical Issues

No confirmed Critical code blocker remains after local verification.

External launch-proof items remain important but are not local code blockers:

- Account deletion, email verification, LWW sync, and production smoke workflows still need real staging/default-branch runs with disposable credentials before a final go/no-go.
- Production deployments must provide real `VITE_APP_MODE=real`, Firebase client env, API base URL, `VITE_BILLING_PROVIDER_MODE=api_contract`, support email, Sentry DSN, backend Firebase Admin, MongoDB, Casso/PayOS, and webhook env. The app now fails loud when required real-mode frontend runtime env is missing.

### High-Impact Quick Wins Implemented

- Real-mode safety: missing or malformed app mode no longer silently downgrades production to demo.
- Public legal/trust surfaces: privacy, terms, contact, refund/billing help, footer links, sitemap, and metadata were tightened.
- Auth and onboarding clarity: login/signup/reset flows have clearer headings, autocomplete metadata, password confirmation handling, verification gating, and actionable auth errors.
- Billing and revenue safety: real checkout copy, paid checkout kill switch, public checkout claim guard, customer portal/support paths, webhook replay/idempotency, amount/currency validation, receipt and manual-completion audit metadata.
- Data safety: account export/delete covers more account-scoped models; deletion keeps Mongo/app-data cleanup before Firebase deletion and preserves retry anchors on dependent-delete failure.
- Sync reliability: 12-week mutation queue, import/pull, conflict, outbox, and destructive/local-data safety tests were expanded.
- Error handling and trust: app/tab error boundaries and backend error middleware avoid leaking raw 5xx details; frontend/backend Sentry and assistant provider errors are scrubbed.
- Performance: assistant panel code is split behind a lazy chunk; build output shows `AIAssistant` shell around 49.56 kB and `AssistantPanel` around 152.75 kB.
- Deployment readiness: runtime env, proof workflow, production smoke, staging proof, security header, and public metadata checks were added or updated.

### Medium-Term Improvements

- Run real staging proof workflows for account deletion, email verification, LWW sync, and production smoke with disposable accounts.
- Add broader backend controller contract tests for goal/plan/week/task/metric CRUD beyond the current route integration coverage.
- Verify analytics/GA4 or any production analytics destination end-to-end, including event delivery and privacy fields.
- Consider MongoDB transactions or a small lifecycle state machine for public order claim and account deletion if production DB topology supports transactions.
- Add performance budget tracking for `index.css`, `12WeekSystem`, and major route chunks instead of only one-off build inspection.
- Add visual regression baselines for the key public/auth/billing/settings routes once the launch UI stabilizes.

### Things Not To Change Yet

- Do not rename localStorage keys or change saved data shapes for `UserData`, goals, 12-week systems, billing, entitlement, event log, or outbox.
- Do not change billing authority: checkout creation must not unlock entitlements; provider webhook/sync remains authoritative.
- Do not change payment provider assumptions to Stripe/VNPay/MoMo unless the provider migration is explicitly scoped.
- Do not rewrite auth, Firebase, sync, or 12-week storage architecture before staging proof.
- Do not broaden warm prefetch to heavy routes such as `/12-week-system` without measurement.
- Do not remove local-first behavior; backend sync must remain best-effort per call and must not block in-session 12-week execution.
- Do not include audit logs in account export/delete until retention/legal policy is decided.

## Verification Artifacts

- Manual UI screenshots/report: `output/playwright/production-audit-final-20260709-env-ok/`.
- Env-missing fail-loud sweep: `output/playwright/production-audit-final-20260709-current/`.
- Current account deletion spec: `docs/specs/account-deletion-mongo-before-firebase.md`.

## Remaining Completion Gates

- Review final dirty/untracked file set and classify source changes vs disposable QA artifacts.
- Run a final small verification pass after any further edits.
- Produce final report with files changed, why they improve user experience, verified commands/results, and remaining risks.
- Only mark the Codex goal complete after the completion audit proves every original requirement has current evidence.
