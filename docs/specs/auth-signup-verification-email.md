# Auth Signup Verification Email Spec

## 1. Context & Goal

- Feature / bug: email/password signup creates a Firebase user but does not automatically send the first verification email.
- Why now: production auth needs a clear verification path before users reach paid or cloud-sync protected actions.
- User impact: new users receive the verification email immediately after signup and still enter the app if email delivery has a temporary issue.
- Modes affected: real mode with Firebase configured; demo/unconfigured auth remains unchanged.

## 2. Surface Classification

- Type: Core.
- Touched domains: Firebase email signup, email verification.
- Existing invariants that must not break: signup must persist the Firebase token; signup must not clear local data; verification email delivery failure must not roll back account creation.

## 3. Actors & Entry Points

- Primary actor: new email/password user.
- Route(s): `/login?mode=signup`.
- API / hook / store touchpoints: `registerWithEmail`, Firebase `sendEmailVerification`.

## 4. Functional Requirements

1. WHEN email/password signup succeeds and the new Firebase user is not verified, THE system SHALL request a verification email for that user.
2. WHEN the new Firebase user is already verified, THE system SHALL NOT request another verification email.
3. IF sending the verification email fails after signup, THE system SHALL keep the signup successful and log the failure for diagnostics.
4. WHILE Firebase auth is unconfigured, THE system SHALL keep returning `null` without attempting signup or verification.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: existing Firebase token persistence only; no new app storage keys.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: account creation and token persistence happen before verification email send.
- rollback / restore concerns: email-send failure is non-blocking and can be retried from the persistent email verification banner.

## 6. Non-functional Requirements

- observability / logging: non-blocking send failure is logged without secrets.
- security / privacy: do not log passwords or tokens.

## 7. Out of Scope

- Firebase email template configuration.
- Blocking paid checkout beyond existing email verification guards.
- Staging inbox delivery proof.

## 8. Acceptance Criteria

- [x] signup sends an initial verification email for unverified Firebase users.
- [x] signup skips verification email for already verified Firebase users.
- [x] verification email send failure does not fail signup.
- [x] tests cover the Firebase helper behavior.

## 9. Verification Plan

```bash
npm.cmd run test:run -- src/lib/auth/firebase.test.ts
npm.cmd run typecheck
npm.cmd run lint
```

## 10. Open Questions / Follow-ups

- Production-core aggregate guard now includes `src/lib/auth/firebase.test.ts` through `npm run test:production-core:unit`, so PR/main local proof now fails fast if signup stops sending or safely skipping the initial verification email.
- Run staging signup with a real disposable inbox to prove Firebase template/delivery outside repo code.
