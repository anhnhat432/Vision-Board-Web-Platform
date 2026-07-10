# PayOS Payer Source Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators distinguish configured internal payer accounts from other PayOS payer accounts for new and historical PayOS orders without persisting full bank account numbers.

**Architecture:** A small backend utility normalizes and HMAC-hashes PayOS counter-account data, then stores a safe payer summary beneath existing PayOS order metadata. The verified webhook calls the utility for new orders. A protected, audited Admin endpoint fetches an old payment link from PayOS, selects an unambiguous transaction, and writes the same safe metadata; the Admin table displays and refreshes the result.

**Tech Stack:** Express, TypeScript, Mongoose, `@payos/node`, React, Vitest.

## Global Constraints

- Preserve PayOS webhook as the only authority that completes an order or grants PLUS.
- Store no full payer account number in MongoDB, logs, UI, or CSV output.
- Use server-only `PAYMENT_PAYER_HASH_KEY` and `INTERNAL_PAYER_ACCOUNT_NUMBERS` configuration.
- Treat no payer data, missing configuration, and ambiguous historical transactions as `unknown`.

---

### Task 1: Payer-source utility and model contract

**Files:**
- Create: `backend/src/services/paymentPayerSource.ts`
- Create: `backend/src/tests/paymentPayerSource.test.ts`
- Modify: `backend/src/models/PaymentOrderModel.ts`
- Modify: `backend/.env.example`

- [ ] Write failing tests for normalization, masked output, internal/external/unknown classification, and no raw account field.
- [ ] Implement the pure HMAC and classification utility using only server environment values.
- [ ] Add optional typed `metadata.payos.payer` fields with no schema migration requirement.
- [ ] Run the focused backend test until green.

### Task 2: New orders and historical PayOS reconciliation

**Files:**
- Modify: `backend/src/services/payosPaymentAdapter.ts`
- Modify: `backend/src/controllers/payosWebhookController.ts`
- Modify: `backend/src/controllers/adminController.ts`
- Modify: `backend/src/routes/adminRoutes.ts`
- Modify: `backend/src/tests/payosWebhookController.test.ts`
- Create: `backend/src/tests/adminPayosPayerReconciliation.test.ts`

- [ ] Write failing tests for webhook payer persistence and a reconciliation request that cannot complete an order.
- [ ] Add a typed PayOS link lookup that uses stored link ID then order code and selects exactly one full-value transaction.
- [ ] Persist safe payer metadata from verified webhooks and add the authenticated audited Admin reconciliation endpoint.
- [ ] Run focused backend tests and backend typecheck.

### Task 3: Admin payment visibility and action

**Files:**
- Modify: `src/services/adminService.ts`
- Modify: `src/app/pages/AdminPaymentsPage.tsx`
- Modify: `src/app/pages/AdminPaymentsPage.dialog.test.tsx`

- [ ] Write failing UI tests for the source label and successful per-order reconciliation refresh.
- [ ] Add safe payer-source types, Admin API call, text labels, and an accessible reconciliation button for PayOS completed orders.
- [ ] Keep manual completion and CSV output unchanged so no sensitive payer data is exported.
- [ ] Run focused frontend tests and typecheck.

### Task 4: Verify and document deployment

**Files:**
- Modify: `docs/specs/PAYOS_PAYER_SOURCE_CLASSIFICATION.md`

- [ ] Run the specified backend and frontend verification commands.
- [ ] Record only actual verification results and required Render environment variables in the final delivery.
