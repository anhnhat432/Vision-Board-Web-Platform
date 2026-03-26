import { useEffect, useState } from "react";

const PAGE_TOUR_EVENT = "page-tour-start";

export function usePageTour(tourName: string) {
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTourStart = (event: Event) => {
      const detail = (event as CustomEvent<{ tour?: string }>).detail;
      if (detail?.tour === tourName) {
        setIsTourOpen(true);
      }
    };

    window.addEventListener(PAGE_TOUR_EVENT, handleTourStart);
    return () => {
      window.removeEventListener(PAGE_TOUR_EVENT, handleTourStart);
    };
  }, [tourName]);

  return { isTourOpen, setIsTourOpen };
}
