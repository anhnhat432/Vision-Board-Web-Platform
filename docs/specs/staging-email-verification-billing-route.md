# Feature: Staging email verification billing-route access

Status: Implemented
Risk: Medium

## Context and goal

The Email Verification staging proof creates a fresh unverified account and returns it to `/billing/plan`. After profile bootstrap, the first-time onboarding guard redirected that route to `/onboarding`, detaching the billing CTA before the proof could validate checkout availability.

## Business rules

- `BILLING-ROUTE-01`: `/billing/plan` remains a public billing surface even when a signed-in account has not completed onboarding.
- `BILLING-ROUTE-02`: Fresh signed-in users still enter onboarding when they visit ordinary workspace routes such as `/goals`.
- `BILLING-ROUTE-03`: This change does not bypass authentication, email verification, paid-checkout controls, or entitlement confirmation.

## Acceptance criteria

- WHEN a signed-in fresh account opens `/billing/plan`, THE system SHALL keep the user on `/billing/plan`.
- WHEN a signed-in fresh account opens a non-public workspace route, THE system SHALL redirect the user to `/onboarding` under the existing guard rules.
- THE system SHALL preserve the current checkout and email-verification assertions.

## Test mapping

- `src/app/components/RootLayout.test.tsx`: keeps the public billing plan reachable for signed-in users before onboarding.
- `src/app/components/RootLayout.test.tsx`: sends signed-in users to onboarding when setup is incomplete.

## Out of scope

- Billing provider behavior, entitlement activation, Firebase verification, onboarding content, and E2E timeout changes.
