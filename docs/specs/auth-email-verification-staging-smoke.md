# Auth Email Verification Staging Smoke Spec

## 1. Context & Goal

- Feature / bug: local tests cover signup verification email and banner cooldown, but launch still lacks an opt-in staging smoke for the deployed auth path.
- Why now: production users must understand email verification for cloud sync and account-trust actions, while paid checkout remains available with a receipt email.
- User impact: a disposable staging signup can prove the deployed app shows the unverified-email banner, restores resend cooldown, and still lets unverified users enter paid checkout when checkout is available.
- Modes affected: real-mode staging/production only; local/default runs must skip unless explicitly enabled.

## 2. Surface Classification

- Type: Core.
- Touched domains: Firebase signup, email verification banner, billing upgrade availability, Playwright staging smoke.
- Existing invariants that must not break: no real customer accounts; no hardcoded credentials; no localStorage app data shape changes; paid checkout remains available for unverified email unless the global checkout kill-switch is active.

## 3. Actors & Entry Points

- Primary actor: disposable email/password test user.
- Route(s): `/login?mode=signup`, `/billing/plan`.
- API / hook / store touchpoints: Firebase email signup, `EmailVerificationBanner`, `UpgradePaywallDialog`.

## 4. Functional Requirements

1. WHEN the smoke is not explicitly enabled, THE test SHALL skip and SHALL NOT create an account.
2. WHEN a custom email is provided, THE test SHALL refuse to run unless the email clearly looks disposable for verification.
3. WHEN fixed staging credentials are configured, THE workflow SHALL require both email and password or neither before account creation starts.
4. WHEN signup succeeds, THE test SHALL land on `/billing/plan` and see the persistent unverified-email banner.
5. WHEN the initial verification email cooldown was written, THE test SHALL see the banner resend button disabled.
6. WHEN paid checkout is available and the upgrade dialog can open, THE test SHALL verify the checkout CTA remains enabled for the unverified user.
7. WHEN paid checkout is globally disabled, THE test SHALL report that state without treating it as email-guard proof.
8. WHERE the workflow target is for deployed launch proof, THE workflow SHALL reject `localhost` and `127.0.0.1` so local-only URLs cannot satisfy staging evidence.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: reads existing `emailVerificationLastSentAt:*`; no app user-data schema changes.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: none.
- rollback / restore concerns: generated signup accounts may remain in Firebase and should use only disposable `+verify` addresses.

## 6. Non-functional Requirements

- performance / latency: auth/navigation waits are bounded.
- accessibility: test uses visible roles plus stable `data-testid` selectors.
- observability / logging: failure output includes route/auth alert text when signup fails.
- security / privacy: no credentials in repo; all staging credentials come from env or generated disposable values.

## 7. Out of Scope

- Reading inbox contents or clicking the Firebase email link.
- Deleting the disposable Firebase user after the smoke.
- Proving provider payment webhooks.

## 8. Acceptance Criteria

- [x] smoke is opt-in and skipped by default.
- [x] destructive/account-creating run requires explicit allow env.
- [x] custom emails must contain a verification marker such as `+verify`.
- [x] fixed staging email/password secrets must be configured as a complete pair.
- [x] smoke proves deployed signup reaches billing plan with unverified banner.
- [x] smoke proves resend starts disabled from the signup-written cooldown.
- [x] smoke verifies paid checkout remains available for unverified email when checkout is otherwise available.
- [x] workflow rejects `localhost` / `127.0.0.1` targets for deployed proof.
- [x] launch and pre-deploy checklists include the email-verification staging workflow as a required proof gate.

## 9. Verification Plan

```bash
npm.cmd run test:e2e:email-verification
npm.cmd run test:ui -- src/app/components/root-layout/EmailVerificationBanner.persistent.test.tsx src/app/components/UpgradePaywallDialog.unverified.test.tsx
npm.cmd run test:ops
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 10. Batch Evidence - 2026-06-25

- Staging smoke harness verified by `e2e/email-verification.spec.ts`: default run skips unless `EMAIL_VERIFICATION_E2E_URL` and `EMAIL_VERIFICATION_E2E_ALLOW=CREATE_TEST_ACCOUNT` are present, and custom emails must contain a verification marker such as `+verify`.
- Manual staging workflow added in `.github/workflows/email-verification-e2e-staging.yml`: requires `allow_create=CREATE_TEST_ACCOUNT` and rejects any configured `EMAIL_VERIFICATION_E2E_EMAIL` secret that lacks a verification marker before Playwright starts.
- Persistent banner cooldown verified by `src/app/components/root-layout/EmailVerificationBanner.persistent.test.tsx`: resend cooldown survives refresh, signup-written cooldown disables resend initially, the banner stays visible for unverified email, and sync-triggered verification reason appears.
- Paid checkout availability verified by `src/app/components/UpgradePaywallDialog.unverified.test.tsx`: unverified real-mode user does not see verification-before-payment copy and can continue checkout.
- Verification passed:
  - `npm.cmd run test:e2e:email-verification` (1 test skipped by safety guard)
  - `npm.cmd run test:ui -- src/app/components/root-layout/EmailVerificationBanner.persistent.test.tsx src/app/components/UpgradePaywallDialog.unverified.test.tsx` (6 tests passed)
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`

## 10.1. Batch Evidence - 2026-06-26

- Workflow guard tightened in `.github/workflows/email-verification-e2e-staging.yml`: fixed staging credentials must provide both `EMAIL_VERIFICATION_E2E_EMAIL` and `EMAIL_VERIFICATION_E2E_PASSWORD` or neither before any account creation can start.
- Workflow target guard now also rejects `localhost` / `127.0.0.1`, so deployed email-verification proof cannot be filled with a local-only URL.
- Ops regression coverage added in `scripts/github-workflow-guards.test.mjs` and included in `npm run test:ops`, so CI checks the email-verification workflow keeps the explicit opt-in, partial-credential guard, and disposable email marker guard.
- Verification passed:
  - `npm.cmd run test:ops` (7 tests passed)
  - `npm.cmd run test:e2e:email-verification` (1 test skipped by safety guard)

## 10.2. Batch Evidence - 2026-06-27

- `src/app/components/UpgradePaywallDialog.unverified.test.tsx` is now included in `npm run test:production-core:ui`, so PR/main local proof fails if an unverified real-mode user is blocked from paid checkout again.
- `src/lib/auth/firebase.test.ts` is now included in `npm run test:production-core:unit`, so signup-written verification email and cooldown proof stay attached to the production-core aggregate instead of only targeted auth runs.
- `src/app/utils/production/outboxSync.test.ts` is now included in `npm run test:production-core:sync`, so the local-only outbox pause for `email_unverified` remains part of the launch sync guard.

## 11. Open Questions / Follow-ups

- Run against staging with a disposable inbox and manually confirm Firebase delivery/template.
- Add cleanup through Firebase Admin only if a safe staging cleanup API/tool is available.
- Current ops guard coverage after later staging/prod proof guards were added: `npm.cmd run test:ops` passed 14 tests on 2026-06-26.
