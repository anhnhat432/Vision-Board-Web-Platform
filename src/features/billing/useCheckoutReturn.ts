import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { useSearchParams } from "react-router";

import { logBillingUiError, toastBillingNetworkError } from "../../app/utils/billing-ui-monitoring";
import { syncEntitlementsWithProvider } from "../../app/utils/production";
import type { CheckoutReturnStatus } from "./types";

type SearchParamsTuple = ReturnType<typeof useSearchParams>;

export interface UseCheckoutReturnArgs {
  isCheckoutReturn: boolean;
  searchParams: SearchParamsTuple[0];
  setSearchParams: SearchParamsTuple[1];
  reloadUserData: () => void;
}

export interface UseCheckoutReturnResult {
  checkoutReturnStatus: CheckoutReturnStatus;
  retry: () => Promise<void>;
}

/**
 * Polls server entitlement after returning from checkout. Includes a
 * cancel guard via AbortController-style ref so unmounted components do
 * not call setState (fixes a long-standing race in BillingPlan).
 */
export function useCheckoutReturn({
  isCheckoutReturn,
  searchParams,
  setSearchParams,
  reloadUserData,
}: UseCheckoutReturnArgs): UseCheckoutReturnResult {
  const [checkoutReturnStatus, setCheckoutReturnStatus] = useState<CheckoutReturnStatus>("idle");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const pollServerEntitlement = useCallback(async () => {
    if (!isCheckoutReturn) return;
    if (isMountedRef.current) setCheckoutReturnStatus("pending");

    const newParams = new URLSearchParams(searchParams);
    newParams.delete("status");
    newParams.delete("context");
    setSearchParams(newParams, { replace: true });

    try {
      const result = await syncEntitlementsWithProvider();
      if (!isMountedRef.current) return;
      reloadUserData();
      if (result.ok && result.planCode !== "FREE") {
        setCheckoutReturnStatus("confirmed");
        toast.success(`Đã xác nhận gói ${result.planCode} trên tài khoản.`);
      } else {
        setCheckoutReturnStatus("pending");
        toast.info("Thanh toán đang được xử lý. Quyền sẽ được cập nhật khi hệ thống xác nhận.");
      }
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      setCheckoutReturnStatus("failed");
      if (!toastBillingNetworkError(error, { surface: "BillingPlan", action: "poll_server_entitlement" })) {
        logBillingUiError(error, { surface: "BillingPlan", action: "poll_server_entitlement" });
        toast.error("Không thể kiểm tra quyền trên tài khoản. Vui lòng thử lại.");
      }
    }
  }, [isCheckoutReturn, searchParams, setSearchParams, reloadUserData]);

  useEffect(() => {
    if (isCheckoutReturn && checkoutReturnStatus === "idle") {
      void pollServerEntitlement();
    }
  }, [isCheckoutReturn, checkoutReturnStatus, pollServerEntitlement]);

  return { checkoutReturnStatus, retry: pollServerEntitlement };
}
