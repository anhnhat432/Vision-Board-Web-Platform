import { getAppMode, type AppMode } from "./app-mode";
import { captureFrontendException, type FrontendCaptureContext } from "@/lib/monitoring/sentry";

export type ProductionRuntimeEnv = Record<string, boolean | string | undefined>;

export interface ProductionRuntimeEnvIssue {
  key: string;
  message: string;
  severity: "error";
}

type CaptureFrontendException = (error: unknown, context?: FrontendCaptureContext) => void;

interface ReportProductionRuntimeEnvOptions {
  env?: ProductionRuntimeEnv;
  appMode?: AppMode;
  captureException?: CaptureFrontendException;
  consoleError?: (...args: unknown[]) => void;
}

const REQUIRED_REAL_MODE_ENV: ProductionRuntimeEnvIssue[] = [
  {
    key: "VITE_API_BASE_URL",
    message: "VITE_API_BASE_URL must point to the deployed backend API in real mode.",
    severity: "error",
  },
  {
    key: "VITE_FIREBASE_API_KEY",
    message: "Firebase client config is required for signup, signin, and protected sync.",
    severity: "error",
  },
  {
    key: "VITE_FIREBASE_AUTH_DOMAIN",
    message: "Firebase client config is required for signup, signin, and protected sync.",
    severity: "error",
  },
  {
    key: "VITE_FIREBASE_PROJECT_ID",
    message: "Firebase client config is required for signup, signin, and protected sync.",
    severity: "error",
  },
  {
    key: "VITE_FIREBASE_APP_ID",
    message: "Firebase client config is required for signup, signin, and protected sync.",
    severity: "error",
  },
  {
    key: "VITE_BILLING_PROVIDER_MODE",
    message: "VITE_BILLING_PROVIDER_MODE must be api_contract for real billing.",
    severity: "error",
  },
  {
    key: "VITE_BILLING_SUPPORT_EMAIL",
    message: "VITE_BILLING_SUPPORT_EMAIL is required for refund, cancel, and payment support flows.",
    severity: "error",
  },
  {
    key: "VITE_SENTRY_DSN",
    message: "VITE_SENTRY_DSN is required so production boot/config failures are observable.",
    severity: "error",
  },
];

const LOCAL_API_BASE_URL_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i;

function readEnvString(env: ProductionRuntimeEnv, key: string): string {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
}

function cloneIssue(issue: ProductionRuntimeEnvIssue): ProductionRuntimeEnvIssue {
  return {
    key: issue.key,
    message: issue.message,
    severity: issue.severity,
  };
}

function hasProductionBuildFlag(env: ProductionRuntimeEnv): boolean {
  return env.PROD === true;
}

export function collectProductionRuntimeEnvIssues(
  env: ProductionRuntimeEnv = import.meta.env,
  appMode: AppMode = getAppMode(),
): ProductionRuntimeEnvIssue[] {
  if (appMode !== "real") return [];

  const issues: ProductionRuntimeEnvIssue[] = [];
  for (const requiredIssue of REQUIRED_REAL_MODE_ENV) {
    if (!readEnvString(env, requiredIssue.key)) {
      issues.push(cloneIssue(requiredIssue));
    }
  }

  const apiBaseUrl = readEnvString(env, "VITE_API_BASE_URL");
  if (apiBaseUrl && hasProductionBuildFlag(env) && LOCAL_API_BASE_URL_PATTERN.test(apiBaseUrl)) {
    issues.push({
      key: "VITE_API_BASE_URL",
      message: "VITE_API_BASE_URL points to localhost in a production build.",
      severity: "error",
    });
  }

  const billingProviderMode = readEnvString(env, "VITE_BILLING_PROVIDER_MODE");
  if (billingProviderMode && billingProviderMode !== "api_contract") {
    issues.push({
      key: "VITE_BILLING_PROVIDER_MODE",
      message: "VITE_BILLING_PROVIDER_MODE must be api_contract for real billing.",
      severity: "error",
    });
  }

  return issues;
}

export function reportProductionRuntimeEnvReadiness(
  options: ReportProductionRuntimeEnvOptions = {},
): ProductionRuntimeEnvIssue[] {
  const env = options.env ?? import.meta.env;
  const appMode = options.appMode ?? getAppMode();
  const issues = collectProductionRuntimeEnvIssues(env, appMode);
  if (issues.length === 0) return [];

  const issueKeys = issues.map((issue) => issue.key);
  const consoleError = options.consoleError ?? ((...args: unknown[]) => console.error(...args));
  consoleError("[production-runtime-env] Missing or unsafe real-mode env keys.", issueKeys);

  const captureException = options.captureException ?? captureFrontendException;
  captureException(new Error("Production runtime environment is missing required configuration."), {
    tags: {
      appMode,
      surface: "production_runtime_env",
    },
    extra: {
      issueCount: issues.length,
      issues,
    },
  });

  return issues;
}
