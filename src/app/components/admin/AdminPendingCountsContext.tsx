import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Pending counts surfaced as small badges on the admin sidebar.
 *
 * Pages own the data fetch (e.g. `/admin/refunds` knows the pending refund count).
 * They report into this context so the sidebar — which lives one level up — can
 * render badges without re-fetching or duplicating loaders.
 */
export interface AdminPendingCounts {
  /** Số đơn in đang chờ xác nhận. */
  orders?: number;
  /** Số đơn thanh toán tự động đang ở trạng thái pending. */
  payments?: number;
  /** Số yêu cầu hoàn tiền đang chờ duyệt. */
  refunds?: number;
}

interface AdminPendingCountsContextValue {
  counts: AdminPendingCounts;
  setOrdersPending: (value: number | undefined) => void;
  setPaymentsPending: (value: number | undefined) => void;
  setRefundsPending: (value: number | undefined) => void;
}

const AdminPendingCountsContext = createContext<AdminPendingCountsContextValue | null>(null);

export function AdminPendingCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<AdminPendingCounts>({});

  const setOrdersPending = useCallback((value: number | undefined) => {
    setCounts((prev) => (prev.orders === value ? prev : { ...prev, orders: value }));
  }, []);
  const setPaymentsPending = useCallback((value: number | undefined) => {
    setCounts((prev) => (prev.payments === value ? prev : { ...prev, payments: value }));
  }, []);
  const setRefundsPending = useCallback((value: number | undefined) => {
    setCounts((prev) => (prev.refunds === value ? prev : { ...prev, refunds: value }));
  }, []);

  const value = useMemo(
    () => ({ counts, setOrdersPending, setPaymentsPending, setRefundsPending }),
    [counts, setOrdersPending, setPaymentsPending, setRefundsPending],
  );

  return <AdminPendingCountsContext.Provider value={value}>{children}</AdminPendingCountsContext.Provider>;
}

export function useAdminPendingCounts(): AdminPendingCountsContextValue {
  const ctx = useContext(AdminPendingCountsContext);
  if (!ctx) {
    // Pages may render outside the admin layout in tests; fall back to noop so
    // they never crash, but warn so it's visible during development.
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("useAdminPendingCounts called outside AdminPendingCountsProvider; returning noop");
    }
    return {
      counts: {},
      setOrdersPending: () => {},
      setPaymentsPending: () => {},
      setRefundsPending: () => {},
    };
  }
  return ctx;
}
