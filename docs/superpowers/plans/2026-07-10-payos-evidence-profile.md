# PayOS Reconciliation Evidence Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an Admin reopen a privacy-safe PayOS reconciliation profile that explains whether a payer account is internal, external, or unknown.

**Architecture:** The backend derives a partial account mask from the in-memory PayOS payer account and persists only safe evidence fields in `PaymentOrder.metadata.payos.payer`. The protected Admin list and reconciliation responses serialize these fields; the Admin payments page opens a reusable Dialog after reconciliation and from a `Xem chứng cứ` control on already reconciled rows.

**Tech Stack:** Express, TypeScript, Mongoose, React 18, TypeScript, Radix Dialog, Vitest, Node test runner.

## Global Constraints

- Apply only to real-mode protected Admin PayOS payment flows; demo mode has no protected billing route.
- Never store, return, log, export, or render a full payer account number.
- Account masking is server-side: use `123****6789` only when the normalized account has at least eight characters; otherwise use `****6789`.
- `internal` means the account matches `INTERNAL_PAYER_ACCOUNT_NUMBERS`; `external` means it does not match that configured list and is not identity proof.
- Evidence actions never alter payment status, amount, provider, entitlement, receipt state, or localStorage.
- Keep `.kiro/specs/library-page-ui-alignment/` untracked and never stage it.

---

### Task 1: Produce a safe payer account mask

**Files:**
- Modify: `backend/src/services/paymentPayerSource.ts:16-85`
- Modify: `backend/src/tests/paymentPayerSource.test.ts:1-55`

**Interfaces:**
- Consumes: `PayosPayerInput.accountNumber` and existing `normalizeAccountNumber`.
- Produces: `PaymentPayerSourceSummary.accountMasked?: string` alongside `accountHash`, `accountLast4`, masked name, and bank name.

- [ ] **Step 1: Write the failing tests for the safe mask**

```ts
assert.equal(result.accountMasked, "012****6789");
assert.equal(JSON.stringify(result).includes("0123456789"), false);

const shortResult = classifyPayosPayerSource(
  { accountNumber: "1234567" },
  { hashKey: "test-hash-key", internalAccountNumbers: "1234567" },
);
assert.equal(shortResult.accountMasked, "****4567");
```

- [ ] **Step 2: Run the focused test and verify the mask assertion fails**

Run: `npm.cmd --prefix backend run build` then `node --test backend/dist/tests/paymentPayerSource.test.js`

Expected: FAIL because `accountMasked` is undefined.

- [ ] **Step 3: Add the minimal server-side mask helper and field**

```ts
function maskAccountNumber(value: string): string {
  if (value.length < 8) return `****${value.slice(-4)}`;
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

export interface PaymentPayerSourceSummary {
  classification: PaymentPayerSourceClassification;
  accountHash?: string;
  accountLast4?: string;
  accountMasked?: string;
  accountNameMasked?: string;
  bankName?: string;
}
```

Add `accountMasked: maskAccountNumber(accountNumber)` only on the path that already has a normalized account number and configuration. Keep the existing `unknown` return unchanged.

- [ ] **Step 4: Re-run the focused test**

Run: `npm.cmd --prefix backend run build` then `node --test backend/dist/tests/paymentPayerSource.test.js`

Expected: PASS with no full account number in serialized results.

- [ ] **Step 5: Commit the safe masking utility**

```bash
git add backend/src/services/paymentPayerSource.ts backend/src/tests/paymentPayerSource.test.ts
git commit -m "feat(billing): add masked PayOS payer account evidence"
```

### Task 2: Persist and serialize reconciliation evidence

**Files:**
- Modify: `backend/src/models/PaymentOrderModel.ts:52-112`
- Modify: `backend/src/controllers/adminController.ts:172-209`
- Modify: `backend/src/controllers/adminController.ts:408-466`
- Modify: `backend/src/tests/adminController.test.ts:90-170`

**Interfaces:**
- Consumes: `PayosPayerReconciliationResult` with `payer`, `transactionReference`, and `transactionDateTime`.
- Produces: `AdminPaymentPayerSummary` and the Admin API payer shape with optional `accountMasked`, `transactionReference`, and `transactionDateTime`.

- [ ] **Step 1: Write a failing controller test for the persisted and returned evidence**

```ts
assert.deepEqual((response.body as { data: { payer: unknown } }).data.payer, {
  classification: "external",
  accountLast4: "6789",
  accountMasked: "012****6789",
  accountNameMasked: "N*** V*** A***",
  bankName: "MB Bank",
  transactionReference: "TF_PAYOS_1",
  transactionDateTime: "2026-07-10 10:00:00",
  source: "reconciliation",
  observedAt: expect.any(String),
});
```

Also assert the mocked order's saved `metadata.payos.payer` has the same safe evidence and `JSON.stringify(savedMetadata)` does not contain `0123456789`.

- [ ] **Step 2: Run the focused controller test and verify it fails**

Run: `npm.cmd --prefix backend run build` then `node --test backend/dist/tests/adminController.test.js`

Expected: FAIL because the controller drops the transaction fields and does not serialize `accountMasked`.

- [ ] **Step 3: Extend the optional Mongoose/API evidence shape and write it during reconciliation**

```ts
payer: {
  classification: PaymentPayerSourceClassification;
  accountHash?: string;
  accountLast4?: string;
  accountMasked?: string;
  accountNameMasked?: string;
  bankName?: string;
  transactionReference?: string;
  transactionDateTime?: string;
  source: "webhook" | "reconciliation";
  observedAt: Date;
}
```

In `reconcileAdminPaymentOrderPayerSource`, persist and serialize only:

```ts
{
  ...result.payer,
  transactionReference: result.transactionReference,
  transactionDateTime: result.transactionDateTime,
  source: "reconciliation",
  observedAt,
}
```

Update `serializePaymentPayer` to allowlist every safe field above. Do not add account hashes, descriptions, or raw provider payload fields to the response.

- [ ] **Step 4: Re-run focused tests**

Run: `npm.cmd --prefix backend run build` then `node --test backend/dist/tests/adminController.test.js backend/dist/tests/payosPayerReconciliation.test.js backend/dist/tests/paymentPayerSource.test.js`

Expected: PASS; successful reconciliation returns and persists only masked evidence.

- [ ] **Step 5: Commit the API contract**

```bash
git add backend/src/models/PaymentOrderModel.ts backend/src/controllers/adminController.ts backend/src/tests/adminController.test.ts
git commit -m "feat(billing): persist PayOS reconciliation evidence"
```

### Task 2a: Remove raw PayOS values from persistence and legacy exports

**Files:**
- Modify: `backend/src/controllers/payosWebhookController.ts`
- Modify: `backend/src/models/PaymentOrderModel.ts`
- Modify: `backend/src/controllers/accountController.ts`
- Modify: `backend/src/tests/payosWebhookController.test.ts`
- Modify: `backend/src/tests/accountRoutes.test.ts`

**Root cause:** The webhook persisted PayOS `data.desc` in `metadata.payos.webhookDescription`, while account export returned entire legacy `PaymentOrder` documents. Legacy data could therefore export an account hash or raw PayOS fields even after the reconciliation route was allowlisted.

- [ ] **Step 1: Write failing regressions**

Assert a successful webhook does not persist its raw `data.desc`; seed a legacy payment order whose PayOS metadata contains `accountHash`, a full account number, and raw webhook text; assert the account-export JSON excludes all three while retaining only safe payer evidence.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd --prefix backend run build` then `node --test backend/dist/tests/payosWebhookController.test.js backend/dist/tests/accountRoutes.test.js`

Expected: FAIL because the webhook still writes `webhookDescription` and account export returns whole payment-order metadata.

- [ ] **Step 3: Implement source and export allowlists**

Remove the `metadata.payos.webhookDescription` writes and type. Serialize PayOS metadata for account export with explicit fields only: `orderCode`, `paymentLinkId`, `status`, `webhookReference`, `webhookCode`, `transactionDateTime`, and a payer object containing only `classification`, `accountLast4`, `accountMasked`, `accountNameMasked`, `bankName`, `transactionReference`, `transactionDateTime`, `source`, and `observedAt`.

Do not pass through arbitrary PayOS metadata. Keep `PaymentOrder.description`: it is the application-generated order identifier required for transfer instructions, not PayOS `data.desc`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm.cmd --prefix backend run build` then `node --test backend/dist/tests/payosWebhookController.test.js backend/dist/tests/accountRoutes.test.js`

Commit only the five files above with `fix(billing): redact raw PayOS export metadata`.

### Task 3: Show a reusable Admin evidence dialog

**Files:**
- Modify: `src/services/adminService.ts:57-64`
- Modify: `src/app/pages/AdminPaymentsPage.tsx:1-70`
- Modify: `src/app/pages/AdminPaymentsPage.tsx:73-196`
- Modify: `src/app/pages/AdminPaymentsPage.tsx:335-381`
- Modify: `src/app/pages/AdminPaymentsPage.dialog.test.tsx:1-210`

**Interfaces:**
- Consumes: `AdminPaymentPayerSource` with optional `accountMasked`, `transactionReference`, and `transactionDateTime` from Task 2.
- Produces: a `Dialog` titled `Hồ sơ đối chiếu PayOS`, opened after reconciliation and from `Xem chứng cứ` for a payer with `source === "reconciliation"`.

- [ ] **Step 1: Write the failing UI test for immediate and reopened evidence**

```tsx
await user.click(screen.getByRole("button", { name: "Đối chiếu PayOS" }));
expect(await screen.findByRole("dialog", { name: "Hồ sơ đối chiếu PayOS" })).toBeInTheDocument();
expect(screen.getByText("Nguồn ngoài")).toBeInTheDocument();
expect(screen.getByText("012****6789")).toBeInTheDocument();
expect(screen.getByText("MB Bank")).toBeInTheDocument();
expect(screen.getByText("TF_PAYOS_1")).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: "Đóng" }));
await user.click(screen.getByRole("button", { name: "Xem chứng cứ" }));
expect(await screen.findByRole("dialog", { name: "Hồ sơ đối chiếu PayOS" })).toBeInTheDocument();
```

Seed `accountMasked`, `transactionReference`, and `transactionDateTime` in the mocked reconciliation response. Add a separate old-order assertion that missing fields render `Không có dữ liệu` rather than throwing.

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run: `npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx`

Expected: FAIL because the page has no evidence dialog or `Xem chứng cứ` control.

- [ ] **Step 3: Add typed evidence state, a safe Dialog, and a reopen control**

```tsx
const [evidencePayment, setEvidencePayment] = useState<AdminPaymentOrderSummary | null>(null);

const evidenceRows = [
  ["Kết quả", PAYER_SOURCE_LABELS[payer.classification]],
  ["Chủ tài khoản", payer.accountNameMasked ?? "Không có dữ liệu"],
  ["Số tài khoản", payer.accountMasked ?? (payer.accountLast4 ? `****${payer.accountLast4}` : "Không có dữ liệu")],
  ["Ngân hàng", payer.bankName ?? "Không có dữ liệu"],
  ["Mã giao dịch PayOS", payer.transactionReference ?? "Không có dữ liệu"],
  ["Thời gian PayOS xác nhận", payer.transactionDateTime ?? "Không có dữ liệu"],
];
```

After a successful reconciliation, update the row's payer, set `evidencePayment` to that updated row, and retain the concise success toast. Import the existing non-destructive `Dialog` components. Render `Xem chứng cứ` in the visible `Nguồn tiền` cell only for `payer.source === "reconciliation"`; use a regular `Button` with accessible text. The dialog must say that the classification compares against the configured internal-account list and does not prove payer identity.

- [ ] **Step 4: Re-run the focused UI test**

Run: `npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx`

Expected: PASS with the safe fields visible, missing values handled, and the dialog reopening from the row.

- [ ] **Step 5: Commit the Admin presentation surface**

```bash
git add src/services/adminService.ts src/app/pages/AdminPaymentsPage.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx
git commit -m "feat(admin): show PayOS reconciliation evidence"
```

### Task 4: Verify integration and publish safely

**Files:**
- Modify: `docs/specs/PAYOS_PAYER_RECONCILIATION_EVIDENCE.md:56-61`

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verified source and an updated acceptance checklist; no new runtime interface.

- [ ] **Step 1: Mark only verified acceptance criteria complete**

```md
- [x] A successful PayOS reconciliation immediately shows a dialog with the safe evidence profile.
- [x] A reconciled order can reopen the same evidence profile after reload.
```

Leave production-only deployment verification unchecked until Render has deployed and an Admin completes a real reconciliation.

- [ ] **Step 2: Run backend verification**

Run: `npm.cmd --prefix backend run typecheck` and `npm.cmd --prefix backend run test:run`

Expected: both commands exit 0.

- [ ] **Step 3: Run frontend verification**

Run: `npm.cmd run typecheck`, `npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.dialog.test.tsx`, and `npm.cmd run build`

Expected: all commands exit 0.

- [ ] **Step 4: Check the staged patch before publishing**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors; `.kiro/specs/library-page-ui-alignment/` remains untracked and unstaged.

- [ ] **Step 5: Commit and push only this feature's files**

```bash
git add docs/specs/PAYOS_PAYER_RECONCILIATION_EVIDENCE.md
git commit -m "docs(billing): verify PayOS evidence profile"
git push origin main
```

Do not use `git add .`.
