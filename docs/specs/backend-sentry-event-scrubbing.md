# Backend Sentry Event Scrubbing Spec

## 1. Context & Goal

- Feature / bug: backend monitoring can capture raw exceptions and context from billing, webhook, auth, rate-limit, receipt, reconciliation, and Express error-handler paths.
- Why now: production backend handles paid orders and user account data, so outbound monitoring events need a defensive scrubber even when the caller accidentally includes sensitive text.
- User impact: backend observability remains available while reducing risk that personal data, provider payload details, or credentials appear in Sentry.
- Modes affected: real production backend primary; development/test behavior remains compatible.

## 2. Surface Classification

- Type: Core.
- Touched domains: backend monitoring, Sentry initialization, billing critical exception capture, backend verification.
- Existing invariants that must not break: Sentry remains optional; missing DSN still disables monitoring; captured errors must not throw; billing/auth/sync/webhook behavior and database contracts remain unchanged.

## 3. Actors & Entry Points

- Primary actor: real-mode user whose backend request hits a server-side failure.
- Secondary actor(s): launch operator reviewing backend Sentry events.
- Route(s): all backend routes covered by Express Sentry error handler and `captureBackendException`.
- API / hook / store touchpoints: `initializeSentry`, `captureBackendException`, `captureBillingCriticalException`, Sentry `beforeSend`.

## 4. Functional Requirements

1. WHEN backend Sentry initializes, THE system SHALL install a `beforeSend` scrubber for outgoing events.
2. WHEN an outgoing backend Sentry event contains exception values, message text, context, extra data, request data, user data, tags, or breadcrumbs, THE system SHALL sanitize email addresses, bearer tokens, secret-like key/value pairs, raw URLs, and raw user identifiers.
3. WHERE backend monitoring context contains safe operational metadata, THE system SHALL preserve fields such as event, provider, status, counts, amount, and coarse technical flags.
4. WHILE Sentry is disabled or unconfigured, THE system SHALL preserve the current no-op capture behavior.
5. WHERE billing critical capture includes order metadata, THE system SHALL keep existing status/order triage metadata without adding provider payloads or account details.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: no.
- backend models or API contracts touched: none.
- sync ordering guarantees: no sync change.
- rollback / restore concerns: reverting only reduces backend monitoring privacy hardening.

## 6. Non-functional Requirements

- performance / latency: scrubber is bounded-depth and runs only during monitoring event preparation.
- accessibility: no UI change.
- observability / logging: preserve safe tags and operational context for grouping.
- security / privacy: reduce PII/secret/provider URL exposure in outbound backend monitoring.

## 7. Out of Scope

- Live Sentry ingestion proof.
- Sentry dashboard alert rules.
- Refactoring billing/reconciliation/receipt callers.
- Changing API error payloads.

## 8. Acceptance Criteria

- [x] backend Sentry init includes a `beforeSend` scrubber.
- [x] exception/message/context/extra/request/user/breadcrumb payloads are scrubbed before send.
- [x] safe operational tags and status metadata remain available.
- [x] backend capture stays no-op when Sentry is disabled.
- [x] targeted backend regression test covers raw email/token/URL/user id redaction.

## 9. Verification Plan

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run build
node backend/dist/tests/sentryMonitoring.test.js
npm.cmd --prefix backend run test:run
```

## 10. Open Questions / Follow-ups

- Validate actual Sentry project payloads in staging once DSN and access to event samples are available.
- Consider safe fingerprinting if issue grouping becomes too broad after message scrubbing.
