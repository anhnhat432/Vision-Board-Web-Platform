import * as Sentry from "@sentry/node";
import type { Express } from "express";

const DEFAULT_TRACES_SAMPLE_RATE = 0.05;
const DEFAULT_FLUSH_TIMEOUT_MS = 2000;
type BackendCaptureContext = Parameters<typeof Sentry.captureException>[1];

interface BillingCriticalContext {
  event: string;
  orderId?: string | null;
  amount?: number | null;
  status?: string | null;
}

function buildBillingCriticalExtra(context: BillingCriticalContext): Record<string, string | number> {
  const extra: Record<string, string | number> = {};
  if (context.orderId) extra.orderId = context.orderId;
  if (typeof context.amount === "number" && Number.isFinite(context.amount)) extra.amount = context.amount;
  if (context.status) extra.status = context.status;
  return extra;
}

function parseSampleRate(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) return fallback;

  const value = Number.parseFloat(rawValue);
  if (!Number.isFinite(value)) return fallback;

  return Math.min(1, Math.max(0, value));
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function initializeSentry(): boolean {
  const dsn = optionalEnv("SENTRY_DSN");
  if (!dsn) {
    if (process.env.NODE_ENV === "production") {
      console.warn("WARNING: Sentry disabled in production because SENTRY_DSN is not configured.");
    }
    return false;
  }

  Sentry.init({
    dsn,
    environment: optionalEnv("SENTRY_ENVIRONMENT") ?? process.env.NODE_ENV ?? "development",
    release: optionalEnv("SENTRY_RELEASE"),
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE,
      DEFAULT_TRACES_SAMPLE_RATE,
    ),
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.mongooseIntegration(),
    ],
  });

  return true;
}

export const sentryEnabled = initializeSentry();

export function setupSentryErrorHandler(app: Express): void {
  if (!sentryEnabled || !Sentry.isEnabled()) return;
  Sentry.setupExpressErrorHandler(app);
}

export function captureBackendException(error: unknown, context?: BackendCaptureContext): void {
  if (!sentryEnabled || !Sentry.isEnabled()) return;
  Sentry.captureException(error, context);
}

export function captureBillingCriticalException(
  error: unknown,
  context: BillingCriticalContext,
): void {
  captureBackendException(error, {
    tags: {
      feature: "billing",
      severity: "critical",
      event: context.event,
    },
    extra: {
      event: context.event,
      ...buildBillingCriticalExtra(context),
    },
  });
}

export async function flushSentry(timeoutMs = DEFAULT_FLUSH_TIMEOUT_MS): Promise<void> {
  if (!sentryEnabled || !Sentry.isEnabled()) return;
  await Sentry.flush(timeoutMs);
}
