import { beforeEach, describe, expect, it, vi } from "vitest";

const monitoringMock = vi.hoisted(() => ({
  captureFrontendException: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  captureFrontendException: monitoringMock.captureFrontendException,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import { logBillingUiError } from "./billing-ui-monitoring";

describe("billing UI monitoring", () => {
  beforeEach(() => {
    monitoringMock.captureFrontendException.mockReset();
    toastMock.error.mockReset();
  });

  it("captures billing errors with safe metadata only", () => {
    logBillingUiError(new Error("checkout failed"), {
      surface: "BillingCheckoutQR",
      action: "fetch_order_status",
      orderId: "VBSECRETORDER123",
      amount: 99_000,
      status: "pending",
    });

    expect(monitoringMock.captureFrontendException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: {
          feature: "billing-ui",
        },
        extra: {
          surface: "BillingCheckoutQR",
          action: "fetch_order_status",
          hasOrderId: true,
          amountBand: "under_100k",
          status: "pending",
        },
      }),
    );

    const contextJson = JSON.stringify(monitoringMock.captureFrontendException.mock.calls[0]?.[1]);
    expect(contextJson).not.toContain("VBSECRETORDER123");
    expect(contextJson).not.toContain("99000");
  });

  it("coarsens higher billing amounts into bands", () => {
    logBillingUiError(new Error("portal failed"), {
      surface: "BillingPlan",
      action: "open_customer_portal",
      amount: 750_000,
    });

    expect(monitoringMock.captureFrontendException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({
          amountBand: "500k_to_999k",
        }),
      }),
    );

    expect(JSON.stringify(monitoringMock.captureFrontendException.mock.calls[0]?.[1])).not.toContain("750000");
  });
});
