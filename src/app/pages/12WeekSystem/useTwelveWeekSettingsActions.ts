import { useCallback, type RefObject } from "react";
import type { NavigateFunction } from "react-router";
import { toast } from "sonner";

import {
  getBrowserNotificationStatus,
  requestBrowserNotificationPermission,
  sendTestBrowserNotification,
} from "@/app/utils/production";
import { downloadLocalUserDataBackup } from "@/app/utils/local-data-backup";
import { isDemoMode } from "@/app/utils/app-mode";
import { exportCloudWorkspace, deleteCloudWorkspace } from "@/services/syncService";
import {
  type AppPreferences,
  type InAppReminder,
  type SyncOutboxItem,
  archiveOutboxItem,
  clearLocalDeviceSignals,
  deleteAllUserData,
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
import { enqueueLeadMetricUpsertedMutations } from "@/features/plan12week/persistence/leadMetricMutation";
import { enqueuePlanSnapshotUpdatedMutation } from "@/features/plan12week/persistence/planSnapshotMutation";

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
  const commitPlanSnapshotUpdate = (nextSystem: TwelveWeekSystem) => {
    const savedSystem = commitSystemUpdate(nextSystem);
    if (activeGoal) enqueuePlanSnapshotUpdatedMutation(activeGoal.id, savedSystem, "manual_update");
    return savedSystem;
  };

  const handleReviewDayChange = useCallback((value: string) => {
    if (!system) return;
    commitPlanSnapshotUpdate({
      ...system,
      reviewDay: value,
    });
    toast.success("Ngày review đã được cập nhật.");
  }, [system, commitPlanSnapshotUpdate]);

  const handleReminderTimeChange = useCallback((value: string) => {
    if (!system) return;
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    commitSystemUpdate({
      ...system,
      dailyReminderTime: value,
    });
    updateAppPreferences({ preferredReminderHour: Number.parseInt(value.split(":")[0] ?? "19", 10) || 19 });
    refreshSnapshotMeta();
  }, [system, commitSystemUpdate, updateAppPreferences, refreshSnapshotMeta]);

  const handleLoadPreferenceChange = useCallback((value: string) => {
    if (!system) return;
    commitPlanSnapshotUpdate({
      ...system,
      tacticLoadPreference: value as typeof system.tacticLoadPreference,
    });
  }, [system, commitPlanSnapshotUpdate]);

  const handleStatusChange = useCallback((value: string) => {
    if (!system) return;
    commitPlanSnapshotUpdate({
      ...system,
      status: value as typeof system.status,
    });
  }, [system, commitPlanSnapshotUpdate]);

  const handleTacticPriorityChange = useCallback((tacticId: string | undefined, value: string) => {
    if (!activeGoal || !system || !tacticId) return;

    const savedSystem = commitPlanSnapshotUpdate({
      ...system,
      leadIndicators: system.leadIndicators.map((indicator, index) => {
        const indicatorId = indicator.id ?? `tactic_${index}`;
        return indicatorId === tacticId ? { ...indicator, priority: Number.parseInt(value, 10) || index + 1 } : indicator;
      }),
    });
    enqueueLeadMetricUpsertedMutations(activeGoal.id, savedSystem, "manual_update", { indicatorIds: [tacticId] });
    trackAppEvent("12_week_tactic_updated", activeGoal.id, { tacticId, field: "priority", value });
  }, [activeGoal, system, commitPlanSnapshotUpdate]);

  const handleTacticTypeChange = useCallback((tacticId: string | undefined, value: string) => {
    if (!activeGoal || !system || !tacticId) return;

    const savedSystem = commitPlanSnapshotUpdate({
      ...system,
      leadIndicators: system.leadIndicators.map((indicator, index) => {
        const indicatorId = indicator.id ?? `tactic_${index}`;
        return indicatorId === tacticId ? { ...indicator, type: value === "optional" ? "optional" : "core" } : indicator;
      }),
    });
    enqueueLeadMetricUpsertedMutations(activeGoal.id, savedSystem, "manual_update", { indicatorIds: [tacticId] });
    trackAppEvent("12_week_tactic_updated", activeGoal.id, { tacticId, field: "type", value });
  }, [activeGoal, system, commitPlanSnapshotUpdate]);

  const handlePreferenceToggle = useCallback(<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    updateAppPreferences({ [key]: value } as Pick<AppPreferences, K>);
    refreshSnapshotMeta();
  }, [updateAppPreferences, refreshSnapshotMeta]);

  const handleArchivePendingOutbox = useCallback(() => {
    const data = getUserData();
    data.syncOutbox
      .filter((item) => item.status === "pending")
      .forEach((item) => {
        archiveOutboxItem(item.id);
      });
    refreshSnapshotMeta();
  }, [refreshSnapshotMeta]);

  const handleOutboxItemToggle = useCallback((item: SyncOutboxItem) => {
    if (item.status === "pending") {
      archiveOutboxItem(item.id);
      toast.success("Mục outbox đã được lưu lại.");
    } else {
      restoreOutboxItem(item.id);
      toast.success("Mục outbox đã được khôi phục về hàng chờ.");
    }
    refreshSnapshotMeta();
  }, [refreshSnapshotMeta]);

  const handleRestoreArchivedOutbox = useCallback(() => {
    restoreArchivedOutbox();
    toast.success("Các mục outbox đã lưu đã được đưa lại về hàng chờ.");
    refreshSnapshotMeta();
  }, [refreshSnapshotMeta]);

  const handleOpenReminder = useCallback((reminder: InAppReminder) => {
    if (!activeGoal) return;
    if (reminder.goalId && reminder.goalId !== activeGoal.id) {
      loadGoalData(reminder.goalId);
    }
    handleTabChange(reminder.kind === "review" ? "week" : "today");
  }, [activeGoal, loadGoalData, handleTabChange]);

  const handleExportLocalData = useCallback(() => {
    downloadLocalUserDataBackup({ data: getUserData(), filenamePrefix: "vision-board-local" });
    toast.success("Đã tải bản sao dữ liệu local.");
  }, []);

  const handleExportCloudWorkspace = async () => {
    if (isDemoMode()) {
      toast.info("Bản demo không hỗ trợ export cloud. Dùng export local.");
      return;
    }
    try {
      const data = await exportCloudWorkspace();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `vision-board-cloud-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      trackAppEvent("cloud_workspace_exported", activeGoal?.id ?? "", { counts: JSON.stringify(data.counts) });
      toast.success("Đã tải bản sao cloud workspace.");
    } catch (error) {
      toast.error("Không thể export cloud workspace. Kiểm tra kết nối và thử lại.");
    }
  };

  const handleDeleteCloudWorkspace = useCallback(async () => {
    if (isDemoMode()) {
      toast.info("Bản demo không hỗ trợ xóa cloud workspace.");
      return;
    }
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa toàn bộ dữ liệu 12-week trên cloud?\n\n" +
        "• Chỉ xóa dữ liệu workspace trên server (goal, plan, week, task, lead metric, check-in, review).\n" +
        "• KHÔNG xóa dữ liệu local trên trình duyệt này.\n" +
        "• KHÔNG xóa billing, subscription hay tài khoản.\n\n" +
        "Hành động này không thể hoàn tác.",
    );
    if (!confirmed) return;
    try {
      const result = await deleteCloudWorkspace();
      trackAppEvent("cloud_workspace_deleted", activeGoal?.id ?? "", {
        policy: result.policy,
        counts: JSON.stringify(result.counts),
      });
      toast.success("Đã xóa dữ liệu 12-week trên cloud.", {
        description: "Dữ liệu local, billing và tài khoản không bị ảnh hưởng.",
      });
    } catch (error) {
      toast.error("Không thể xóa cloud workspace. Kiểm tra kết nối và thử lại.");
    }
  }, [activeGoal?.id]);

  const handleClearLocalSignals = useCallback(() => {
    clearLocalDeviceSignals();
    setIsClearLocalDialogOpen(false);
    toast.success("Đã xóa log, outbox và trạng thái nhắc việc trên thiết bị này.");
    refreshSnapshotMeta();
  }, [setIsClearLocalDialogOpen, refreshSnapshotMeta]);

  const handleDeleteAllData = useCallback(() => {
    deleteAllUserData();
    toast.success("Đã xóa toàn bộ dữ liệu trên thiết bị.");
    navigate("/");
  }, [navigate]);

  const handleBrowserNotificationToggle = useCallback(async (value: boolean) => {
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
  }, [activeGoal, activeGoalIdRef, updateAppPreferences, setBrowserNotificationStatus, refreshSnapshotMeta]);

  const handleResetCycle = useCallback(() => {
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
    const resetSystem = getUserData().goals.find((goal) => goal.id === activeGoal.id)?.twelveWeekSystem;
    if (resetSystem) enqueuePlanSnapshotUpdatedMutation(activeGoal.id, resetSystem, "reset");
    setActiveTab("today");
    toast.success("Chu kỳ đã được reset từ tuần này.", {
      description: "Việc, check-in và review tuần của chu kỳ hiện tại đã được làm mới để bạn bắt đầu lại gọn hơn.",
    });
    loadGoalData(activeGoal.id);
  }, [activeGoal, system, setIsResetDialogOpen, setActiveTab, loadGoalData]);

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
    handleExportCloudWorkspace,
    handleDeleteCloudWorkspace,
    handleClearLocalSignals,
    handleDeleteAllData,
    handleBrowserNotificationToggle,
    handleResetCycle,
  };
}
