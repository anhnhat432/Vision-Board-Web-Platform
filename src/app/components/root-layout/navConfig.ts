import {
  Award,
  BookOpen,
  CalendarDays,
  CreditCard,
  Images,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  compactLabel: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Trang chính", compactLabel: "Chính", icon: LayoutDashboard },
  { path: "/goals", label: "Mục tiêu", compactLabel: "Mục tiêu", icon: Target },
  { path: "/12-week-system", label: "Hệ thống 12 tuần", compactLabel: "12 tuần", icon: CalendarDays },
  { path: "/vision-board", label: "Vision board", compactLabel: "Vision", icon: Sparkles },
  { path: "/gallery", label: "Thư viện", compactLabel: "Thư viện", icon: Images },
  { path: "/life-balance", label: "Cân bằng cuộc sống", compactLabel: "Cân bằng", icon: TrendingUp },
  { path: "/achievements", label: "Thành tựu", compactLabel: "Thành tựu", icon: Award },
  { path: "/journal", label: "Nhật ký", compactLabel: "Nhật ký", icon: BookOpen },
  { path: "/order", label: "Đặt kit", compactLabel: "Đặt kit", icon: Package },
  { path: "/billing/plan", label: "Gói & thanh toán", compactLabel: "Gói", icon: CreditCard },
];

export const PRIMARY_NAV_PATHS = new Set(["/", "/goals", "/12-week-system", "/vision-board"]);
export const MOBILE_BOTTOM_NAV_PATHS = new Set(["/", "/goals", "/12-week-system", "/vision-board"]);
export const MOBILE_NAV_LABELS: Record<string, string> = {
  "/": "Tổng quan",
  "/goals": "Mục tiêu",
  "/12-week-system": "12 tuần",
  "/vision-board": "Vision",
};
export const SIGNED_OUT_HOME_NAV_ITEM: NavItem = {
  ...NAV_ITEMS[0],
  label: "Trang chính",
  compactLabel: "Trang chính",
};

const ROUTE_IMPORTS: Record<string, () => Promise<unknown>> = {
  "/": () => import("../../pages/DashboardEntry"),
  "/goals": () => import("../../pages/GoalTracker"),
  "/12-week-system": () => import("../../pages/12WeekSystem"),
  "/vision-board": () => import("../../pages/VisionBoardEditor"),
  "/gallery": () => import("../../pages/VisionBoardGallery"),
  "/life-balance": () => import("../../pages/LifeBalance"),
  "/achievements": () => import("../../pages/Achievements"),
  "/journal": () => import("../../pages/ReflectionJournal"),
  "/order": () => import("@/features/order/pages/OrderPage"),
  "/billing/plan": () => import("../../pages/BillingPlan"),
};

export const WARM_PREFETCH_ROUTE_PATHS = ["/12-week-system", "/goals", "/life-balance"] as const;

const prefetchedRoutes = new Set<string>();

export function prefetchRoute(path: string): void {
  if (prefetchedRoutes.has(path)) return;
  const loader = ROUTE_IMPORTS[path];
  if (loader) {
    prefetchedRoutes.add(path);
    void loader().catch(() => {
      prefetchedRoutes.delete(path);
    });
  }
}

export function isActiveRoute(pathname: string, path: string): boolean {
  if (path === "/") return pathname === "/";
  return pathname.startsWith(path);
}

export function getNavItemsForState(isSignedOutVisitor: boolean) {
  const primaryNavItems = isSignedOutVisitor
    ? [SIGNED_OUT_HOME_NAV_ITEM]
    : NAV_ITEMS.filter((item) => PRIMARY_NAV_PATHS.has(item.path));

  return {
    primaryNavItems,
    secondaryNavItems: isSignedOutVisitor ? [] : NAV_ITEMS.filter((item) => !PRIMARY_NAV_PATHS.has(item.path)),
    bottomNavItems: isSignedOutVisitor ? [] : NAV_ITEMS.filter((item) => MOBILE_BOTTOM_NAV_PATHS.has(item.path)),
    mobileMenuNavItems: isSignedOutVisitor ? primaryNavItems : NAV_ITEMS,
  };
}

export function buildAuthPath(mode: "signin" | "signup", pathname: string, search: string, hash: string): string {
  const destination = `${pathname}${search}${hash}`;
  const params = new URLSearchParams({ next: destination });
  if (mode === "signup") params.set("mode", "signup");
  return `/login?${params.toString()}`;
}
