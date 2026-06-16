import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";
import { PAGE_TOUR_SEEN_STORAGE_PREFIX } from "../utils/storage-constants";

export const PAGE_TOUR_EVENT = "page-tour-start";
const PENDING_TOUR_TTL_MS = 8_000;

interface PageTourEventDetail {
  tour?: string;
  force?: boolean;
}

interface StartPageTourOptions {
  /**
   * Re-open even when the user has already completed or skipped this tour.
   * Used by the persistent "Hướng dẫn sử dụng" button.
   */
  force?: boolean;
}

interface PendingPageTourRequest extends StartPageTourOptions {
  requestedAt: number;
}

interface PageTourState {
  isTourOpen: boolean;
  setIsTourOpen: Dispatch<SetStateAction<boolean>>;
  hasSeenTour: boolean;
  startTour: (options?: StartPageTourOptions) => void;
}

function pageTourStorageKey(tourName: string): string {
  return `${PAGE_TOUR_SEEN_STORAGE_PREFIX}${tourName}`;
}

function hasSeenPageTour(tourName: string): boolean {
  if (typeof window === "undefined") return true;

  try {
    return window.localStorage.getItem(pageTourStorageKey(tourName)) === "true";
  } catch {
    return true;
  }
}

function markPageTourSeen(tourName: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(pageTourStorageKey(tourName), "true");
  } catch {
    // Ignore storage failures - tour guidance is non-critical UX.
  }
}

const pendingPageTourRequests = new Map<string, PendingPageTourRequest>();

function rememberPendingPageTour(tourName: string, options: StartPageTourOptions): void {
  pendingPageTourRequests.set(tourName, { ...options, requestedAt: Date.now() });
}

function consumePendingPageTour(tourName: string): StartPageTourOptions | null {
  const pendingRequest = pendingPageTourRequests.get(tourName);
  if (!pendingRequest) return null;

  pendingPageTourRequests.delete(tourName);
  if (Date.now() - pendingRequest.requestedAt > PENDING_TOUR_TTL_MS) return null;

  return { force: pendingRequest.force };
}

export function startPageTour(tourName: string, options: StartPageTourOptions = {}) {
  if (typeof window === "undefined") return;

  rememberPendingPageTour(tourName, options);
  window.dispatchEvent(new CustomEvent<PageTourEventDetail>(PAGE_TOUR_EVENT, { detail: { tour: tourName, ...options } }));
}

export function usePageTour(tourName: string): PageTourState {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    setHasSeenTour(hasSeenPageTour(tourName));
  }, [tourName]);

  const handleTourOpenChange = useCallback(
    (next: SetStateAction<boolean>) => {
      const nextOpen = typeof next === "function" ? next(isTourOpen) : next;
      if (isTourOpen && !nextOpen) {
        markPageTourSeen(tourName);
        setHasSeenTour(true);
      }
      setIsTourOpen(nextOpen);
    },
    [isTourOpen, tourName],
  );

  const openTour = useCallback(
    (options: StartPageTourOptions = {}) => {
      const alreadySeen = hasSeenPageTour(tourName);
      setHasSeenTour(alreadySeen);

      if (alreadySeen && !options.force) {
        return;
      }

      if (!alreadySeen) {
        markPageTourSeen(tourName);
        setHasSeenTour(true);
      }

      setIsTourOpen(true);
    },
    [tourName],
  );

  const startTour = useCallback((options: StartPageTourOptions = {}) => startPageTour(tourName, options), [tourName]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTourStart = (event: Event) => {
      const detail = (event as CustomEvent<PageTourEventDetail>).detail;
      if (detail?.tour === tourName) {
        consumePendingPageTour(tourName);
        openTour({ force: detail.force });
      }
    };

    window.addEventListener(PAGE_TOUR_EVENT, handleTourStart);
    const pendingRequest = consumePendingPageTour(tourName);
    if (pendingRequest) {
      openTour(pendingRequest);
    }

    return () => {
      window.removeEventListener(PAGE_TOUR_EVENT, handleTourStart);
    };
  }, [openTour, tourName]);

  return { isTourOpen, setIsTourOpen: handleTourOpenChange, hasSeenTour, startTour };
}
