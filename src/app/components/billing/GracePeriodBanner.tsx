import { AlertTriangle, RefreshCw } from "lucide-react";
import { Link } from "react-router";

import { useSyncedUserData } from "../../hooks/useSyncedUserData";
import { getSubscriptionGraceState } from "../../utils/billing-grace-period";
import { getUserData } from "../../utils/storage";
import { Button } from "../ui/button";

export function GracePeriodBanner() {
  const { userData: syncedUserData } = useSyncedUserData();
  const userData = syncedUserData ?? getUserData();
  const graceState = getSubscriptionGraceState(userData);

  if (!graceState.inGracePeriod) return null;

  return (
    <div
      role="alert"
      className="relative z-40 border-b border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/75 dark:text-amber-100 sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 flex-none" />
            Gói Plus của bạn đã hết hạn.
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
            Bạn còn {graceState.daysRemaining} ngày trước khi quyền bị tạm dừng.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="w-full shrink-0 border-amber-300 bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
        >
          <Link to="/billing/plan">
            <RefreshCw className="mr-2 h-4 w-4" />
            Gia hạn ngay
          </Link>
        </Button>
      </div>
    </div>
  );
}
