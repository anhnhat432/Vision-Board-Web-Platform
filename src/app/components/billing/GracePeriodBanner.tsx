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
      className="relative z-40 border-b border-app-status-warning/30 bg-app-status-warning/10 px-4 py-2 text-sm text-app-status-warning dark:border-app-status-warning/20 dark:bg-app-status-warning/10 dark:text-app-status-warning sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 flex-none" />
            Gói Plus của bạn đã hết hạn.
          </p>
          <p className="mt-0.5 text-xs leading-4 text-app-status-warning/80 dark:text-app-status-warning/80">
            Bạn còn {graceState.daysRemaining} ngày trước khi quyền bị tạm dừng.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="w-full shrink-0 border-app-status-warning/30 bg-app-status-warning text-app-ink-on-accent hover:bg-app-status-warning/80 sm:w-auto"
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
