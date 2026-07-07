# Firebase Token Storage Hardening

## Context

The frontend currently mirrors Firebase ID tokens into `localStorage` under `firebase_id_token`. Firebase already persists the user session through its SDK; storing a bearer token in web storage increases exposure if any future XSS or third-party script bug can read `localStorage`.

## Surface Classification

- Type: Core
- Touched domains: Firebase auth, protected API authorization, logout/session restore.
- Storage shape changes: no product data shape changes.
- Auth contract change: `firebase_id_token` remains as a legacy/session hint key, but must not contain a bearer token.
- Backend contract changes: none.

## Requirements

1. WHEN login, signup, ID-token refresh, or user reload obtains a Firebase ID token, THE system SHALL keep the bearer token in memory/Firebase SDK flow and SHALL NOT write that bearer token to `localStorage`.
2. WHEN the app needs to decide whether to subscribe to Firebase auth restoration after refresh, THE system MAY keep a non-sensitive session hint in the existing `firebase_id_token` key to preserve current UX without adding a new storage key.
3. WHEN Firebase auth is configured and `auth.currentUser` is unavailable after auth restoration, THE system SHALL NOT send a legacy `localStorage` token as a bearer fallback.
4. WHEN token refresh fails but the app already has an in-memory token from the current session, THE system MAY return that in-memory token as a best-effort retry fallback.
5. WHEN the user logs out or Firebase reports no user, THE system SHALL clear the session hint and in-memory token.
6. WHILE this hardening is applied, THE system SHALL NOT change local-first user data, backend auth middleware, Firebase provider setup, or signup/email-verification behavior.

## Verification Plan

Focused frontend auth tests:

```bash
npm.cmd run test:run -- src/lib/auth/firebase.test.ts src/lib/auth/useAuth.logout.test.ts src/lib/auth/authedFetch.test.ts
```

Frontend compile/lint gates:

```bash
npm.cmd run typecheck
npm.cmd run lint
```

Regression spot-check:

```bash
npm.cmd run test:run -- src/test/ux-ui-upgrade/property-9-storage-keys.test.ts
```
