import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api/apiClient";
import { logBillingUiError, toastBillingNetworkError } from "../../app/utils/billing-ui-monitoring";
import { getPaymentHistoryErrorMessage } from "./helpers";
import type { PaymentHistoryOrder, PaymentHistoryResponse } from "./types";

export const PAYMENT_HISTORY_REQUEST_TIMEOUT_MS = 8_000;

export interface UsePaymentHistoryResult {
  paymentHistory: PaymentHistoryOrder[];
  setPaymentHistory: React.Dispatch<React.SetStateAction<PaymentHistoryOrder[]>>;
  isLoadingPaymentHistory: boolean;
  paymentHistoryError: string | null;
  loadPaymentHistory: () => Promise<void>;
}

export function usePaymentHistory(canLoad: boolean): UsePaymentHistoryResult {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryOrder[]>([]);
  const [isLoadingPaymentHistory, setIsLoadingPaymentHistory] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState<string | null>(null);

  const loadPaymentHistory = useCallback(async () => {
    if (!canLoad) return;
    setIsLoadingPaymentHistory(true);
    setPaymentHistoryError(null);
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
    } catch (error: unknown) {
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
    } finally {
      globalThis.clearTimeout(timeoutId);
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
    paymentHistoryError,
    loadPaymentHistory,
  };
}
