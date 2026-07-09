import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeBackendSentryEvent } from "../monitoring/sentry";

describe("backend Sentry monitoring privacy", () => {
  it("scrubs sensitive data while preserving safe operational metadata", () => {
    const scrubbed = sanitizeBackendSentryEvent({
      breadcrumbs: [
        {
          data: {
            password: "CorrectHorseBatteryStaple",
          },
          message: "Webhook failed for alice@example.com",
        },
      ],
      contexts: {
        billing: {
          checkoutUrl: "https://pay.internal.local/checkout?token=provider-token",
          email: "alice@example.com",
          orderId: "order_safe_for_triage",
          status: "failed",
        },
      },
      exception: {
        values: [
          {
            type: "ProviderError",
            value:
              "PayOS failed for alice@example.com with password=CorrectHorseBatteryStaple at https://provider.internal.local/api?token=raw-token",
          },
        ],
      },
      extra: {
        amount: 750000,
        authorization: "Bearer raw-token-123",
        event: "billing_webhook_failed",
        provider: "payos",
        status: "failed",
        userId: "firebase-uid-123",
      },
      message: "Unhandled backend error for alice@example.com token=raw-token",
      request: {
        headers: {
          authorization: "Bearer raw-token-456",
        },
        url: "https://api.example.com/billing/webhook/payos?token=request-token",
      },
      tags: {
        event: "billing_webhook_failed",
        provider: "payos",
        token: "raw-tag-token",
      },
      user: {
        email: "alice@example.com",
        id: "firebase-uid-123",
      },
    } as never) as unknown as Record<string, unknown>;

    const scrubbedJson = JSON.stringify(scrubbed);
    assert.match(scrubbedJson, /\[redacted-email\]/);
    assert.match(scrubbedJson, /\[redacted-url\]/);
    assert.match(scrubbedJson, /billing_webhook_failed/);
    assert.match(scrubbedJson, /payos/);
    assert.match(scrubbedJson, /failed/);
    assert.match(scrubbedJson, /750000/);
    assert.match(scrubbedJson, /order_safe_for_triage/);
    assert.doesNotMatch(scrubbedJson, /alice@example\.com/);
    assert.doesNotMatch(scrubbedJson, /CorrectHorseBatteryStaple/);
    assert.doesNotMatch(scrubbedJson, /provider-token/);
    assert.doesNotMatch(scrubbedJson, /raw-token/);
    assert.doesNotMatch(scrubbedJson, /firebase-uid-123/);
  });
});
