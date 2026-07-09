# Public contact route and login heading checklist

## Classification

Mixed: public/legal route availability is production-facing and payment-adjacent, while the login heading change is shell-level accessibility cleanup.

## Contract

- WHEN a user opens `/contact`, THE system SHALL render a public support page instead of the app error boundary.
- WHEN a user needs help before or after payment, THE system SHALL expose the configured support email without requiring sign-in.
- WHERE the support email env var is absent, THE system SHALL keep the existing fallback support address.
- WHEN `/login` renders responsive hero content, THE system SHALL expose one document-level `<h1>` while preserving the desktop and mobile visual titles.
- THE system SHALL NOT change auth redirects, billing entitlement behavior, payment provider contracts, storage keys, or local-first data semantics.

## Verification

- Add route/component regression tests before implementation.
- Run targeted UI tests for routes and login.
- Run frontend `typecheck`, `lint`, `test:run`, and `build`.
- Re-run preview route sanity for `/contact` and `/login`.
