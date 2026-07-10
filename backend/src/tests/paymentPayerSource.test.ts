import assert from "node:assert/strict";
import test from "node:test";

import { classifyPayosPayerSource } from "../services/paymentPayerSource";

test("classifies a configured team account without retaining its full number", () => {
  const result = classifyPayosPayerSource(
    {
      accountNumber: " 0123-456-789 ",
      accountName: "NGUYEN VAN A",
      bankName: "MB Bank",
    },
    {
      hashKey: "test-hash-key",
      internalAccountNumbers: "0123456789, 99887766",
    },
  );

  assert.equal(result.classification, "internal");
  assert.match(result.accountHash ?? "", /^[a-f0-9]{64}$/);
  assert.equal(result.accountLast4, "6789");
  assert.equal(result.accountNameMasked, "N*** V*** A***");
  assert.equal(result.bankName, "MB Bank");
  assert.equal(JSON.stringify(result).includes("0123456789"), false);
});

test("classifies a non-team payer account as external", () => {
  const result = classifyPayosPayerSource(
    { accountNumber: "9876543210", accountName: "TRAN THI B", bankName: "ACB" },
    { hashKey: "test-hash-key", internalAccountNumbers: "0123456789" },
  );

  assert.equal(result.classification, "external");
  assert.equal(result.accountLast4, "3210");
  assert.equal(result.accountNameMasked, "T*** T*** B***");
});

test("keeps the classification unknown when PayOS omits the payer account or the hash key is unavailable", () => {
  assert.deepEqual(
    classifyPayosPayerSource(
      { accountNumber: null, accountName: "TRAN THI B", bankName: "ACB" },
      { hashKey: "test-hash-key", internalAccountNumbers: "0123456789" },
    ),
    { classification: "unknown" },
  );

  assert.deepEqual(
    classifyPayosPayerSource(
      { accountNumber: "9876543210", accountName: "TRAN THI B", bankName: "ACB" },
      { hashKey: "", internalAccountNumbers: "0123456789" },
    ),
    { classification: "unknown" },
  );

  assert.deepEqual(
    classifyPayosPayerSource(
      { accountNumber: "9876543210", accountName: "TRAN THI B", bankName: "ACB" },
      { hashKey: "test-hash-key", internalAccountNumbers: "" },
    ),
    { classification: "unknown" },
  );
});
