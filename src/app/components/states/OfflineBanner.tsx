import { WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { cn } from "../ui/utils";

const OFFLINE_BANNER_DISMISSED_KEY = "offline-banner-dismissed";

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem(OFFLINE_BANNER_DISMISSED_KEY) === "1";
    setIsDismissed(dismissed);
  }, []);

  useEffect(() => {
    if (!isOffline) {
      setIsDismissed(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(OFFLINE_BANNER_DISMISSED_KEY);
      }
    }
  }, [isOffline]);

  if (!isOffline || isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium leading-5 text-white bg-app-status-error animate-in slide-in-from-top duration-300",
        "transition-all",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>Bạn đang ngoại tuyến. Một số tính năng đồng bộ hóa có thể không hoạt động.</span>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsDismissed(true);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(OFFLINE_BANNER_DISMISSED_KEY, "1");
          }
        }}
        className="shrink-0 rounded-full p-1 transition-colors hover:bg-app-status-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label="Tắt thông báo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
