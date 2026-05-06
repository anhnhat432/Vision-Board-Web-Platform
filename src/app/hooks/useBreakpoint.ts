import { useState, useEffect } from "react";

export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    // Initial check
    setIsDesktop(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}
