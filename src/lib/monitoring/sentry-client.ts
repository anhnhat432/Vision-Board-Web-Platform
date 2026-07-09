import { browserTracingIntegration, captureException, init, withScope } from "@sentry/react";

import type { FrontendCaptureContext } from "./sentry";

const MAX_SANITIZE_DEPTH = 6;
const MAX_SANITIZED_ARRAY_ITEMS = 50;
const MAX_SANITIZED_STRING_LENGTH = 1_000;
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
  /(?:password|passcode|token|secret|api[_-]?key|authorization|cookie|session|idtoken|refreshToken|credential|private[_-]?key|email|phone|address|bank|card|cvv|otp|pin|userId|uid|firebaseUid|ownerUid|customerId)/i;

type FrontendSentryOptions = NonNullable<Parameters<typeof init>[0]>;
type FrontendSentryBeforeSend = NonNullable<FrontendSentryOptions["beforeSend"]>;
type FrontendSentryEvent = Parameters<FrontendSentryBeforeSend>[0];

interface FrontendMonitoringClientOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
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

function sanitizeMonitoringTags(tags: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tags).map(([key, value]) => [
      key,
      shouldRedactKey(key) ? REDACTED : sanitizeMonitoringString(value),
    ]),
  );
}

function sanitizeMonitoringContext(context: Record<string, unknown>): Record<string, unknown> {
  return sanitizeMonitoringValue(context) as Record<string, unknown>;
}

export function sanitizeFrontendSentryEvent(event: FrontendSentryEvent): FrontendSentryEvent {
  const sanitized = sanitizeMonitoringValue(event) as FrontendSentryEvent;
  if (event.user) {
    sanitized.user = { hasUser: true } as FrontendSentryEvent["user"];
  }
  return sanitized;
}

export function initFrontendMonitoringClient(options: FrontendMonitoringClientOptions): void {
  init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    sendDefaultPii: false,
    tracesSampleRate: options.tracesSampleRate,
    integrations: [browserTracingIntegration()],
    beforeSend: (event) => sanitizeFrontendSentryEvent(event),
  });
}

export function captureFrontendClientException(error: unknown, context?: FrontendCaptureContext): void {
  withScope((scope) => {
    if (context?.tags) {
      scope.setTags(sanitizeMonitoringTags(context.tags));
    }
    if (context?.extra) {
      scope.setContext("extra", sanitizeMonitoringContext(context.extra));
    }
    if (context) {
      const appContext = { ...context };
      delete appContext.tags;
      delete appContext.extra;
      scope.setContext("app", sanitizeMonitoringContext(appContext));
    }
    captureException(error);
  });
}
