import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api/apiClient";
import { logBillingUiError, toastBillingNetworkError } from "../../app/utils/billing-ui-monitoring";
import { getPaymentHistoryErrorMessage } from "./helpers";
import type { PaymentHistoryOrder, PaymentHistoryResponse } from "./types";

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

    try {
      const response = await apiClient.get<PaymentHistoryResponse>("/billing/payment-history");
      setPaymentHistory(response.orders);
    } catch (error: unknown) {
      if (toastBillingNetworkError(error, { surface: "BillingPlan", action: "load_payment_history" })) {
        setPaymentHistoryError("Mạng có vấn đề, vui lòng thử lại");
      } else {
        logBillingUiError(error, { surface: "BillingPlan", action: "load_payment_history" });
        setPaymentHistoryError(getPaymentHistoryErrorMessage(error));
      }
    } finally {
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
