import * as Sentry from "@sentry/node";
import type { Express } from "express";

const DEFAULT_TRACES_SAMPLE_RATE = 0.05;
const DEFAULT_FLUSH_TIMEOUT_MS = 2000;
type BackendCaptureContext = Parameters<typeof Sentry.captureException>[1];
type BackendSentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;
type BackendSentryBeforeSend = NonNullable<BackendSentryOptions["beforeSend"]>;
type BackendSentryEvent = Parameters<BackendSentryBeforeSend>[0];

const MAX_SANITIZE_DEPTH = 6;
const MAX_SANITIZED_ARRAY_ITEMS = 50;
const MAX_SANITIZED_STRING_LENGTH = 1000;
const REDACTED = "[redacted]";
const REDACTED_EMAIL = "[redacted-email]";
const REDACTED_TOKEN = "[redacted-token]";
const REDACTED_URL = "[redacted-url]";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SECRET_KEY_VALUE_PATTERN =
  /\b(password|passcode|token|secret|api[_-]?key|authorization|cookie|session|idtoken|refreshToken|otp|pin)\s*[:=]\s*([^&\s,;]+)/gi;
const SENSITIVE_KEY_PATTERN =
  /(?:password|passcode|token|secret|api[_-]?key|authorization|cookie|session|idtoken|refreshToken|credential|private[_-]?key|email|phone|address|bank|card|cvv|otp|pin|userId|firebaseUid|ownerUid|customerId)/i;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function shouldRedactKey(key: string | undefined): boolean {
  return Boolean(key && SENSITIVE_KEY_PATTERN.test(key));
}

function truncateSanitizedString(value: string): string {
  if (value.length <= MAX_SANITIZED_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_SANITIZED_STRING_LENGTH)}...[truncated]`;
}

function sanitizeMonitoringString(value: string): string {
  const sanitized = value
    .replace(EMAIL_PATTERN, REDACTED_EMAIL)
    .replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED_TOKEN}`)
    .replace(SECRET_KEY_VALUE_PATTERN, (_match, key: string) => `${key}=${REDACTED}`)
    .replace(URL_PATTERN, REDACTED_URL);

  return truncateSanitizedString(sanitized);
}

function sanitizeMonitoringValue(value: unknown, key?: string, depth = 0): unknown {
  if (shouldRedactKey(key)) return REDACTED;

  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "string") return sanitizeMonitoringString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return "[non-serializable]";
  if (value instanceof Date) return value.toISOString();

  if (depth >= MAX_SANITIZE_DEPTH) return "[truncated-depth]";

  if (Array.isArray(value)) {
    const sanitizedItems = value
      .slice(0, MAX_SANITIZED_ARRAY_ITEMS)
      .map((item) => sanitizeMonitoringValue(item, key, depth + 1));

    if (value.length > MAX_SANITIZED_ARRAY_ITEMS) sanitizedItems.push("[truncated-array]");
    return sanitizedItems;
  }

  if (!isRecord(value)) return REDACTED;

  const sanitized: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    sanitized[childKey] = sanitizeMonitoringValue(childValue, childKey, depth + 1);
  }
  return sanitized;
}

export function sanitizeBackendSentryEvent(event: BackendSentryEvent): BackendSentryEvent {
  const sanitized = sanitizeMonitoringValue(event) as BackendSentryEvent;
  if (event.user) {
    sanitized.user = { hasUser: true } as BackendSentryEvent["user"];
  }
  return sanitized;
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
    beforeSend: (event) => sanitizeBackendSentryEvent(event),
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
