# PayOS Payer Source Classification

## 1. Context & Goal

- Feature: classify a completed PayOS payment as internal, external, or unknown from PayOS-originated payer account data.
- Why now: an order code and a user-created email do not distinguish a team member's test payment from a payment sent by an account outside the team.
- User impact: admins can inspect a privacy-preserving payer-source label and reconcile completed historical PayOS orders without changing billing entitlement state.
- Modes affected: `real` only. Demo mode has no PayOS checkout or protected Admin billing calls.

## 2. Surface Classification

- Type: Core.
- Touched domains: PayOS webhook metadata, `PaymentOrder`, protected Admin API, production environment configuration, Admin payments UI.
- Existing invariants that must not break:
  - Only a verified PayOS webhook may mark an order completed or grant a PLUS entitlement.
  - A reconciliation action may not change order status, entitlement, amount, provider, or receipt state.
  - No full payer account number is stored in MongoDB, returned by an API, logged, exported, or displayed.

## 3. Actors & Entry Points

- Primary actor: authenticated administrator.
- Secondary actor: PayOS webhook service.
- Route: `/admin/payments`.
- API touchpoints: verified PayOS webhook and `POST /api/admin/billing/payment-orders/:orderId/reconcile-payer-source`.

## 4. Functional Requirements

1. WHEN a verified successful PayOS webhook includes a payer account, THE system SHALL store only a keyed account hash, masked name, last four account characters, payer bank name, source classification, source origin, and observation time.
2. WHEN the normalized payer account matches a server-configured internal payer account, THE system SHALL classify the order as `internal`; WHEN it does not match, THE system SHALL classify it as `external`.
3. WHERE PayOS omits payer account data or the payer hash key is not configured, THE system SHALL classify the order as `unknown` and SHALL not infer a result.
4. WHEN an administrator reconciles a completed PayOS order, THE system SHALL retrieve the historical payment link by stored `paymentLinkId` or `orderCode`, update only payer-source metadata, and return a safe summary.
5. WHILE reconciling an order from another provider, a non-completed order, or a PayOS link without one unambiguous paid transaction, THE system SHALL reject the action without changing the order.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- backend model: `PaymentOrder.metadata.payos.payer` gains optional safe metadata; existing documents remain valid without migration.
- configuration: `PAYMENT_PAYER_HASH_KEY` and `INTERNAL_PAYER_ACCOUNT_NUMBERS` are server-only Render environment variables and are never committed.
- rollback: leaving either variable unset makes new and backfilled classifications `unknown`; it does not affect checkout, webhook completion, or Plus access.

## 6. Non-functional Requirements

- security / privacy: normalize account numbers in memory, use HMAC-SHA256 with a dedicated server secret, persist no full payer account number, and mask payer names in every Admin response.
- authorization: reconciliation is protected by the existing `requireAdmin` and audited admin-action wrapper.
- observability: provider retrieval failures are reported as a safe Admin error; payer details are not logged.
- accessibility: labels are textual and do not rely on color alone.

## 7. Out of Scope

- KYC, phone verification, fraud scoring, IP/device fingerprinting, payment-proof uploads, or claiming that an `external` classification proves a real customer.
- Backfilling Casso orders; it requires its own provider-specific reconciliation contract.
- Automatic billing completion from the reconciliation path.

## 8. Acceptance Criteria

- [ ] A valid webhook classifies a PayOS transaction against internal account configuration without storing the full payer account.
- [ ] Missing payer information or configuration is visible as `unknown`.
- [ ] A PayOS historical completed order can be reconciled from its stored link ID/order code without changing entitlement or completion state.
- [ ] The Admin payments table displays the safe label and can request per-order reconciliation.
- [ ] The protected action is unavailable to non-admin users and is not registered in demo mode through normal auth guards.

## 9. Verification Plan

```bash
npm --prefix backend run test:run -- --runInBand
npm --prefix backend run typecheck
npm --prefix backend run build
npm run typecheck
npm run lint
npm run test:run
npm run build
```

## 10. Deployment Follow-up

- Set `PAYMENT_PAYER_HASH_KEY` to a new random secret in Render.
- Set `INTERNAL_PAYER_ACCOUNT_NUMBERS` to a comma-separated list of team-owned payer accounts in Render; do not commit it.
- Reconcile historical PayOS orders from Admin after deploying and treat `external` as "not in the configured internal list", not identity verification.

## 11. Verification Results (2026-07-10)

- `npm.cmd --prefix backend run build` completed successfully.
- Focused backend PayOS tests passed: 24 tests, 0 failures.
- `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build` completed successfully.
- `npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx` passed: 2 tests, 0 failures.
- `npm.cmd run test:run -- --reporter=dot --silent` passed: 135 test files and 1,341 tests, 0 failures.
