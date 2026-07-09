import type { User } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/auth/firebase";

const RETURN_TO_KEY = "emailVerification:returnTo";

function getCurrentUser(explicitUser?: User | null): User | null {
  if (explicitUser !== undefined) return explicitUser;
  return getFirebaseAuth()?.currentUser ?? null;
}

export function canDoCriticalAction(user?: User | null): boolean {
  return getCurrentUser(user)?.emailVerified === true;
}

export function canUpgradeToPlus(_user?: User | null): boolean {
  return true;
}

export function canSyncToCloud(user?: User | null): boolean {
  return canDoCriticalAction(user);
}

export function canRequestRefund(user?: User | null): boolean {
  return canDoCriticalAction(user);
}

export function rememberEmailVerificationReturnPath(path?: string): void {
  if (typeof window === "undefined") return;
  const returnTo = path ?? `${window.location.pathname || "/"}${window.location.search || ""}`;
  window.sessionStorage.setItem(RETURN_TO_KEY, returnTo);
}

export function getEmailVerificationRequiredMessage(
  action: "sync" | "refund" | "critical" = "critical",
): string {
  if (action === "sync") {
    return "Vui lòng xác thực email trước khi đồng bộ cloud để bảo vệ dữ liệu tài khoản.";
  }
  if (action === "refund") {
    return "Vui lòng xác thực email trước khi yêu cầu hoàn tiền để đội hỗ trợ liên hệ đúng địa chỉ.";
  }
  return "Vui lòng xác thực email trước khi tiếp tục thao tác quan trọng này.";
}
