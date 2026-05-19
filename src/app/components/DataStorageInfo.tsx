import { HardDrive, Info, Monitor } from "lucide-react";
import { isDemoMode } from "../utils/app-mode";

type DataStorageInfoVariant = "card" | "inline" | "banner";

interface DataStorageInfoProps {
  variant?: DataStorageInfoVariant;
  showSyncHint?: boolean;
  className?: string;
}

export function DataStorageInfo({ variant = "card", showSyncHint = false, className = "" }: DataStorageInfoProps) {
  const demoMode = isDemoMode();

  if (variant === "inline") {
    return (
      <p className={`flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
        <Monitor className="h-3 w-3 shrink-0" />
        {demoMode ? "Kế hoạch 12 tuần được lưu trên thiết bị này." : "Kế hoạch 12 tuần đang gắn với tài khoản của bạn."}
      </p>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`flex items-start gap-3 rounded-[var(--r-card)] border border-sky-200 bg-sky-50/80 px-4 py-3 ${className}`}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-900">
            {demoMode ? "Dữ liệu được lưu trên thiết bị này" : "Dữ liệu được gắn với tài khoản của bạn"}
          </p>
          <p className="mt-0.5 text-sm text-sky-700">
            {demoMode
              ? "Nếu đổi thiết bị hoặc xóa dữ liệu trình duyệt, tiến độ sẽ bị mất. Hãy tải bản dự phòng nếu muốn giữ lại."
              : "Ứng dụng vẫn giữ một bản trên thiết bị để thao tác nhanh và sao lưu lại khi tài khoản sẵn sàng."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[var(--r-card)] border border-slate-200 bg-white/92 p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-tile)] bg-slate-100">
          <HardDrive className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Dữ liệu và quyền riêng tư</p>
          <p className="text-xs text-slate-500">{demoMode ? "Dữ liệu lưu trên thiết bị" : "Dữ liệu tài khoản"}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        <li className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
          <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {demoMode
            ? "Tiến trình được lưu trên thiết bị này. Đăng nhập để sao lưu vào tài khoản và dùng tiếp trên thiết bị khác."
            : "Dữ liệu được gắn với tài khoản; thiết bị vẫn giữ bản tạm để bạn dùng mượt khi mạng chập chờn."}
        </li>
        <li className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {demoMode
            ? "Đổi thiết bị hoặc xóa dữ liệu trình duyệt sẽ mất tiến độ. Hãy đăng nhập hoặc tải bản dự phòng thường xuyên."
            : "Nếu đổi thiết bị, hãy đăng nhập cùng tài khoản để khôi phục dữ liệu. Bạn vẫn có thể tải bản dự phòng khi cần."}
        </li>
        {showSyncHint && (
          <li className="flex items-start gap-2.5 text-sm leading-6 text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            {demoMode
              ? "Đăng nhập để sao lưu dữ liệu giữa các thiết bị."
              : "Sao lưu vào tài khoản chạy nền và không xóa dữ liệu trên thiết bị nếu gặp lỗi."}
          </li>
        )}
      </ul>
    </div>
  );
}
