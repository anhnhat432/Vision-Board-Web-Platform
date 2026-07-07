# Account Deletion Ordering

## Context

The Settings page already uses a two-step `AlertDialog` for irreversible account deletion and keeps local data when the delete request fails. The backend, however, deletes MongoDB account collections before deleting the Firebase Auth user. If Firebase account removal fails after MongoDB deletion, the user can keep local data but their cloud account data may already be gone.

## Surface Classification

- Type: Core
- Touched domains: account deletion, Firebase Admin auth, MongoDB user data deletion.
- Storage changes: none.
- Payment changes: none.
- API shape changes: keep the existing success response shape and error code.

## Requirements

1. WHEN Firebase account deletion fails for an existing Firebase user, THE system SHALL NOT delete MongoDB user collections in that request.
2. WHEN Firebase reports `auth/user-not-found`, THE system SHALL treat Firebase deletion as idempotently complete and SHALL continue deleting MongoDB user collections.
3. WHEN Firebase account deletion succeeds, THE system SHALL delete the same MongoDB collections as before and SHALL return the existing success response shape.
4. WHEN Firebase account deletion fails, THE system SHALL return `firebase_account_delete_failed` with user-safe copy that says cloud account data was not deleted and the user may retry.
5. WHEN Firebase account deletion has completed but MongoDB account data deletion fails, THE system SHALL return `account_data_delete_failed_after_auth_delete` with user-safe copy that says the account sign-in may already be removed, cloud data deletion could not be confirmed, and support should be contacted.
6. WHILE this ordering is changed, THE system SHALL NOT change localStorage shapes, frontend account deletion flow, billing/payment data formats, or auth middleware.

## Verification Plan

Focused backend route test:

```bash
npm.cmd --prefix backend run test:run -- dist/tests/accountRoutes.test.js
```

Backend compile gates:

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
```

Shared hygiene:

```bash
npm.cmd run lint
git diff --check
```
