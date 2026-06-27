import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { syncEntitlementsWithProvider } from "../../app/utils/production";
import { useCheckoutReturn } from "./useCheckoutReturn";

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

const billingMonitoringMock = vi.hoisted(() => ({
  logBillingUiError: vi.fn(),
  toastBillingNetworkError: vi.fn(() => false),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("../../app/utils/production", () => ({
  syncEntitlementsWithProvider: vi.fn(),
}));

vi.mock("../../app/utils/billing-ui-monitoring", () => ({
  logBillingUiError: billingMonitoringMock.logBillingUiError,
  toastBillingNetworkError: billingMonitoringMock.toastBillingNetworkError,
}));

const syncEntitlementsWithProviderMock = vi.mocked(syncEntitlementsWithProvider);

function createSearchParamsTuple(initial = "status=success&context=plan&keep=1") {
  const searchParams = new URLSearchParams(initial);
  const setSearchParams = vi.fn();

  return {
    searchParams,
    setSearchParams,
  };
}

describe("useCheckoutReturn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    syncEntitlementsWithProviderMock.mockReset();
    toastMock.success.mockReset();
    toastMock.info.mockReset();
    toastMock.error.mockReset();
    billingMonitoringMock.logBillingUiError.mockReset();
    billingMonitoringMock.toastBillingNetworkError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function flushMicrotasks() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("confirms checkout return only after server entitlement sync returns a non-free plan", async () => {
    syncEntitlementsWithProviderMock.mockResolvedValue({
      ok: true,
      status: "synced",
      providerMode: "api_contract",
      planCode: "PLUS",
      entitlementKeys: ["premium_templates"],
      message: "Server confirmed Plus.",
    });
    const reloadUserData = vi.fn();
    const { searchParams, setSearchParams } = createSearchParamsTuple();

    const { result } = renderHook(() =>
      useCheckoutReturn({
        isCheckoutReturn: true,
        searchParams,
        setSearchParams,
        reloadUserData,
      }),
    );

    await flushMicrotasks();

    expect(syncEntitlementsWithProviderMock).toHaveBeenCalledTimes(1);
    expect(result.current.checkoutReturnStatus).toBe("confirmed");
    expect(reloadUserData).toHaveBeenCalledTimes(1);
    expect(setSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
    const cleanedParams = setSearchParams.mock.calls[0]?.[0] as URLSearchParams;
    expect(cleanedParams.get("status")).toBeNull();
    expect(cleanedParams.get("context")).toBeNull();
    expect(cleanedParams.get("keep")).toBe("1");
    expect(toastMock.success).toHaveBeenCalledWith("Đã xác nhận gói PLUS trên tài khoản.");
  });

  it("keeps checkout return pending when server entitlement is still FREE", async () => {
    syncEntitlementsWithProviderMock.mockResolvedValue({
      ok: true,
      status: "already_current",
      providerMode: "api_contract",
      planCode: "FREE",
      entitlementKeys: [],
      message: "Still free.",
    });
    const reloadUserData = vi.fn();
    const { searchParams, setSearchParams } = createSearchParamsTuple();

    const { result, unmount } = renderHook(() =>
      useCheckoutReturn({
        isCheckoutReturn: true,
        searchParams,
        setSearchParams,
        reloadUserData,
      }),
    );

    await flushMicrotasks();

    expect(syncEntitlementsWithProviderMock).toHaveBeenCalledTimes(1);
    expect(result.current.checkoutReturnStatus).toBe("pending");
    expect(reloadUserData).toHaveBeenCalledTimes(1);
    expect(toastMock.success).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    await flushMicrotasks();

    expect(syncEntitlementsWithProviderMock).toHaveBeenCalledTimes(2);
    expect(result.current.checkoutReturnStatus).toBe("pending");
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(setSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });

    unmount();
  });

  it("captures monitoring when checkout return stays FREE after all retries", async () => {
    syncEntitlementsWithProviderMock.mockResolvedValue({
      ok: true,
      status: "already_current",
      providerMode: "api_contract",
      planCode: "FREE",
      entitlementKeys: [],
      message: "Still free.",
    });
    const reloadUserData = vi.fn();
    const { searchParams, setSearchParams } = createSearchParamsTuple();

    const { result, unmount } = renderHook(() =>
      useCheckoutReturn({
        isCheckoutReturn: true,
        searchParams,
        setSearchParams,
        reloadUserData,
      }),
    );

    await flushMicrotasks();

    for (const delay of [2_000, 4_000, 8_000]) {
      act(() => {
        vi.advanceTimersByTime(delay);
      });
      await flushMicrotasks();
    }

    expect(syncEntitlementsWithProviderMock).toHaveBeenCalledTimes(4);
    expect(result.current.checkoutReturnStatus).toBe("pending");
    expect(toastMock.info).toHaveBeenCalledTimes(1);
    expect(billingMonitoringMock.logBillingUiError).toHaveBeenCalledWith(expect.any(Error), {
      surface: "BillingPlan",
      action: "checkout_return_unconfirmed",
      status: "already_current",
    });

    unmount();
  });
});
