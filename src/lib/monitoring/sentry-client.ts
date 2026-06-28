import { browserTracingIntegration, captureException, init, withScope } from "@sentry/react";

import type { FrontendCaptureContext } from "./sentry";

interface FrontendMonitoringClientOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
}

export function initFrontendMonitoringClient(options: FrontendMonitoringClientOptions): void {
  init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    sendDefaultPii: false,
    tracesSampleRate: options.tracesSampleRate,
    integrations: [browserTracingIntegration()],
  });
}

export function captureFrontendClientException(error: unknown, context?: FrontendCaptureContext): void {
  withScope((scope) => {
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
    captureException(error);
  });
}
