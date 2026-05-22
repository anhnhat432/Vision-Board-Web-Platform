import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateBackendEnv, summarizeEnvIssues } from "../config/envValidation";

const FAKE_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\\nMIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAlMVbi2TSRbVF\\n-----END PRIVATE KEY-----\\n";

function baseProductionEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    PORT: "4000",
    MONGODB_URI: "mongodb+srv://user:pwd@cluster0.example.mongodb.net/vision_board",
    FIREBASE_PROJECT_ID: "vision-board-prod",
    FIREBASE_CLIENT_EMAIL: "firebase-adminsdk-xxxx@vision-board-prod.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: FAKE_PRIVATE_KEY,
    FRONTEND_ORIGIN: "https://app.example.com",
    BILLING_REPOSITORY: "mongo",
    SENTRY_DSN: "https://example@o0.ingest.sentry.io/0",
    BILLING_SUPPORT_EMAIL: "support@example.com",
  };
}

describe("validateBackendEnv: production core requirements", () => {
  it("returns no errors when production env is fully configured", () => {
    const issues = validateBackendEnv(baseProductionEnv(), { nodeEnv: "production" });
    const errors = issues.filter((issue) => issue.level === "error");
    assert.deepEqual(errors, []);
  });

  it("flags missing required core variables for an empty production env", () => {
    const issues = validateBackendEnv({}, { nodeEnv: "production" });

    const missingKeys = issues
      .filter((issue) => issue.level === "error")
      .map((issue) => issue.key);

    for (const key of [
      "MONGODB_URI",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "FRONTEND_ORIGIN",
    ]) {
      assert.ok(missingKeys.includes(key), `expected ${key} to be reported as missing`);
    }
  });

  it("rejects http frontend origin in production", () => {
    const env = baseProductionEnv();
    env.FRONTEND_ORIGIN = "http://app.example.com";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const offending = issues.find((issue) => issue.key === "FRONTEND_ORIGIN" && issue.level === "error");
    assert.ok(offending, "expected FRONTEND_ORIGIN error for http in production");
  });

  it("rejects wildcard frontend origin", () => {
    const env = baseProductionEnv();
    env.FRONTEND_ORIGIN = "*";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const wildcardIssue = issues.find((issue) => issue.key === "FRONTEND_ORIGIN" && /wildcard/i.test(issue.message));
    assert.ok(wildcardIssue, "expected wildcard FRONTEND_ORIGIN error");
  });

  it("rejects FRONTEND_ORIGIN with path/query/hash", () => {
    const env = baseProductionEnv();
    env.FRONTEND_ORIGIN = "https://app.example.com/dashboard";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const offending = issues.find((issue) => issue.key === "FRONTEND_ORIGIN" && /origin only/i.test(issue.message));
    assert.ok(offending, "expected FRONTEND_ORIGIN path-only error");
  });

  it("rejects malformed FIREBASE_PRIVATE_KEY without PEM markers", () => {
    const env = baseProductionEnv();
    env.FIREBASE_PRIVATE_KEY = "not-a-pem-key";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const pemIssue = issues.find((issue) => issue.key === "FIREBASE_PRIVATE_KEY");
    assert.ok(pemIssue, "expected FIREBASE_PRIVATE_KEY error for malformed PEM");
    assert.equal(pemIssue?.level, "error");
  });

  it("warns when MONGODB_URI points at localhost in production", () => {
    const env = baseProductionEnv();
    env.MONGODB_URI = "mongodb://localhost:27017/vision_board";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const warning = issues.find((issue) => issue.key === "MONGODB_URI" && issue.level === "warning");
    assert.ok(warning, "expected MONGODB_URI localhost warning in production");
  });

  it("warns when BILLING_REPOSITORY=memory in production", () => {
    const env = baseProductionEnv();
    env.BILLING_REPOSITORY = "memory";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const warning = issues.find((issue) => issue.key === "BILLING_REPOSITORY" && issue.level === "warning");
    assert.ok(warning, "expected BILLING_REPOSITORY=memory warning in production");
  });

  it("warns when SENTRY_DSN missing in production", () => {
    const env = baseProductionEnv();
    delete env.SENTRY_DSN;
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const warning = issues.find((issue) => issue.key === "SENTRY_DSN" && issue.level === "warning");
    assert.ok(warning, "expected SENTRY_DSN warning in production");
  });
});

describe("validateBackendEnv: Casso billing", () => {
  function baseCassoEnv(): NodeJS.ProcessEnv {
    return {
      ...baseProductionEnv(),
      BILLING_PROVIDER: "casso",
      CASSO_WEBHOOK_SECRET: "fake-secret",
      CASSO_BANK_ACCOUNT: "0123456789",
      CASSO_BANK_NAME: "MB",
      CASSO_ACCOUNT_NAME: "NGUYEN VAN A",
      PLUS_PRICE_VND: "99000",
    };
  }

  it("accepts a fully configured Casso production env", () => {
    const issues = validateBackendEnv(baseCassoEnv(), { nodeEnv: "production" });
    const errors = issues.filter((issue) => issue.level === "error");
    assert.deepEqual(errors, []);
  });

  it("errors when Casso webhook secret is missing", () => {
    const env = baseCassoEnv();
    delete env.CASSO_WEBHOOK_SECRET;
    delete env.CASSO_WEBHOOK_CHECKSUM_KEY;
    delete env.CASSO_CHECKSUM_KEY;
    delete env.CASSO_SECURE_TOKEN;
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const offending = issues.find((issue) => issue.key === "CASSO_WEBHOOK_SECRET" && issue.level === "error");
    assert.ok(offending, "expected CASSO_WEBHOOK_SECRET error when no secret configured");
  });

  it("accepts CASSO_WEBHOOK_CHECKSUM_KEY as substitute secret", () => {
    const env = baseCassoEnv();
    delete env.CASSO_WEBHOOK_SECRET;
    env.CASSO_WEBHOOK_CHECKSUM_KEY = "checksum-key";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const offending = issues.find((issue) => issue.key === "CASSO_WEBHOOK_SECRET" && issue.level === "error");
    assert.equal(offending, undefined);
  });

  it("errors when PLUS_PRICE_VND is below 1000", () => {
    const env = baseCassoEnv();
    env.PLUS_PRICE_VND = "500";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const offending = issues.find((issue) => issue.key === "PLUS_PRICE_VND" && issue.level === "error");
    assert.ok(offending, "expected PLUS_PRICE_VND error for <1000 VND");
  });

  it("errors when PLUS_PRICE_VND is non-numeric", () => {
    const env = baseCassoEnv();
    env.PLUS_PRICE_VND = "abc";
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const offending = issues.find((issue) => issue.key === "PLUS_PRICE_VND" && issue.level === "error");
    assert.ok(offending, "expected PLUS_PRICE_VND error for non-numeric");
  });

  it("errors when bank account fields missing for Casso production", () => {
    const env = baseCassoEnv();
    delete env.CASSO_BANK_ACCOUNT;
    delete env.CASSO_ACCOUNT_NAME;
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const accountIssue = issues.find((issue) => issue.key === "CASSO_BANK_ACCOUNT" && issue.level === "error");
    const nameIssue = issues.find((issue) => issue.key === "CASSO_ACCOUNT_NAME" && issue.level === "error");
    assert.ok(accountIssue);
    assert.ok(nameIssue);
  });

  it("downgrades Casso config issues to warnings outside production", () => {
    const env = baseCassoEnv();
    delete env.CASSO_WEBHOOK_SECRET;
    delete env.CASSO_WEBHOOK_CHECKSUM_KEY;
    delete env.CASSO_CHECKSUM_KEY;
    delete env.CASSO_SECURE_TOKEN;
    delete env.CASSO_BANK_ACCOUNT;
    const issues = validateBackendEnv(env, { nodeEnv: "development" });
    const errors = issues.filter((issue) => issue.level === "error");
    assert.equal(errors.length, 0);
    const warnings = issues.filter((issue) => issue.category === "casso");
    assert.ok(warnings.length >= 2);
  });
});

describe("validateBackendEnv: PayOS billing", () => {
  function basePayosEnv(): NodeJS.ProcessEnv {
    return {
      ...baseProductionEnv(),
      BILLING_PROVIDER: "payos",
      BILLING_PAID_DISABLED: "true",
      PAYOS_CLIENT_ID: "payos-client-id",
      PAYOS_API_KEY: "payos-api-key",
      PAYOS_CHECKSUM_KEY: "payos-checksum-key",
      PLUS_PRICE_VND: "99000",
    };
  }

  it("accepts a fully configured PayOS production env while checkout is locked", () => {
    const issues = validateBackendEnv(basePayosEnv(), { nodeEnv: "production" });
    const errors = issues.filter((issue) => issue.level === "error");
    assert.deepEqual(errors, []);
  });

  it("does not require Casso env when BILLING_PROVIDER=payos", () => {
    const env = basePayosEnv();
    delete env.CASSO_WEBHOOK_SECRET;
    delete env.CASSO_BANK_ACCOUNT;
    delete env.CASSO_BANK_NAME;
    delete env.CASSO_ACCOUNT_NAME;
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const cassoErrors = issues.filter((issue) => issue.category === "casso" && issue.level === "error");
    assert.deepEqual(cassoErrors, []);
  });

  it("warns instead of errors for missing PayOS secrets while backend checkout is locked", () => {
    const env = basePayosEnv();
    delete env.PAYOS_CLIENT_ID;
    delete env.PAYOS_API_KEY;
    delete env.PAYOS_CHECKSUM_KEY;
    env.BILLING_PAID_DISABLED = "true";

    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const payosErrors = issues.filter((issue) => issue.category === "payos" && issue.level === "error");
    const payosWarnings = issues.filter((issue) => issue.category === "payos" && issue.level === "warning");

    assert.deepEqual(payosErrors, []);
    assert.ok(payosWarnings.length >= 3);
  });

  it("errors for missing PayOS secrets when production checkout is not locked", () => {
    const env = basePayosEnv();
    delete env.PAYOS_CLIENT_ID;
    delete env.PAYOS_API_KEY;
    delete env.PAYOS_CHECKSUM_KEY;
    env.BILLING_PAID_DISABLED = "false";

    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const missingKeys = issues
      .filter((issue) => issue.category === "payos" && issue.level === "error")
      .map((issue) => issue.key);

    assert.ok(missingKeys.includes("PAYOS_CLIENT_ID"));
    assert.ok(missingKeys.includes("PAYOS_API_KEY"));
    assert.ok(missingKeys.includes("PAYOS_CHECKSUM_KEY"));
  });
});

describe("validateBackendEnv: dev/test forgiveness", () => {
  it("does not require Casso config when BILLING_PROVIDER=mock", () => {
    const env = { ...baseProductionEnv(), BILLING_PROVIDER: "mock" };
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const cassoErrors = issues.filter((issue) => issue.category === "casso" && issue.level === "error");
    assert.deepEqual(cassoErrors, []);
  });

  it("warns instead of errors on unknown billing provider", () => {
    const env = { ...baseProductionEnv(), BILLING_PROVIDER: "stripe-extra" };
    const issues = validateBackendEnv(env, { nodeEnv: "production" });
    const warning = issues.find((issue) => issue.key === "BILLING_PROVIDER" && issue.level === "warning");
    assert.ok(warning, "expected BILLING_PROVIDER warning for unknown value");
  });
});

describe("summarizeEnvIssues", () => {
  it("renders human-readable lines without leaking values", () => {
    const lines = summarizeEnvIssues([
      { level: "error", key: "MONGODB_URI", category: "mongodb", message: "is required and must not be empty." },
    ]);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /\[ERROR\] mongodb\/MONGODB_URI: is required/);
  });
});
