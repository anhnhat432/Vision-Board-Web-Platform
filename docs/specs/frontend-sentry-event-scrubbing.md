# Frontend Sentry Event Scrubbing Spec

## 1. Context & Goal

- Feature / bug: shared frontend monitoring can receive raw `Error` messages and context from auth, billing, sync, and route boundaries before sending to Sentry.
- Why now: production launch privacy copy says Sentry reports should not contain personal content, so the shared monitoring boundary needs a defensive scrubber even when a caller forgets to sanitize.
- User impact: users keep the same UI behavior while sensitive strings are less likely to leave the browser in monitoring payloads.
- Modes affected: real primary; demo remains compatible when a Sentry DSN is configured.

## 2. Surface Classification

- Type: Core.
- Touched domains: frontend monitoring, Sentry client, production-core unit verification.
- Existing invariants that must not break: Sentry remains optional; monitoring must never block user flows; feature/action/status tags stay available for triage; no route, auth, billing, sync, backend, or storage contract changes.

## 3. Actors & Entry Points

- Primary actor: real-mode user who hits an auth, billing, sync, or route error.
- Secondary actor(s): launch operator reviewing frontend Sentry events.
- Route(s): shared app surfaces through error boundaries and monitoring callers.
- API / hook / store touchpoints: `captureFrontendException`, `captureFrontendClientException`, Sentry `beforeSend`.

## 4. Functional Requirements

1. WHEN frontend monitoring initializes Sentry, THE system SHALL install a `beforeSend` scrubber for outgoing events.
2. WHEN an outgoing Sentry event contains exception values, message text, context, extra data, request data, user data, tags, or breadcrumbs, THE system SHALL sanitize email addresses, bearer tokens, secret-like key/value pairs, raw URLs, and raw user identifiers.
3. WHERE monitoring context is set through `captureFrontendClientException`, THE system SHALL set only sanitized scope context and tags.
4. WHILE monitoring is disabled or Sentry is unconfigured, THE system SHALL preserve current no-op behavior.
5. WHERE safe operational fields exist, THE system SHALL preserve non-sensitive values such as feature, action, status, phase, counts, booleans, and error type.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no sync behavior change.
- rollback / restore concerns: reverting only reduces monitoring privacy hardening.

## 6. Non-functional Requirements

- performance / latency: scrubber is local, bounded-depth, and only runs while preparing monitoring payloads.
- accessibility: no UI changes.
- observability / logging: preserve safe tags and coarse metadata for grouping.
- security / privacy: reduce risk of PII, credentials, URLs, or user-entered content appearing in outbound monitoring events.

## 7. Out of Scope

- Backend Sentry event pipeline.
- Sentry project configuration and alert rules.
- Live Sentry ingestion proof.
- Changing user-facing error copy.

## 8. Acceptance Criteria

- [x] Sentry init includes a `beforeSend` scrubber.
- [x] exception/message/context/extra/request/user/breadcrumb payloads, including raw user identifiers, are scrubbed before send.
- [x] `captureFrontendClientException` sets sanitized scope context.
- [x] feature/action/status style metadata remains usable.
- [x] production-core frontend/unit verification includes the regression test.

## 9. Verification Plan

```bash
npx.cmd vitest run --config vitest.fast.config.ts src/lib/monitoring/sentry-client.test.ts
npm.cmd run test:production-core:unit
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 10. Open Questions / Follow-ups

- Add backend Sentry `beforeSend` scrubbing in a separate batch after inspecting Express/Sentry request payload behavior.
- Decide with production ops whether Sentry issue grouping needs a safe fingerprint strategy.
