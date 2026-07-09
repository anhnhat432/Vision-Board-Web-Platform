# CodeQL: `js/clear-text-storage-of-sensitive-data` — accepted and excluded

Last updated: 2026-07-10

## Decision

The CodeQL query `js/clear-text-storage-of-sensitive-data` is excluded via
`.github/codeql/codeql-config.yml` (referenced from `.github/workflows/codeql.yml`).

## Context

The app is **local-first by design** (see `AGENTS.md`: "LocalStorage is the
primary UX source of truth"). `UserData` — including billing/entitlement fields —
is persisted to `localStorage` and read back across the whole app. As a result,
almost every module that calls `saveUserData`/`updateGoal` becomes a CodeQL
"sink", producing 30+ alerts spread across unrelated files whenever any of those
files is edited (CodeQL re-attributes pre-existing alerts to a PR when nearby
lines shift).

## Why this is not a real vulnerability

The data the rule flags is billing metadata:

- `BillingCycle` — a plan cadence enum (`monthly`, `yearly`, ...).
- `PricingPlanCode` and `SubscriptionStatus` — plan tier / state.
- `entitlements` — which features are unlocked.
- `externalCustomerId` / `externalSubscriptionId` — provider reference ids.

None of this is a genuine secret:

- No auth tokens, passwords, or card / PAN / CVV values are stored in
  `localStorage`. Firebase auth tokens are managed by the Firebase SDK
  (IndexedDB), not this store.
- Client-side encryption of `localStorage` would **not** add real security,
  because the decryption key must be available to the browser/JS bundle. It would
  only silence the scanner while breaking local-first storage compatibility
  (which `AGENTS.md` explicitly protects) and adding migration risk.

## Residual risk and compensating controls

- Genuine secret leakage into the repo is covered by **Gitleaks**.
- The team must not start storing real secrets (tokens, passwords, payment
  instrument data) in `localStorage`. Because this rule is excluded, such a
  regression would not be caught by CodeQL — it must be caught in review.

## Optional follow-up (not done here)

Stop persisting `externalCustomerId` / `externalSubscriptionId` to `localStorage`
(they are server-owned references re-fetchable via entitlement sync). This is a
minor surface reduction but touches billing reconciliation in
`src/app/utils/production/billingCore.ts` (carry-forward of previous ids), so it
should be scoped as its own change with focused tests before implementing.
