import { useEffect } from "react";
import { useLocation } from "react-router";

import { canSendRemoteAnalytics } from "../../../utils/analytics";

/**
 * Phát event GA4 page_view mỗi khi route đổi.
 * Tự bỏ qua khi remote analytics tắt hoặc gtag chưa load.
 */
export function usePageViewAnalytics(signedIn: boolean): void {
  const location = useLocation();
  useEffect(() => {
    if (!canSendRemoteAnalytics() || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const route = `${location.pathname}${location.search}${location.hash}`;
    const timeoutId = window.setTimeout(() => {
      window.gtag?.("event", "page_view", {
        app: "vision_board_web",
        page_path: route,
        page_title: document.title,
        signed_in: signedIn,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.hash, location.pathname, location.search, signedIn]);
}
