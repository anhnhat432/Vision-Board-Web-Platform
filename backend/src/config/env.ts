import dotenv from "dotenv";

import { summarizeEnvIssues, validateBackendEnv } from "./envValidation";

dotenv.config();

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getRequiredEnvInProduction(name: string): string | undefined {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") return getOptionalEnv(name);
  return getRequiredEnv(name);
}

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) return 4000;

  const parsed = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsed;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

// Fail-fast production validation. Aggregates every problem so operators
// see the full report instead of patching one issue at a time. Skipped
// outside production to keep dev/test boots forgiving.
if (nodeEnv === "production") {
  const issues = validateBackendEnv(process.env, { nodeEnv });
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[env] ${warnings.length} production env warning(s):\n${summarizeEnvIssues(warnings).join("\n")}`,
    );
  }

  if (errors.length > 0) {
    const summary = summarizeEnvIssues(errors).join("\n");
    throw new Error(
      `Production environment is not safe to start. ${errors.length} error(s):\n${summary}`,
    );
  }
}

const billingProvider = getOptionalEnv("BILLING_PROVIDER")?.toLowerCase();
const rawPrivateKey = getRequiredEnv("FIREBASE_PRIVATE_KEY");
const assistantProvider = getOptionalEnv("ASSISTANT_PROVIDER")?.toLowerCase();
const geminiApiKey = getOptionalEnv("GEMINI_API_KEY");
const geminiModel = getOptionalEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";
const groqApiKey = getOptionalEnv("GROQ_API_KEY");
const groqModel = getOptionalEnv("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

const resolvedAssistantProvider: "groq" | "gemini" = assistantProvider === "gemini" ? "gemini" : "groq";

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parsePort(process.env.PORT),
  MONGODB_URI: getRequiredEnv("MONGODB_URI"),
  FIREBASE_PROJECT_ID: getRequiredEnv("FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: rawPrivateKey.replace(/\\n/g, "\n"),
  FRONTEND_ORIGIN: getRequiredEnv("FRONTEND_ORIGIN"),
  SENTRY_DSN: getOptionalEnv("SENTRY_DSN"),
  CASSO_WEBHOOK_SECRET:
    billingProvider === "casso" ? getRequiredEnvInProduction("CASSO_WEBHOOK_SECRET") : getOptionalEnv("CASSO_WEBHOOK_SECRET"),
  ASSISTANT_PROVIDER: resolvedAssistantProvider,
  GEMINI_API_KEY: geminiApiKey,
  GEMINI_MODEL: geminiModel,
  GROQ_API_KEY: groqApiKey,
  GROQ_MODEL: groqModel,
};

export type Env = typeof env;
