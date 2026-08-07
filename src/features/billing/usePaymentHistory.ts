import { useCallback, useEffect, useState } from "react";

import { apiClient, toAppError } from "@/lib/api/apiClient";
import {
  isBillingNetworkError,
  logBillingUiError,
  toastBillingNetworkError,
} from "../../app/utils/billing-ui-monitoring";
import { getPaymentHistoryErrorMessage } from "./helpers";
import type { PaymentHistoryOrder, PaymentHistoryResponse } from "./types";

export const PAYMENT_HISTORY_REQUEST_TIMEOUT_MS = 8_000;
const PAYMENT_HISTORY_MAX_ATTEMPTS = 2;

function isTransientPaymentHistoryError(error: unknown, timedOut: boolean): boolean {
  if (timedOut || isBillingNetworkError(error)) return true;
  const appError = toAppError(error);
  return typeof appError.status === "number" && appError.status >= 500;
}

export interface UsePaymentHistoryResult {
  paymentHistory: PaymentHistoryOrder[];
  setPaymentHistory: React.Dispatch<React.SetStateAction<PaymentHistoryOrder[]>>;
  isLoadingPaymentHistory: boolean;
  isRetryingPaymentHistory: boolean;
  paymentHistoryError: string | null;
  loadPaymentHistory: () => Promise<void>;
}

export function usePaymentHistory(canLoad: boolean): UsePaymentHistoryResult {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryOrder[]>([]);
  const [isLoadingPaymentHistory, setIsLoadingPaymentHistory] = useState(false);
  const [isRetryingPaymentHistory, setIsRetryingPaymentHistory] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState<string | null>(null);

  const loadPaymentHistory = useCallback(async () => {
    if (!canLoad) return;
    setIsLoadingPaymentHistory(true);
    setIsRetryingPaymentHistory(false);
    setPaymentHistoryError(null);

    try {
      for (let attempt = 0; attempt < PAYMENT_HISTORY_MAX_ATTEMPTS; attempt += 1) {
        let timedOut = false;
        const controller = new AbortController();
        const timeoutId = globalThis.setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, PAYMENT_HISTORY_REQUEST_TIMEOUT_MS);

        try {
          const response = await apiClient.get<PaymentHistoryResponse>("/billing/payment-history", {
            signal: controller.signal,
          });
          setPaymentHistory(response.orders);
          return;
        } catch (error: unknown) {
          const canRetry =
            attempt === 0 && isTransientPaymentHistoryError(error, timedOut);

          if (canRetry) {
            logBillingUiError(error, {
              surface: "BillingPlan",
              action: "load_payment_history_retry",
            });
            setIsRetryingPaymentHistory(true);
            continue;
          }

          if (timedOut) {
            logBillingUiError(error, { surface: "BillingPlan", action: "load_payment_history_timeout" });
            setPaymentHistoryError(
              "Không thể tải lịch sử thanh toán sau vài giây. Dữ liệu thanh toán trên tài khoản vẫn an toàn; hãy thử lại.",
            );
            return;
          }

          if (toastBillingNetworkError(error, { surface: "BillingPlan", action: "load_payment_history" })) {
            setPaymentHistoryError("Mạng có vấn đề, vui lòng thử lại");
          } else {
            logBillingUiError(error, { surface: "BillingPlan", action: "load_payment_history" });
            setPaymentHistoryError(getPaymentHistoryErrorMessage(error));
          }
          return;
        } finally {
          globalThis.clearTimeout(timeoutId);
        }
      }
    } finally {
      setIsRetryingPaymentHistory(false);
      setIsLoadingPaymentHistory(false);
    }
  }, [canLoad]);

  useEffect(() => {
    if (!canLoad) return;
    void loadPaymentHistory();
  }, [canLoad, loadPaymentHistory]);

  return {
    paymentHistory,
    setPaymentHistory,
    isLoadingPaymentHistory,
    isRetryingPaymentHistory,
    paymentHistoryError,
    loadPaymentHistory,
  };
}
