import type { Subscription } from "./storage-types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const BILLING_EXPIRY_NOTICE_DAYS = 7;

export interface BillingExpiryInfo {
  expiresAt: Date | null;
  daysLeft: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export function getBillingExpiryInfo(
  subscription: Subscription | null | undefined,
  referenceDate = new Date(),
  noticeDays = BILLING_EXPIRY_NOTICE_DAYS,
): BillingExpiryInfo {
  if (!subscription?.renewsAt) {
    return {
      expiresAt: null,
      daysLeft: null,
      isExpired: false,
      isExpiringSoon: false,
    };
  }

  const expiresAt = new Date(subscription.renewsAt);
  if (!Number.isFinite(expiresAt.valueOf())) {
    return {
      expiresAt: null,
      daysLeft: null,
      isExpired: false,
      isExpiringSoon: false,
    };
  }

  const remainingMs = expiresAt.getTime() - referenceDate.getTime();
  const isExpired = remainingMs < 0;
  const daysLeft = isExpired ? Math.floor(remainingMs / MS_PER_DAY) : Math.ceil(remainingMs / MS_PER_DAY);

  return {
    expiresAt,
    daysLeft,
    isExpired,
    isExpiringSoon: !isExpired && daysLeft <= noticeDays,
  };
}

export function formatBillingExpiryDate(value: Date | string | null | undefined): string {
  if (!value) return "chưa có";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.valueOf())) return String(value);

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
