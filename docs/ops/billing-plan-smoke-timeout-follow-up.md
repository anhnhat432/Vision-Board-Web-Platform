# Billing `/billing/plan` Smoke Timeout — Follow-up

Status: **OPEN — under investigation**
Scope: billing surface only. Not attributed to release `d8b35b71` (12-week setup route replacement).

## 1. Observed failure

- Command: `npm run smoke:prod:quick`
- Result: 4/5 steps passed.
- Failing step: `/billing/plan` payment-history hydration.
- Symptom: hydration wait condition exceeded timeout.
- Timeout: `30000ms`.
- Other smoke steps (including the 12-week setup route mapping and demo-copy leak check) passed.

## 2. Why this is treated as separate from `d8b35b71`

- `d8b35b71` ships the 12-week setup route replacement (`/12-week-setup` -> `TwelveWeekSetupLab`).
- The change does not touch `/billing/plan`, payment-history fetching, billing provider wiring, or backend `/billing/*` endpoints.
- Production route smoke for the 12-week setup route mapping passed independently.
- Demo-copy leak check passed.
- Failure is isolated to the billing surface and shares no code path or deployment artifact specific to the 12-week setup change.

Conclusion: tracked as an independent billing-surface issue. Does not block 12-week setup limited rollout monitoring.

## 3. Suspected causes

Ranked by likelihood given Render + smoke harness behavior:

- **Render cold start.** Backend dyno cold-start can exceed the 30s smoke wait when the billing route is the first protected call after idle. Typical cold-start cost on Render free / low tier can stack with Firebase Admin init and Mongo connection warm-up.
- **`payment-history` endpoint latency.** Endpoint may be slow under cold cache, large history, or upstream provider call (if it queries provider records rather than local mirror). Worth measuring p50 / p95 latency.
- **Frontend wait condition too strict.** Smoke harness may wait on a specific DOM marker or network-idle condition that is sensitive to slow hydration. A real user would likely see a loading state and recover; the smoke harness does not.

Other lower-likelihood factors to keep in mind:

- Firebase Admin token verification path delays on cold start.
- Mongo connection pool warm-up on a freshly woken dyno.
- Transient network blip between Vercel and Render.

## 4. Suggested next checks

In order:

1. **Rerun billing smoke after backend warmup.**
   - Hit a cheap backend health endpoint first to warm the dyno.
   - Rerun `npm run smoke:prod:quick`.
   - If `/billing/plan` now passes, primary cause is cold start.
2. **Inspect Render logs around the failed run.**
   - Look for cold-start markers, Firebase Admin init time, Mongo connect time.
   - Look for slow query / slow handler logs on `payment-history`.
3. **Inspect `payment-history` endpoint latency.**
   - Measure p50 / p95 server-side handler time on warm and cold dynos.
   - Check whether the endpoint hits the provider live or reads a local mirror; prefer local mirror for hot-path reads.
4. **Decide whether to adjust smoke timeout or improve loading state.**
   - If cold start is unavoidable on the deploy tier: extend smoke timeout for the billing step, or add an explicit warmup step in `smoke:prod:quick`.
   - If hydration timing is fragile: improve frontend loading state so the wait condition resolves on a stable signal (e.g. data-attribute on the hydrated section) rather than network-idle.
   - If endpoint latency is the root cause: optimize the query / cache the response, do not paper over with a longer timeout.

## 5. Impact on 12-week setup limited rollout

- **No block** on the 12-week setup limited rollout from this billing failure.
- Reassess only if either of the following becomes true:
  - The billing failure becomes user-visible in real-mode production (users report payment history not loading, paywall hangs, or upgrade flow stalls on `/billing/plan`).
  - A direct link is established between this billing failure and release `d8b35b71` (e.g. shared dependency, shared bundle change, or shared backend deploy artifact).
- Otherwise, continue to track this in the billing surface follow-up. Limited rollout monitoring for the 12-week setup proceeds per `docs/ux/12-week-setup-limited-rollout-monitoring.md`.
