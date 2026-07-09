# Billing manual completion safety

Surface: Core billing/admin behavior.

## Acceptance

- WHEN an admin manually completes a PLUS subscription payment order, THE system SHALL keep the existing manual completion behavior and grant the matching PLUS subscription.
- WHEN an admin attempts to manually complete a `physical_order` payment order through the subscription payment recovery action, THE system SHALL reject the action before subscription creation and before mutating the order.
- WHEN an anonymous public PLUS checkout session is created, THE system SHALL require a valid `receiptEmail` so the completed public order can later be claimed by a verified account with the same email.
- WHILE these guards run, THE system SHALL preserve existing order IDs, storage shapes, provider contracts, and webhook behavior.

## Verification

- `node --test backend/dist/tests/adminController.test.js`
- `node --test backend/dist/tests/billingRoutes.test.js`
