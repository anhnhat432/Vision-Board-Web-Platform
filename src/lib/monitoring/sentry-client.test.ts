import { beforeEach, describe, expect, it, vi } from "vitest";

type SentryScopeMock = {
  setContext: ReturnType<typeof vi.fn>;
  setTags: ReturnType<typeof vi.fn>;
};

const sentryMock = vi.hoisted(() => {
  const scope: SentryScopeMock = {
    setContext: vi.fn(),
    setTags: vi.fn(),
  };

  return {
    browserTracingIntegration: vi.fn(() => ({ name: "browser-tracing" })),
    captureException: vi.fn(),
    init: vi.fn(),
    scope,
    withScope: vi.fn((callback: (scope: SentryScopeMock) => void) => callback(scope)),
  };
});

vi.mock("@sentry/react", () => ({
  browserTracingIntegration: sentryMock.browserTracingIntegration,
  captureException: sentryMock.captureException,
  init: sentryMock.init,
  withScope: sentryMock.withScope,
}));

import { captureFrontendClientException, initFrontendMonitoringClient } from "./sentry-client";

describe("frontend Sentry client privacy", () => {
  beforeEach(() => {
    sentryMock.browserTracingIntegration.mockClear();
    sentryMock.captureException.mockClear();
    sentryMock.init.mockClear();
    sentryMock.scope.setContext.mockClear();
    sentryMock.scope.setTags.mockClear();
    sentryMock.withScope.mockClear();
  });

  it("scrubs sensitive data from outgoing Sentry events before send", () => {
    initFrontendMonitoringClient({
      dsn: "https://public@example.invalid/1",
      environment: "real",
      tracesSampleRate: 0.02,
    });

    const initOptions = sentryMock.init.mock.calls[0]?.[0] as
      | { beforeSend?: (event: Record<string, unknown>) => Record<string, unknown> | null }
      | undefined;

    expect(initOptions?.beforeSend).toEqual(expect.any(Function));

    const scrubbed = initOptions?.beforeSend?.({
      breadcrumbs: [
        {
          data: {
            password: "CorrectHorseBatteryStaple",
          },
          message: "Fetch failed for alice@example.com",
        },
      ],
      contexts: {
        extra: {
          amountBand: "100k_to_499k",
          checkoutUrl: "https://pay.internal.local/checkout?token=provider-token",
          email: "alice@example.com",
          status: "failed",
        },
      },
      exception: {
        values: [
          {
            type: "FirebaseError",
            value:
              "Profile failed for alice@example.com with password=CorrectHorseBatteryStaple at https://api.internal.local/auth/profile?token=raw-token",
          },
        ],
      },
      extra: {
        authorization: "Bearer raw-token-123",
        phase: "full_sync",
        ownerUid: "firebase-uid-from-extra",
      },
      message: "Unhandled error for alice@example.com token=raw-token",
      request: {
        url: "https://app.example.com/reset-password?token=reset-token",
      },
      tags: {
        feature: "auth",
        token: "raw-tag-token",
        userId: "firebase-uid-from-tag",
      },
      user: {
        email: "alice@example.com",
        id: "firebase-uid-123",
      },
    });

    const scrubbedJson = JSON.stringify(scrubbed);
    expect(scrubbedJson).toContain("auth");
    expect(scrubbedJson).toContain("failed");
    expect(scrubbedJson).toContain("full_sync");
    expect(scrubbedJson).toContain("100k_to_499k");
    expect(scrubbedJson).toContain("[redacted-email]");
    expect(scrubbedJson).toContain("[redacted-url]");
    expect(scrubbedJson).not.toContain("alice@example.com");
    expect(scrubbedJson).not.toContain("CorrectHorseBatteryStaple");
    expect(scrubbedJson).not.toContain("provider-token");
    expect(scrubbedJson).not.toContain("raw-token");
    expect(scrubbedJson).not.toContain("firebase-uid-123");
    expect(scrubbedJson).not.toContain("firebase-uid-from-extra");
    expect(scrubbedJson).not.toContain("firebase-uid-from-tag");
  });

  it("sanitizes scope context before capturing frontend exceptions", () => {
    captureFrontendClientException(new Error("Checkout failed for alice@example.com token=raw-token"), {
      action: "checkout",
      extra: {
        checkoutUrl: "https://pay.internal.local/checkout?token=provider-token",
        email: "alice@example.com",
        ownerUid: "firebase-uid-from-extra",
        status: "failed",
      },
      status: "failed",
      supportEmail: "alice@example.com",
      tags: {
        feature: "billing",
        token: "raw-tag-token",
        userId: "firebase-uid-from-tag",
      },
    });

    expect(sentryMock.scope.setTags).toHaveBeenCalledWith({
      feature: "billing",
      token: "[redacted]",
      userId: "[redacted]",
    });

    const scopeContextJson = JSON.stringify(sentryMock.scope.setContext.mock.calls);
    expect(scopeContextJson).toContain("checkout");
    expect(scopeContextJson).toContain("failed");
    expect(scopeContextJson).toContain("[redacted]");
    expect(scopeContextJson).toContain("[redacted-url]");
    expect(scopeContextJson).not.toContain("alice@example.com");
    expect(scopeContextJson).not.toContain("firebase-uid-from-extra");
    expect(scopeContextJson).not.toContain("provider-token");
    expect(scopeContextJson).not.toContain("raw-tag-token");
    expect(JSON.stringify(sentryMock.scope.setTags.mock.calls)).not.toContain("firebase-uid-from-tag");
    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
  });
});
