# Auth Sync Email Verification Surface Spec

## 1. Context & Goal

- Feature / bug: cloud sync can be blocked by an unverified email, but the visible account banner must name that sync blocker instead of looking like a generic verification reminder.
- Why now: production users need to trust whether work is only local or eligible for cloud sync.
- User impact: signed-in users with pending local work understand that local data is safe, but cloud sync waits for email verification.
- Modes affected: real primary; demo remains hidden from Firebase/cloud sync requirements.

## 2. Surface Classification

- Type: Core
- Touched domains: email verification banner, outbox sync snapshot, local-first sync trust.
- Existing invariants that must not break: local saves and pending outbox items remain intact; demo mode does not show verification requirements; unverified users do not call protected sync.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user with `emailVerified=false`.
- Secondary actor(s): signed-in verified user, demo user.
- Route(s): root layout surfaces that render `EmailVerificationBanner`, `/settings#account-sync`.
- API / hook / store touchpoints: `syncPendingOutbox`, `email-verification:required`, `EmailVerificationBanner`, `SettingsPage`, `LAST_OUTBOX_SYNC_KEY`.

## 4. Functional Requirements

1. WHEN pending outbox sync is blocked because email is unverified, THE system SHALL persist an `email_unverified` outbox snapshot and keep pending local outbox items pending.
2. WHEN pending outbox sync is blocked because email is unverified, THE system SHALL dispatch `email-verification:required` with `action: "sync"`.
3. WHEN the banner receives `email-verification:required` with `action: "sync"`, THE system SHALL show a visible sync-specific reason in the persistent email verification banner.
4. WHILE demo mode is active, THE system SHALL not render the email verification banner.
5. WHEN Settings can read an `email_unverified` outbox snapshot, THE system SHALL show a visible account-sync warning that data remains local-only until email verification is complete.
6. WHEN the header sync pill can read an `email_unverified` outbox snapshot, THE system SHALL show a visible local-only sync-blocked state and send the user to account sync details.
7. WHERE no email verification action has been requested, THE system SHALL keep the existing persistent banner copy and resend cooldown behavior.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none. Existing `visionboard_last_outbox_sync` snapshot shape is reused.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: local data and pending outbox records remain unchanged when sync is blocked by email verification.
- rollback / restore concerns: no destructive state change.

## 6. Non-functional Requirements

- performance / latency: event handling is local-only and should not trigger network calls.
- accessibility: sync blocker reason must be visible text inside the alert banner.
- observability / logging: `email_unverified` snapshot remains available for support/debug surfaces.
- security / privacy: no secrets, tokens, or full backend response bodies in the banner.

## 7. Out of Scope

- Changing Firebase verification delivery.
- Replacing localStorage/outbox architecture.
- Running staging email delivery smoke.

## 8. Acceptance Criteria

- [x] pending outbox + unverified email returns `email_unverified`.
- [x] pending outbox remains pending; API post is not called.
- [x] `email-verification:required` with `action: "sync"` makes the banner show a sync-specific reason.
- [x] Settings account sync shows a local-only warning for an `email_unverified` outbox snapshot.
- [x] Header sync pill shows a local-only blocked state for an `email_unverified` outbox snapshot.
- [x] demo mode remains banner-free.
- [x] existing resend cooldown tests still pass.

## 9. Verification Plan

```bash
npm run test:sync -- src/app/utils/production/outboxSync.test.ts
npm run test:ui -- src/app/components/root-layout/EmailVerificationBanner.persistent.test.tsx
npm run test:sync -- src/app/components/root-layout/SyncStatusPill.test.tsx
npm run test:ui -- src/app/pages/SettingsPage.account-export.test.tsx
npm run typecheck
npm run lint
npm run build
```

## 10. Open Questions / Follow-ups

- Batch evidence 2026-06-26: `EmailVerificationBanner.persistent.test.tsx` now covers demo-mode suppression directly instead of only mocking real mode.
- Batch evidence 2026-06-26: `SyncStatusPill.test.tsx` now proves email-unverified click goes to `/settings#account-sync` instead of firing manual sync.
- Production-core aggregate guard now includes `src/app/utils/production/outboxSync.test.ts` through `npm run test:production-core:sync`, so local PR/main proof now covers the `email_unverified` outbox snapshot and no-network local-only pause.
- Run `npm run test:e2e:email-verification` against staging when Firebase test account credentials are available.
