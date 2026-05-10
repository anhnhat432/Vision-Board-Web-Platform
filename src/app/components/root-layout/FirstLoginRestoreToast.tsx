import { useEffect } from "react";
import { toast } from "sonner";

import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";

function getRestoreDescription(weeklyReviewCount: number): string {
  if (weeklyReviewCount <= 0) return "Dữ liệu 12 tuần đã sẵn sàng trên thiết bị này.";
  return `${weeklyReviewCount} review tuần đã được khôi phục.`;
}

export function FirstLoginRestoreToast() {
  const { firstLoginRestoreSummary, clearFirstLoginRestoreSummary } = useAutoCloudSyncContext();

  useEffect(() => {
    if (!firstLoginRestoreSummary) return;

    toast.success(
      `Đã khôi phục dữ liệu tài khoản: ${firstLoginRestoreSummary.goalCount} kế hoạch, ${firstLoginRestoreSummary.checkInCount} check-in`,
      {
        description: getRestoreDescription(firstLoginRestoreSummary.weeklyReviewCount),
        duration: 5000,
      },
    );
    clearFirstLoginRestoreSummary();
  }, [clearFirstLoginRestoreSummary, firstLoginRestoreSummary]);

  return null;
}
