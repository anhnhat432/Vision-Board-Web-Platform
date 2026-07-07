import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type NetworkStatus = "online" | "offline" | "unknown";

function getBrowserNetworkStatus(): NetworkStatus {
  if (typeof navigator === "undefined") return "unknown";
  if (typeof navigator.onLine !== "boolean") return "unknown";
  return navigator.onLine ? "online" : "offline";
}

export interface UseNetworkStatusOptions {
  /** Whether to attach browser network listeners. Default: true. */
  enabled?: boolean;
  /** Called when the browser transitions to online after being offline. */
  onReconnect?: () => void;
  /** Debounce delay (ms) before calling onReconnect. Default: 3000ms. */
  reconnectDebounceMs?: number;
}

/**
 * Reactive hook that tracks browser online/offline status.
 *
 * Attaches `online` / `offline` event listeners on `window` and
 * updates state accordingly.  Optionally calls `onReconnect` (debounced)
 * when the browser transitions from offline → online.
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const { enabled = true, onReconnect, reconnectDebounceMs = 3000 } = options;
  const [status, setStatus] = useState<NetworkStatus>(getBrowserNetworkStatus);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  const cancelReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cancelReconnectTimer();
      return;
    }

    setStatus(getBrowserNetworkStatus());

    const handleOnline = () => {
      setStatus("online");
      cancelReconnectTimer();
      if (onReconnectRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          onReconnectRef.current?.();
        }, reconnectDebounceMs);
      }
    };

    const handleOffline = () => {
      setStatus("offline");
      cancelReconnectTimer();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      cancelReconnectTimer();
    };
  }, [cancelReconnectTimer, enabled, reconnectDebounceMs]);

  return useMemo(
    () => ({
      status,
      isOnline: status === "online",
      isOffline: status === "offline",
    }),
    [status],
  );
}
