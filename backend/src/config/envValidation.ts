/**
 * Backend env validation (pure functions, no side effects).
 *
 * Used at server start (via env.ts) to fail fast in production when the
 * runtime configuration is unsafe, and by the standalone audit script
 * `npm run check:env` to inspect a target deployment without connecting
 * to MongoDB, Firebase, or any external service.
 *
 * Rules:
 * - Never read or log secret values. Issues reference the variable name only.
 * - Aggregate every problem instead of throwing on the first one so operators
 *   see the full report in one shot.
 * - Production-only checks must not break local dev or test runs.
 */

import { parseAllowedCorsOrigins } from "../middleware/corsOrigin";

export type EnvIssueLevel = "error" | "warning";

export type EnvIssueCategory =
  | "core"
  | "frontend"
  | "mongodb"
  | "firebase"
  | "billing"
  | "casso"
  | "payos"
  | "monitoring"
  | "email";

export interface EnvValidationIssue {
  level: EnvIssueLevel;
  key: string;
  category: EnvIssueCategory;
  message: string;
}

export interface EnvValidationOptions {
  nodeEnv: string;
}

const PRIVATE_KEY_HEADER = "-----BEGIN PRIVATE KEY-----";
const PRIVATE_KEY_FOOTER = "-----END PRIVATE KEY-----";

const SUPPORTED_BILLING_PROVIDERS = new Set(["mock", "casso", "payos", "momo", "vnpay"]);
/** Providers with a real adapter implementation that can process payments. */
const IMPLEMENTED_BILLING_PROVIDERS = new Set(["casso", "payos"]);
const SUPPORTED_BILLING_REPOSITORIES = new Set(["mongo", "memory"]);

function isNonEmpty(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function unescapeNewlines(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function validateMongoUri(value: string, isProduction: boolean): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = [];
  if (!/^mongodb(\+srv)?:\/\//i.test(value)) {
    issues.push({
      level: "error",
      key: "MONGODB_URI",
      category: "mongodb",
      message: 'must start with "mongodb://" or "mongodb+srv://".',
    });
    return issues;
  }

  if (isProduction && /^mongodb:\/\/(localhost|127\.0\.0\.1|::1)/i.test(value)) {
    issues.push({
      level: "warning",
      key: "MONGODB_URI",
      category: "mongodb",
      message: "points at localhost in production. Use a managed MongoDB cluster (mongodb+srv://...).",
    });
  }
  return issues;
}

function validatePrivateKey(value: string): EnvValidationIssue | null {
  const unescaped = unescapeNewlines(value);
  if (!unescaped.includes(PRIVATE_KEY_HEADER) || !unescaped.includes(PRIVATE_KEY_FOOTER)) {
    return {
      level: "error",
      key: "FIREBASE_PRIVATE_KEY",
      category: "firebase",
      message:
        "must be a PEM-formatted Firebase Admin private key (BEGIN/END markers required; escape newlines as \\n).",
    };
  }
  return null;
}

function validateFrontendOrigin(value: string, nodeEnv: string): EnvValidationIssue | null {
  try {
    parseAllowedCorsOrigins(value, { nodeEnv });
    return null;
  } catch (error) {
    return {
      level: "error",
      key: "FRONTEND_ORIGIN",
      category: "frontend",
      message: error instanceof Error ? error.message : "is invalid.",
    };
  }
}

function validateClientEmail(value: string): EnvValidationIssue | null {
  if (!/^.+@.+\..+$/.test(value.trim())) {
    return {
      level: "error",
      key: "FIREBASE_CLIENT_EMAIL",
      category: "firebase",
      message: "must look like a Firebase service-account email (e.g. firebase-adminsdk-xxx@<project>.iam.gserviceaccount.com).",
    };
  }
  return null;
}

function validatePort(value: string): EnvValidationIssue | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return {
      level: "error",
      key: "PORT",
      category: "core",
      message: "must be a positive integer between 1 and 65535.",
    };
  }
  return null;
}

function isPaidCheckoutDisabled(env: NodeJS.ProcessEnv): boolean {
  const raw = env.BILLING_PAID_DISABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function isCassoBillingActive(env: NodeJS.ProcessEnv): boolean {
  return env.BILLING_PROVIDER?.trim().toLowerCase() === "casso";
}

function isPayosBillingActive(env: NodeJS.ProcessEnv): boolean {
  return env.BILLING_PROVIDER?.trim().toLowerCase() === "payos";
}

function hasAnyCassoSecret(env: NodeJS.ProcessEnv): boolean {
  return [
    env.CASSO_WEBHOOK_SECRET,
    env.CASSO_WEBHOOK_CHECKSUM_KEY,
    env.CASSO_CHECKSUM_KEY,
    env.CASSO_SECURE_TOKEN,
  ].some(isNonEmpty);
}

function validateBillingProvider(env: NodeJS.ProcessEnv, isProduction: boolean): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = [];
  const raw = env.BILLING_PROVIDER?.trim().toLowerCase();
  const paidCheckoutEnabled = !isPaidCheckoutDisabled(env);

  if (isProduction && paidCheckoutEnabled) {
    if (!raw) {
      issues.push({
        level: "error",
        key: "BILLING_PROVIDER",
        category: "billing",
        message: 'must be set in production when paid checkout is enabled (BILLING_PAID_DISABLED is not enabled). Must be a real provider (e.g. "payos" or "casso").',
      });
    } else if (raw === "mock") {
      issues.push({
        level: "error",
        key: "BILLING_PROVIDER",
        category: "billing",
        message: 'cannot be "mock" in production when paid checkout is enabled.',
      });
    } else if (!SUPPORTED_BILLING_PROVIDERS.has(raw)) {
      issues.push({
        level: "error",
        key: "BILLING_PROVIDER",
        category: "billing",
        message: `unrecognized value "${raw}" in production with paid checkout enabled. Implemented providers: ${Array.from(IMPLEMENTED_BILLING_PROVIDERS).join(", ")}.`,
      });
    } else if (!IMPLEMENTED_BILLING_PROVIDERS.has(raw)) {
      // Recognized but not implemented (momo, vnpay) — fail closed
      issues.push({
        level: "error",
        key: "BILLING_PROVIDER",
        category: "billing",
        message: `"${raw}" is recognized but not yet implemented. Only ${Array.from(IMPLEMENTED_BILLING_PROVIDERS).join(", ")} can process real payments. Set BILLING_PAID_DISABLED=true or switch to an implemented provider.`,
      });
    }
  } else {
    if (raw && !SUPPORTED_BILLING_PROVIDERS.has(raw)) {
      issues.push({
        level: "warning",
        key: "BILLING_PROVIDER",
        category: "billing",
        message: `unrecognized value. Allowed: ${Array.from(SUPPORTED_BILLING_PROVIDERS).join(", ")}. Will fall back to "mock".`,
      });
    }
  }
  return issues;
}

function validateBillingRepository(env: NodeJS.ProcessEnv, isProduction: boolean): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = [];
  const raw = env.BILLING_REPOSITORY?.trim().toLowerCase();
  if (raw && !SUPPORTED_BILLING_REPOSITORIES.has(raw)) {
    issues.push({
      level: "error",
      key: "BILLING_REPOSITORY",
      category: "billing",
      message: `must be "mongo" or "memory".`,
    });
    return issues;
  }
  if (isProduction && raw === "memory") {
    issues.push({
      level: "warning",
      key: "BILLING_REPOSITORY",
      category: "billing",
      message: 'is "memory" in production. Subscriptions will be lost on restart. Use "mongo".',
    });
  }
  if (isProduction && !raw) {
    issues.push({
      level: "warning",
      key: "BILLING_REPOSITORY",
      category: "billing",
      message: 'is unset in production. Set BILLING_REPOSITORY="mongo" so paid entitlements persist across restarts.',
    });
  }
  return issues;
}

function validateCassoConfig(env: NodeJS.ProcessEnv, isProduction: boolean): EnvValidationIssue[] {
  if (!isCassoBillingActive(env)) return [];

  const issues: EnvValidationIssue[] = [];
  const strict = isProduction;

  if (!hasAnyCassoSecret(env)) {
    issues.push({
      level: strict ? "error" : "warning",
      key: "CASSO_WEBHOOK_SECRET",
      category: "casso",
      message:
        "at least one of CASSO_WEBHOOK_SECRET / CASSO_WEBHOOK_CHECKSUM_KEY / CASSO_CHECKSUM_KEY / CASSO_SECURE_TOKEN must be set when BILLING_PROVIDER=casso. Webhooks without a configured secret are rejected.",
    });
  }

  const cassoFields: Array<{ key: string; label: string }> = [
    { key: "CASSO_BANK_ACCOUNT", label: "receiving bank account number" },
    { key: "CASSO_BANK_NAME", label: 'short bank code (e.g. "MB", "VCB")' },
    { key: "CASSO_ACCOUNT_NAME", label: "bank account holder name" },
  ];
  for (const { key, label } of cassoFields) {
    if (!isNonEmpty(env[key])) {
      issues.push({
        level: strict ? "error" : "warning",
        key,
        category: "casso",
        message: `is required when BILLING_PROVIDER=casso (${label}).`,
      });
    }
  }

  const priceRaw = env.PLUS_PRICE_VND?.trim();
  if (!isNonEmpty(priceRaw)) {
    issues.push({
      level: strict ? "error" : "warning",
      key: "PLUS_PRICE_VND",
      category: "casso",
      message: "is required when BILLING_PROVIDER=casso (PLUS plan price in VND).",
    });
  } else {
    const parsed = Number.parseInt(priceRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1000) {
      issues.push({
        level: "error",
        key: "PLUS_PRICE_VND",
        category: "casso",
        message: "must be a positive integer >= 1000 (VND).",
      });
    }
  }

  return issues;
}

function validatePayosConfig(env: NodeJS.ProcessEnv, isProduction: boolean): EnvValidationIssue[] {
  if (!isPayosBillingActive(env)) return [];

  const issues: EnvValidationIssue[] = [];
  const strict = isProduction && !isPaidCheckoutDisabled(env);
  const requiredPayosFields: Array<{ key: string; label: string }> = [
    { key: "PAYOS_CLIENT_ID", label: "PayOS client ID" },
    { key: "PAYOS_API_KEY", label: "PayOS API key" },
    { key: "PAYOS_CHECKSUM_KEY", label: "PayOS checksum key for webhook verification" },
  ];

  for (const { key, label } of requiredPayosFields) {
    if (!isNonEmpty(env[key])) {
      issues.push({
        level: strict ? "error" : "warning",
        key,
        category: "payos",
        message: strict
          ? `is required when BILLING_PROVIDER=payos and BILLING_PAID_DISABLED is not enabled (${label}).`
          : `is not set while BILLING_PROVIDER=payos. Checkout remains safe only if BILLING_PAID_DISABLED=true; PayOS webhooks without PAYOS_CHECKSUM_KEY are rejected.`,
      });
    }
  }

  const priceRaw = env.PLUS_PRICE_VND?.trim();
  if (!isNonEmpty(priceRaw)) {
    issues.push({
      level: strict ? "error" : "warning",
      key: "PLUS_PRICE_VND",
      category: "payos",
      message: "is required when BILLING_PROVIDER=payos (PLUS plan price in VND).",
    });
  } else {
    const parsed = Number.parseInt(priceRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1000) {
      issues.push({
        level: "error",
        key: "PLUS_PRICE_VND",
        category: "payos",
        message: "must be a positive integer >= 1000 (VND).",
      });
    }
  }

  return issues;
}

function validateMonitoring(env: NodeJS.ProcessEnv, isProduction: boolean): EnvValidationIssue[] {
  if (!isProduction) return [];
  const issues: EnvValidationIssue[] = [];
  if (!isNonEmpty(env.SENTRY_DSN)) {
    issues.push({
      level: "warning",
      key: "SENTRY_DSN",
      category: "monitoring",
      message: "is not set in production. Backend Sentry error monitoring will be disabled.",
    });
  }
  return issues;
}

function validateSupportEmail(env: NodeJS.ProcessEnv, isProduction: boolean): EnvValidationIssue[] {
  if (!isProduction) return [];
  if (isNonEmpty(env.BILLING_SUPPORT_EMAIL) || isNonEmpty(env.SUPPORT_EMAIL)) return [];
  return [
    {
      level: "warning",
      key: "BILLING_SUPPORT_EMAIL",
      category: "email",
      message:
        "no support email configured. Refund emails and customer-portal copy will fall back to a placeholder address.",
    },
  ];
}

function validateAIConfig(env: NodeJS.ProcessEnv, isProduction: boolean): EnvValidationIssue[] {
  if (!isProduction) return [];
  const issues: EnvValidationIssue[] = [];
  const provider = (env.AI_PROVIDER || env.ASSISTANT_PROVIDER || "gemini").trim().toLowerCase();
  const providerKey = provider === "groq" ? "GROQ_API_KEY" : "GEMINI_API_KEY";
  const apiKey = env.AI_API_KEY || env[providerKey];

  if (!apiKey) {
    issues.push({
      level: "warning",
      key: providerKey,
      category: "core",
      message: `AI provider "${provider}" is active but its API key is not configured. Assistant requests in real mode will fail.`,
    });
  }
  return issues;
}

/**
 * Pure validator. Caller decides how to react (throw, log, exit).
 * Returns every issue found so operators get a complete report.
 */
export function validateBackendEnv(
  env: NodeJS.ProcessEnv,
  options: EnvValidationOptions,
): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = [];
  const isProduction = options.nodeEnv === "production";

  const requiredCore: Array<{ key: string; category: EnvIssueCategory }> = [
    { key: "MONGODB_URI", category: "mongodb" },
    { key: "FIREBASE_PROJECT_ID", category: "firebase" },
    { key: "FIREBASE_CLIENT_EMAIL", category: "firebase" },
    { key: "FIREBASE_PRIVATE_KEY", category: "firebase" },
    { key: "FRONTEND_ORIGIN", category: "frontend" },
  ];

  for (const { key, category } of requiredCore) {
    if (!isNonEmpty(env[key])) {
      issues.push({
        level: "error",
        key,
        category,
        message: "is required and must not be empty.",
      });
    }
  }

  if (isNonEmpty(env.MONGODB_URI)) {
    issues.push(...validateMongoUri(env.MONGODB_URI.trim(), isProduction));
  }

  if (isNonEmpty(env.FIREBASE_CLIENT_EMAIL)) {
    const issue = validateClientEmail(env.FIREBASE_CLIENT_EMAIL);
    if (issue) issues.push(issue);
  }

  if (isNonEmpty(env.FIREBASE_PRIVATE_KEY)) {
    const issue = validatePrivateKey(env.FIREBASE_PRIVATE_KEY);
    if (issue) issues.push(issue);
  }

  if (isNonEmpty(env.FRONTEND_ORIGIN)) {
    const issue = validateFrontendOrigin(env.FRONTEND_ORIGIN, options.nodeEnv);
    if (issue) issues.push(issue);
  }

  if (isNonEmpty(env.PORT)) {
    const issue = validatePort(env.PORT);
    if (issue) issues.push(issue);
  }

  issues.push(...validateBillingProvider(env, isProduction));
  issues.push(...validateBillingRepository(env, isProduction));
  issues.push(...validateCassoConfig(env, isProduction));
  issues.push(...validatePayosConfig(env, isProduction));
  issues.push(...validateMonitoring(env, isProduction));
  issues.push(...validateSupportEmail(env, isProduction));
  issues.push(...validateAIConfig(env, isProduction));

  return issues;
}

/** Render issues as one human-readable line per entry. Never includes values. */
export function summarizeEnvIssues(issues: EnvValidationIssue[]): string[] {
  return issues.map(
    (issue) => `- [${issue.level.toUpperCase()}] ${issue.category}/${issue.key}: ${issue.message}`,
  );
}
