import { type SyntheticEvent, useCallback, useState } from "react";
import { AlertTriangle, CloudDownload, CloudUpload, FileDown, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { trackAnalyticsEvent } from "@/app/utils/analytics";
import type { MutationQueueManualSyncStatus, TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekLocalStatusSectionProps = Pick<
  TwelveWeekSettingsTabProps,
  | "activeGoalId"
  | "appPreferences"
  | "backendConnectionStatus"
  | "isHydratingBackendPlans"
  | "isResolvingBackendPlanConflicts"
  | "lastBackendHydrationResult"
  | "mutationQueueSyncStatus"
  | "onExportLocalData"
  | "onExportCloudWorkspace"
  | "onDeleteCloudWorkspace"
  | "onHydrateBackendPlans"
  | "onRunMutationQueueSync"
  | "onKeepLocalPlanForConflicts"
  | "onUseBackendPlanForConflicts"
  | "onUseCloudVersion"
  | "pendingOutboxCount"
>;

type BackendConflict = NonNullable<TwelveWeekSettingsTabProps["lastBackendHydrationResult"]>["conflicts"][number];

interface BackendConflictGroup {
  goalId: string;
  goalTitle: string;
  planVision: string;
  conflicts: BackendConflict[];
}

type MutationQueueSyncResult = NonNullable<MutationQueueManualSyncStatus["lastResult"]>;
type MutationQueueMergeReport = NonNullable<MutationQueueSyncResult["mergeReport"]>;
type MutationQueueConflictAction = "review_details" | "export_local_backup" | "keep_local" | "retry_sync" | "use_cloud_version";

const MAX_VISIBLE_PULL_ISSUES = 4;

function getBackendBadgeClass(status: TwelveWeekSettingsTabProps["backendConnectionStatus"]): string {
  if (!status.authConfigured) return "border-amber-200 bg-amber-50 text-amber-800";
  if (status.authLoading) return "border-sky-200 bg-sky-50 text-sky-800";
  if (!status.signedIn) return "border-slate-300 bg-white text-slate-700";
  if (!status.profileReady) return "border-violet-200 bg-violet-50 text-violet-800";
  if (status.syncing) return "border-sky-200 bg-sky-50 text-sky-800";
  if (status.syncStatus === "partial") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status.syncStatus === "error") return "border-red-200 bg-red-50 text-red-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function getMutationQueueSyncBlocker(input: {
  backendConnectionStatus: TwelveWeekSettingsTabProps["backendConnectionStatus"];
  mutationQueueSyncStatus: MutationQueueManualSyncStatus;
}): string | null {
  const { backendConnectionStatus, mutationQueueSyncStatus } = input;

  if (!mutationQueueSyncStatus.realMode) return "Bản demo lưu trên trình duyệt này, không cần cloud sync.";
  if (!mutationQueueSyncStatus.featureEnabled) return "Mutation sync đang tắt bằng feature flag.";
  if (!mutationQueueSyncStatus.pullFeatureEnabled) return "Pull sync đang tắt bằng feature flag.";
  if (!mutationQueueSyncStatus.apiConfigured) return "Chưa cấu hình backend API để gửi queue.";
  if (!backendConnectionStatus.authConfigured) return "Chưa cấu hình đăng nhập Firebase.";
  if (backendConnectionStatus.authLoading) return "Đang kiểm tra phiên đăng nhập.";
  if (!backendConnectionStatus.signedIn) return "Cần đăng nhập để gửi queue account.";
  if (!backendConnectionStatus.profileReady) return "Đang chờ backend profile sẵn sàng.";

  return null;
}

function getMutationQueueResultDescription(result: MutationQueueSyncResult | null): string {
  if (!result) {
    return "Chưa chạy lần nào trong phiên này. Hành động này gửi queue, pull cloud workspace, rồi chỉ áp dụng nếu merge an toàn.";
  }

  if (result.status === "applied") {
    const pulledGoalCount = result.pullResponse?.workspace.goals.length ?? 0;
    return `Đã gửi queue, pull ${pulledGoalCount} goal cloud và áp dụng merge an toàn vào local.`;
  }

  if (result.status === "drain_failed") {
    return `${result.message} Dữ liệu local vẫn được giữ nguyên.`;
  }

  if (result.status === "conflict") {
    const conflictCount = result.mergeReport?.summary.conflictCount ?? 0;
    const unresolvedCount = result.unresolvedLocalMutationCount ?? 0;
    return `${result.message} Conflict: ${conflictCount}; local pending: ${unresolvedCount}.`;
  }

  if (result.status === "unsafe") {
    const summary = result.mergeReport?.summary;
    return summary
      ? `${result.message} Cloud-only: ${summary.cloudOnlyCount}; local-only: ${summary.localOnlyCount}; missing IDs: ${summary.missingClientIdCount}.`
      : result.message;
  }

  if (result.status === "error") {
    return `${result.message} Dữ liệu local không bị xóa.`;
  }

  switch (result.skipReason) {
    case "mutation_feature_disabled":
      return "Mutation sync đang tắt bằng feature flag.";
    case "pull_feature_disabled":
      return "Pull sync đang tắt bằng feature flag.";
    case "demo_mode":
      return "Demo mode không gọi backend protected endpoint.";
    case "unauthenticated":
      return "Chưa có account đã đăng nhập để chạy cloud sync.";
    case "api_not_configured":
      return "Chưa cấu hình API backend.";
    default:
      return result.message || "Điều kiện cloud sync chưa sẵn sàng.";
  }
}

function isMutationQueueMergeReviewNeeded(result: MutationQueueSyncResult | null): result is MutationQueueSyncResult {
  return Boolean(result?.mergeReport && (result.status === "conflict" || result.status === "unsafe"));
}

function getPullEntityKindLabel(kind: MutationQueueMergeReport["conflicts"][number]["kind"]): string {
  switch (kind) {
    case "goal":
      return "Goal";
    case "plan":
      return "12-week plan";
    case "week":
      return "Week";
    case "task":
      return "Task";
    case "leadMetric":
      return "Lead metric";
    case "dailyCheckIn":
      return "Daily check-in";
    case "weeklyReview":
      return "Weekly review";
    default:
      return "Workspace item";
  }
}

function getPullConflictReasonLabel(reason: MutationQueueMergeReport["conflicts"][number]["reason"]): string {
  switch (reason) {
    case "pending_local_mutation_cloud_newer":
      return "Cloud changed after a pending local mutation.";
    case "task_completion_differs":
      return "Task completion differs.";
    case "daily_check_in_differs":
      return "Daily check-in differs.";
    case "weekly_review_differs":
      return "Weekly review differs.";
    default:
      return "Local and cloud differ.";
  }
}

function getMutationQueueConflictCounts(result: MutationQueueSyncResult): AnalyticsPayloadForConflict {
  const summary = result.mergeReport?.summary;
  return {
    conflict_count: summary?.conflictCount ?? 0,
    local_only_count: summary?.localOnlyCount ?? 0,
    cloud_only_count: summary?.cloudOnlyCount ?? 0,
    missing_client_id_count: summary?.missingClientIdCount ?? 0,
    unsupported_field_count: summary?.unsupportedFieldCount ?? 0,
    unresolved_local_mutation_count: result.unresolvedLocalMutationCount ?? 0,
  };
}

interface AnalyticsPayloadForConflict {
  conflict_count: number;
  local_only_count: number;
  cloud_only_count: number;
  missing_client_id_count: number;
  unsupported_field_count: number;
  unresolved_local_mutation_count: number;
}

function trackMutationQueueConflictAction(
  action: MutationQueueConflictAction,
  result: MutationQueueSyncResult,
  activeGoalId: string,
): void {
  trackAnalyticsEvent(
    "sync_conflict_action",
    {
      source: "settings",
      action,
      status: result.status === "unsafe" ? "unsafe" : "conflict",
      ...getMutationQueueConflictCounts(result),
    },
    { area: "12_week", goalId: activeGoalId },
  );
}

function formatMutationQueueTimestamp(value: string | null): string {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không rõ";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getBackendStatusLabel(status: TwelveWeekSettingsTabProps["backendConnectionStatus"]): string {
  if (!status.authConfigured) return "Chưa cấu hình";
  if (status.authLoading) return "Đang kiểm tra";
  if (!status.signedIn) return "Chưa đăng nhập";
  if (!status.profileReady) return "Đang nối profile";
  if (status.syncing) return "Đang đồng bộ";
  if (status.syncStatus === "success") return "Đã đồng bộ";
  if (status.syncStatus === "partial") return "Đồng bộ một phần";
  if (status.syncStatus === "error") return "Có lỗi sync";
  return "Đã sẵn sàng";
}

function getBackendStatusDescription(status: TwelveWeekSettingsTabProps["backendConnectionStatus"]): string {
  if (!status.authConfigured) return "Backend chưa được cấu hình. Dữ liệu vẫn được giữ local trên thiết bị này.";
  if (status.authLoading) return "Đang kiểm tra phiên đăng nhập trước khi nối backend.";
  if (!status.signedIn) return "Đăng nhập để đồng bộ tiến độ qua thiết bị khác.";
  if (!status.profileReady) return "Đã có phiên đăng nhập, đang chờ backend profile sẵn sàng.";
  if (status.syncing) return "Đang đồng bộ plan, task, check-in và review 12-week lên backend.";
  if (status.syncMessage) return status.syncMessage;
  return status.displayName || status.email
    ? `Đang đồng bộ dưới tài khoản ${status.displayName || status.email}. Nếu local và backend khác nhau, web sẽ hỏi bạn trước khi ghi đè.`
    : "Backend đã sẵn sàng. Nếu local và backend khác nhau, web sẽ hỏi bạn trước khi ghi đè.";
}

function getBackendHydrationDescription(result: TwelveWeekSettingsTabProps["lastBackendHydrationResult"]): string {
  if (!result) {
    return "Kiểm tra backend và chỉ kéo về những chu kỳ 12-week đang thiếu ở local. Nếu hai bên khác nhau, web sẽ yêu cầu bạn chọn nguồn dữ liệu trước.";
  }

  if (result.status === "error") return result.message;
  if (result.status === "partial") return result.message;
  if (result.conflictCount > 0) {
    return `${result.message} Web đã tạm dừng tự đồng bộ cho các chu kỳ này.`;
  }
  if (result.hydratedCount + result.updatedCount > 0) {
    return `Đã khôi phục ${result.hydratedCount} chu kỳ mới và cập nhật ${result.updatedCount} chu kỳ từ backend.`;
  }

  return "Backend đã được kiểm tra, chưa có chu kỳ mới cần khôi phục.";
}

function getConflictKindLabel(kind: BackendConflict["kind"]): string {
  switch (kind) {
    case "weekly_focus":
      return "Trọng tâm tuần";
    case "weekly_milestone":
      return "Mốc tuần";
    case "task_completion":
      return "Trạng thái việc";
    case "task_title":
      return "Tên việc";
    case "task_schedule":
      return "Lịch việc";
    case "linked_task_missing_backend":
      return "Việc đã link";
    case "daily_checkin":
      return "Check-in ngày";
    case "weekly_review_output":
      return "Kết quả review";
    case "weekly_review_priority":
      return "Ưu tiên tuần tới";
    case "weekly_review_score":
      return "Điểm review";
    default:
      return "Khác biệt";
  }
}

function getConflictScopeLabel(conflict: BackendConflict): string {
  const parts = [];
  if (conflict.weekNumber) parts.push(`Tuần ${conflict.weekNumber}`);
  if (conflict.localId && conflict.kind === "daily_checkin") parts.push(conflict.localId);
  return parts.join(" · ") || "Chu kỳ";
}

function getConflictValueLabel(value: string): string {
  return value.trim() || "Trống";
}

function getBackendConflictGroups(
  result: TwelveWeekSettingsTabProps["lastBackendHydrationResult"],
): BackendConflictGroup[] {
  if (!result?.conflicts.length) return [];

  const groupByGoalId = new Map<string, BackendConflictGroup>();
  result.conflicts.forEach((conflict) => {
    const existingGroup = groupByGoalId.get(conflict.goalId);
    if (existingGroup) {
      existingGroup.conflicts.push(conflict);
      return;
    }

    groupByGoalId.set(conflict.goalId, {
      goalId: conflict.goalId,
      goalTitle: conflict.goalTitle,
      planVision: conflict.planVision,
      conflicts: [conflict],
    });
  });

  return Array.from(groupByGoalId.values());
}

function MutationQueueConflictResolutionPanel({
  activeGoalId,
  result,
  syncLoading,
  onExportLocalData,
  onRunMutationQueueSync,
  onUseCloudVersion,
}: {
  activeGoalId: string;
  result: MutationQueueSyncResult | null;
  syncLoading: boolean;
  onExportLocalData: () => void;
  onRunMutationQueueSync: () => void;
  onUseCloudVersion: () => void;
}) {
  const [keptLocal, setKeptLocal] = useState(false);
  const [confirmExported, setConfirmExported] = useState(false);
  const [showCloudConfirm, setShowCloudConfirm] = useState(false);

  const handleConfirmUseCloud = useCallback(() => {
    if (!confirmExported || !result) return;
    trackMutationQueueConflictAction("use_cloud_version", result, activeGoalId);
    onUseCloudVersion();
    setShowCloudConfirm(false);
    setConfirmExported(false);
  }, [confirmExported, result, activeGoalId, onUseCloudVersion]);

  if (!isMutationQueueMergeReviewNeeded(result) || !result.mergeReport) return null;

  const report = result.mergeReport;
  const visibleConflicts = report.conflicts.slice(0, MAX_VISIBLE_PULL_ISSUES);
  const hiddenConflictCount = report.conflicts.length - visibleConflicts.length;
  const visibleUnsupportedFields = report.unsupportedFields.slice(0, MAX_VISIBLE_PULL_ISSUES);
  const hiddenUnsupportedCount = report.unsupportedFields.length - visibleUnsupportedFields.length;

  const handleDetailsToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (!event.currentTarget.open) return;
    trackMutationQueueConflictAction("review_details", result, activeGoalId);
  };

  const handleExport = () => {
    trackMutationQueueConflictAction("export_local_backup", result, activeGoalId);
    onExportLocalData();
  };

  const handleKeepLocal = () => {
    trackMutationQueueConflictAction("keep_local", result, activeGoalId);
    setKeptLocal(true);
  };

  const handleRetry = () => {
    trackMutationQueueConflictAction("retry_sync", result, activeGoalId);
    setKeptLocal(false);
    setShowCloudConfirm(false);
    setConfirmExported(false);
    onRunMutationQueueSync();
  };

  // "Use cloud version" is only available when:
  // - the pull response has workspace data
  // - there are no pending local mutations that could be lost
  // - the merge report has no missing client IDs (cloud data is complete)
  const hasPullResponse = Boolean(result.pullResponse?.workspace);
  const hasPendingLocalMutations = (result.unresolvedLocalMutationCount ?? 0) > 0;
  const hasMissingIds = (report.summary.missingClientIdCount ?? 0) > 0;
  const canUseCloudVersion = hasPullResponse && !hasPendingLocalMutations && !hasMissingIds;

  const handleShowCloudConfirm = () => {
    setShowCloudConfirm(true);
    setKeptLocal(false);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950">
            Có thay đổi trên trình duyệt này và trên cloud.
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Ứng dụng chưa tự ghi đè để tránh mất dữ liệu. Nên export backup trước khi xử lý conflict.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Conflict</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.conflictCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Local only</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.localOnlyCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Cloud only</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.cloudOnlyCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Missing IDs</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.missingClientIdCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Unsupported</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.unsupportedFieldCount}</p>
        </div>
      </div>

      <details className="mt-3 rounded-lg border border-amber-200 bg-white p-3" onToggle={handleDetailsToggle}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Xem chi tiết</summary>
        <div className="mt-3 space-y-3 text-xs leading-5 text-slate-600">
          <p>
            Chi tiết bên dưới chỉ hiển thị loại dữ liệu và số lượng. Nội dung note, reflection, check-in hoặc review
            không được mở ra ở đây.
          </p>
          {visibleConflicts.length > 0 ? (
            <div className="space-y-2">
              {visibleConflicts.map((conflict) => (
                <div
                  key={`${conflict.kind}-${conflict.reason}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                >
                  <p className="font-semibold text-slate-900">{getPullEntityKindLabel(conflict.kind)}</p>
                  <p className="mt-1">{getPullConflictReasonLabel(conflict.reason)}</p>
                </div>
              ))}
              {hiddenConflictCount > 0 ? <p>Còn {hiddenConflictCount} conflict khác.</p> : null}
            </div>
          ) : null}
          {report.localOnlyChanges.length > 0 ? (
            <p>Có {report.localOnlyChanges.length} mục chỉ có trên trình duyệt này.</p>
          ) : null}
          {report.cloudOnlyChanges.length > 0 ? <p>Có {report.cloudOnlyChanges.length} mục chỉ có trên cloud.</p> : null}
          {visibleUnsupportedFields.length > 0 ? (
            <div>
              <p className="font-semibold text-slate-900">Field chưa tự merge:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {visibleUnsupportedFields.map((field) => (
                  <li key={field.field}>{field.field}</li>
                ))}
              </ul>
              {hiddenUnsupportedCount > 0 ? <p className="mt-1">Còn {hiddenUnsupportedCount} field khác.</p> : null}
            </div>
          ) : null}
        </div>
      </details>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          type="button"
          variant="outline"
          className="whitespace-normal border-amber-200 bg-white text-center text-slate-800 hover:bg-amber-50"
          onClick={handleExport}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Tải bản sao local
        </Button>
        <Button
          type="button"
          variant="outline"
          className="whitespace-normal border-amber-200 bg-white text-center text-slate-800 hover:bg-amber-50"
          onClick={handleKeepLocal}
        >
          Giữ bản local
        </Button>
        <Button
          type="button"
          variant="outline"
          className="whitespace-normal border-amber-200 bg-white text-center text-slate-800 hover:bg-amber-50"
          disabled={syncLoading}
          onClick={handleRetry}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
          Thử lại đồng bộ
        </Button>
        <Button
          type="button"
          variant="outline"
          className="whitespace-normal border-amber-200 bg-white text-center text-slate-800 hover:bg-amber-50"
          disabled={!canUseCloudVersion}
          onClick={handleShowCloudConfirm}
        >
          <CloudDownload className="mr-2 h-4 w-4" />
          Dùng bản cloud
        </Button>
      </div>

      {!canUseCloudVersion && hasPendingLocalMutations ? (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          Không thể dùng bản cloud khi vẫn còn thay đổi local chưa gửi. Thử đồng bộ lại trước.
        </p>
      ) : null}

      {showCloudConfirm ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">
            Xác nhận ghi đè dữ liệu local bằng bản cloud
          </p>
          <p className="mt-1 text-xs leading-5 text-red-800">
            Hành động này sẽ thay thế toàn bộ dữ liệu 12-week trên thiết bị này bằng bản từ cloud.
            Khuyên bạn export backup trước khi tiếp tục.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-red-800">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmExported}
              onChange={(e) => setConfirmExported(e.target.checked)}
            />
            <span>Tôi đã export backup hoặc chấp nhận mất dữ liệu local hiện tại.</span>
          </label>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-red-200 bg-white text-red-800 hover:bg-red-50"
              disabled={!confirmExported}
              onClick={handleConfirmUseCloud}
            >
              <CloudDownload className="mr-2 h-4 w-4" />
              Xác nhận dùng bản cloud
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              onClick={() => { setShowCloudConfirm(false); setConfirmExported(false); }}
            >
              Hủy
            </Button>
          </div>
        </div>
      ) : null}

      {keptLocal ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs leading-5 text-amber-800">
          Đã giữ bản local cho hiện tại. Không có dữ liệu nào bị xóa hoặc ghi đè.
        </p>
      ) : null}
    </div>
  );
}

export function TwelveWeekLocalStatusSection({
  activeGoalId,
  appPreferences,
  backendConnectionStatus,
  isHydratingBackendPlans,
  isResolvingBackendPlanConflicts,
  lastBackendHydrationResult,
  mutationQueueSyncStatus,
  onExportLocalData,
  onExportCloudWorkspace,
  onDeleteCloudWorkspace,
  onHydrateBackendPlans,
  onRunMutationQueueSync,
  onKeepLocalPlanForConflicts,
  onUseBackendPlanForConflicts,
  onUseCloudVersion,
  pendingOutboxCount,
}: TwelveWeekLocalStatusSectionProps) {
  const canHydrateBackendPlans =
    backendConnectionStatus.authConfigured &&
    !backendConnectionStatus.authLoading &&
    backendConnectionStatus.signedIn &&
    backendConnectionStatus.profileReady &&
    !backendConnectionStatus.syncing &&
    !isHydratingBackendPlans;
  const conflictGroups = getBackendConflictGroups(lastBackendHydrationResult);
  const mutationQueueBlocker = getMutationQueueSyncBlocker({
    backendConnectionStatus,
    mutationQueueSyncStatus,
  });
  const canRunMutationQueueSync = !mutationQueueBlocker && !mutationQueueSyncStatus.loading;
  const queueSummary = mutationQueueSyncStatus.queueSummary;
  const mutationQueueMergeReviewResult = isMutationQueueMergeReviewNeeded(mutationQueueSyncStatus.lastResult)
    ? mutationQueueSyncStatus.lastResult
    : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bảng điều khiển local</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            Các tiện ích dưới đây chỉ tác động trên thiết bị hiện tại.
          </p>
        </div>
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          Thiết bị này
        </Badge>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Đồng bộ backend</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {getBackendStatusDescription(backendConnectionStatus)}
            </p>
          </div>
          <Badge variant="outline" className={getBackendBadgeClass(backendConnectionStatus)}>
            {getBackendStatusLabel(backendConnectionStatus)}
          </Badge>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm leading-6 text-slate-700">
                {isHydratingBackendPlans
                  ? "Đang kiểm tra backend và khôi phục các chu kỳ còn thiếu."
                  : getBackendHydrationDescription(lastBackendHydrationResult)}
              </p>
              <p className="text-xs leading-5 text-slate-500">
                Hành động này không tự xóa dữ liệu local khi phát hiện khác biệt.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full whitespace-normal border-slate-200 bg-white text-center text-slate-800 hover:bg-slate-50"
              disabled={!canHydrateBackendPlans}
              onClick={onHydrateBackendPlans}
            >
              <CloudDownload className="mr-2 h-4 w-4" />
              {isHydratingBackendPlans ? "Đang kiểm tra..." : "Kiểm tra backend"}
            </Button>
          </div>
        </div>
        {conflictGroups.length > 0 ? (
          <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-950">Cần chọn nguồn dữ liệu</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Local và backend đang khác nhau. Chưa có dữ liệu nào bị ghi đè; chọn bản muốn giữ cho từng chu kỳ
                  trước khi web tự đồng bộ tiếp.
                </p>
              </div>
            </div>
            {conflictGroups.map((group) => {
              const isActiveGoalConflict = group.goalId === activeGoalId;
              const visibleConflicts = group.conflicts.slice(0, 4);
              const hiddenCount = group.conflicts.length - visibleConflicts.length;

              return (
                <div key={group.goalId} className="rounded-lg border border-amber-200 bg-white p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-950">{group.goalTitle}</p>
                      {group.planVision ? (
                        <p className="mt-1 break-words text-xs leading-5 text-slate-600">{group.planVision}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-800">
                      {group.conflicts.length} khác biệt
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {visibleConflicts.map((conflict, index) => (
                      <div
                        key={`${conflict.kind}-${conflict.localId ?? conflict.backendId ?? index}`}
                        className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)]"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{getConflictKindLabel(conflict.kind)}</p>
                          <p className="mt-1 text-slate-500">{getConflictScopeLabel(conflict)}</p>
                        </div>
                        <div className="min-w-0 rounded-md bg-white p-2">
                          <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Local</p>
                          <p className="mt-1 break-words text-slate-800">
                            {getConflictValueLabel(conflict.localValue)}
                          </p>
                        </div>
                        <div className="min-w-0 rounded-md bg-white p-2">
                          <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Backend</p>
                          <p className="mt-1 break-words text-slate-800">
                            {getConflictValueLabel(conflict.backendValue)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {hiddenCount > 0 ? (
                      <p className="text-xs text-slate-600">Còn {hiddenCount} khác biệt khác trong chu kỳ này.</p>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 leading-5 text-slate-600">
                      <span className="font-semibold text-slate-900">Dùng bản backend:</span> thay dữ liệu local của chu
                      kỳ này bằng bản đang lưu trên backend.
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 leading-5 text-slate-600">
                      <span className="font-semibold text-slate-900">Giữ bản local:</span> đẩy dữ liệu trên thiết bị này
                      lên backend để dùng làm bản chính.
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="whitespace-normal border-slate-200 bg-white text-center text-slate-800 hover:bg-slate-50 sm:whitespace-nowrap"
                      disabled={isResolvingBackendPlanConflicts}
                      onClick={() => onUseBackendPlanForConflicts(group.goalId)}
                    >
                      <CloudDownload className="mr-2 h-4 w-4" />
                      Dùng bản backend
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="whitespace-normal border-slate-200 bg-white text-center text-slate-800 hover:bg-slate-50 sm:whitespace-nowrap"
                      disabled={isResolvingBackendPlanConflicts}
                      onClick={() => onKeepLocalPlanForConflicts(group.goalId)}
                    >
                      <CloudUpload className="mr-2 h-4 w-4" />
                      {isActiveGoalConflict ? "Giữ bản local" : "Mở chu kỳ để giữ local"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Mutation queue
                </p>
                <Badge
                  variant="outline"
                  className={
                    mutationQueueBlocker
                      ? "border-slate-200 bg-slate-50 text-slate-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }
                >
                  {mutationQueueBlocker ? "Chưa bật" : "Sẵn sàng"}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-slate-700">
                {mutationQueueBlocker ??
                  "Gửi queue đang chờ, pull cloud workspace, rồi chỉ apply local merge nếu an toàn. Local vẫn là nguồn chính."}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Chờ sync</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.pendingCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Đang gửi</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.inFlightCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lỗi/retry</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.failedOrRetryableCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Đã nhận</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.succeededCount}</p>
                </div>
              </div>
              <div className="grid gap-2 pt-2 text-xs leading-5 text-slate-500 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-700">Bắt đầu sync gần nhất:</span>{" "}
                  {formatMutationQueueTimestamp(queueSummary.lastDrainStartedAt)}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Kết thúc sync gần nhất:</span>{" "}
                  {formatMutationQueueTimestamp(queueSummary.lastDrainFinishedAt)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mạng</p>
                  <p className={`mt-1 text-sm font-semibold ${
                    mutationQueueSyncStatus.networkStatus === "offline"
                      ? "text-amber-700"
                      : mutationQueueSyncStatus.networkStatus === "online"
                        ? "text-emerald-700"
                        : "text-slate-500"
                  }`}>
                    {mutationQueueSyncStatus.networkStatus === "offline" ? "Offline" : mutationQueueSyncStatus.networkStatus === "online" ? "Online" : "Không rõ"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tự retry khi online</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {mutationQueueSyncStatus.retryOnReconnectEnabled ? "Bật" : "Tắt"}
                  </p>
                </div>
              </div>
              {mutationQueueSyncStatus.networkStatus === "offline" ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs leading-5 text-amber-800">
                    Trình duyệt đang offline. Thay đổi vẫn lưu local và sẽ sync khi có mạng.
                  </p>
                </div>
              ) : null}
              <p className="text-xs leading-5 text-slate-500">
                Dữ liệu local vẫn an toàn nếu backend fail; panel này chỉ dùng để kiểm thử MVP 2 real mode.
              </p>
              <p className="text-xs leading-5 text-slate-500">
                {getMutationQueueResultDescription(mutationQueueSyncStatus.lastResult)}
              </p>
            </div>
            <MutationQueueConflictResolutionPanel
              activeGoalId={activeGoalId}
              result={mutationQueueMergeReviewResult}
              syncLoading={mutationQueueSyncStatus.loading}
              onExportLocalData={onExportLocalData}
              onRunMutationQueueSync={onRunMutationQueueSync}
              onUseCloudVersion={onUseCloudVersion}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full whitespace-normal border-slate-200 bg-white text-center text-slate-800 hover:bg-slate-50"
              disabled={!canRunMutationQueueSync}
              onClick={onRunMutationQueueSync}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${mutationQueueSyncStatus.loading ? "animate-spin" : ""}`} />
              {mutationQueueSyncStatus.loading ? "Đang đồng bộ..." : "Đồng bộ cloud thủ công"}
            </Button>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full whitespace-normal border-slate-200 bg-white text-center text-slate-800 hover:bg-slate-50"
                disabled={!canRunMutationQueueSync}
                onClick={onExportCloudWorkspace}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export cloud
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full whitespace-normal border-red-200 bg-white text-center text-red-700 hover:bg-red-50"
                disabled={!canRunMutationQueueSync}
                onClick={onDeleteCloudWorkspace}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa cloud
              </Button>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Export cloud tải bản sao JSON workspace trên server. Xóa cloud chỉ xóa dữ liệu 12-week trên server, không xóa local, billing hay tài khoản.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Nhắc việc</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {appPreferences.enableInAppReminders ? "Bật" : "Tắt"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Trình duyệt</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {appPreferences.enableBrowserNotifications ? "Bật" : "Tắt"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Phân tích</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {appPreferences.allowLocalAnalytics ? "Bật" : "Tắt"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Outbox</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{pendingOutboxCount} chờ</p>
        </div>
      </div>
    </div>
  );
}
