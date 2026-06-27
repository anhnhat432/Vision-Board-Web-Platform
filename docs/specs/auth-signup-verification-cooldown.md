# Auth Signup Verification Cooldown Spec

## 1. Context & Goal

- Feature / bug: signup now sends the first verification email, but the persistent banner only knows about emails sent from the banner itself.
- Why now: production users should see that the first verification email was already sent and should not be encouraged to spam resend immediately after signup.
- User impact: after signup, the email verification banner shows a recent sent time and the resend button starts in cooldown.
- Modes affected: real mode with Firebase configured; demo mode remains unaffected.

## 2. Surface Classification

- Type: Core.
- Touched domains: Firebase signup, email verification banner, localStorage cooldown state.
- Existing invariants that must not break: reuse the existing `emailVerificationLastSentAt:*` localStorage key format; no user-data schema migration; failed email send stays non-blocking.

## 3. Actors & Entry Points

- Primary actor: new email/password user after signup.
- Route(s): `/login?mode=signup`, root layout email verification banner.
- API / hook / store touchpoints: `registerWithEmail`, `EmailVerificationBanner`, email verification cooldown localStorage.

## 4. Functional Requirements

1. WHEN signup sends the initial verification email, THE system SHALL store the sent timestamp under the same cooldown key the banner already reads.
2. WHEN the banner mounts for that unverified user, THE system SHALL restore the sent timestamp and disable resend until cooldown expires.
3. WHEN initial verification email sending fails, THE system SHALL NOT write a sent timestamp.
4. WHEN Firebase auth is unconfigured or signup returns no user, THE system SHALL NOT write cooldown state.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: existing `emailVerificationLastSentAt:${uidOrEmail}` only.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: cooldown timestamp is local UX state only.
- rollback / restore concerns: removing this helper reverts to banner-only cooldown behavior.

## 6. Non-functional Requirements

- accessibility: resend button remains disabled through the existing button semantics.
- security / privacy: timestamp only; no tokens, passwords, or secrets.

## 7. Out of Scope

- Server-side verification email audit log.
- Inbox delivery proof.
- Changing cooldown duration.

## 8. Acceptance Criteria

- [x] signup stores cooldown timestamp after successful initial verification email send.
- [x] signup does not store cooldown timestamp when email send fails.
- [x] banner restores signup-written cooldown state.
- [x] existing resend/change-email cooldown behavior remains covered.

## 9. Verification Plan

```bash
npm.cmd run test:run -- src/lib/auth/firebase.test.ts
npm.cmd run test:ui -- src/app/components/root-layout/EmailVerificationBanner.persistent.test.tsx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 10. Open Questions / Follow-ups

- Production-core aggregate guard now includes `src/lib/auth/firebase.test.ts` through `npm run test:production-core:unit`, so signup-written cooldown persistence stays covered with the rest of the launch auth proof on every PR/main run.
- Staging signup smoke should verify the Firebase email is actually delivered to a disposable inbox.
