# Billing Webhook Completion After Entitlement

## Surface

Core: billing webhook handling, entitlement authority, payment order status.

## Acceptance Criteria

- WHEN a Casso or PayOS webhook confirms a PLUS payment, THE system SHALL grant or confirm the subscription entitlement before marking the local `PaymentOrder` as `completed`.
- WHEN subscription entitlement upsert fails after a valid provider webhook, THE system SHALL return a retryable error and leave the `PaymentOrder` retryable instead of permanently treating it as completed.
- WHEN the provider retries the same successful webhook after a transient entitlement failure, THE system SHALL attempt the entitlement upsert again and then mark the matching `PaymentOrder` as `completed`.
- WHEN a webhook replay arrives after a `PaymentOrder` is already completed, THE system SHALL remain idempotent and SHALL NOT grant PLUS twice.
- WHERE physical orders use the same webhook controllers, THE system SHALL preserve the existing physical-order confirmation behavior and only mark the payment order completed after the physical order side effect has succeeded or is already confirmed.

## Non-goals

- Do not change plan prices, plan codes, billing cycles, provider selection, checkout creation, receipt copy, or customer portal behavior.
- Do not add a new persisted payment-order status in this batch.
- Do not open paid checkout kill switches.

## Verification

- `npm --prefix backend run build`
- `node --test dist/tests/cassoWebhook.replay.test.js dist/tests/payosWebhookController.test.js`
- `npm --prefix backend run typecheck`
