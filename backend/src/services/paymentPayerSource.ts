import { createHmac } from "node:crypto";

export type PaymentPayerSourceClassification = "internal" | "external" | "unknown";

export interface PayosPayerInput {
  accountNumber?: string | null;
  accountName?: string | null;
  bankName?: string | null;
}

export interface PaymentPayerSourceConfig {
  hashKey?: string | null;
  internalAccountNumbers?: string | null;
}

export interface PaymentPayerSourceSummary {
  classification: PaymentPayerSourceClassification;
  accountHash?: string;
  accountLast4?: string;
  accountMasked?: string;
  accountNameMasked?: string;
  bankName?: string;
}

export function getPaymentPayerSourceConfig(): PaymentPayerSourceConfig {
  return {
    hashKey: process.env.PAYMENT_PAYER_HASH_KEY,
    internalAccountNumbers: process.env.INTERNAL_PAYER_ACCOUNT_NUMBERS,
  };
}

function normalizeAccountNumber(value: string | null | undefined): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return normalized.length >= 4 ? normalized : null;
}

function maskAccountNumber(value: string): string {
  if (value.length <= 4) return "****";
  if (value.length < 8) return `****${value.slice(-4)}`;
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function maskAccountName(value: string | null | undefined): string | undefined {
  const parts = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((part) => `${part.slice(0, 1).toUpperCase()}***`).join(" ");
}

function normalizeBankName(value: string | null | undefined): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

function createAccountHash(accountNumber: string, hashKey: string): string {
  return createHmac("sha256", hashKey).update(`payos-payer-account:${accountNumber}`).digest("hex");
}

function getInternalAccountNumbers(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((accountNumber) => normalizeAccountNumber(accountNumber))
    .filter((accountNumber): accountNumber is string => Boolean(accountNumber));
}

export function classifyPayosPayerSource(
  input: PayosPayerInput,
  config: PaymentPayerSourceConfig = getPaymentPayerSourceConfig(),
): PaymentPayerSourceSummary {
  const accountNumber = normalizeAccountNumber(input.accountNumber);
  const hashKey = config.hashKey?.trim() ?? "";
  const internalAccountNumbers = getInternalAccountNumbers(config.internalAccountNumbers);

  if (!accountNumber || !hashKey || internalAccountNumbers.length === 0) {
    return { classification: "unknown" };
  }

  const accountHash = createAccountHash(accountNumber, hashKey);
  const internalAccountHashes = new Set(internalAccountNumbers.map((item) => createAccountHash(item, hashKey)));

  return {
    classification: internalAccountHashes.has(accountHash) ? "internal" : "external",
    accountHash,
    ...(accountNumber.length > 4 ? { accountLast4: accountNumber.slice(-4) } : {}),
    accountMasked: maskAccountNumber(accountNumber),
    accountNameMasked: maskAccountName(input.accountName),
    bankName: normalizeBankName(input.bankName),
  };
}
