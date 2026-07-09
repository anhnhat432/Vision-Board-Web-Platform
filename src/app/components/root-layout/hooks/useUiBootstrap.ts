import { useEffect } from "react";

import { prefetchRoute, WARM_PREFETCH_ROUTE_PATHS } from "../navConfig";

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
}

/**
 * Bật listener Cmd/Ctrl+K toggle CommandPalette ở phạm vi window.
 */
export function useCommandPaletteHotkey(setOpen: (toggle: (open: boolean) => boolean) => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isHotkey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isHotkey) return;
      event.preventDefault();
      setOpen((open) => !open);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setOpen]);
}

/**
 * Sau khi RootLayout mount, prefetch các heavy route để tránh spinner đầu tiên.
 */
export function useWarmPrefetch(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const connection = (window.navigator as NavigatorWithConnection).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return;
    if (window.navigator.hardwareConcurrency <= 4) return;

    const warmPrimaryHeavyRoutes = () => {
      for (const path of WARM_PREFETCH_ROUTE_PATHS) {
        prefetchRoute(path);
      }
    };

    let idleHandle: number | null = null;
    const timeoutId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(warmPrimaryHeavyRoutes, { timeout: 2_500 });
        return;
      }

      warmPrimaryHeavyRoutes();
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, [enabled]);
}
