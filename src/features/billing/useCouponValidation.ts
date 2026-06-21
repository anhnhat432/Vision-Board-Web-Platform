import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/apiClient";

export interface DiscountInfo {
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  discountCode?: string;
  discountId?: string;
  discountName?: string;
  minAmount?: number;
  originalAmount?: number;
  finalAmount?: number;
  reason?: string;
}

export interface CouponValidationState {
  status: "idle" | "loading" | "valid" | "invalid";
  discount: DiscountInfo | null;
  error: string | null;
}

export interface UseCouponValidationOptions {
  planCode?: string;
  purpose?: "plus_subscription" | "physical_order";
}

export function useCouponValidation(options: UseCouponValidationOptions = {}) {
  const { planCode = "PLUS", purpose } = options;
  const [state, setState] = useState<CouponValidationState>({
    status: "idle",
    discount: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const validate = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        setState({ status: "idle", discount: null, error: null });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "loading", discount: null, error: null });

      try {
        const result = await apiClient.post<{ valid: boolean } & DiscountInfo>(
          "/billing/validate-coupon",
          { code: trimmed, planCode, purpose },
          { signal: controller.signal },
        );

        if (result.valid) {
          setState({ status: "valid", discount: result as DiscountInfo, error: null });
        } else {
          setState({ status: "invalid", discount: null, error: (result as DiscountInfo).reason ?? "Mã không hợp lệ." });
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : "Không thể kiểm tra mã giảm giá.";
        setState({ status: "invalid", discount: null, error: message });
      }
    },
    [planCode, purpose],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", discount: null, error: null });
  }, []);

  return { ...state, validate, reset };
}
