import { afterEach, describe, expect, it, vi } from "vitest";

async function importBillingCoreWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.unstubAllEnvs();

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      vi.stubEnv(key, "");
    } else {
      vi.stubEnv(key, value);
    }
  }

  return import("./billingCore");
}

describe("billing provider mode resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it("keeps mock provider available in demo mode", async () => {
    const { getBillingProviderMode } = await importBillingCoreWithEnv({
      VITE_APP_MODE: "demo",
      VITE_BILLING_PROVIDER_MODE: "mock_provider",
      VITE_API_BASE_URL: "https://api.example.test",
    });

    expect(getBillingProviderMode()).toBe("mock_provider");
  });

  it("forces api contract in real mode when billing is accidentally configured as mock", async () => {
    const { getBillingProviderMode } = await importBillingCoreWithEnv({
      VITE_APP_MODE: "real",
      VITE_BILLING_PROVIDER_MODE: "mock_provider",
      VITE_API_BASE_URL: "https://api.example.test",
    });

    expect(getBillingProviderMode()).toBe("api_contract");
  });

  it("defaults real mode to api contract instead of mock billing", async () => {
    const { getBillingProviderMode } = await importBillingCoreWithEnv({
      VITE_APP_MODE: "real",
      VITE_BILLING_PROVIDER_MODE: "",
      VITE_API_BASE_URL: "https://api.example.test",
    });

    expect(getBillingProviderMode()).toBe("api_contract");
  });

  it("persists cancel-at-period-end state from a server entitlement payload", async () => {
    const { applyBillingAccessPayload } = await importBillingCoreWithEnv({
      VITE_APP_MODE: "real",
      VITE_BILLING_PROVIDER_MODE: "api_contract",
      VITE_API_BASE_URL: "https://api.example.test",
    });
    const { getUserData } = await import("../storage");

    applyBillingAccessPayload(
      {
        planCode: "PLUS",
        subscription: {
          planCode: "PLUS",
          status: "active",
          renewsAt: "2099-06-01T00:00:00.000Z",
          cancelAtPeriodEnd: true,
        },
        entitlements: ["premium_templates", "premium_review_insights"],
      },
      "api_contract",
    );

    expect(getUserData().subscription).toMatchObject({
      planCode: "PLUS",
      status: "active",
      renewsAt: "2099-06-01T00:00:00.000Z",
      cancelAtPeriodEnd: true,
    });
  });
});
