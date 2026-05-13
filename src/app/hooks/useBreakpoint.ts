import { useState, useEffect } from "react";

/**
 * Desktop = viewport >= 768px (matches Tailwind `md:` breakpoint and `useIsMobile`).
 * Previously used 640px which caused inconsistent behaviour between this hook,
 * Tailwind class-based layouts, and `useIsMobile` on tablets (640-767px).
 */
const DESKTOP_MIN_WIDTH = 768;

function getIsDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= DESKTOP_MIN_WIDTH;
}

export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    setIsDesktop(getIsDesktop());

    // Listen for changes
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}
