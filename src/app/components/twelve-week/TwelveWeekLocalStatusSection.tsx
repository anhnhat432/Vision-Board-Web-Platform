import { Badge } from "../ui/badge";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekLocalStatusSectionProps = Pick<TwelveWeekSettingsTabProps, "appPreferences" | "pendingOutboxCount">;

export function TwelveWeekLocalStatusSection({
  appPreferences,
  pendingOutboxCount,
}: TwelveWeekLocalStatusSectionProps) {
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
