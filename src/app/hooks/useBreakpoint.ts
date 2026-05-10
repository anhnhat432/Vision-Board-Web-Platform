import { useState, useEffect } from "react";

function getIsDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 640;
}

export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    setIsDesktop(getIsDesktop());

    // Listen for changes
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}
