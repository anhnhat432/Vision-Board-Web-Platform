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
  assert.equal(result.accountMasked, "012****6789");
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

test("masks an external payer account without retaining its full number", () => {
  const accountNumber = "9876543210";
  const result = classifyPayosPayerSource(
    { accountNumber },
    { hashKey: "test-hash-key", internalAccountNumbers: "0123456789" },
  );

  assert.equal(result.classification, "external");
  assert.equal(result.accountMasked, "987****3210");
  assert.equal(JSON.stringify(result).includes(accountNumber), false);
});

test("masks short payer accounts without retaining their full number", () => {
  const result = classifyPayosPayerSource(
    { accountNumber: "1234567" },
    { hashKey: "test-hash-key", internalAccountNumbers: "1234567" },
  );

  assert.equal(result.accountMasked, "****4567");
  assert.equal(JSON.stringify(result).includes("1234567"), false);
});

test("does not expose a four-character payer account", () => {
  const accountNumber = "1234";
  const result = classifyPayosPayerSource(
    { accountNumber },
    { hashKey: "test-hash-key", internalAccountNumbers: accountNumber },
  );

  assert.equal(result.accountLast4, undefined);
  assert.equal(result.accountMasked, "****");
  assert.equal(JSON.stringify(result).includes(accountNumber), false);
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
