import { CloudDownload } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekLocalStatusSectionProps = Pick<
  TwelveWeekSettingsTabProps,
  | "appPreferences"
  | "backendConnectionStatus"
  | "isHydratingBackendPlans"
  | "lastBackendHydrationResult"
  | "onHydrateBackendPlans"
  | "pendingOutboxCount"
>;

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
  if (!status.authConfigured) return "Firebase chưa được cấu hình, dữ liệu vẫn chạy ở chế độ local-first.";
  if (status.authLoading) return "Đang kiểm tra phiên đăng nhập trước khi nối backend.";
  if (!status.signedIn) return "Đăng nhập để bật profile backend và đồng bộ tiến độ qua thiết bị khác.";
  if (!status.profileReady) return "Đã có phiên đăng nhập, đang chờ backend profile hoàn tất bootstrap.";
  if (status.syncing) return "Đang đẩy plan, task, check-in và review 12-week lên backend.";
  if (status.syncMessage) return status.syncMessage;
  return status.displayName || status.email
    ? `Đang đồng bộ dưới tài khoản ${status.displayName || status.email}.`
    : "Backend profile đã sẵn sàng cho các thao tác đồng bộ.";
}

function getBackendHydrationDescription(
  result: TwelveWeekSettingsTabProps["lastBackendHydrationResult"],
): string {
  if (!result) return "Kéo các chu kỳ 12-week đã có trên backend về thiết bị này nếu local còn thiếu.";

  if (result.status === "error") return result.message;
  if (result.status === "partial") return result.message;
  if (result.hydratedCount + result.updatedCount > 0) {
    return `Đã khôi phục ${result.hydratedCount} chu kỳ mới và cập nhật ${result.updatedCount} chu kỳ.`;
  }

  return "Backend đã được kiểm tra, chưa có chu kỳ mới cần khôi phục.";
}

export function TwelveWeekLocalStatusSection({
  appPreferences,
  backendConnectionStatus,
  isHydratingBackendPlans,
  lastBackendHydrationResult,
  onHydrateBackendPlans,
  pendingOutboxCount,
}: TwelveWeekLocalStatusSectionProps) {
  const canHydrateBackendPlans =
    backendConnectionStatus.authConfigured &&
    !backendConnectionStatus.authLoading &&
    backendConnectionStatus.signedIn &&
    backendConnectionStatus.profileReady &&
    !backendConnectionStatus.syncing &&
    !isHydratingBackendPlans;

  return (
    <div className="rounded-[26px] border border-slate-900/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-[0_28px_60px_-38px_rgba(15,23,42,0.7)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Bảng điều khiển local</p>
          <p className="mt-2 text-lg font-semibold">Các tiện ích dưới đây chỉ tác động trên thiết bị hiện tại.</p>
        </div>
        <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
          Thiết bị này
        </Badge>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Đồng bộ backend</p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              {getBackendStatusDescription(backendConnectionStatus)}
            </p>
          </div>
          <Badge variant="outline" className={getBackendBadgeClass(backendConnectionStatus)}>
            {getBackendStatusLabel(backendConnectionStatus)}
          </Badge>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-white/72">
              {isHydratingBackendPlans
                ? "Đang kiểm tra backend và khôi phục các chu kỳ còn thiếu."
                : getBackendHydrationDescription(lastBackendHydrationResult)}
            </p>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 border-white/20 bg-white/12 text-white hover:bg-white/20 hover:text-white"
              disabled={!canHydrateBackendPlans}
              onClick={onHydrateBackendPlans}
            >
              <CloudDownload className="mr-2 h-4 w-4" />
              {isHydratingBackendPlans ? "Đang khôi phục..." : "Khôi phục từ backend"}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Nhắc việc</p>
          <p className="mt-2 text-sm font-semibold text-white">{appPreferences.enableInAppReminders ? "Bật" : "Tắt"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Trình duyệt</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {appPreferences.enableBrowserNotifications ? "Bật" : "Tắt"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Phân tích</p>
          <p className="mt-2 text-sm font-semibold text-white">{appPreferences.allowLocalAnalytics ? "Bật" : "Tắt"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Outbox</p>
          <p className="mt-2 text-sm font-semibold text-white">{pendingOutboxCount} chờ</p>
        </div>
      </div>
    </div>
  );
}
