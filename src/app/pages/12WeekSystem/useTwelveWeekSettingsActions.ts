import type { RefObject } from "react";
import type { NavigateFunction } from "react-router";
import { toast } from "sonner";

import {
  getBrowserNotificationStatus,
  requestBrowserNotificationPermission,
  sendTestBrowserNotification,
} from "@/app/utils/production";
import {
  type AppPreferences,
  type InAppReminder,
  type SyncOutboxItem,
  archiveOutboxItem,
  clearLocalDeviceSignals,
  deleteAllUserData,
  exportUserDataSnapshot,
  formatDateInputValue,
  getUserData,
  resetTwelveWeekGoalCycle,
  restoreArchivedOutbox,
  restoreOutboxItem,
  trackAppEvent,
  updateAppPreferences,
} from "@/app/utils/storage";
import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";
import { getCurrentWeekStartDate } from "@/app/utils/twelve-week-system-ui";

interface UseTwelveWeekSettingsActionsOptions {
  activeGoal: Goal | null;
  system: TwelveWeekSystem | null;
  activeGoalIdRef: RefObject<string | null>;
  commitSystemUpdate: (nextSystem: TwelveWeekSystem) => TwelveWeekSystem;
  refreshSnapshotMeta: () => void;
  loadGoalData: (preferredGoalId?: string) => void;
  handleTabChange: (value: string) => void;
  setActiveTab: (value: string) => void;
  setBrowserNotificationStatus: (value: ReturnType<typeof getBrowserNotificationStatus>) => void;
  setIsClearLocalDialogOpen: (open: boolean) => void;
  setIsResetDialogOpen: (open: boolean) => void;
  navigate: NavigateFunction;
}

export function useTwelveWeekSettingsActions({
  activeGoal,
  system,
  activeGoalIdRef,
  commitSystemUpdate,
  refreshSnapshotMeta,
  loadGoalData,
  handleTabChange,
  setActiveTab,
  setBrowserNotificationStatus,
  setIsClearLocalDialogOpen,
  setIsResetDialogOpen,
  navigate,
}: UseTwelveWeekSettingsActionsOptions) {
  const handleReviewDayChange = (value: string) => {
    if (!system) return;
    commitSystemUpdate({
      ...system,
      reviewDay: value,
    });
    toast.success("Ngày review đã được cập nhật.");
  };

  const handleReminderTimeChange = (value: string) => {
    if (!system) return;
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    commitSystemUpdate({
      ...system,
      dailyReminderTime: value,
    });
    updateAppPreferences({ preferredReminderHour: Number.parseInt(value.split(":")[0] ?? "19", 10) || 19 });
    refreshSnapshotMeta();
  };

  const handleLoadPreferenceChange = (value: string) => {
    if (!system) return;
    commitSystemUpdate({
      ...system,
      tacticLoadPreference: value as typeof system.tacticLoadPreference,
    });
  };

  const handleStatusChange = (value: string) => {
    if (!system) return;
    commitSystemUpdate({
      ...system,
      status: value as typeof system.status,
    });
  };

  const handleTacticPriorityChange = (tacticId: string | undefined, value: string) => {
    if (!activeGoal || !system || !tacticId) return;

    commitSystemUpdate({
      ...system,
      leadIndicators: system.leadIndicators.map((indicator, index) => {
        const indicatorId = indicator.id ?? `tactic_${index}`;
        return indicatorId === tacticId ? { ...indicator, priority: Number.parseInt(value, 10) || index + 1 } : indicator;
      }),
    });
    trackAppEvent("12_week_tactic_updated", activeGoal.id, { tacticId, field: "priority", value });
  };

  const handleTacticTypeChange = (tacticId: string | undefined, value: string) => {
    if (!activeGoal || !system || !tacticId) return;

    commitSystemUpdate({
      ...system,
      leadIndicators: system.leadIndicators.map((indicator, index) => {
        const indicatorId = indicator.id ?? `tactic_${index}`;
        return indicatorId === tacticId ? { ...indicator, type: value === "optional" ? "optional" : "core" } : indicator;
      }),
    });
    trackAppEvent("12_week_tactic_updated", activeGoal.id, { tacticId, field: "type", value });
  };

  const handlePreferenceToggle = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    updateAppPreferences({ [key]: value } as Pick<AppPreferences, K>);
    refreshSnapshotMeta();
  };

  const handleArchivePendingOutbox = () => {
    const data = getUserData();
    data.syncOutbox
      .filter((item) => item.status === "pending")
      .forEach((item) => {
        archiveOutboxItem(item.id);
      });
    refreshSnapshotMeta();
  };

  const handleOutboxItemToggle = (item: SyncOutboxItem) => {
    if (item.status === "pending") {
      archiveOutboxItem(item.id);
      toast.success("Mục outbox đã được lưu lại.");
    } else {
      restoreOutboxItem(item.id);
      toast.success("Mục outbox đã được khôi phục về hàng chờ.");
    }
    refreshSnapshotMeta();
  };

  const handleRestoreArchivedOutbox = () => {
    restoreArchivedOutbox();
    toast.success("Các mục outbox đã lưu đã được đưa lại về hàng chờ.");
    refreshSnapshotMeta();
  };

  const handleOpenReminder = (reminder: InAppReminder) => {
    if (!activeGoal) return;
    if (reminder.goalId && reminder.goalId !== activeGoal.id) {
      loadGoalData(reminder.goalId);
    }
    handleTabChange(reminder.kind === "review" ? "week" : "today");
  };

  const handleExportLocalData = () => {
    const blob = new Blob([exportUserDataSnapshot()], { type: "application/json;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vision-board-local-${formatDateInputValue(new Date())}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    toast.success("Đã tải bản sao dữ liệu local.");
  };

  const handleClearLocalSignals = () => {
    clearLocalDeviceSignals();
    setIsClearLocalDialogOpen(false);
    toast.success("Đã xóa log, outbox và trạng thái nhắc việc trên thiết bị này.");
    refreshSnapshotMeta();
  };

  const handleDeleteAllData = () => {
    deleteAllUserData();
    toast.success("Đã xóa toàn bộ dữ liệu trên thiết bị.");
    navigate("/");
  };

  const handleBrowserNotificationToggle = async (value: boolean) => {
    if (!activeGoal) return;
    const actionGoalId = activeGoal.id;
    updateAppPreferences({ enableBrowserNotifications: value });

    if (value) {
      const permission = await requestBrowserNotificationPermission();
      setBrowserNotificationStatus(permission);

      if (permission === "granted") {
        sendTestBrowserNotification();
        toast.success("Thông báo ngoài trình duyệt đã được bật.");
      } else if (permission === "denied") {
        toast.error("Trình duyệt đang chặn thông báo ngoài trình duyệt.");
      } else if (permission === "unsupported") {
        toast.info("Trình duyệt hiện tại không hỗ trợ thông báo ngoài trình duyệt.");
      }
    } else {
      toast.success("Đã tắt thông báo ngoài trình duyệt.");
      setBrowserNotificationStatus(getBrowserNotificationStatus());
    }

    if (activeGoalIdRef.current === actionGoalId) {
      refreshSnapshotMeta();
    }
  };

  const handleResetCycle = () => {
    if (!activeGoal || !system) return;
    const resetFrom = getCurrentWeekStartDate(system.weekStartsOn ?? "Monday");
    const didReset = resetTwelveWeekGoalCycle(activeGoal.id, resetFrom);

    if (!didReset) {
      toast.error("Không thể reset chu kỳ lúc này.");
      return;
    }

    trackAppEvent("12_week_cycle_reset", activeGoal.id, {
      resetFrom: formatDateInputValue(resetFrom),
      totalWeeks: String(system.totalWeeks),
    });
    setIsResetDialogOpen(false);
    setActiveTab("today");
    toast.success("Chu kỳ đã được reset từ tuần này.", {
      description: "Việc, check-in và review tuần của chu kỳ hiện tại đã được làm mới để bạn bắt đầu lại gọn hơn.",
    });
    loadGoalData(activeGoal.id);
  };

  return {
    handleReviewDayChange,
    handleReminderTimeChange,
    handleLoadPreferenceChange,
    handleStatusChange,
    handleTacticPriorityChange,
    handleTacticTypeChange,
    handlePreferenceToggle,
    handleArchivePendingOutbox,
    handleOutboxItemToggle,
    handleRestoreArchivedOutbox,
    handleOpenReminder,
    handleExportLocalData,
    handleClearLocalSignals,
    handleDeleteAllData,
    handleBrowserNotificationToggle,
    handleResetCycle,
  };
}
