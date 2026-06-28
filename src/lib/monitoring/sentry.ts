import { getAppMode } from "@/app/utils/app-mode";

const DEFAULT_TRACES_SAMPLE_RATE = 0.02;
type SentryClientModule = typeof import("./sentry-client");

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
let sentryClientPromise: Promise<SentryClientModule | null> | null = null;
let sentryInitPromise: Promise<SentryClientModule | null> | null = null;

interface InstallFrontendMonitoringOptions {
  deferUntilIdle?: boolean;
  delayMs?: number;
}

function loadSentryClient(): Promise<SentryClientModule | null> {
  if (!sentryEnabled) return Promise.resolve(null);
  sentryClientPromise ??= import("./sentry-client");
  return sentryClientPromise;
}

function initSentry(): Promise<SentryClientModule | null> {
  if (!sentryEnabled) return Promise.resolve(null);

  sentryInitPromise ??= loadSentryClient()
    .then((client) => {
      if (!client || !sentryDsn) return null;

      client.initFrontendMonitoringClient({
        dsn: sentryDsn,
        environment: optionalEnv(import.meta.env.VITE_SENTRY_ENVIRONMENT) ?? appMode,
        release: optionalEnv(import.meta.env.VITE_SENTRY_RELEASE),
        tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, DEFAULT_TRACES_SAMPLE_RATE),
      });

      return client;
    })
    .catch((error) => {
      sentryClientPromise = null;
      sentryInitPromise = null;
      console.error("Failed to initialize frontend monitoring.", error);
      return null;
    });

  return sentryInitPromise;
}

function installWhenBrowserIsIdle(delayMs: number): void {
  if (typeof window === "undefined") {
    void initSentry();
    return;
  }

  let idleHandle: number | null = null;
  let timeoutHandle: number | null = null;

  const cleanup = () => {
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    if (idleHandle !== null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleHandle);
      idleHandle = null;
    }
    window.removeEventListener("error", initNow, true);
    window.removeEventListener("unhandledrejection", initNow);
  };

  const initNow = () => {
    cleanup();
    void initSentry();
  };

  timeoutHandle = window.setTimeout(() => {
    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(initNow, { timeout: 3_000 });
      return;
    }

    initNow();
  }, delayMs);

  window.addEventListener("error", initNow, { capture: true, once: true });
  window.addEventListener("unhandledrejection", initNow, { once: true });
}

export function installFrontendMonitoring(options: InstallFrontendMonitoringOptions = {}): void {
  if (options.deferUntilIdle) {
    installWhenBrowserIsIdle(options.delayMs ?? 2_800);
    return;
  }

  void initSentry();
}

export interface FrontendCaptureContext extends Record<string, unknown> {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export function captureFrontendException(error: unknown, context?: FrontendCaptureContext): void {
  if (!sentryEnabled) return;

  void initSentry()
    .then((client) => {
      if (!client) return;
      client.captureFrontendClientException(error, context);
    })
    .catch((captureError) => {
      console.error("Failed to capture frontend exception.", captureError);
    });
}
