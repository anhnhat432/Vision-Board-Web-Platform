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
const geminiModel = getOptionalEnv("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
const geminiSmartModel = getOptionalEnv("GEMINI_SMART_MODEL") ?? "gemini-3.1-flash-lite";
const groqApiKey = getOptionalEnv("GROQ_API_KEY");
const groqModel = getOptionalEnv("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
const groqAudioModel = getOptionalEnv("GROQ_AUDIO_MODEL") ?? "whisper-large-v3-turbo";

const resolvedAssistantProvider: "groq" | "gemini" = assistantProvider === "groq" ? "groq" : "gemini";

const aiProvider = getOptionalEnv("AI_PROVIDER")?.toLowerCase() || assistantProvider || "gemini";
const resolvedAiProvider: "groq" | "gemini" = aiProvider === "groq" ? "groq" : "gemini";
const aiApiKey = getOptionalEnv("AI_API_KEY") || (resolvedAiProvider === "gemini" ? geminiApiKey : groqApiKey);
const aiModel = getOptionalEnv("AI_MODEL") || (resolvedAiProvider === "gemini" ? geminiModel : groqModel);
const aiSmartModel = getOptionalEnv("AI_SMART_MODEL") || (resolvedAiProvider === "gemini" ? geminiSmartModel : aiModel);

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
  GEMINI_SMART_MODEL: geminiSmartModel,
  GROQ_API_KEY: groqApiKey,
  GROQ_MODEL: groqModel,
  GROQ_AUDIO_MODEL: groqAudioModel,
  AI_PROVIDER: resolvedAiProvider,
  AI_API_KEY: aiApiKey,
  AI_MODEL: aiModel,
  AI_SMART_MODEL: aiSmartModel,
  R2_ACCOUNT_ID: getOptionalEnv("R2_ACCOUNT_ID"),
  R2_ACCESS_KEY_ID: getOptionalEnv("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: getOptionalEnv("R2_SECRET_ACCESS_KEY"),
  R2_BUCKET: getOptionalEnv("R2_BUCKET"),
  R2_ENDPOINT: getOptionalEnv("R2_ENDPOINT"),
  R2_PUBLIC_BASE_URL: getOptionalEnv("R2_PUBLIC_BASE_URL"),
};

export type Env = typeof env;
