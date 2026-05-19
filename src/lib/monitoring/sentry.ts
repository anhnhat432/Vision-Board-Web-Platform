import * as Sentry from "@sentry/react";

import { getAppMode } from "@/app/utils/app-mode";

const DEFAULT_TRACES_SAMPLE_RATE = 0.02;

function parseSampleRate(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) return fallback;

  const value = Number.parseFloat(rawValue);
  if (!Number.isFinite(value)) return fallback;

  return Math.min(1, Math.max(0, value));
}

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const sentryDsn = optionalEnv(import.meta.env.VITE_SENTRY_DSN);
const appMode = getAppMode();

export const sentryEnabled = Boolean(sentryDsn);

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: optionalEnv(import.meta.env.VITE_SENTRY_ENVIRONMENT) ?? appMode,
    release: optionalEnv(import.meta.env.VITE_SENTRY_RELEASE),
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, DEFAULT_TRACES_SAMPLE_RATE),
    integrations: [Sentry.browserTracingIntegration()],
  });
}

interface FrontendCaptureContext extends Record<string, unknown> {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export function captureFrontendException(error: unknown, context?: FrontendCaptureContext): void {
  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    if (context?.tags) {
      scope.setTags(context.tags);
    }
    if (context?.extra) {
      scope.setContext("extra", context.extra);
    }
    if (context) {
      const appContext = { ...context };
      delete appContext.tags;
      delete appContext.extra;
      scope.setContext("app", appContext);
    }
    Sentry.captureException(error);
  });
}
