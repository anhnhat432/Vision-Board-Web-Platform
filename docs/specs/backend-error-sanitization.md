# Backend Error Sanitization

Surface classification: Core. API error payloads are consumed by real-mode billing, auth, sync, and account flows.

Acceptance checklist:

- WHEN production receives an internal `ApiError` with status 5xx, THE system SHALL return a safe user-facing message and keep raw details in logs/Sentry only.
- WHEN production returns a 5xx API error, THE system SHALL omit `details` from the JSON response unless the error is an explicitly safe business state.
- WHEN a client needs diagnostics, THE system SHALL preserve `errorCode` so frontend code can branch without parsing raw internal messages.
- WHEN validation, authorization, conflict, or not-found errors use 4xx status codes, THE system SHALL preserve the existing API message/details contract.
- WHEN paid checkout is intentionally disabled, THE system SHALL preserve the existing customer-facing maintenance message.
