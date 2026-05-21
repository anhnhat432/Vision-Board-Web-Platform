/**
 * Standalone production env audit.
 *
 * Run via: `npm run check:env` (mirrors current process env) or
 *          `NODE_ENV=production npm run check:env` to apply production rules.
 *
 * - Pure inspection: never opens MongoDB, Firebase, or HTTP connections.
 * - Never logs secret values: only variable names and validation messages.
 * - Exits with code 1 if any error-level issue is found.
 */

import dotenv from "dotenv";

import { summarizeEnvIssues, validateBackendEnv, type EnvValidationIssue } from "../config/envValidation";

const dotenvResult = dotenv.config();
const dotenvStatus = dotenvResult.parsed ? "loaded" : "not found";

const nodeEnv = process.env.NODE_ENV?.trim() || "development";
const isProduction = nodeEnv === "production";

const issues = validateBackendEnv(process.env, { nodeEnv });
const errors = issues.filter((issue) => issue.level === "error");
const warnings = issues.filter((issue) => issue.level === "warning");

const billingProvider = process.env.BILLING_PROVIDER?.trim().toLowerCase() || "(unset → mock)";
const billingRepository = process.env.BILLING_REPOSITORY?.trim().toLowerCase() || "(unset)";
const cassoActive = billingProvider === "casso";

function formatIssues(label: string, list: EnvValidationIssue[]): string {
  if (list.length === 0) return `${label}: none`;
  return `${label} (${list.length}):\n${summarizeEnvIssues(list).join("\n")}`;
}

// eslint-disable-next-line no-console
console.log(
  [
    "Backend production env audit",
    `NODE_ENV         = ${nodeEnv}${isProduction ? " (strict)" : ""}`,
    `dotenv .env      = ${dotenvStatus}`,
    `BILLING_PROVIDER = ${billingProvider}`,
    `BILLING_REPOSITORY = ${billingRepository}`,
    `Casso billing active: ${cassoActive ? "yes" : "no"}`,
    "",
    formatIssues("Errors", errors),
    "",
    formatIssues("Warnings", warnings),
  ].join("\n"),
);

if (errors.length > 0) {
  process.exit(1);
}
