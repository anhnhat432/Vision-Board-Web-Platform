# Account Deletion Mongo-Before-Firebase Safety

## 1. Context & Goal

- Feature / bug: destructive account deletion can leave an account in a partial state if one external system succeeds and the other fails.
- Why now: real users can rely on account deletion for trust, privacy, and data lifecycle control. A partial failure must not leave server data orphaned behind a Firebase account that no longer exists.
- User impact: if account-data deletion fails, the Firebase account remains available so the user can retry without losing local data. If Firebase deletion fails after account-data deletion, the frontend clears local app data and signs out so deleted server data is not re-synced from the device.
- Modes affected: `real` only. Demo/local-only deletion remains local-device behavior.

## 2. Surface Classification

- Type: `Core`.
- Touched domains: Firebase auth, backend account deletion, Mongo account-data deletion, Settings destructive flow, 12-week destructive settings flow.
- Existing invariants that must not break:
  - Protected account deletion still requires Firebase auth.
  - User can still export data before deletion.
  - Local data is cleared only after the backend deletion request succeeds.
  - `auth/user-not-found` remains idempotent for repeated deletion attempts.
  - No localStorage keys, storage shapes, billing entitlement rules, or payment flows change.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user deleting their own account.
- Secondary actor(s): Firebase Admin SDK, MongoDB account-data collections.
- Route(s): `DELETE /api/account/delete`, `DELETE /api/account`.
- API / hook / store touchpoints:
  - `backend/src/controllers/accountController.ts`
  - `backend/src/routes/accountRoutes.ts`
  - `src/services/syncService.ts`
  - `src/app/pages/SettingsPage.tsx`
  - `src/features/plan12week/pages/12WeekSystem/useTwelveWeekSettingsActions.ts`

## 4. Functional Requirements

1. WHEN a signed-in user requests account deletion, THE system SHALL delete that user's MongoDB account data before deleting the Firebase account.
2. WHEN MongoDB account-data deletion fails, THE system SHALL NOT delete the Firebase account.
3. WHEN MongoDB account-data deletion succeeds and Firebase deletes the user successfully, THE system SHALL return success with deletion counts.
4. WHEN MongoDB account-data deletion succeeds and Firebase returns `auth/user-not-found`, THE system SHALL treat Firebase deletion as idempotently complete and return success.
5. WHEN MongoDB account-data deletion succeeds and Firebase account deletion fails for any other reason, THE system SHALL return `502` with `firebase_account_delete_failed`.
6. WHEN the frontend receives `firebase_account_delete_failed`, THE system SHALL sign out when possible, clear local app data on this device, close the destructive dialog, navigate to a safe start page, and show a partial-completion warning.
7. WHILE handling `firebase_account_delete_failed`, THE system SHALL NOT keep local app data in a state that can automatically re-sync deleted server data.
8. WHEN account deletion fails before MongoDB deletion starts, THE frontend SHALL keep local data intact because the backend request failed.
9. WHERE account deletion is requested without Firebase auth, THE system SHALL reject the request before Firebase or MongoDB deletion is attempted.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: response status/error behavior for Firebase-delete failure is preserved; deletion ordering changes.
- sync ordering guarantees: backend account deletion must not delete Firebase auth until account data has been removed successfully; after app data deletion, local app data must be cleared even if Firebase auth cleanup fails.
- rollback / restore concerns: this does not introduce soft-delete or recovery. It only avoids the current Firebase-failure partial-delete state.

## 6. Non-functional Requirements

- performance / latency: Firebase Admin deletion stays after MongoDB account-data deletion; no extra network calls.
- accessibility: no UI changes required.
- observability / logging: keep server-side error logging for Firebase deletion failure; do not log tokens or sensitive user data.
- security / privacy: keep authorization before destructive actions; do not expose Firebase internals beyond existing safe error code/message.

## 7. Out of Scope

- Adding background deletion jobs, queues, or retry workers.
- Adding soft-delete/tombstone account lifecycle.
- Changing frontend destructive dialogs or localStorage clearing behavior.
- Changing billing, entitlement, payment, or export data shapes.
- Running destructive staging e2e against a real account in this batch.

## 8. Acceptance Criteria

- [x] Happy path: account data and Firebase user are deleted when Firebase deletion succeeds.
- [x] Signed-out path: unauthenticated deletion does not call Firebase or MongoDB deletion.
- [x] Firebase already missing path: `auth/user-not-found` remains successful and deletes MongoDB account data.
- [x] MongoDB failure path: account-data deletion failure returns an error and does not delete the Firebase account.
- [x] Firebase failure path: non-idempotent Firebase failure returns `502` with `firebase_account_delete_failed` after account-data deletion.
- [x] Frontend local-data safety: generic backend deletion failure keeps local data, but `firebase_account_delete_failed` clears local data to prevent re-syncing deleted server data.
- [x] Real-mode vs demo-mode boundary: no demo-mode backend deletion behavior is introduced.

## 9. Verification Plan

Commands to run:

```bash
npm.cmd run test:production-core:backend:account
npm --prefix backend run check
npm.cmd run test:production-core:backend
npx.cmd vitest run --config vitest.flows.config.ts src/features/plan12week/pages/12WeekSystem.destructive.test.tsx
npx.cmd vitest run --config vitest.ui.config.ts src/app/pages/SettingsPage.account-export.test.tsx
npm.cmd run check
```

If frontend account-deletion copy or response handling changes, also run:

```bash
npm.cmd run test:run -- src/app/pages/SettingsPage.account-export.test.tsx src/features/plan12week/pages/12WeekSystem.destructive.test.tsx
```

## 10. Open Questions / Follow-ups

- Consider a later account-deletion lifecycle design with soft-delete, audit trails, and asynchronous retries after launch proof is stable.
- Run `.github/workflows/account-delete-e2e-staging.yml` with an explicit disposable-account opt-in before D-1 go/no-go.
