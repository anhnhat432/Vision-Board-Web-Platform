import { AlertTriangle, CloudDownload, CloudUpload } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekLocalStatusSectionProps = Pick<
  TwelveWeekSettingsTabProps,
  | "activeGoalId"
  | "appPreferences"
  | "backendConnectionStatus"
  | "isHydratingBackendPlans"
  | "isResolvingBackendPlanConflicts"
  | "lastBackendHydrationResult"
  | "onHydrateBackendPlans"
  | "onKeepLocalPlanForConflicts"
  | "onUseBackendPlanForConflicts"
  | "pendingOutboxCount"
>;

type BackendConflict = NonNullable<TwelveWeekSettingsTabProps["lastBackendHydrationResult"]>["conflicts"][number];

interface BackendConflictGroup {
  goalId: string;
  goalTitle: string;
  planVision: string;
  conflicts: BackendConflict[];
}

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

export function TwelveWeekLocalStatusSection({
  activeGoalId,
  appPreferences,
  backendConnectionStatus,
  isHydratingBackendPlans,
  isResolvingBackendPlanConflicts,
  lastBackendHydrationResult,
  onHydrateBackendPlans,
  onKeepLocalPlanForConflicts,
  onUseBackendPlanForConflicts,
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
