import { HardDrive, Info, Monitor } from "lucide-react";

type DataStorageInfoVariant = "card" | "inline" | "banner";

interface DataStorageInfoProps {
  variant?: DataStorageInfoVariant;
  showSyncHint?: boolean;
  className?: string;
}

export function DataStorageInfo({
  variant = "card",
  showSyncHint = false,
  className = "",
}: DataStorageInfoProps) {
  if (variant === "inline") {
    return (
      <p className={`flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
        <Monitor className="h-3 w-3 shrink-0" />
        Kế hoạch 12 tuần được lưu trên trình duyệt này.
      </p>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 ${className}`}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-900">
            Dữ liệu được lưu trên trình duyệt này
          </p>
          <p className="mt-0.5 text-sm text-sky-700">
            Nếu đổi thiết bị hoặc xóa dữ liệu trình duyệt, tiến độ sẽ bị mất. Hãy xuất bản sao
            lưu nếu muốn giữ lại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[22px] border border-slate-200 bg-white/92 p-5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.12)] ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
          <HardDrive className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Dữ liệu và quyền riêng tư</p>
          <p className="text-xs text-slate-500">Dữ liệu lưu trên thiết bị</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        <li className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
          <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          Toàn bộ dữ liệu được lưu trên trình duyệt này. App chỉ đồng bộ lên tài khoản khi bạn đăng nhập.
        </li>
        <li className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          Đổi thiết bị, dùng trình duyệt khác hoặc xóa dữ liệu trình duyệt sẽ mất tiến độ. Hãy
          xuất bản sao lưu thường xuyên.
        </li>
        {showSyncHint && (
          <li className="flex items-start gap-2.5 text-sm leading-6 text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            Đăng nhập để đồng bộ dữ liệu giữa các thiết bị (khi tính năng sẵn sàng).
          </li>
        )}
      </ul>
    </div>
  );
}
