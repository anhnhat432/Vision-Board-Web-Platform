import { useEffect, useRef } from "react";

import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { syncEntitlementsWithProvider } from "../../../utils/production";
import { getCurrentPlan, getUserData } from "../../../utils/storage";

interface UseEntitlementsAutoSyncArgs {
  demoMode: boolean;
  isConfigured: boolean;
  user: { uid: string } | null | undefined;
  userProfile: { id?: string | null; role?: string | null } | null | undefined;
  onPlanUpgraded: () => void;
}

/**
 * Tự động đồng bộ entitlement với provider khi user signed-in.
 * - Bỏ qua trong demo mode, khi auth/api chưa cấu hình, hoặc khi user là admin.
 * - Chỉ chạy 1 lần / scope (scopeKey = userProfile.id || user.uid) để tránh dội.
 * - Nếu plan hiện tại đã là Plus, đánh dấu scope là đã sync và thoát.
 */
export function useEntitlementsAutoSync({
  demoMode,
  isConfigured,
  user,
  userProfile,
  onPlanUpgraded,
}: UseEntitlementsAutoSyncArgs): void {
  const scopeRef = useRef<string | null>(null);

  useEffect(() => {
    if (demoMode || !isConfigured || !isApiBaseUrlConfigured() || !user || !userProfile) return;
    if (userProfile.role === "admin") return;

    const scopeKey = userProfile.id || user.uid;
    if (scopeRef.current === scopeKey) return;

    const currentData = getUserData();
    if (getCurrentPlan(currentData) !== "FREE") {
      scopeRef.current = scopeKey;
      return;
    }

    scopeRef.current = scopeKey;
    let cancelled = false;

    syncEntitlementsWithProvider().then((result) => {
      if (cancelled) return;
      if (result.ok && result.planCode !== "FREE") {
        onPlanUpgraded();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [demoMode, isConfigured, user, userProfile, onPlanUpgraded]);
}
