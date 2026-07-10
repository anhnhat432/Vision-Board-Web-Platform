# PayOS Reconciliation Evidence Profile

## 1. Context & Goal

- Feature: show an administrator a reusable, privacy-safe evidence profile after reconciling a completed PayOS order.
- Why now: a bare `Nội bộ` or `Nguồn ngoài` label is not enough evidence to explain the result during a project presentation.
- User impact: an administrator can show how the payer source was classified without exposing a complete bank-account number or changing billing state.
- Modes affected: `real` only; demo mode does not expose protected PayOS billing routes.

## 2. Surface Classification

- Type: Core.
- Touched domains: PayOS historical reconciliation, `PaymentOrder` safe payer metadata, protected Admin payment API, Admin payments UI.
- Existing invariants that must not break:
  - Only a verified provider webhook can complete an order or grant Plus access.
  - Viewing or reconciling evidence never changes order status, entitlement, amount, provider, or receipt state.
  - A full payer account number is never stored, returned, logged, exported, or displayed.

## 3. Actors & Entry Points

- Primary actor: authenticated administrator.
- Route: `/admin/payments`.
- API touchpoint: `POST /api/admin/billing/payment-orders/:orderId/reconcile-payer-source` and the payment-order list response.
- UI entry points: the `Đối chiếu PayOS` action and a `Xem chứng cứ` action for orders already reconciled.

## 4. Functional Requirements

1. WHEN an administrator successfully reconciles a completed PayOS order, THE system SHALL return and persist a safe evidence profile containing the source classification, masked payer name, masked account number, payer bank name, provider transaction reference, provider transaction time, and observation time.
2. WHERE the normalized payer account has at least eight characters, THE system SHALL show only the first three and final four characters in the account mask, for example `123****6789`; WHERE it has fewer than eight characters, THE system SHALL show only the final four characters, for example `****6789`.
3. WHEN the source classification is `internal`, THE UI SHALL state that the account matches the configured internal-account list; WHEN it is `external`, THE UI SHALL state that the account is not in that list; WHEN it is `unknown`, THE UI SHALL distinguish incomplete comparison configuration from missing PayOS payer data and retain every available safe evidence field.
4. WHEN an administrator opens evidence for a reconciled order, THE UI SHALL show a non-destructive dialog with the safe profile and the classification explanation.
5. WHILE older orders lack any newly added evidence field, THE UI SHALL render the available values and identify unavailable fields without retrying or changing the order.
6. WHEN PayOS returns only part of the payer profile, THE system SHALL retain and show every safe masked field that is available even if the source classification remains `unknown`.
7. WHEN PayOS omits all counter-account identity fields, THE UI SHALL explain that the provider did not supply payer-account details for that transaction and SHALL NOT fabricate or relabel the receiving account as the payer account.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization: none; all evidence fields are optional so historical `PaymentOrder` documents remain valid.
- backend model / API contract: `metadata.payos.payer` gains optional `accountMasked`, `transactionReference`, and `transactionDateTime` fields. The Admin list and reconciliation responses expose only those safe fields.
- sync ordering guarantees: reconciliation writes only safe evidence metadata after PayOS confirms one unambiguous paid transaction.
- rollback: the new fields may remain on existing orders; old application versions ignore them without affecting billing.

## 6. Non-functional Requirements

- accessibility: the dialog has a title, textual labels, and a close action; classification does not rely on color alone.
- observability / logging: no raw account number, raw PayOS transfer description, or secrets enter logs or audit events.
- security / privacy: account masking happens server-side from an in-memory normalized value; full account numbers never reach MongoDB, API responses, CSV exports, or the browser.

## 7. Out of Scope

- Proving a payer's legal identity, KYC, or asserting that `external` proves someone is a real customer.
- Showing a full bank-account number, phone number, address, device data, or IP address.
- Reconciling Casso or manual-payment payer identity through this PayOS-specific flow.

## 8. Acceptance Criteria

- [x] A successful PayOS reconciliation immediately shows a dialog with the safe evidence profile.
- [x] A reconciled order can reopen the same evidence profile after reload.
- [ ] An account with sufficient length is shown as `123****6789`, never in full.
- [ ] `internal`, `external`, and `unknown` explain their exact comparison meaning without claiming identity proof.
- [ ] Old records missing evidence fields remain readable and do not change billing state.
- [ ] Partial PayOS payer details remain visible in masked form even when comparison configuration is incomplete.
- [ ] A transaction with no PayOS counter-account details shows a provider-data limitation instead of repeated empty identity rows.
- [ ] The protected evidence API remains unavailable to non-admin users and demo mode does not expose the flow.
- [ ] Production acceptance: the real-mode Render backend has been deployed and an administrator has completed one real PayOS reconciliation. This repository evidence does not mark or claim the flow as production-verified.

## 9. Verification Plan

```bash
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend run test:run
npm.cmd run typecheck
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx
npm.cmd run build
```

## 10. Open Questions / Follow-ups

- The agreed account display format is `123****6789` where the account length permits it.
- Production source classification also requires `INTERNAL_PAYER_ACCOUNT_NUMBERS` in Render. `PAYMENT_PAYER_HASH_KEY` alone cannot distinguish an internal payer account from an external one.
