import type { UserData } from "./storage-types";
import { SUBSCRIPTION_GRACE_PERIOD_MS } from "./storage-billing-ops";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface GraceState {
  active: boolean;
  inGracePeriod: boolean;
  gracePeriodEndsAt: string | null;
  daysRemaining: number;
}

export function getSubscriptionGraceState(userData: UserData, now: Date = new Date()): GraceState {
  const sub = userData.subscription;
  if (!sub?.renewsAt) {
    return {
      active: Boolean(sub),
      inGracePeriod: false,
      gracePeriodEndsAt: null,
      daysRemaining: 0,
    };
  }

  const renewsAt = new Date(sub.renewsAt).getTime();
  if (!Number.isFinite(renewsAt)) {
    return {
      active: Boolean(sub),
      inGracePeriod: false,
      gracePeriodEndsAt: null,
      daysRemaining: 0,
    };
  }

  const nowMs = now.getTime();
  const graceEnd = renewsAt + SUBSCRIPTION_GRACE_PERIOD_MS;

  if (nowMs < renewsAt) {
    return {
      active: true,
      inGracePeriod: false,
      gracePeriodEndsAt: null,
      daysRemaining: Math.ceil((renewsAt - nowMs) / MS_PER_DAY),
    };
  }

  if (nowMs < graceEnd) {
    return {
      active: true,
      inGracePeriod: true,
      gracePeriodEndsAt: new Date(graceEnd).toISOString(),
      daysRemaining: Math.ceil((graceEnd - nowMs) / MS_PER_DAY),
    };
  }

  return {
    active: false,
    inGracePeriod: false,
    gracePeriodEndsAt: null,
    daysRemaining: 0,
  };
}
