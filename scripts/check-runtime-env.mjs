#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const fullStack = args.has("--full-stack");
const skipHealth = args.has("--skip-health");
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

const requiredBackendKeys = [
  "PORT",
  "MONGODB_URI",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FRONTEND_ORIGIN",
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
const frontendMissing = collectMissing(requiredFrontendForBackendSync, frontendEnv.values);
const backendMissing = backendEnv.exists ? collectMissing(requiredBackendKeys, backendEnv.values) : requiredBackendKeys;

console.log("Runtime environment check");
console.log(`Mode: ${fullStack ? "full-stack" : "report-only"}`);
console.log(`Vite env mode: ${mode}`);
console.log(`Frontend env files: ${frontendEnv.loaded.length > 0 ? frontendEnv.loaded.join(", ") : "none"}`);
console.log(`Backend env file: ${backendEnv.exists ? backendEnvFile : "missing"}`);
console.log("");

printKeyStatus("Frontend backend-sync requirements", requiredFrontendForBackendSync, frontendEnv.values);
console.log("");
printKeyStatus("Optional Firebase client keys", optionalFrontendFirebaseKeys, frontendEnv.values);
console.log("");
printKeyStatus("Backend local API requirements", requiredBackendKeys, backendEnv.values);
console.log("");

if (frontendEnv.values.VITE_APP_MODE && frontendEnv.values.VITE_APP_MODE !== "real") {
  console.log(`WARN    VITE_APP_MODE is "${frontendEnv.values.VITE_APP_MODE}". Full backend sync expects "real".`);
}

let healthResult = { status: "skipped", message: "Use --skip-health=false by default." };
if (skipHealth) {
  healthResult = { status: "skipped", message: "Skipped by --skip-health." };
} else {
  healthResult = await checkApiHealth(frontendEnv.values.VITE_API_BASE_URL);
}

console.log(`API health: ${healthResult.status.toUpperCase()} ${healthResult.message}`);

const fullStackFailures = [
  ...frontendMissing.map((key) => `frontend:${key}`),
  ...backendMissing.map((key) => `backend:${key}`),
];

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
