# Production Smoke Metrics Retry Design

## Context

The production smoke workflow run `30406120570` completed authentication, verified 12-week sync, and completed checkout verification, but exited non-zero at final API aggregation. The recorded failure was a rate-limited `GET /api/weeks/:weekId/metrics` response with a `Retry-After` header.

## Goal

Make the full production smoke prove that 12-week metric hydration recovers from a temporary 429, rather than accepting or masking the first 429.

## Chosen design

After the existing 12-week save/sync proof, the smoke script will inspect the recorded requests for an observed `GET /api/weeks/:weekId/metrics` rate limit.

- When no metrics 429 was observed, the smoke continues; it must not invent a request that the product flow did not make.
- A 429 response is recorded, marked as handled, and waits for the server-provided `Retry-After` value through the existing retry helper.
- The retry callback reissues that exact authenticated `GET` request with the in-memory authorization header captured from the live browser session.
- The proof passes only after a later 2xx metrics response. A non-429 error, a second timeout, or a 5xx remains a failure.
- `/api/weeks/:weekId/metrics` is not added to the final-background-429 allowlist. This prevents the final aggregate from hiding a metrics API outage.

## Alternatives considered

1. Add the metrics route to `isExpectedBackgroundRateLimit`.
   Rejected because it would convert a real metric-hydration failure into a passing smoke run.
2. Increase or disable the backend rate limiter.
   Rejected because the observed `Retry-After` is an expected production response and the smoke client must demonstrate safe recovery first.
3. Retry the entire smoke from the workflow.
   Rejected because it loses endpoint-level evidence and needlessly repeats mutation, billing, and hosted-checkout actions.

## Verification

1. Extend `scripts/production-smoke-harness.test.mjs` first so it requires a metric-specific retry proof and rejects allowlisting that endpoint.
2. Run the focused Vitest harness and confirm it fails before the script change.
3. Add the observed-metrics-specific retry flow in `scripts/smoke-production-e2e.mjs` and rerun the focused test.
4. Run the release-gate test group, typecheck, lint, and production build.
5. Push the branch, open a PR, merge after CI passes, and verify a new Production smoke workflow run passes.

## Documentation alignment

The README must say that frontend Sentry is required for real-mode production runtime checks, while keeping local/demo operation optional when the DSN is blank.
