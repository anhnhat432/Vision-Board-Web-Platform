# Feature: Production API Rate-Limit Isolation

Status: Approved
Risk: High
Delivery: SDD Full for Core behavior, bounded ADD for tests and documentation

## Context and goal

Production smoke and real signed-in sessions can receive HTTP 429 on planning reads such as
`GET /api/plans/:id` and `GET /api/weeks/:weekId/metrics` after otherwise valid authentication,
sync, and billing activity.

The goal is to prevent unrelated authenticated traffic from exhausting the same quota while
preserving strict limits for billing checkout, assistant, account lifecycle, webhooks, and other
sensitive operations. The change must also remove confirmed duplicate frontend sync traffic and
keep production smoke strict about unexpected 429 responses.

## Root-cause diagnosis

### Backend middleware composition

`backend/src/routes/index.ts` currently registers:

```ts
apiRoutes.use(healthRateLimiter, healthRoutes);
apiRoutes.use(authMiddleware);
apiRoutes.use(generalApiRateLimiter);
apiRoutes.use(authProfileRateLimiter, authRoutes);
```

Express flattens each callback passed to `Router.use`. The limiter and child router therefore
become separate root-matching middleware layers. The result is:

- `healthRateLimiter` counts every API request, not only `/health` requests.
- `generalApiRateLimiter` counts every authenticated API request in one 120/minute user bucket.
- `authProfileRateLimiter` counts every authenticated API request in one 60/minute user bucket,
  not only `/auth/profile` requests.
- A signed-in request to `GET /api/plans/:id` can be blocked by the 60/minute `auth-profile`
  limiter before it reaches the plan controller.
- Billing, planning, sync, and other authenticated traffic consume the same unintended buckets.

The current handler logs the route and raw `userId`, but not the limiter name, configured limit,
window, safe key, or authentication state. Multiple limiters also share the default
`rate_limited` response code, so production logs cannot identify the rejecting limiter directly.

### Frontend request amplification

- `hydrateTwelveWeekPlansFromBackend` fetches goals and plans, then starts an unbounded
  `Promise.allSettled(plans.map(getPlan))` fan-out. A long-lived QA or production account can issue
  many plan-detail requests at once after login.
- Plan reads are deduplicated only inside individual hook instances. Hydration, progress overlays,
  task overlays, and execution sync do not share one in-flight request registry.
- In real mode with mutation sync enabled, task completion, daily check-in, and weekly review are
  first enqueued into the new mutation queue and then also sent through the legacy execution sync
  path. This produces two automatic sync paths for the same local mutation.
- `apiClient` parses `Retry-After`, and the legacy queue stops a batch on 429, but planning reads do
  not have one shared, bounded retry policy.
- Billing payment history intentionally does not retry 429. That behavior remains unchanged.

The incident is therefore a combination of backend limiter composition and frontend request
amplification. The backend composition defect is sufficient to make valid traffic self-throttle;
the frontend fan-out and dual sync paths make the defect occur sooner.

## Actors and permissions

- Signed-in user: reads and changes only their own planning, sync, billing, order, and account data.
- Admin: uses admin-only read and mutation surfaces after existing authorization checks.
- Public visitor: may access public catalog and public billing routes without Firebase auth.
- Billing provider: calls signed webhook endpoints protected by signature verification and
  provider-specific rate limits.
- Production smoke account: is treated exactly like any other signed-in user and receives no
  allowlist or quota exception.

## Preconditions and assumptions

- Firebase authentication continues to run before authenticated limiter classification so the
  Firebase UID is available as the preferred key.
- Existing authorization, email-verification, validation, and webhook-signature middleware remain
  in force.
- The default in-memory rate-limit store remains in scope. A distributed store is a separate
  scaling decision.
- `VITE_ENABLE_12_WEEK_MUTATION_SYNC=true` means the mutation queue is the automatic write path for
  task completion, daily check-in, and weekly review. Explicit manual sync remains available.
- No production smoke account, IP, UID, or email is special-cased.

## Architecture

### Named limiter construction

`createLimiter` SHALL require a stable limiter name. The name SHALL be passed to the 429 handler and
used as the policy identifier where supported by `express-rate-limit`.

The handler SHALL log:

- event name `rate_limit_hit`
- limiter name
- HTTP method
- route/original URL without request body or query payload logging
- whether an authenticated user exists
- a short SHA-256 hash of the effective rate-limit key
- configured limit and window in milliseconds
- current used/remaining count when available
- computed `Retry-After`
- request IP where operationally necessary
- existing merchant identifier only for webhook diagnostics

The handler SHALL NOT log Firebase tokens, passwords, full email addresses, payment or webhook
secrets, request bodies, user content, or raw Firebase UIDs.

All default 429 responses SHALL retain `errorCode: "rate_limited"`. Assistant responses SHALL retain
`errorCode: "ASSISTANT_RATE_LIMITED"`. Every 429 response SHALL include `Retry-After`.

### Authenticated limiter classifier

After `authMiddleware`, one classifier middleware SHALL select exactly one authenticated quota
family for routes that do not already carry an exact route-level limiter. It SHALL NOT increment a
shared global authenticated counter.

Dedicated billing, assistant, discount-validation, and plan bulk-sync routes already attach their
own limiter at the exact route and SHALL bypass the authenticated classifier to avoid double
counting.

Current route families and limits:

| Limiter | Scope | Key | Window | Limit |
| --- | --- | --- | ---: | ---: |
| `health` | `GET /health`, `GET /health/billing` only | normalized IP | 1 minute | 120 |
| `webhook-health` | provider webhook health GET routes only | normalized IP | 1 minute | 120 |
| `public-catalog` | public order catalog reads only | normalized IP | 1 minute | 120 |
| `auth-profile` | `/auth/profile` GET/POST/PATCH only | Firebase UID, IP fallback | 1 minute | 60 |
| `planning-read` | GET goal/plan/week/metric/task/vision-board resources | Firebase UID, IP fallback | 1 minute | 240 |
| `planning-write` | POST/PATCH/PUT/DELETE planning CRUD | Firebase UID, IP fallback | 1 minute | 60 |
| `sync-read` | pull and workspace export | Firebase UID, IP fallback | 1 minute | 60 |
| `sync-write` | mutation/import/validate endpoints | Firebase UID, IP fallback | 1 minute | 30 |
| `account-export` | account export | Firebase UID, IP fallback | 1 minute | 10 |
| `account-destructive` | account deletion | Firebase UID, IP fallback | 1 minute | 3 |
| `admin-read` | authenticated admin GET surfaces | Firebase UID, IP fallback | 1 minute | 120 |
| `admin-write` | authenticated admin mutations | Firebase UID, IP fallback | 1 minute | 30 |
| `order-read` | signed-in user order reads | Firebase UID, IP fallback | 1 minute | 120 |
| `order-write` | signed-in user order mutations/payment-session | Firebase UID, IP fallback | 1 minute | 30 |
| `authenticated-read-fallback` | future/unclassified authenticated GET routes | Firebase UID, IP fallback | 1 minute | 120 |
| `authenticated-write-fallback` | future/unclassified authenticated mutations | Firebase UID, IP fallback | 1 minute | 30 |
| `billing-status` | existing entitlement/order-status/checkout-info routes | Firebase UID or IP | 1 minute | 40 |
| `billing-history` | existing payment-history route | Firebase UID | 1 minute | 120 |
| `billing-checkout` | existing checkout/portal/cancel/refund/claim routes | Firebase UID or IP | 1 minute | 10 |
| `plan-bulk-sync` | existing bulk-sync route | Firebase UID | 1 minute | 10 |
| `assistant` | existing assistant/transcription routes | Firebase UID or IP | 15 minutes | 20 FREE / 120 paid |
| webhook limiters | existing provider-specific webhook POST routes | merchant or IP | 1 minute | unchanged |

The planning-read limit is intentionally isolated and paired with frontend request controls. It is
not a replacement increase to the old global limiter: billing, assistant, sync writes, account
actions, and admin writes cannot consume it.

### Frontend planning-read control

A planning-domain request helper SHALL provide:

- module-level in-flight deduplication by HTTP method and normalized API path
- one retry at most for planning GET requests that receive HTTP 429
- delay equal to the parsed `Retry-After` value plus bounded jitter of at most 250 ms
- no retry for 401, 403, validation errors, conflicts, or other 4xx responses
- removal of the in-flight entry after success or final failure

`getPlans`, `getPlan`, `getWeeks`, and `getMetrics` SHALL use this helper. Billing and mutation
requests SHALL not use it.

Backend plan hydration SHALL process plan-detail reads with concurrency 4 instead of starting every
request simultaneously. Result ordering and partial-failure behavior SHALL remain unchanged.

### Single automatic sync path

WHEN mutation sync is enabled, task completion, daily check-in, and weekly review SHALL enqueue the
new mutation once and SHALL NOT also invoke the legacy automatic execution sync path for that same
change.

WHEN mutation sync is disabled, the existing legacy execution sync and retry queue SHALL remain the
fallback behavior.

Explicit manual cloud sync and explicit backend recovery actions SHALL remain available and SHALL
not be removed.

### Production smoke behavior

Production smoke SHALL continue to fail on unexpected HTTP 429 after legitimate application retry
behavior is exhausted. The implementation SHALL NOT:

- retain or add plan, week, metric, billing, auth, or sync routes in a blanket 429 allowlist
- skip final severe API failure aggregation
- special-case the smoke account
- remove existing assertions

The existing pathname-based `isExpectedBackgroundRateLimit` allowlist SHALL be removed. A recorded
429 MAY be considered recovered only when it was explicitly marked as handled by an existing smoke
retry or when a later response for the same method and normalized URL succeeds. An unrecovered 429
SHALL remain a severe API failure.

## Acceptance criteria

- `RL-001` WHEN any API request is not a health request, THE system SHALL NOT increment the `health` limiter.
- `RL-002` WHEN any authenticated request is not `/auth/profile`, THE system SHALL NOT increment the `auth-profile` limiter.
- `RL-003` WHEN billing traffic consumes its configured quota, THE system SHALL keep planning-read quota independent.
- `RL-004` WHEN a signed-in user performs a valid login, hydration, sync, entitlement, and billing burst within the documented per-family limits, THE system SHALL not return HTTP 429.
- `RL-005` WHEN a client exceeds a route-family quota, THE system SHALL return HTTP 429 with `Retry-After` and the stable error code for that limiter family.
- `RL-006` WHEN a limiter rejects a request, THE system SHALL log the limiter name, method, safe route, safe key hash, auth state, limit, window, retry delay, and operational IP without logging secrets or raw UID/email.
- `RL-007` WHEN two callers request the same planning GET while the first request is in flight, THE frontend SHALL issue one network request and share its promise.
- `RL-008` WHEN plan hydration contains more than four plans, THE frontend SHALL run at most four plan-detail reads concurrently.
- `RL-009` WHEN a planning GET receives HTTP 429 with `Retry-After`, THE frontend SHALL wait for that delay, retry at most once, and surface the final error if the retry fails.
- `RL-010` WHEN a planning GET receives 401, 403, 409, or a validation 4xx, THE frontend SHALL not retry it.
- `RL-011` WHILE mutation sync is enabled, THE frontend SHALL use one automatic mutation path for task completion, daily check-in, and weekly review.
- `RL-012` WHILE mutation sync is disabled, THE frontend SHALL preserve the legacy execution sync fallback.
- `RL-013` WHEN checkout exceeds 10 requests per minute for one key, THE backend SHALL still return HTTP 429.
- `RL-014` WHEN assistant traffic exceeds the existing entitlement-specific limit, THE backend SHALL still return `ASSISTANT_RATE_LIMITED`.
- `RL-015` WHEN a planning client exceeds the planning-read or planning-write quota, THE backend SHALL still return HTTP 429; valid-burst protection SHALL not disable abuse protection.
- `RL-016` WHEN production smoke observes an unexpected final HTTP 429, THE smoke SHALL still fail.

## Test mapping

| Requirement | Evidence |
| --- | --- |
| RL-001, RL-002 | backend route integration tests exercising non-health and non-auth traffic beyond the old accidental thresholds |
| RL-003, RL-004 | backend integration test interleaving billing/status/history and planning reads for one Firebase UID |
| RL-005, RL-006 | named limiter handler test with captured warning context and response headers/body |
| RL-007, RL-009, RL-010 | frontend planning request helper tests with deferred promises, fake timers, and 429/4xx responses |
| RL-008 | hydration test tracking maximum concurrent `getPlan` calls |
| RL-011, RL-012 | execution action tests for mutation-sync enabled and disabled modes |
| RL-013 | billing route limiter integration test exceeding checkout quota |
| RL-014 | assistant limiter regression test preserving existing limits and error code |
| RL-015 | backend planning limiter abuse test exceeding the configured quota |
| RL-016 | production smoke harness source-contract test |

## Documentation updates

Update only the relevant sections of:

- `guidelines/CURRENT_PROJECT_STATUS.md`
- `guidelines/SOFT_LAUNCH_CHECKLIST.md`
- `docs/ops/staging-proof-runbook.md`

The documentation SHALL distinguish local verification from deployed smoke evidence. It SHALL not
claim two consecutive production smoke passes until those runs exist for the same deployed commit.

## Rollout and rollback

### Rollout

1. Merge the reviewed branch without production deployment from this task.
2. Deploy the backend and frontend through the normal staging/preview path.
3. Run quick smoke once to warm infrastructure.
4. Run full production smoke twice consecutively against the same deployed commit.
5. Capture workflow URLs, commit SHA, target URL, and result in the proof ledger.

### Rollback

- Revert the feature commit to restore the previous limiter arrangement and frontend behavior.
- Do not disable billing, assistant, webhook, or account lifecycle limiters during rollback.
- If an individual quota is too strict after deployment, adjust only that route-family limiter with
  production evidence; do not reintroduce a shared authenticated limiter.

## Out of scope

- Distributed Redis or Mongo-backed rate-limit storage
- UI redesign or new product modules
- Billing provider changes or pricing changes
- Firebase authentication redesign
- Backend-first migration of local-first planning data
- Production deployment or PR merge
- Smoke-account allowlisting
- Major dependency or TypeScript upgrades

## Traceability

- Source request: production API 429 investigation and remediation request dated 2026-08-07.
- Primary implementation surfaces: backend limiter middleware and route composition, planning read
  services and hydration, 12-week execution actions, focused tests, and production-readiness docs.
- Completion requires automated verification, spec compliance review, security review, and deployed
  smoke evidence clearly separated from local evidence.
