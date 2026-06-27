import { useCallback, useEffect, useRef, useState } from "react";
import type { useSearchParams } from "react-router";
import { toast } from "sonner";

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

const MAX_RETRY_ATTEMPTS = 4;
const INITIAL_RETRY_DELAY_MS = 2000;

/**
 * Polls server entitlement after returning from checkout with exponential
 * backoff retry (2 s → 4 s → 8 s → 16 s, up to 4 attempts). Includes a
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
  const attemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
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
        attemptRef.current = 0;
        setCheckoutReturnStatus("confirmed");
        toast.success(`Đã xác nhận gói ${result.planCode} trên tài khoản.`);
        return;
      }

      // Payment may still be processing — retry with backoff.
      attemptRef.current += 1;
      if (attemptRef.current < MAX_RETRY_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** (attemptRef.current - 1);
        setCheckoutReturnStatus("pending");
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          void pollServerEntitlement();
        }, delay);
        return;
      }

      // Exhausted retries.
      attemptRef.current = 0;
      setCheckoutReturnStatus("pending");
      logBillingUiError(new Error("Checkout return entitlement still unconfirmed."), {
        surface: "BillingPlan",
        action: "checkout_return_unconfirmed",
        status: result.status,
      });
      toast.info("Thanh toán đang được xử lý. Quyền sẽ được cập nhật khi hệ thống xác nhận.");
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      attemptRef.current += 1;
      if (attemptRef.current < MAX_RETRY_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** (attemptRef.current - 1);
        setCheckoutReturnStatus("pending");
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          void pollServerEntitlement();
        }, delay);
        return;
      }

      attemptRef.current = 0;
      setCheckoutReturnStatus("failed");
      if (!toastBillingNetworkError(error, { surface: "BillingPlan", action: "poll_server_entitlement" })) {
        logBillingUiError(error, { surface: "BillingPlan", action: "poll_server_entitlement" });
        toast.error("Không thể kiểm tra quyền trên tài khoản. Vui lòng thử lại.");
      }
    }
  }, [isCheckoutReturn, searchParams, setSearchParams, reloadUserData]);

  useEffect(() => {
    if (isCheckoutReturn && checkoutReturnStatus === "idle") {
      attemptRef.current = 0;
      void pollServerEntitlement();
    }
  }, [isCheckoutReturn, checkoutReturnStatus, pollServerEntitlement]);

  return { checkoutReturnStatus, retry: pollServerEntitlement };
}
