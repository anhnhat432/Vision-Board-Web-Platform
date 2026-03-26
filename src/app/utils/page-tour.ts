export const PAGE_TOUR_EVENT = "visionboard:start-page-tour";

export type PageTourId = "dashboard" | "goal_tracker" | "twelve_week_system";

export interface PageTourMeta {
  id: PageTourId;
  label: string;
}

export function getPageTourMeta(pathname: string): PageTourMeta | null {
  if (pathname === "/") {
    return {
      id: "dashboard",
      label: "Tour bảng điều khiển",
    };
  }

  if (pathname.startsWith("/goals")) {
    return {
      id: "goal_tracker",
      label: "Tour mục tiêu",
    };
  }

  if (pathname.startsWith("/12-week-system")) {
    return {
      id: "twelve_week_system",
      label: "Tour trung tâm 12 tuần",
    };
  }

  return null;
}

export function startPageTour(tourId: PageTourId) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PAGE_TOUR_EVENT, {
      detail: { tour: tourId },
    }),
  );
}
