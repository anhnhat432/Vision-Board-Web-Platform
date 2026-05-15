import { type SyntheticEvent, useCallback, useState } from "react";
import { AlertTriangle, CloudDownload, CloudUpload, FileDown, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { CloudSyncIllustration, SyncErrorDot, SyncIdleDot, SyncOkDot, SyncSyncingDot } from "../illustrations";
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
  if (status.syncStatus === "error") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function getBackendStatusDot(status: TwelveWeekSettingsTabProps["backendConnectionStatus"]) {
  if (!status.authConfigured || !status.signedIn) return SyncIdleDot;
  if (status.authLoading || !status.profileReady || status.syncing) return SyncSyncingDot;
  if (status.syncStatus === "partial" || status.syncStatus === "error") return SyncErrorDot;
  if (status.authConfigured && status.signedIn) return SyncOkDot;
  return SyncIdleDot;
}

function getMutationQueueSyncBlocker(input: {
  backendConnectionStatus: TwelveWeekSettingsTabProps["backendConnectionStatus"];
  mutationQueueSyncStatus: MutationQueueManualSyncStatus;
}): string | null {
  const { backendConnectionStatus, mutationQueueSyncStatus } = input;

  if (!mutationQueueSyncStatus.realMode) return "Dữ liệu đang lưu trên thiết bị này, chưa bật đồng bộ tài khoản.";
  if (!mutationQueueSyncStatus.featureEnabled) return "Đồng bộ thay đổi đang tắt.";
  if (!mutationQueueSyncStatus.pullFeatureEnabled) return "Khôi phục dữ liệu tài khoản đang tắt.";
  if (!mutationQueueSyncStatus.apiConfigured) return "Chưa cấu hình kết nối tài khoản để gửi hàng chờ.";
  if (!backendConnectionStatus.authConfigured) return "Chưa cấu hình đăng nhập.";
  if (backendConnectionStatus.authLoading) return "Đang kiểm tra phiên đăng nhập.";
  if (!backendConnectionStatus.signedIn) return "Cần đăng nhập để gửi hàng chờ lên tài khoản.";
  if (!backendConnectionStatus.profileReady) return "Đang chờ hồ sơ tài khoản sẵn sàng.";

  return null;
}

function getMutationQueueResultDescription(result: MutationQueueSyncResult | null): string {
  if (!result) {
    return "Chưa chạy lần nào trong phiên này. Hành động này gửi các mục đang chờ, lấy dữ liệu tài khoản, rồi chỉ áp dụng khi an toàn.";
  }

  if (result.status === "applied") {
    const pulledGoalCount = result.pullResponse?.workspace.goals.length ?? 0;
    return `Đã gửi hàng chờ, lấy ${pulledGoalCount} mục tiêu từ tài khoản và áp dụng dữ liệu an toàn vào thiết bị.`;
  }

  if (result.status === "drain_failed") {
    return `${result.message} Dữ liệu trên thiết bị vẫn được giữ nguyên.`;
  }

  if (result.status === "conflict") {
    const conflictCount = result.mergeReport?.summary.conflictCount ?? 0;
    const unresolvedCount = result.unresolvedLocalMutationCount ?? 0;
    return `${result.message} Khác biệt: ${conflictCount}; mục còn chờ trên thiết bị: ${unresolvedCount}.`;
  }

  if (result.status === "unsafe") {
    const summary = result.mergeReport?.summary;
    return summary
      ? `${result.message} Chỉ có trên tài khoản: ${summary.cloudOnlyCount}; chỉ có trên thiết bị: ${summary.localOnlyCount}; thiếu mã liên kết: ${summary.missingClientIdCount}.`
      : result.message;
  }

  if (result.status === "error") {
    return `${result.message} Dữ liệu trên thiết bị không bị xóa.`;
  }

  switch (result.skipReason) {
    case "mutation_feature_disabled":
      return "Đồng bộ thay đổi đang tắt.";
    case "pull_feature_disabled":
      return "Khôi phục dữ liệu tài khoản đang tắt.";
    case "demo_mode":
      return "Chế độ chỉ lưu cục bộ không gọi API tài khoản.";
    case "unauthenticated":
      return "Cần đăng nhập để đồng bộ tài khoản.";
    case "api_not_configured":
      return "Chưa cấu hình API.";
    default:
      return result.message || "Điều kiện đồng bộ chưa sẵn sàng.";
  }
}

function isMutationQueueMergeReviewNeeded(result: MutationQueueSyncResult | null): result is MutationQueueSyncResult {
  return Boolean(result?.mergeReport && (result.status === "conflict" || result.status === "unsafe"));
}

function getPullEntityKindLabel(kind: MutationQueueMergeReport["conflicts"][number]["kind"]): string {
  switch (kind) {
    case "goal":
      return "Mục tiêu";
    case "plan":
      return "Kế hoạch 12 tuần";
    case "week":
      return "Tuần";
    case "task":
      return "Việc";
    case "leadMetric":
      return "Việc lặp lại";
    case "dailyCheckIn":
      return "Check-in hàng ngày";
    case "weeklyReview":
      return "Review tuần";
    default:
      return "Mục trong không gian làm việc";
  }
}

function getPullConflictReasonLabel(reason: MutationQueueMergeReport["conflicts"][number]["reason"]): string {
  switch (reason) {
    case "pending_local_mutation_cloud_newer":
      return "Đám mây đã thay đổi sau khi bạn cập nhật.";
    case "task_completion_differs":
      return "Trạng thái hoàn thành việc khác nhau.";
    case "daily_check_in_differs":
      return "Check-in hàng ngày khác nhau.";
    case "weekly_review_differs":
      return "Review tuần khác nhau.";
    default:
      return "Dữ liệu máy và đám mây khác nhau.";
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
  if (!status.profileReady) return "Đang kết nối hồ sơ";
  if (status.syncing) return "Đang đồng bộ";
  if (status.syncStatus === "success") return "Đã đồng bộ";
  if (status.syncStatus === "partial") return "Đồng bộ một phần";
  if (status.syncStatus === "error") return "Có lỗi đồng bộ";
  return "Đã sẵn sàng";
}

function getBackendStatusDescription(status: TwelveWeekSettingsTabProps["backendConnectionStatus"]): string {
  if (!status.authConfigured) return "Đồng bộ tài khoản chưa được cấu hình. Dữ liệu vẫn được giữ trên thiết bị này.";
  if (status.authLoading) return "Đang kiểm tra phiên đăng nhập trước khi nối tài khoản.";
  if (!status.signedIn) return "Đăng nhập để đồng bộ tiến độ qua thiết bị khác.";
  if (!status.profileReady) return "Đã có phiên đăng nhập, đang chờ hồ sơ tài khoản sẵn sàng.";
  if (status.syncing) return "Đang đồng bộ kế hoạch, việc, check-in và review 12 tuần lên tài khoản.";
  if (status.syncMessage) return status.syncMessage;
  return status.displayName || status.email
    ? `Đang đồng bộ dưới tài khoản ${status.displayName || status.email}. Nếu dữ liệu hai nơi khác nhau, web sẽ hỏi bạn trước khi ghi đè.`
    : "Đồng bộ tài khoản đã sẵn sàng. Nếu dữ liệu hai nơi khác nhau, web sẽ hỏi bạn trước khi ghi đè.";
}

function getBackendHydrationDescription(result: TwelveWeekSettingsTabProps["lastBackendHydrationResult"]): string {
  if (!result) {
    return "Kiểm tra tài khoản và chỉ khôi phục những chu kỳ 12 tuần đang thiếu trên thiết bị. Nếu hai bên khác nhau, web sẽ yêu cầu bạn chọn nguồn dữ liệu trước.";
  }

  if (result.status === "error") return result.message;
  if (result.status === "partial") return result.message;
  if (result.conflictCount > 0) {
    return `${result.message} Web đã tạm dừng tự đồng bộ cho các chu kỳ này.`;
  }
  if (result.hydratedCount + result.updatedCount > 0) {
    return `Đã khôi phục ${result.hydratedCount} chu kỳ mới và cập nhật ${result.updatedCount} chu kỳ từ tài khoản.`;
  }

  return "Tài khoản đã được kiểm tra, chưa có chu kỳ mới cần khôi phục.";
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
      return "Việc đã liên kết";
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
    <div className="rounded-[var(--r-control)] border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950">
            Có thay đổi trên thiết bị này và trong tài khoản.
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Ứng dụng chưa tự ghi đè để tránh mất dữ liệu. Nên tải bản sao trước khi xử lý khác biệt.
          </p>
        </div>
      </div>

      <div className="mt-[var(--space-inline)] grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <div className="rounded-[var(--r-control)] border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Khác biệt</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.conflictCount}</p>
        </div>
        <div className="rounded-[var(--r-control)] border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Chỉ trên máy</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.localOnlyCount}</p>
        </div>
        <div className="rounded-[var(--r-control)] border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Chỉ tài khoản</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.cloudOnlyCount}</p>
        </div>
        <div className="rounded-[var(--r-control)] border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Thiếu liên kết</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.missingClientIdCount}</p>
        </div>
        <div className="rounded-[var(--r-control)] border border-amber-200 bg-white px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.12em] text-amber-700">Cần kiểm tra</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{report.summary.unsupportedFieldCount}</p>
        </div>
      </div>

      <details className="mt-[var(--space-inline)] rounded-[var(--r-control)] border border-amber-200 bg-white p-3" onToggle={handleDetailsToggle}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Xem chi tiết</summary>
        <div className="mt-[var(--space-inline)] stack-tight text-xs leading-5 text-slate-600">
          <p>
            Chi tiết bên dưới chỉ hiển thị loại dữ liệu và số lượng. Nội dung ghi chú, nhìn lại, check-in hoặc review
            không được mở ra ở đây.
          </p>
          {visibleConflicts.length > 0 ? (
            <div className="space-y-2">
              {visibleConflicts.map((conflict) => (
                <div
                  key={`${conflict.kind}-${conflict.reason}`}
                  className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-2"
                >
                  <p className="font-semibold text-slate-900">{getPullEntityKindLabel(conflict.kind)}</p>
                  <p className="mt-1">{getPullConflictReasonLabel(conflict.reason)}</p>
                </div>
              ))}
              {hiddenConflictCount > 0 ? <p>Còn {hiddenConflictCount} khác biệt khác.</p> : null}
            </div>
          ) : null}
          {report.localOnlyChanges.length > 0 ? (
            <p>Có {report.localOnlyChanges.length} mục chỉ có trên thiết bị này.</p>
          ) : null}
          {report.cloudOnlyChanges.length > 0 ? (
            <p>Có {report.cloudOnlyChanges.length} mục chỉ có trong tài khoản.</p>
          ) : null}
          {visibleUnsupportedFields.length > 0 ? (
            <div>
              <p className="font-semibold text-slate-900">Mục chưa tự xử lý:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {visibleUnsupportedFields.map((field) => (
                  <li key={field.field}>{field.field}</li>
                ))}
              </ul>
              {hiddenUnsupportedCount > 0 ? <p className="mt-1">Còn {hiddenUnsupportedCount} mục khác.</p> : null}
            </div>
          ) : null}
        </div>
      </details>

      <div className="mt-[var(--space-inline)] grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          type="button"
          variant="outline"
          className="whitespace-normal border-amber-200 bg-white text-center text-slate-800 hover:bg-amber-50"
          onClick={handleExport}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Tải bản sao dữ liệu
        </Button>
        <Button
          type="button"
          variant="outline"
          className="whitespace-normal border-amber-200 bg-white text-center text-slate-800 hover:bg-amber-50"
          onClick={handleKeepLocal}
        >
          Giữ bản trên thiết bị
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
          Dùng bản tài khoản
        </Button>
      </div>

      {!canUseCloudVersion && hasPendingLocalMutations ? (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          Không thể dùng bản tài khoản khi vẫn còn thay đổi trên thiết bị chưa gửi. Thử đồng bộ lại trước.
        </p>
      ) : null}

      {showCloudConfirm ? (
        <div className="mt-[var(--space-inline)] rounded-[var(--r-control)] border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">
            Xác nhận dùng dữ liệu từ tài khoản
          </p>
          <p className="mt-1 text-xs leading-5 text-red-800">
            Hành động này sẽ thay thế toàn bộ dữ liệu 12 tuần trên thiết bị này bằng bản từ tài khoản.
            Khuyên bạn tải bản sao trước khi tiếp tục.
          </p>
          <label className="mt-[var(--space-inline)] flex cursor-pointer items-start gap-2 text-xs text-red-800">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmExported}
              onChange={(e) => setConfirmExported(e.target.checked)}
            />
            <span>Tôi đã tải bản sao hoặc chấp nhận thay dữ liệu hiện tại trên thiết bị.</span>
          </label>
          <div className="mt-[var(--space-inline)] flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-red-200 bg-white text-red-800 hover:bg-red-50"
              disabled={!confirmExported}
              onClick={handleConfirmUseCloud}
            >
              <CloudDownload className="mr-2 h-4 w-4" />
              Xác nhận dùng bản tài khoản
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
        <p className="mt-[var(--space-inline)] rounded-[var(--r-control)] border border-amber-200 bg-white px-3 py-2 text-xs leading-5 text-amber-800">
          Đã giữ bản trên thiết bị cho hiện tại. Không có dữ liệu nào bị xóa hoặc ghi đè.
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
  const BackendStatusDot = getBackendStatusDot(backendConnectionStatus);

  return (
    <div className="rounded-[var(--r-control)] border border-slate-200 bg-white p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Đồng bộ tài khoản</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            Các tiện ích dưới đây giúp kiểm tra và bảo vệ dữ liệu trước khi đồng bộ.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <CloudSyncIllustration className="hidden w-28 text-violet-500 opacity-70 sm:block" />
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            Thiết bị này
          </Badge>
        </div>
      </div>
      <div className="mt-4 rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Đồng bộ tài khoản</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {getBackendStatusDescription(backendConnectionStatus)}
            </p>
          </div>
          <Badge variant="outline" className={getBackendBadgeClass(backendConnectionStatus)}>
            <BackendStatusDot className="mr-1.5 h-4 w-4" />
            {getBackendStatusLabel(backendConnectionStatus)}
          </Badge>
        </div>
        <div className="mt-4 rounded-[var(--r-control)] border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm leading-6 text-slate-700">
                {isHydratingBackendPlans
                  ? "Đang kiểm tra tài khoản và khôi phục các chu kỳ còn thiếu."
                  : getBackendHydrationDescription(lastBackendHydrationResult)}
              </p>
              <p className="text-xs leading-5 text-slate-500">
                Hành động này không tự xóa dữ liệu trên thiết bị khi phát hiện khác biệt.
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
              {isHydratingBackendPlans ? "Đang kiểm tra..." : "Kiểm tra dữ liệu tài khoản"}
            </Button>
          </div>
        </div>
        {conflictGroups.length > 0 ? (
          <div className="mt-4 stack-tight rounded-[var(--r-control)] border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-950">Cần chọn nguồn dữ liệu</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Dữ liệu trên thiết bị và tài khoản đang khác nhau. Chưa có dữ liệu nào bị ghi đè; chọn bản muốn giữ cho từng chu kỳ
                  trước khi web tự đồng bộ tiếp.
                </p>
              </div>
            </div>
            {conflictGroups.map((group) => {
              const isActiveGoalConflict = group.goalId === activeGoalId;
              const visibleConflicts = group.conflicts.slice(0, 4);
              const hiddenCount = group.conflicts.length - visibleConflicts.length;

              return (
                <div key={group.goalId} className="rounded-[var(--r-control)] border border-amber-200 bg-white p-3">
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
                  <div className="mt-[var(--space-inline)] space-y-2">
                    {visibleConflicts.map((conflict, index) => (
                      <div
                        key={`${conflict.kind}-${conflict.localId ?? conflict.backendId ?? index}`}
                        className="grid gap-2 rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-2 text-xs sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)]"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{getConflictKindLabel(conflict.kind)}</p>
                          <p className="mt-1 text-slate-500">{getConflictScopeLabel(conflict)}</p>
                        </div>
                        <div className="min-w-0 rounded-[var(--r-control)] bg-white p-2">
                          <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Thiết bị</p>
                          <p className="mt-1 break-words text-slate-800">
                            {getConflictValueLabel(conflict.localValue)}
                          </p>
                        </div>
                        <div className="min-w-0 rounded-[var(--r-control)] bg-white p-2">
                          <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Tài khoản</p>
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
                  <div className="mt-[var(--space-inline)] grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-2 leading-5 text-slate-600">
                      <span className="font-semibold text-slate-900">Dùng bản tài khoản:</span> thay dữ liệu trên thiết bị của chu
                      kỳ này bằng bản đang lưu trong tài khoản.
                    </div>
                    <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-2 leading-5 text-slate-600">
                      <span className="font-semibold text-slate-900">Giữ bản thiết bị:</span> dùng dữ liệu trên thiết bị này
                      làm bản chính.
                    </div>
                  </div>
                  <div className="mt-[var(--space-inline)] flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="whitespace-normal border-slate-200 bg-white text-center text-slate-800 hover:bg-slate-50 sm:whitespace-nowrap"
                      disabled={isResolvingBackendPlanConflicts}
                      onClick={() => onUseBackendPlanForConflicts(group.goalId)}
                    >
                      <CloudDownload className="mr-2 h-4 w-4" />
                      Dùng bản tài khoản
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="whitespace-normal border-slate-200 bg-white text-center text-slate-800 hover:bg-slate-50 sm:whitespace-nowrap"
                      disabled={isResolvingBackendPlanConflicts}
                      onClick={() => onKeepLocalPlanForConflicts(group.goalId)}
                    >
                      <CloudUpload className="mr-2 h-4 w-4" />
                      {isActiveGoalConflict ? "Giữ bản thiết bị" : "Mở chu kỳ để giữ bản thiết bị"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="mt-4 rounded-[var(--r-control)] border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Hàng chờ đồng bộ
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
                  "Gửi các mục đang chờ, lấy dữ liệu tài khoản, rồi chỉ cập nhật thiết bị nếu an toàn. Dữ liệu trên thiết bị vẫn được ưu tiên."}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Chờ đồng bộ</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.pendingCount}</p>
                </div>
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Đang gửi</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.inFlightCount}</p>
                </div>
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lỗi/thử lại</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.failedOrRetryableCount}</p>
                </div>
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Đã nhận</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{queueSummary.succeededCount}</p>
                </div>
              </div>
              <div className="grid gap-2 pt-2 text-xs leading-5 text-slate-500 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-700">Bắt đầu đồng bộ gần nhất:</span>{" "}
                  {formatMutationQueueTimestamp(queueSummary.lastDrainStartedAt)}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Kết thúc đồng bộ gần nhất:</span>{" "}
                  {formatMutationQueueTimestamp(queueSummary.lastDrainFinishedAt)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mạng</p>
                  <p className={`mt-1 text-sm font-semibold ${
                    mutationQueueSyncStatus.networkStatus === "offline"
                      ? "text-amber-700"
                      : mutationQueueSyncStatus.networkStatus === "online"
                        ? "text-emerald-700"
                        : "text-slate-500"
                  }`}>
                    {mutationQueueSyncStatus.networkStatus === "offline" ? "Mất mạng" : mutationQueueSyncStatus.networkStatus === "online" ? "Có mạng" : "Không rõ"}
                  </p>
                </div>
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tự thử lại khi có mạng</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {mutationQueueSyncStatus.retryOnReconnectEnabled ? "Bật" : "Tắt"}
                  </p>
                </div>
              </div>
              {mutationQueueSyncStatus.networkStatus === "offline" ? (
                <div className="flex items-start gap-2 rounded-[var(--r-control)] border border-amber-200 bg-amber-50 px-3 py-2">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs leading-5 text-amber-800">
                    Trình duyệt đang mất mạng. Thay đổi vẫn lưu trên thiết bị và sẽ đồng bộ khi có mạng.
                  </p>
                </div>
              ) : null}
              <p className="text-xs leading-5 text-slate-500">
                Dữ liệu trên thiết bị vẫn an toàn nếu đồng bộ lỗi; phần này chỉ dành cho kiểm thử nội bộ.
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
              {mutationQueueSyncStatus.loading ? "Đang đồng bộ..." : "Đồng bộ tài khoản"}
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
                Tải bản sao tài khoản
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full whitespace-normal border-red-200 bg-white text-center text-red-700 hover:bg-red-50"
                disabled={!canRunMutationQueueSync}
                onClick={onDeleteCloudWorkspace}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa dữ liệu tài khoản
              </Button>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Tải bản sao dữ liệu tài khoản dưới dạng JSON. Xóa dữ liệu tài khoản chỉ xóa dữ liệu 12 tuần trên tài khoản,
              không xóa dữ liệu trên thiết bị, gói Plus hay tài khoản đăng nhập.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Nhắc việc</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {appPreferences.enableInAppReminders ? "Bật" : "Tắt"}
          </p>
        </div>
        <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Trình duyệt</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {appPreferences.enableBrowserNotifications ? "Bật" : "Tắt"}
          </p>
        </div>
        <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Phân tích</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {appPreferences.allowLocalAnalytics ? "Bật" : "Tắt"}
          </p>
        </div>
        <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hàng chờ gửi</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{pendingOutboxCount} chờ</p>
        </div>
      </div>
    </div>
  );
}
