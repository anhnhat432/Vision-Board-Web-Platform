import { toast } from "sonner";
import { captureFrontendException } from "@/lib/monitoring/sentry";

const BILLING_NETWORK_ERROR_MESSAGE = "Mạng có vấn đề, vui lòng thử lại";
const BILLING_NETWORK_TOAST_INTERVAL_MS = 15_000;
let lastBillingNetworkToastAt = 0;

interface BillingUiErrorContext {
  surface: "UpgradePaywallDialog" | "BillingCheckoutQR" | "OrderStatusPage" | "BillingPlan";
  action: string;
  orderId?: string | null;
  amount?: number | null;
  status?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function isBillingNetworkError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.isNetworkError === true) return true;
  if (error.name === "AbortError") return true;
  if (typeof error.status === "number") return false;

  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  return message.includes("network") || message.includes("fetch") || message.includes("kết nối");
}

function getAmountBand(amount: number): string | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (amount === 0) return "zero";
  if (amount < 100_000) return "under_100k";
  if (amount < 500_000) return "100k_to_499k";
  if (amount < 1_000_000) return "500k_to_999k";
  return "1m_plus";
}

function sanitizeBillingUiContext(context: BillingUiErrorContext): Record<string, boolean | string> {
  const sanitized: Record<string, boolean | string> = {
    surface: context.surface,
    action: context.action,
  };

  if (context.orderId) sanitized.hasOrderId = true;
  if (typeof context.amount === "number") {
    const amountBand = getAmountBand(context.amount);
    if (amountBand) sanitized.amountBand = amountBand;
  }
  if (context.status) sanitized.status = context.status;

  return sanitized;
}

export function logBillingUiError(error: unknown, context: BillingUiErrorContext): void {
  captureFrontendException(error, {
    tags: {
      feature: "billing-ui",
    },
    extra: sanitizeBillingUiContext(context),
  });
}

export function toastBillingNetworkError(error: unknown, context: BillingUiErrorContext): boolean {
  if (!isBillingNetworkError(error)) return false;

  const now = Date.now();
  if (now - lastBillingNetworkToastAt > BILLING_NETWORK_TOAST_INTERVAL_MS) {
    toast.error(BILLING_NETWORK_ERROR_MESSAGE);
    lastBillingNetworkToastAt = now;
  }
  logBillingUiError(error, context);
  return true;
}
