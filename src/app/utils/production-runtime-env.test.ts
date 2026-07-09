import { describe, expect, it, vi } from "vitest";

import type { AppMode } from "./app-mode";
import {
  collectProductionRuntimeEnvIssues,
  reportProductionRuntimeEnvReadiness,
  type ProductionRuntimeEnv,
} from "./production-runtime-env";

const completeRealModeEnv: ProductionRuntimeEnv = {
  VITE_APP_MODE: "real",
  PROD: true,
  VITE_API_BASE_URL: "https://api.example.test/api",
  VITE_FIREBASE_API_KEY: "firebase-api-key-test",
  VITE_FIREBASE_AUTH_DOMAIN: "vision-test.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "vision-test",
  VITE_FIREBASE_APP_ID: "1:123:web:test",
  VITE_BILLING_PROVIDER_MODE: "api_contract",
  VITE_BILLING_SUPPORT_EMAIL: "support@example.test",
  VITE_SENTRY_DSN: "https://public@example.test/1",
};

function collect(env: ProductionRuntimeEnv, appMode: AppMode = "real") {
  return collectProductionRuntimeEnvIssues(env, appMode);
}

describe("production runtime env readiness", () => {
  it("does not report real-mode env issues in demo mode", () => {
    expect(
      collect(
        {
          VITE_APP_MODE: "demo",
          PROD: true,
        },
        "demo",
      ),
    ).toEqual([]);
  });

  it("reports missing production-critical frontend env in real mode", () => {
    const issues = collect({
      VITE_APP_MODE: "real",
      PROD: true,
    });

    expect(issues.map((issue) => issue.key)).toEqual([
      "VITE_API_BASE_URL",
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_PROJECT_ID",
      "VITE_FIREBASE_APP_ID",
      "VITE_BILLING_PROVIDER_MODE",
      "VITE_BILLING_SUPPORT_EMAIL",
      "VITE_SENTRY_DSN",
    ]);
  });

  it("reports unsafe production API and billing mode values without exposing env values", () => {
    const issues = collect({
      ...completeRealModeEnv,
      VITE_API_BASE_URL: "http://localhost:4000/api",
      VITE_BILLING_PROVIDER_MODE: "mock_provider",
      VITE_FIREBASE_API_KEY: "secret-firebase-key",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "VITE_API_BASE_URL",
          message: expect.stringContaining("localhost"),
        }),
        expect.objectContaining({
          key: "VITE_BILLING_PROVIDER_MODE",
          message: expect.stringContaining("api_contract"),
        }),
      ]),
    );
    expect(JSON.stringify(issues)).not.toContain("secret-firebase-key");
    expect(JSON.stringify(issues)).not.toContain("http://localhost:4000/api");
  });

  it("logs and captures sanitized readiness issues for real-mode boot", () => {
    const captureException = vi.fn();
    const consoleError = vi.fn();
    const env: ProductionRuntimeEnv = {
      ...completeRealModeEnv,
      VITE_API_BASE_URL: "",
      VITE_FIREBASE_API_KEY: "secret-firebase-key",
    };

    const issues = reportProductionRuntimeEnvReadiness({
      env,
      appMode: "real",
      captureException,
      consoleError,
    });

    expect(issues).toEqual([
      expect.objectContaining({
        key: "VITE_API_BASE_URL",
      }),
    ]);
    expect(consoleError).toHaveBeenCalledWith(
      "[production-runtime-env] Missing or unsafe real-mode env keys.",
      ["VITE_API_BASE_URL"],
    );
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: {
        appMode: "real",
        surface: "production_runtime_env",
      },
      extra: {
        issueCount: 1,
        issues: [
          {
            key: "VITE_API_BASE_URL",
            message: expect.any(String),
            severity: "error",
          },
        ],
      },
    });
    expect(JSON.stringify(captureException.mock.calls)).not.toContain("secret-firebase-key");
  });
});
