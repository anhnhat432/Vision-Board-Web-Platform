# Auth Profile Bootstrap Monitoring Spec

## 1. Context & Goal

- Feature / bug: profile bootstrap failures are visible to the user, but frontend production monitoring did not capture the final failure with safe context.
- Why now: production launch needs evidence for auth/bootstrap failures beyond local console logs.
- User impact: support and operators can detect profile bootstrap failures while users keep actionable retry/cache behavior.
- Modes affected: real primary; demo/unconfigured auth remains unchanged.

## 2. Surface Classification

- Type: Core.
- Touched domains: auth profile bootstrap, frontend monitoring, production-core tests.
- Existing invariants that must not break: no secrets or raw user identifiers in monitoring context; cached profile fallback still keeps the session usable for recoverable failures; demo mode still works without Firebase.

## 3. Actors & Entry Points

- Primary actor: signed-in real-mode user after Firebase auth succeeds.
- Secondary actor(s): launch operator reviewing Sentry.
- Route(s): app shell through `AuthProvider`.
- API / hook / store touchpoints: `AuthProvider`, `/auth/profile`, user profile cache, `captureFrontendException`.

## 4. Functional Requirements

1. WHEN profile bootstrap fails after all retry attempts, THE system SHALL capture the failure through frontend monitoring.
2. WHERE monitoring context is attached, THE system SHALL include only safe metadata such as HTTP status, timeout flag, recoverability, cache fallback availability, and attempt count.
3. WHERE cached profile fallback is available for a recoverable failure, THE system SHALL keep using the cached profile and SHALL NOT surface a blocking profile error.
4. WHILE monitoring is disabled or unconfigured, THE system SHALL keep existing console/user-facing behavior without throwing.
5. WHERE monitoring is captured, THE system SHALL NOT include raw Firebase UID, email, access token, or profile payload.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: none.
- rollback / restore concerns: reverting monitoring only removes observability, not auth behavior.

## 6. Non-functional Requirements

- performance / latency: monitoring capture runs only after final bootstrap failure.
- accessibility: no UI copy changes.
- observability / logging: capture failure category and safe metadata for production triage.
- security / privacy: no PII/secrets in capture context.

## 7. Out of Scope

- New auth UI.
- Changing retry policy.
- Backend auth/profile endpoint behavior.
- Sentry DSN or deployment env configuration.

## 8. Acceptance Criteria

- [x] final profile bootstrap failure calls `captureFrontendException`.
- [x] captured context excludes raw UID/email/profile data.
- [x] recoverable cached-profile fallback still suppresses blocking profile error.
- [x] production-core guard runs the monitoring regression test.

## 9. Verification Plan

```bash
npm.cmd run test:run -- src/lib/auth/AuthContext.test.ts
npm.cmd run test:production-core:unit
npm.cmd run typecheck
npm.cmd run lint
```

## 10. Open Questions / Follow-ups

- Add production dashboard alert thresholds once Sentry project rules are available.
