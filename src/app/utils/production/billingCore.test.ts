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
});
