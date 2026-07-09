# Public Checkout Order Claim

## Scope

Core billing/auth behavior for linking a paid public checkout order (`userId` starts with `public:`) to a signed-in Firebase user.

This must not grant entitlements from the checkout session response. It may only transfer already-confirmed billing records created by provider/webhook completion.

## Acceptance Criteria

- WHEN an unauthenticated request calls `POST /api/billing/orders/:orderId/claim`, THE system SHALL return `401`.
- WHEN the authenticated user's email is not verified, THE system SHALL return `403` before claiming the order.
- WHEN `orderId` is malformed, THE system SHALL return `400 invalid_order_id` before database lookup.
- WHEN the order does not exist, THE system SHALL return `404 order_not_found`.
- WHEN the order is already linked to a non-public user, THE system SHALL return `400 order_already_claimed`.
- WHEN the order is not `completed`, THE system SHALL return `400 order_not_completed`.
- WHEN the order purpose is `physical_order`, THE system SHALL return `400 physical_order_not_claimable`.
- WHEN the public order has `receiptEmail`, THE authenticated Firebase email SHALL be present and match case-insensitively.
- WHEN the public order has no `receiptEmail`, THE system SHALL reject automatic claim and direct the user to support/manual reconciliation.
- WHEN a completed public PLUS order is claimed by the matching verified user, THE system SHALL transfer the `PaymentOrder.userId` and matching `BillingSubscription.userId` from the old `public:*` id to the Firebase uid.
- WHEN transferring subscription ownership, THE system SHALL update only the subscription matching the claimed payment order (`provider` + `providerSubscriptionId`/`orderId`), not every subscription under the public browser id.
- WHEN subscription migration fails or the matching subscription is missing, THE system SHALL leave the `PaymentOrder.userId` unchanged so the user can retry or support can reconcile manually.
- WHEN a matching verified user retries a claim for an order already linked to their Firebase uid, THE system SHALL return the current entitlement snapshot instead of rejecting the retry as already claimed.
- AFTER a successful claim, THE response SHALL include an entitlement snapshot resolved for the Firebase uid.

## Non-Goals

- Do not create or complete payment orders.
- Do not unlock entitlements directly from checkout-session data.
- Do not change provider webhook behavior.
- Do not change payment, subscription, or localStorage data shapes.
