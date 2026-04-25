import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Compass,
  CreditCard,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  RefreshCw,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  User2,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useOutlet } from "react-router";
import { maybeShowBrowserReminderNotification, syncPendingOutbox } from "../utils/production";
import { getUserData, initializeUserData } from "../utils/storage";
import {
  getNewUserGuideProgress,
  hasSeenNewUserGuide,
  isNewUserGuideDismissed,
  markNewUserGuideSeen,
} from "../utils/new-user-guide";
import { isDemoMode } from "../utils/app-mode";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { BACKEND_PLAN_HYDRATION_EVENT_NAME, useBackendPlanHydration } from "../hooks/useBackendPlanHydration";
import { useTheme } from "../hooks/useTheme";
import { MotivationalReminder } from "./MotivationalReminder";
import { NewUserGuideDialog } from "./NewUserGuide";
import { Button } from "./ui/button";
import { Toaster } from "./ui/sonner";

const GUIDED_PATHS = new Set([
  "/onboarding",
  "/life-insight",
  "/feasibility",
  "/smart-goal-setup",
  "/12-week-setup",
  "/12-week-plan-setup",
  "/12-week-plan-overview",
]);

const ROUTE_META = [
  {
    match: (pathname: string) => pathname === "/",
    label: "Bảng điều khiển",
    title: "Bảng điều khiển – Dear Our Future",
    tagline: "Thấy rõ quỹ đạo phát triển của mình, không chỉ những việc cần làm hôm nay.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/goals"),
    label: "Mục tiêu",
    title: "Mục tiêu – Dear Our Future",
    tagline: "Biến ý định thành nhịp thực thi đều, rõ và đo được.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/12-week"),
    label: "Hệ 12 tuần",
    title: "Hệ 12 tuần – Dear Our Future",
    tagline: "Giữ đà 12 tuần như đang điều hành một chiến dịch thật sự.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/vision-board"),
    label: "Bảng tầm nhìn",
    title: "Bảng tầm nhìn – Dear Our Future",
    tagline: "Dựng tương lai theo cách đủ đẹp để bạn muốn quay lại mỗi ngày.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/gallery"),
    label: "Thư viện",
    title: "Thư viện – Dear Our Future",
    tagline: "Những phiên bản tương lai của bạn đang được lưu lại theo từng mùa phát triển.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/life-balance"),
    label: "Cân bằng cuộc sống",
    title: "Cân bằng cuộc sống – Dear Our Future",
    tagline: "Nhìn toàn cảnh để biết nơi nào nên được chăm lại trước tiên.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/achievements"),
    label: "Thành tựu",
    title: "Thành tựu – Dear Our Future",
    tagline: "Mọi cột mốc nhỏ đều xứng đáng được nhìn thấy và ăn mừng.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/journal"),
    label: "Nhật ký",
    title: "Nhật ký – Dear Our Future",
    tagline: "Giữ lại cảm xúc, bài học và những chuyển động tinh tế của hành trình.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/billing/plan"),
    label: "Gói & thanh toán",
    title: "Gói & thanh toán – Dear Our Future",
    tagline: "Xem gói hiện tại, quyền truy cập và thao tác thanh toán.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/admin/orders"),
    label: "Quản trị đơn hàng",
    title: "Quản trị đơn hàng – Dear Our Future",
    tagline: "Xem và chuyển trạng thái đơn hàng từ người dùng.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/order-status"),
    label: "Trạng thái đơn",
    title: "Trạng thái đơn – Dear Our Future",
    tagline: "Theo dõi tiến trình đơn kit trong workspace local hiện tại.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/order"),
    label: "Tạo đơn",
    title: "Tạo đơn – Dear Our Future",
    tagline: "Chốt thông tin kit cá nhân hóa trước khi nối backend và fulfillment thật.",
  },
];

const NAV_ITEMS = [
  { path: "/", label: "Bảng điều khiển", compactLabel: "Điều khiển", icon: LayoutDashboard },
  { path: "/goals", label: "Mục tiêu", compactLabel: "Mục tiêu", icon: Target },
  { path: "/12-week-system", label: "Hệ thống 12 tuần", compactLabel: "12 tuần", icon: CalendarDays },
  { path: "/vision-board", label: "Bảng tầm nhìn", compactLabel: "Tầm nhìn", icon: Sparkles },
  { path: "/gallery", label: "Thư viện", compactLabel: "Thư viện", icon: Images },
  { path: "/life-balance", label: "Cân bằng cuộc sống", compactLabel: "Cân bằng", icon: TrendingUp },
  { path: "/achievements", label: "Thành tựu", compactLabel: "Thành tựu", icon: Award },
  { path: "/journal", label: "Nhật ký", compactLabel: "Nhật ký", icon: BookOpen },
  { path: "/billing/plan", label: "Gói & thanh toán", compactLabel: "Gói", icon: CreditCard },
  { path: "/order-status", label: "My Orders", compactLabel: "My Orders", icon: Package },
];

const PRIMARY_NAV_PATHS = new Set(["/", "/goals", "/12-week-system", "/vision-board"]);
const MOBILE_BOTTOM_NAV_PATHS = new Set(["/", "/goals", "/12-week-system", "/vision-board"]);
const MOBILE_NAV_LABELS: Record<string, string> = {
  "/": "Tổng quan",
  "/goals": "Mục tiêu",
  "/12-week-system": "12 tuần",
  "/vision-board": "Tầm nhìn",
};

// Prefetch the remaining lazy route modules on hover so navigation feels instant.
const ROUTE_IMPORTS: Record<string, () => Promise<unknown>> = {
  "/order-status": () => import("../pages/OrderStatusPage"),
};
const prefetchedRoutes = new Set<string>();
function prefetchRoute(path: string) {
  if (prefetchedRoutes.has(path)) return;
  const loader = ROUTE_IMPORTS[path];
  if (loader) {
    prefetchedRoutes.add(path);
    loader();
  }
}

function getRouteTone(pathname: string) {
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/achievements")) return "achievements";
  if (pathname.startsWith("/life-balance")) return "balance";
  if (pathname.startsWith("/12-week")) return "system";
  if (pathname.startsWith("/vision-board") || pathname.startsWith("/gallery")) return "vision";
  return "default";
}

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const demoMode = isDemoMode();
  const {
    authLoading,
    isConfigured,
    logout,
    refreshUserProfile,
    user,
    userProfile,
    userProfileError,
    userProfileLoading,
  } = useAuthContext();
  const backendPlanHydration = useBackendPlanHydration({
    enabled: !demoMode && isConfigured && Boolean(userProfile),
    scopeKey: userProfile?.id ?? null,
  });
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const desktopMoreRef = useRef<HTMLDivElement | null>(null);
  const [guideUserData, setGuideUserData] = useState(() => getUserData());
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const currentRouteKey = `${location.pathname}${location.search}${location.hash}`;

  const navigateAppRoute = useCallback(
    (path: string) => {
      const targetUrl = new URL(path, window.location.origin);
      const targetRouteKey = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

      if (currentRouteKey === targetRouteKey) return;

      navigate(path, { flushSync: true });
    },
    [currentRouteKey, navigate],
  );

  useEffect(() => {
    const userData = initializeUserData();
    setGuideUserData(userData);
  }, []);

  useEffect(() => {
    const userData = getUserData();
    setGuideUserData(userData);

    if (!demoMode && isConfigured && (authLoading || backendPlanHydration.loading)) return;

    if (!demoMode && !userData.onboardingCompleted && location.pathname !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [authLoading, backendPlanHydration.loading, demoMode, isConfigured, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname) {
      setMobileMenuOpen(false);
      setDesktopMoreOpen(false);
      setGuideUserData(getUserData());
      const meta = ROUTE_META.find((item) => item.match(location.pathname)) ?? ROUTE_META[0];
      document.title = meta.title ?? "Dear Our Future";
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!desktopMoreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!desktopMoreRef.current?.contains(event.target as Node)) {
        setDesktopMoreOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDesktopMoreOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [desktopMoreOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    if (!mobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpenGuide = () => {
      setGuideUserData(getUserData());
      setIsGuideOpen(true);
    };
    const handleBackendHydrated = () => {
      setGuideUserData(getUserData());
    };
    window.addEventListener("visionboard:open-guide", handleOpenGuide);
    window.addEventListener(BACKEND_PLAN_HYDRATION_EVENT_NAME, handleBackendHydrated);

    return () => {
      window.removeEventListener("visionboard:open-guide", handleOpenGuide);
      window.removeEventListener(BACKEND_PLAN_HYDRATION_EVENT_NAME, handleBackendHydrated);
    };
  }, []);

  useEffect(() => {
    if (demoMode) return;
    if (location.pathname !== "/") return;

    const progress = getNewUserGuideProgress(guideUserData);
    if (progress.isComplete || isNewUserGuideDismissed() || hasSeenNewUserGuide()) {
      return;
    }

    setIsGuideOpen(true);
    markNewUserGuideSeen();
  }, [demoMode, guideUserData, location.pathname]);

  useEffect(() => {
    const currentPath = location.pathname;
    if (
      !currentPath ||
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const heroCards = Array.from(document.querySelectorAll<HTMLElement>(".hero-surface")).filter(
      (card) => !card.closest(".interactive-surface"),
    );

    const resetCard = (card: HTMLElement) => {
      card.style.setProperty("--hero-pointer-x", "0.5");
      card.style.setProperty("--hero-pointer-y", "0.5");
      card.style.setProperty("--hero-rotate-x", "0deg");
      card.style.setProperty("--hero-rotate-y", "0deg");
      card.style.setProperty("--hero-shift-x", "0px");
      card.style.setProperty("--hero-shift-y", "0px");
      card.dataset.heroHovering = "false";
    };

    const cleanups = heroCards.map((card) => {
      resetCard(card);

      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;

        const bounds = card.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return;

        const pointerX = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
        const pointerY = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
        const rotateX = ((0.5 - pointerY) * 3.5).toFixed(3);
        const rotateY = ((pointerX - 0.5) * 3.5).toFixed(3);
        const shiftX = ((pointerX - 0.5) * 6).toFixed(2);
        const shiftY = ((pointerY - 0.5) * 6).toFixed(2);

        card.style.setProperty("--hero-pointer-x", pointerX.toFixed(4));
        card.style.setProperty("--hero-pointer-y", pointerY.toFixed(4));
        card.style.setProperty("--hero-rotate-x", `${rotateX}deg`);
        card.style.setProperty("--hero-rotate-y", `${rotateY}deg`);
        card.style.setProperty("--hero-shift-x", `${shiftX}px`);
        card.style.setProperty("--hero-shift-y", `${shiftY}px`);
        card.dataset.heroHovering = "true";
      };

      const handleLeave = () => {
        resetCard(card);
      };

      card.addEventListener("pointermove", handleMove);
      card.addEventListener("pointerenter", handleMove);
      card.addEventListener("pointerleave", handleLeave);

      return () => {
        card.removeEventListener("pointermove", handleMove);
        card.removeEventListener("pointerenter", handleMove);
        card.removeEventListener("pointerleave", handleLeave);
        resetCard(card);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const runBackgroundSync = () => {
      void syncPendingOutbox();
      maybeShowBrowserReminderNotification();
    };

    runBackgroundSync();

    const handleFocus = () => {
      maybeShowBrowserReminderNotification();
    };

    const handleOnline = () => {
      runBackgroundSync();
    };

    const intervalId = window.setInterval(() => {
      maybeShowBrowserReminderNotification();
    }, 60_000);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handlePrefetch = useCallback((path: string) => prefetchRoute(path), []);

  const pageMeta = ROUTE_META.find((item) => item.match(location.pathname)) ?? ROUTE_META[0];
  const primaryNavItems = NAV_ITEMS.filter((item) => PRIMARY_NAV_PATHS.has(item.path));
  const secondaryNavItems = NAV_ITEMS.filter((item) => !PRIMARY_NAV_PATHS.has(item.path));
  const bottomNavItems = NAV_ITEMS.filter((item) => MOBILE_BOTTOM_NAV_PATHS.has(item.path));
  const isDesktopMoreNavActive = desktopMoreOpen || secondaryNavItems.some((item) => isActive(item.path));
  const isMoreNavActive = mobileMenuOpen || secondaryNavItems.some((item) => isActive(item.path));
  const routeTone = getRouteTone(location.pathname);
  const shellGradientStyle = {
    backgroundImage:
      "linear-gradient(135deg, var(--tone-shell-primary) 0%, var(--tone-shell-secondary) 58%, var(--tone-shell-tertiary) 100%)",
  };
  const shellBadgeStyle = {
    ...shellGradientStyle,
    boxShadow: "0 14px 28px -20px var(--tone-shell-shadow-strong)",
  };
  const activeNavStyle = {
    ...shellGradientStyle,
    boxShadow: "0 14px 30px -18px var(--tone-shell-shadow)",
  };
  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || "Khách";
  const accountStatus = !isConfigured
    ? "Demo local"
    : authLoading
      ? "Đang kiểm tra"
      : !user
        ? "Chưa đăng nhập"
        : userProfileLoading
          ? "Đang nối backend"
          : userProfileError
            ? "Lỗi profile"
            : userProfile
              ? "Đã nối backend"
              : "Chờ profile";
  const accountStatusClass = userProfileError
    ? "bg-red-50 text-red-700 ring-red-200"
    : userProfile
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-slate-50 text-slate-600 ring-slate-200";
  const canRetryUserProfile = Boolean(user) && !userProfileLoading && (!userProfile || Boolean(userProfileError));

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pageTransition = prefersReducedMotion
    ? ({
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      } as const)
    : ({
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
      } as const);

  if (GUIDED_PATHS.has(location.pathname)) {
    return (
      <div className="app-shell min-h-screen" data-route-tone={routeTone}>
        <div className="relative z-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} className="page-transition-shell" {...pageTransition}>
              {outlet}
            </motion.div>
          </AnimatePresence>
          <Toaster />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen" data-route-tone={routeTone}>
      <a href="#main-content" className="skip-to-content">
        Bỏ qua điều hướng
      </a>

      <header className="sticky top-0 z-40 px-4 pt-2 sm:top-4 sm:px-6 sm:pt-0 lg:px-8">
        <div className="glass-surface mx-auto max-w-7xl rounded-lg px-3 py-2 sm:px-4 sm:py-2 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigateAppRoute("/")}
              className="flex shrink-0 items-center gap-2.5 rounded-lg text-left transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              aria-label="Về trang chủ Dear Our Future"
            >
              <div className="flex size-9 items-center justify-center rounded-xl" style={shellBadgeStyle}>
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold tracking-normal text-slate-900">Dear Our Future</h1>
              </div>
            </button>

            <nav className="hidden flex-1 items-center justify-center md:flex">
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/75 bg-white/72 px-1.5 py-1 shadow-[0_6px_14px_-14px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateAppRoute(item.path)}
                      onPointerEnter={() => handlePrefetch(item.path)}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                      className={`h-8 shrink-0 rounded-full px-3 text-[0.82rem] transition-all duration-200 active:scale-95 ${
                        active
                          ? "text-white hover:text-white"
                          : "bg-transparent text-slate-600 shadow-none hover:bg-white/90 hover:text-slate-900"
                      }`}
                      style={active ? activeNavStyle : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.compactLabel ?? item.label}</span>
                    </Button>
                  );
                })}

                <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200/60" />

                <div ref={desktopMoreRef} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-current={secondaryNavItems.some((item) => isActive(item.path)) ? "page" : undefined}
                    aria-expanded={desktopMoreOpen}
                    aria-haspopup="menu"
                    className={`h-8 shrink-0 rounded-full px-3 text-[0.82rem] transition-all duration-200 active:scale-95 ${
                      isDesktopMoreNavActive
                        ? "text-white hover:text-white"
                        : "bg-transparent text-slate-500 shadow-none hover:bg-white/90 hover:text-slate-700"
                    }`}
                    style={isDesktopMoreNavActive ? activeNavStyle : undefined}
                    onClick={() => setDesktopMoreOpen((open) => !open)}
                  >
                    <Menu className="h-3.5 w-3.5" />
                    <span>Thêm</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${desktopMoreOpen ? "rotate-180" : ""}`}
                    />
                  </Button>

                  {desktopMoreOpen ? (
                    <div
                      role="menu"
                      aria-label="Mục khác"
                      className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/96 p-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.32)] backdrop-blur-xl"
                    >
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Mục khác
                      </div>
                      <div className="mx-1 mb-1 h-px bg-slate-200/80" />
                      {secondaryNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                          <button
                            key={item.path}
                            type="button"
                            role="menuitem"
                            aria-current={active ? "page" : undefined}
                            onPointerEnter={() => handlePrefetch(item.path)}
                            onClick={() => {
                              setDesktopMoreOpen(false);
                              navigateAppRoute(item.path);
                            }}
                            className={`my-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium tracking-normal outline-none transition-colors ${
                              active
                                ? "text-white focus:text-white"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 focus:bg-slate-50 focus:text-slate-950"
                            }`}
                            style={active ? activeNavStyle : undefined}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </nav>

            <div className="hidden shrink-0 items-center gap-1.5 md:flex">
              {user ? (
                <div
                  className="flex max-w-[210px] items-center gap-2 rounded-full border border-white/75 bg-white/82 px-2.5 py-1.5 text-left text-slate-700 shadow-sm"
                  title={userProfileError ?? accountLabel}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <User2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold leading-4">{accountLabel}</span>
                    <span
                      className={`mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none ring-1 ${accountStatusClass}`}
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{accountStatus}</span>
                    </span>
                  </span>
                </div>
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={refreshUserProfile}
                  disabled={!canRetryUserProfile}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/75 bg-white/82 text-slate-600 shadow-sm transition-colors hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/6 dark:text-slate-300 dark:hover:bg-white/12"
                  aria-label="Kiểm tra lại backend profile"
                  title="Kiểm tra lại backend profile"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${userProfileLoading ? "animate-spin" : ""}`} />
                </button>
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/75 bg-white/82 text-slate-600 shadow-sm transition-colors hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/6 dark:text-slate-300 dark:hover:bg-white/12"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/75 bg-white/82 text-slate-600 shadow-sm transition-colors hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300 dark:hover:bg-white/12"
                aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
              >
                {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGuideUserData(getUserData());
                  setIsGuideOpen(true);
                }}
                className="h-8 rounded-full border-white/75 bg-white/82 px-3 text-xs text-slate-600 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300 dark:hover:bg-white/12"
              >
                <Compass className="h-3.5 w-3.5" />
                Hướng dẫn
              </Button>
            </div>

            <div className="md:hidden flex min-w-0 items-center gap-2">
              <span className="hidden max-w-[120px] truncate text-sm font-medium tracking-normal text-slate-700 dark:text-slate-200 sm:inline">
                {pageMeta.label}
              </span>
              <button
                type="button"
                className="hidden size-11 items-center justify-center rounded-xl border border-white/72 bg-white/76 text-slate-700 backdrop-blur-sm transition-colors active:scale-95 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300 sm:flex"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label={resolvedTheme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-[1.1rem] w-[1.1rem]" />
                ) : (
                  <Moon className="h-[1.1rem] w-[1.1rem]" />
                )}
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-xl border border-white/72 bg-white/76 text-slate-700 backdrop-blur-sm transition-colors active:scale-95 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300"
                onClick={() => {
                  setGuideUserData(getUserData());
                  setIsGuideOpen(true);
                }}
                aria-label="Mở hướng dẫn sử dụng"
              >
                <Compass className="h-[1.1rem] w-[1.1rem]" />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-xl border border-white/72 bg-white/76 text-slate-700 backdrop-blur-sm transition-colors active:scale-95 hover:bg-white"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileMenuOpen ? <X className="h-[1.1rem] w-[1.1rem]" /> : <Menu className="h-[1.1rem] w-[1.1rem]" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-nav-menu" className="mx-auto mt-2 max-w-7xl md:hidden">
            <div className="glass-surface rounded-[28px] p-3">
              <nav className="space-y-1" aria-label="Menu điều hướng">
                {user ? (
                  <div className="mb-2 rounded-2xl border border-white/72 bg-white/82 px-4 py-3 text-left">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <User2 className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{accountLabel}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{accountStatus}</p>
                      </div>
                      <button
                        type="button"
                        onClick={refreshUserProfile}
                        disabled={!canRetryUserProfile}
                        className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
                        aria-label="Kiểm tra lại backend profile"
                      >
                        <RefreshCw className={`h-4 w-4 ${userProfileLoading ? "animate-spin" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          void handleSignOut();
                        }}
                        disabled={isSigningOut}
                        className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
                        aria-label="Đăng xuất"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                    {userProfileError ? (
                      <p className="mt-2 text-xs leading-5 text-red-600">{userProfileError}</p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setGuideUserData(getUserData());
                    setIsGuideOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/72 bg-white/82 px-4 py-3 text-left text-sm font-medium tracking-normal text-slate-700"
                >
                  <Compass className="h-5 w-5" />
                  <span>Hướng dẫn sử dụng</span>
                </button>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigateAppRoute(item.path);
                        setMobileMenuOpen(false);
                      }}
                      onFocus={() => handlePrefetch(item.path)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-medium tracking-normal transition-all active:scale-[0.98] ${
                        active ? "text-white" : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                      }`}
                      style={active ? activeNavStyle : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      <main
        className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 main-content-mobile-pad"
        id="main-content"
        aria-label="Nội dung trang"
      >
        {/* Screen-reader route announcer */}
        <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
          {pageMeta.label}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} className="page-transition-shell" {...pageTransition}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom navigation bar */}
      <nav
        className="bottom-nav md:hidden"
        aria-label="Điều hướng chính"
        style={{ animation: "bottom-nav-rise 0.38s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="bottom-nav-inner">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className="bottom-nav-item"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateAppRoute(item.path);
                }}
                onPointerEnter={() => handlePrefetch(item.path)}
                title={item.label}
              >
                <div className="bottom-nav-icon">
                  <Icon
                    className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`}
                    strokeWidth={active ? 2.25 : 1.8}
                  />
                </div>
                <span className={`bottom-nav-label ${active ? "nav-label-active" : "text-slate-400"}`}>
                  {MOBILE_NAV_LABELS[item.path] ?? item.compactLabel ?? item.label}
                </span>
              </button>
            );
          })}
          {/* More button on mobile to open full menu */}
          <button
            type="button"
            className="bottom-nav-item"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Thêm"
            aria-current={isMoreNavActive ? "page" : undefined}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <div className="bottom-nav-icon">
              <Menu
                className={`h-4 w-4 ${isMoreNavActive ? "text-white" : "text-slate-500"}`}
                strokeWidth={isMoreNavActive ? 2.25 : 1.8}
              />
            </div>
            <span className={`bottom-nav-label ${isMoreNavActive ? "nav-label-active" : "text-slate-400"}`}>Thêm</span>
          </button>
        </div>
      </nav>

      <MotivationalReminder />
      <NewUserGuideDialog open={isGuideOpen} onOpenChange={setIsGuideOpen} userData={guideUserData} />
      <Toaster />
    </div>
  );
}
