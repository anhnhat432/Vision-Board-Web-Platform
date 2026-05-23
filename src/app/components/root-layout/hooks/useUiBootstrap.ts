import { useEffect } from "react";

import { WARM_PREFETCH_ROUTE_PATHS, prefetchRoute } from "../navConfig";

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
export function useWarmPrefetch(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const warmPrimaryHeavyRoutes = () => {
      for (const path of WARM_PREFETCH_ROUTE_PATHS) {
        prefetchRoute(path);
      }
    };

    const timeoutId = globalThis.setTimeout(warmPrimaryHeavyRoutes, 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);
}
