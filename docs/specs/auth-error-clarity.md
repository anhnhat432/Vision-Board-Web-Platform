# Auth Error Clarity Spec

## 1. Context & Goal

- Feature / bug: sign-in trust is not fully proven until production users can see actionable error copy, password-reset entry, and legal signup links before submitting credentials.
- Why now: production users need actionable auth recovery paths before paid launch.
- User impact: users can distinguish "create an account / check email" from "retry password / reset password" without guessing, and can reach reset/legal affordances from `/login`.
- Modes affected: real mode primarily; demo/unconfigured auth behavior must remain unchanged.

## 2. Surface Classification

- Type: Core.
- Touched domains: Firebase auth error mapping, login UI tests, production smoke scripts.
- Existing invariants that must not break: no secrets in logs, Firebase-unconfigured login notice remains visible, unknown Firebase failures keep useful messages, local-first app data is not touched.

## 3. Actors & Entry Points

- Primary actor: signed-out real-mode user using email/password auth.
- Route(s): `/login`.
- API / hook / store touchpoints: `resolveAuthErrorMessage`, `LoginPage`.

## 4. Functional Requirements

1. WHEN Firebase returns `auth/user-not-found`, THE system SHALL explain that no account exists for the email and suggest sign-up/checking the email.
2. WHEN Firebase returns `auth/wrong-password`, THE system SHALL explain that the password is wrong and suggest password reset.
3. WHEN Firebase returns `auth/invalid-credential`, THE system SHALL keep a generic credential error because Firebase may hide whether email or password was wrong.
4. WHEN Firebase returns setup/provider/domain errors, THE system SHALL keep the existing production-support messages.
5. WHILE auth is unconfigured, THE system SHALL continue showing the existing unconfigured notice rather than a broken form.
6. WHEN a signed-out user opens `/login`, THE system SHALL expose a password-reset entry in sign-in mode and legal `/terms` + `/privacy` links in sign-up mode without requiring a credential submission.
7. WHEN a signed-out user submits password reset from `/login`, THE system SHALL show visible success or actionable reset-error feedback in the reset card.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: none.
- rollback / restore concerns: copy-only change; revert the mapping if support copy needs another policy.

## 6. Non-functional Requirements

- accessibility: login form errors remain rendered with `role="alert"`.
- security / privacy: do not reveal sensitive backend details; `invalid-credential` remains generic.

## 7. Out of Scope

- New account recovery screens.
- Firebase console policy changes.
- Email verification flow changes.

## 8. Acceptance Criteria

- [x] `auth/user-not-found` has a missing-account message.
- [x] `auth/wrong-password` has a wrong-password/reset message.
- [x] `auth/invalid-credential` remains generic.
- [x] Login form still renders auth errors in the visible alert.
- [x] Sign-in mode exposes password-reset entry and reset card affordances.
- [x] Reset-password card shows success state and actionable request errors.
- [x] Sign-up mode exposes `/terms` and `/privacy` links.
- [x] Production smoke scripts assert login recovery/legal trust surface before auth flow continues.

## 9. Verification Plan

```bash
npm.cmd run test:ui -- src/app/pages/LoginPage.test.tsx
npm.cmd run test:run -- src/lib/auth/useAuth.test.ts
node --check scripts/smoke-production-quick.mjs
node --check scripts/smoke-production-e2e.mjs
npm.cmd run typecheck
npm.cmd run lint
```

## 10. Batch Evidence - 2026-06-26

- Auth error mapping remains covered by `src/lib/auth/useAuth.test.ts`: `auth/user-not-found`, `auth/wrong-password`, and `auth/invalid-credential` keep distinct production-safe messages.
- Login recovery/legal affordances are now locked by `src/app/pages/LoginPage.test.tsx`: sign-in mode exposes reset-password card open/close flow, and sign-up mode exposes `/terms` + `/privacy` links.
- `src/app/pages/LoginPage.test.tsx` now also locks reset-password request feedback: successful submit shows the sent-state card, and missing-account / throttled requests stay visible in the reset card alert.
- Deployed smoke harness now proves recovery trust before credential submit:
  - `scripts/smoke-production-quick.mjs` opens `/login`, requires reset-password entry in sign-in mode, opens/closes reset card, then checks sign-up legal links.
  - `scripts/smoke-production-e2e.mjs` performs same checks on production target before authentication and deeper funnel smoke.

## 11. Open Questions / Follow-ups

- Decide later whether support wants less account-enumeration detail if Firebase project deliberately returns generic `auth/invalid-credential`.
- Actual deployed proof still requires running `npm run smoke:prod:quick` and `npm run smoke:prod` with staging or production-safe credentials.
