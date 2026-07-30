# Account Delete Staging Smoke Spec

## 1. Context & Goal

- Feature / bug: account deletion is locally covered, but launch still lacks an end-to-end staging proof for deployed auth/session behavior after deletion.
- Why now: production users need trustworthy account removal before paid launch and before broader sync/billing rollout.
- User impact: a disposable staging account can prove backend account deletion, Firebase session cleanup, local data cleanup, and safe navigation without deleting shared QA accounts.
- Modes affected: real-mode staging/production only; local/demo runs must skip unless explicitly enabled.

## 2. Surface Classification

- Type: Core.
- Touched domains: Settings account deletion, Playwright E2E smoke, launch docs.
- Existing invariants that must not break: account deletion remains backend-first; local data is cleared only after backend delete success; destructive action uses `AlertDialog`, not `window.confirm`; no secrets in source.

## 3. Actors & Entry Points

- Primary actor: disposable signed-in test account.
- Secondary actor(s): launch engineer running staging smoke.
- Route(s): `/login`, `/settings`, `/`.
- API / hook / store touchpoints: `/api/account/delete`, Firebase email auth, Settings delete-account dialog, localStorage cleanup.

## 4. Functional Requirements

1. WHEN the smoke is not explicitly enabled, THE test SHALL skip and SHALL NOT delete any account.
2. WHEN a custom email is provided, THE test SHALL refuse to run unless the email clearly looks disposable for deletion.
3. WHEN the disposable user signs in or signs up, THE test SHALL navigate to Settings and open the account-delete two-step `AlertDialog` using stable delete-account test ids rather than locale-dependent text.
4. WHEN final confirmation is submitted, THE test SHALL observe a successful `DELETE /api/account/delete` or `DELETE /api/account` response.
5. WHEN backend deletion succeeds, THE test SHALL verify local marker data is removed and the app returns to a safe start route.
6. WHEN the staging workflow wrapper receives `auth_mode`, THE workflow SHALL reject values other than `signin` or `signup` before launching Playwright.
7. WHERE the workflow target is for deployed launch proof, THE workflow SHALL reject `localhost` and `127.0.0.1` so local-only URLs cannot satisfy staging evidence.
8. WHEN `auth_mode=signup`, THE test SHALL generate a fresh delete-marked email and a password that satisfies the current signup form even when fixed account-delete secrets are configured.
9. WHEN `auth_mode=signin`, THE test SHALL continue using the configured disposable email and password.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: test seeds only `visionboard_user_data` with a unique marker, then verifies the marker disappears after account deletion.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: this smoke proves remote delete response is successful before checking local cleanup.
- rollback / restore concerns: test account is destructive and should use only generated or disposable `+delete` emails.

## 6. Non-functional Requirements

- performance / latency: auth and delete waits are bounded at 45s each.
- accessibility: test interacts through visible buttons and `AlertDialog` test ids.
- observability / logging: Playwright response status is part of failure output.
- security / privacy: no credentials in repo; all credentials come from env.

## 7. Out of Scope

- Running against a real customer account.
- Subscription/provider cancellation.
- Full account recovery or re-registration proof after deletion.

## 8. Acceptance Criteria

- [x] account-delete E2E is opt-in and skipped by default.
- [x] destructive run requires `ACCOUNT_DELETE_E2E_ALLOW=DELETE_TEST_ACCOUNT`.
- [x] custom emails must contain a deletion marker such as `+delete`.
- [x] final confirmation step is asserted through stable delete-account test ids, not translated copy.
- [x] test observes the account delete backend response before asserting local cleanup.
- [x] docs/status explain how to run and what remains unproven until staging execution.
- [x] launch and pre-deploy checklists include the account-delete staging workflow as a required proof gate.
- [x] staging workflow rejects invalid `auth_mode` values before browser startup.
- [x] staging workflow rejects localhost and loopback targets before browser startup.
- [ ] signup mode ignores stale fixed credentials and creates a fresh disposable account for the destructive proof.

## 9. Verification Plan

```bash
npm run test:e2e:account-delete
npm run test:ops
npm run typecheck
npm run lint
npm run test:ui -- src/app/pages/SettingsPage.account-export.test.tsx
```

## 10. Batch Evidence - 2026-06-26

- `.github/workflows/account-delete-e2e-staging.yml` now rejects invalid `auth_mode` values before Playwright starts, so the destructive wrapper fails fast on bad operator input.
- `.github/workflows/account-delete-e2e-staging.yml` now rejects `localhost` and `127.0.0.1` targets before Playwright starts, so local-only runs cannot satisfy staging evidence.
- `scripts/github-workflow-guards.test.mjs` keeps the delete marker, explicit destructive opt-in, and `auth_mode` validation aligned with the workflow file.
- Verification passed:
  - `npm.cmd run test:e2e:account-delete` (1 test skipped by safety guard)
  - `npm.cmd run test:ops` (11 tests passed)

## 11. Open Questions / Follow-ups

- Run against staging with a disposable account before launch:
  `ACCOUNT_DELETE_E2E_URL`, `ACCOUNT_DELETE_E2E_ALLOW=DELETE_TEST_ACCOUNT`, and optional disposable `ACCOUNT_DELETE_E2E_EMAIL` / `ACCOUNT_DELETE_E2E_PASSWORD`.
