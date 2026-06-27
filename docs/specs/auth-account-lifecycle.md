# Auth Account Lifecycle Spec

## 1. Context & Goal

- Feature / bug: real users need complete account lifecycle: signup, signin, reset, email verification, export, delete.
- Why now: paid production launch requires account-bound trust and data rights.
- User impact: users can recover access, export data, and delete account without support-only paths.
- Modes affected: real primary; demo must remain usable without Firebase.

## 2. Surface Classification

- Type: Core
- Touched domains: Firebase auth, profile bootstrap, settings, export/delete API, localStorage cleanup, destructive confirmations.
- Existing invariants that must not break: demo mode runs without Firebase; local data export remains available; destructive actions use AlertDialog and two-step confirmation where irreversible.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user.
- Secondary actor(s): signed-out visitor, unconfigured demo user, backend/Firebase admin delete flow.
- Route(s): /login, /settings, /privacy, /terms, /contact or support footer.
- API / hook / store touchpoints: useAuthContext, exportAccountData, deleteAccount, deleteAllUserData, useSyncedUserData.

## 4. Functional Requirements

1. WHEN Firebase is configured and user signs in, THE system SHALL bootstrap profile with retry/cache behavior and show actionable errors on failure.
2. WHEN signed-in user exports account data, THE system SHALL download backend account export without clearing local data.
3. WHEN signed-in user deletes account, THE system SHALL require two-step in-app confirmation before calling backend deletion.
4. WHEN account deletion succeeds, THE system SHALL sign out when possible, clear local app data on this device, reload local state, and navigate to safe start.
5. WHILE Firebase is unconfigured or user is signed out, THE system SHALL hide account delete and block cloud-account export/delete actions with clear errors.
6. IF Firebase Admin user removal fails during backend account deletion, THE system SHALL return an error so the frontend keeps local data and the user can retry.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: deletion uses existing deleteAllUserData only after backend delete succeeds.
- migration or normalization needed: no.
- backend models or API contracts touched: account export/delete endpoints only.
- sync ordering guarantees: delete remote first, then local; failed remote delete must not erase local progress.
- rollback / restore concerns: user should be told to export data before deletion; no in-app undo after success.

## 6. Non-functional Requirements

- performance / latency: show loading state while deletion/export runs.
- accessibility: AlertDialog titles/descriptions must name irreversible impact.
- observability / logging: log logout failure after delete without blocking local cleanup.
- security / privacy: no secrets in logs; account deletion endpoint remains protected.

## 7. Out of Scope

- Provider-side subscription cancellation automation.
- Legal text rewrite.
- Multi-account merge.

## 8. Acceptance Criteria

- [x] settings exposes account export for signed-in configured users.
- [x] settings exposes account delete for signed-in configured users.
- [x] account delete uses two-step AlertDialog, not window.confirm.
- [x] failed backend delete does not clear local data.
- [x] successful delete clears local data and returns user to start.
- [x] backend account delete calls Firebase Admin user deletion, treats `auth/user-not-found` as idempotent success, and fails non-idempotent Firebase deletion errors.

## 9. Verification Plan

```bash
npm run typecheck
npm run test:ui -- src/app/pages/SettingsPage.account-export.test.tsx
npm --prefix backend run test:run -- dist/tests/accountRoutes.test.js
npm run test:run
npm run build
```

## 10. Batch Evidence - 2026-06-25

- Frontend Settings lifecycle verified by `src/app/pages/SettingsPage.account-export.test.tsx`: signed-in configured users see account export/delete, unconfigured/signed-out users do not see cloud account actions, export failure keeps local data, account delete uses two-step `AlertDialog` without `window.confirm`, failed backend delete keeps local data, successful delete clears local data and returns to `/`.
- Deployed smoke now verifies lifecycle reachability for signed-in real-mode users: `scripts/smoke-production-quick.mjs` and `scripts/smoke-production-e2e.mjs` require `/settings` to expose account export, account delete, and legal/payment-help links before launch proof continues.
- Persistent email-verification UX verified by `src/app/components/root-layout/EmailVerificationBanner.persistent.test.tsx`: resend cooldown survives refresh and supports the real-mode email verification trust path.
- Backend delete authority verified by `backend/src/tests/accountRoutes.test.ts`: Firebase auth is required, owner data and Firebase user deletion run on success, `auth/user-not-found` is idempotent success, and non-idempotent Firebase deletion errors return `firebase_account_delete_failed` so frontend local data stays intact.
- Production-core aggregate guard now includes the backend account lifecycle route proof through `npm run test:production-core:backend:account`, so local PR/main guard coverage matches this spec's backend acceptance criteria before staging account-deletion proof runs.
- Destructive staging smoke harness verified by `e2e/account-delete.spec.ts`: default run skips without `ACCOUNT_DELETE_E2E_URL` and `ACCOUNT_DELETE_E2E_ALLOW=DELETE_TEST_ACCOUNT`, so local verification cannot delete an account accidentally.
- Manual staging workflow added in `.github/workflows/account-delete-e2e-staging.yml`: requires `allow_delete=DELETE_TEST_ACCOUNT`, disposable `ACCOUNT_DELETE_E2E_EMAIL` / `ACCOUNT_DELETE_E2E_PASSWORD` secrets, and rejects emails without a delete marker before launching Playwright.
- Account-delete workflow wrapper now rejects `auth_mode` values other than `signin` or `signup` before launching Playwright, so operator mistakes fail before any destructive browser session starts.
- Verification passed:
  - `npm.cmd run test:ui -- src/app/pages/SettingsPage.account-export.test.tsx src/app/components/root-layout/EmailVerificationBanner.persistent.test.tsx` (13 tests passed)
  - `npm.cmd run test:e2e:account-delete` (1 test skipped by safety guard)
  - `npm.cmd --prefix backend run build`
  - `node --test backend\\dist\\tests\\accountRoutes.test.js` with dummy local Firebase env (4 tests passed)
  - `npm.cmd --prefix backend run typecheck`
  - `npm.cmd run typecheck`

## 11. Open Questions / Follow-ups

- Add end-to-end staging account deletion smoke before launch.
