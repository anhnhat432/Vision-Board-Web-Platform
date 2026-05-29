#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const fullStack = args.has("--full-stack");
const skipHealth = args.has("--skip-health");
const requireCassoBilling = args.has("--casso-billing") || getOptionValue(process.argv.slice(2), "--billing") === "casso";
const healthTimeoutMs = Number(process.env.ENV_CHECK_HEALTH_TIMEOUT_MS ?? 15000);
const mode = getMode(process.argv.slice(2));

const frontendEnvFiles = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
const backendEnvFile = path.join("backend", ".env");

const requiredFrontendForBackendSync = [
  "VITE_API_BASE_URL",
  "VITE_APP_MODE",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

const optionalFrontendFirebaseKeys = [
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
];

const optionalFrontendMonitoringKeys = [
  "VITE_SENTRY_DSN",
  "VITE_SENTRY_ENVIRONMENT",
  "VITE_SENTRY_RELEASE",
  "VITE_SENTRY_TRACES_SAMPLE_RATE",
];

const requiredBackendKeys = [
  "PORT",
  "MONGODB_URI",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FRONTEND_ORIGIN",
];

const cassoBillingKeys = [
  "BILLING_PROVIDER",
  "BILLING_REPOSITORY",
  "CASSO_WEBHOOK_SECRET",
  "CASSO_BANK_ACCOUNT",
  "CASSO_BANK_NAME",
  "CASSO_ACCOUNT_NAME",
  "PLUS_PRICE_VND",
];

const payosBillingKeys = [
  "BILLING_PROVIDER",
  "BILLING_REPOSITORY",
  "PAYOS_CLIENT_ID",
  "PAYOS_API_KEY",
  "PAYOS_CHECKSUM_KEY",
  "PLUS_PRICE_VND",
];

const optionalBackendMonitoringKeys = [
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "SENTRY_RELEASE",
  "SENTRY_TRACES_SAMPLE_RATE",
];

const optionalBackendBackupKeys = [
  "MONGODB_BACKUP_DIR",
  "MONGODB_BACKUP_RETENTION_DAYS",
  "MONGODUMP_BIN",
  "GPG_BIN",
  "MONGODB_BACKUP_GPG_PASSPHRASE",
  "MONGODB_BACKUP_R2_PREFIX",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
];

function getMode(argv) {
  const inlineMode = argv.find((arg) => arg.startsWith("--mode="));
  if (inlineMode) return inlineMode.slice("--mode=".length) || "development";

  const modeFlagIndex = argv.indexOf("--mode");
  if (modeFlagIndex !== -1 && argv[modeFlagIndex + 1]) {
    return argv[modeFlagIndex + 1];
  }

  return process.env.MODE || "development";
}

function getOptionValue(argv, name) {
  const inlineOption = argv.find((arg) => arg.startsWith(`${name}=`));
  if (inlineOption) return inlineOption.slice(name.length + 1).trim().toLowerCase();

  const optionIndex = argv.indexOf(name);
  if (optionIndex !== -1 && argv[optionIndex + 1]) {
    return argv[optionIndex + 1].trim().toLowerCase();
  }

  return "";
}

function parseEnvFile(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    return { exists: false, values: {} };
  }

  const values = {};
  const content = readFileSync(absolutePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return { exists: true, values };
}

function mergeEnvFiles(files) {
  const merged = {};
  const loaded = [];

  for (const file of files) {
    const parsed = parseEnvFile(file);
    if (!parsed.exists) continue;
    loaded.push(file);
    Object.assign(merged, parsed.values);
  }

  return { loaded, values: merged };
}

function hasValue(values, key) {
  return typeof values[key] === "string" && values[key].trim().length > 0;
}

function printKeyStatus(label, keys, values) {
  console.log(label);
  for (const key of keys) {
    console.log(`  ${hasValue(values, key) ? "OK     " : "MISSING"} ${key}`);
  }
}

function collectMissing(keys, values) {
  return keys.filter((key) => !hasValue(values, key));
}

async function checkApiHealth(baseUrl) {
  if (!baseUrl) return { status: "skipped", message: "VITE_API_BASE_URL is missing." };

  const url = `${baseUrl.replace(/\/$/, "")}/health`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(healthTimeoutMs) });
    const body = await response.text();

    return {
      status: response.ok ? "ok" : "failed",
      message: `HTTP ${response.status}${body ? ` - ${body.slice(0, 160)}` : ""}`,
    };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

const frontendEnv = mergeEnvFiles(frontendEnvFiles);
const backendEnv = parseEnvFile(backendEnvFile);
const frontendAppMode =
  frontendEnv.values.VITE_APP_MODE?.trim().toLowerCase() === "real" ? "real" : "demo";
const shouldRequireBackendSyncEnv = fullStack || frontendAppMode === "real";
const frontendMissing = shouldRequireBackendSyncEnv
  ? collectMissing(requiredFrontendForBackendSync, frontendEnv.values)
  : [];
const backendMissing = backendEnv.exists ? collectMissing(requiredBackendKeys, backendEnv.values) : requiredBackendKeys;

console.log("Runtime environment check");
console.log(`Mode: ${fullStack ? "full-stack" : "report-only"}`);
console.log(`Vite env mode: ${mode}`);
console.log(`Billing check: ${requireCassoBilling ? "casso" : "auto"}`);
console.log(`Frontend env files: ${frontendEnv.loaded.length > 0 ? frontendEnv.loaded.join(", ") : "none"}`);
console.log(`Backend env file: ${backendEnv.exists ? backendEnvFile : "missing"}`);
console.log("");

printKeyStatus("Frontend backend-sync requirements", requiredFrontendForBackendSync, frontendEnv.values);
console.log("");
printKeyStatus("Optional Firebase client keys", optionalFrontendFirebaseKeys, frontendEnv.values);
console.log("");
printKeyStatus("Optional frontend error monitoring", optionalFrontendMonitoringKeys, frontendEnv.values);
console.log("");
printKeyStatus("Backend local API requirements", requiredBackendKeys, backendEnv.values);
console.log("");
printKeyStatus("Casso + VietQR billing requirements (BILLING_PROVIDER=casso or --casso-billing)", cassoBillingKeys, backendEnv.values);
console.log("");
printKeyStatus("Optional backend error monitoring", optionalBackendMonitoringKeys, backendEnv.values);
console.log("");
printKeyStatus("Optional MongoDB backup config", optionalBackendBackupKeys, backendEnv.values);
console.log("");

if (fullStack && !hasValue(frontendEnv.values, "VITE_SENTRY_DSN")) {
  console.log("WARN    VITE_SENTRY_DSN is missing. Frontend errors will not be captured in Sentry.");
}

if (fullStack && !hasValue(backendEnv.values, "SENTRY_DSN")) {
  console.log("WARN    SENTRY_DSN is missing. Backend errors will not be captured in Sentry.");
}

if (frontendAppMode !== "real") {
  console.log("INFO    VITE_APP_MODE is demo. Firebase/backend sync env is optional and API health is skipped unless --full-stack is used.");
}

if (fullStack && frontendAppMode !== "real") {
  console.log(`WARN    VITE_APP_MODE is "${frontendEnv.values.VITE_APP_MODE ?? "demo"}". Full backend sync expects "real".`);
}

let healthResult = { status: "skipped", message: "Demo mode does not require API health." };
if (skipHealth) {
  healthResult = { status: "skipped", message: "Skipped by --skip-health." };
} else if (fullStack || frontendAppMode === "real") {
  healthResult = await checkApiHealth(frontendEnv.values.VITE_API_BASE_URL);
} else {
  healthResult = { status: "skipped", message: "Demo mode does not require API health." };
}

console.log(`API health: ${healthResult.status.toUpperCase()} ${healthResult.message}`);

const fullStackFailures = [
  ...frontendMissing.map((key) => `frontend:${key}`),
  ...(shouldRequireBackendSyncEnv ? backendMissing.map((key) => `backend:${key}`) : []),
];

function isPaidCheckoutDisabled(env) {
  const raw = env.BILLING_PAID_DISABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

const backendBillingProvider = backendEnv.values.BILLING_PROVIDER?.trim().toLowerCase();
const paidCheckoutDisabled = isPaidCheckoutDisabled(backendEnv.values);

if (shouldRequireBackendSyncEnv) {
  if (!paidCheckoutDisabled) {
    if (!backendBillingProvider || backendBillingProvider === "mock") {
      fullStackFailures.push("backend:BILLING_PROVIDER(real-provider-required-in-production)");
    } else if (backendBillingProvider === "casso") {
      fullStackFailures.push(
        ...collectMissing(cassoBillingKeys, backendEnv.values).map((key) => `backend:${key}`),
      );
    } else if (backendBillingProvider === "payos") {
      fullStackFailures.push(
        ...collectMissing(payosBillingKeys, backendEnv.values).map((key) => `backend:${key}`),
      );
    } else if (backendBillingProvider === "momo" || backendBillingProvider === "vnpay") {
      fullStackFailures.push(`backend:BILLING_PROVIDER(unimplemented-provider:${backendBillingProvider})`);
    } else {
      fullStackFailures.push(`backend:BILLING_PROVIDER(unknown-provider:${backendBillingProvider})`);
    }

    const billingRepository = backendEnv.values.BILLING_REPOSITORY?.trim().toLowerCase();
    if (!billingRepository || billingRepository !== "mongo") {
      fullStackFailures.push("backend:BILLING_REPOSITORY(mongo-required-in-production)");
    }
  } else {
    if (backendBillingProvider === "casso") {
      fullStackFailures.push(
        ...collectMissing(cassoBillingKeys, backendEnv.values).map((key) => `backend:${key}`),
      );
    } else if (backendBillingProvider === "payos") {
      fullStackFailures.push(
        ...collectMissing(payosBillingKeys, backendEnv.values).map((key) => `backend:${key}`),
      );
    }
  }
}

if (fullStack && frontendAppMode !== "real") {
  fullStackFailures.push("frontend:VITE_APP_MODE(real-required)");
}

if (!skipHealth && healthResult.status === "failed") {
  fullStackFailures.push("api:health");
}

if (fullStack && fullStackFailures.length > 0) {
  console.log("");
  console.log("Full-stack backend sync is not ready.");
  console.log(`Missing or failing checks: ${fullStackFailures.join(", ")}`);
  process.exit(1);
}

console.log("");
console.log(fullStackFailures.length > 0 ? "Report complete with warnings." : "Runtime env looks ready.");
