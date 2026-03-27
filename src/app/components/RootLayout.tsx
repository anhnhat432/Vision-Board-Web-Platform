import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  BookOpen,
  CalendarDays,
  Compass,
  CreditCard,
  Images,
  LayoutDashboard,
  Menu,
  Moon,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useOutlet } from "react-router";
import { maybeShowBrowserReminderNotification, syncPendingOutbox } from "../utils/production";
import { getUserData, initializeUserData } from "../utils/storage";
import { getNewUserGuideProgress, hasSeenNewUserGuide, isNewUserGuideDismissed, markNewUserGuideSeen } from "../utils/new-user-guide";
import { isDemoMode } from "../utils/app-mode";
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
];

const PRIMARY_NAV_PATHS = new Set(["/", "/goals", "/12-week-system", "/vision-board"]);

// Prefetch route module on hover so navigation feels instant
const ROUTE_IMPORTS: Record<string, () => Promise<unknown>> = {
  "/": () => import("../pages/Dashboard"),
  "/goals": () => import("../pages/GoalTracker"),
  "/12-week-system": () => import("../pages/12WeekSystem"),
  "/vision-board": () => import("../pages/VisionBoardEditor"),
  "/gallery": () => import("../pages/VisionBoardGallery"),
  "/life-balance": () => import("../pages/LifeBalance"),
  "/achievements": () => import("../pages/Achievements"),
  "/journal": () => import("../pages/ReflectionJournal"),
  "/billing/plan": () => import("../pages/BillingPlan"),
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
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guideUserData, setGuideUserData] = useState(() => getUserData());
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const userData = initializeUserData();
    setGuideUserData(userData);
  }, []);

  useEffect(() => {
    const userData = getUserData();
    setGuideUserData(userData);

    if (!demoMode && !userData.onboardingCompleted && location.pathname !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [demoMode, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname) {
      setMobileMenuOpen(false);
      setGuideUserData(getUserData());
      const meta = ROUTE_META.find((item) => item.match(location.pathname)) ?? ROUTE_META[0];
      document.title = meta.title ?? "Dear Our Future";
    }
  }, [location.pathname]);

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
    window.addEventListener("visionboard:open-guide", handleOpenGuide);

    return () => {
      window.removeEventListener("visionboard:open-guide", handleOpenGuide);
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

    const heroCards = Array.from(
      document.querySelectorAll<HTMLElement>(".hero-surface"),
    ).filter((card) => !card.closest(".interactive-surface"));

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
        const rotateX = ((0.5 - pointerY) * 7).toFixed(3);
        const rotateY = ((pointerX - 0.5) * 7).toFixed(3);
        const shiftX = ((pointerX - 0.5) * 14).toFixed(2);
        const shiftY = ((pointerY - 0.5) * 14).toFixed(2);

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

    const root = document.documentElement;
    root.style.setProperty("--cursor-x", "50vw");
    root.style.setProperty("--cursor-y", "30vh");
    root.style.setProperty("--cursor-glow-opacity", "0");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        root.style.setProperty("--cursor-glow-opacity", "0");
        return;
      }

      root.style.setProperty("--cursor-x", `${event.clientX}px`);
      root.style.setProperty("--cursor-y", `${event.clientY}px`);
      root.style.setProperty("--cursor-glow-opacity", "1");
    };

    const handlePointerDown = (event: PointerEvent) => {
      root.style.setProperty(
        "--cursor-glow-opacity",
        event.pointerType === "touch" ? "0" : "1",
      );
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      root.style.setProperty("--cursor-glow-opacity", "0");
    };
  }, []);

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

  const pageMeta =
    ROUTE_META.find((item) => item.match(location.pathname)) ?? ROUTE_META[0];
  const primaryNavItems = NAV_ITEMS.filter((item) => PRIMARY_NAV_PATHS.has(item.path));
  const secondaryNavItems = NAV_ITEMS.filter((item) => !PRIMARY_NAV_PATHS.has(item.path));
  const routeTone = getRouteTone(location.pathname);
  const shellGradientStyle = {
    backgroundImage:
      "linear-gradient(135deg, var(--tone-shell-primary) 0%, var(--tone-shell-secondary) 58%, var(--tone-shell-tertiary) 100%)",
  };
  const shellBadgeStyle = {
    ...shellGradientStyle,
    boxShadow: "0 20px 45px -20px var(--tone-shell-shadow-strong)",
  };
  const shellIndicatorStyle = {
    ...shellGradientStyle,
    boxShadow: "0 0 0 6px var(--tone-shell-ring)",
  };
  const activeNavStyle = {
    ...shellGradientStyle,
    boxShadow: "0 18px 45px -20px var(--tone-shell-shadow)",
  };

  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pageTransition = prefersReducedMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      } as const
    : {
        initial: { opacity: 0, y: 18, filter: "blur(10px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -10, filter: "blur(8px)" },
        transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
      } as const;

  if (GUIDED_PATHS.has(location.pathname)) {
    return (
      <div className="app-shell min-h-screen" data-route-tone={routeTone}>
        <div className="cursor-glow" />
        <div className="ambient-orb ambient-orb--violet" />
        <div className="ambient-orb ambient-orb--cyan" />
        <div className="ambient-orb ambient-orb--rose" />
        <div className="pointer-events-none fixed inset-x-0 top-[-10rem] z-0 mx-auto h-[28rem] max-w-5xl rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.92)_0%,_rgba(255,255,255,0)_70%)] blur-3xl" />
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
      <div className="cursor-glow" />
      <a href="#main-content" className="skip-to-content">
        Bỏ qua điều hướng
      </a>
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="ambient-orb ambient-orb--rose" />
      <div className="pointer-events-none fixed inset-x-0 top-[-9rem] z-0 mx-auto h-[28rem] max-w-6xl rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.98)_0%,_rgba(255,255,255,0)_72%)] blur-3xl" />

      <header className="sticky top-0 z-40 px-4 pt-2 sm:top-4 sm:px-6 sm:pt-0 lg:px-8">
        <div className="glass-surface mx-auto max-w-7xl rounded-2xl sm:rounded-3xl px-3 py-2 sm:px-4 sm:py-2 shadow-[0_24px_56px_-30px_rgba(15,23,42,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex shrink-0 items-center gap-2.5 rounded-2xl text-left transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              aria-label="Về trang chủ Dear Our Future"
            >
              <div
                className="flex size-9 items-center justify-center rounded-xl"
                style={shellBadgeStyle}
              >
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-slate-900">
                  Dear Our Future
                </h1>
              </div>
            </button>

            <nav className="hidden flex-1 items-center justify-center md:flex">
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/70 bg-white/65 px-1.5 py-1 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]">
                {primaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(item.path)}
                        onPointerEnter={() => handlePrefetch(item.path)}
                        aria-current={active ? "page" : undefined}
                        title={item.label}
                        className={`h-8 shrink-0 rounded-full px-3 text-[0.82rem] transition-all duration-200 active:scale-95 ${active
                          ? "text-white hover:text-white"
                          : "bg-transparent text-slate-600 shadow-none hover:bg-white/90 hover:text-slate-900"}`}
                        style={active ? activeNavStyle : undefined}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{item.compactLabel ?? item.label}</span>
                      </Button>
                    );
                  })}

                <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200/60" />

                {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(item.path)}
                        onPointerEnter={() => handlePrefetch(item.path)}
                        aria-current={active ? "page" : undefined}
                        title={item.label}
                        className={`h-8 shrink-0 rounded-full px-2.5 text-[0.78rem] transition-all duration-200 active:scale-95 ${active
                          ? "text-white hover:text-white"
                          : "bg-transparent text-slate-500 shadow-none hover:bg-white/90 hover:text-slate-700"}`}
                        style={active ? activeNavStyle : undefined}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{item.compactLabel ?? item.label}</span>
                      </Button>
                    );
                  })}
              </div>
            </nav>

            <div className="hidden shrink-0 items-center gap-1.5 md:flex">
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/75 bg-white/80 text-slate-600 shadow-sm transition-all hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300 dark:hover:bg-white/12"
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
                className="h-8 rounded-full border-white/75 bg-white/80 px-3 text-xs text-slate-600 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300 dark:hover:bg-white/12"
              >
                <Compass className="h-3.5 w-3.5" />
                Hướng dẫn
              </Button>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">{pageMeta.label}</span>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-xl border border-white/70 bg-white/72 text-slate-700 backdrop-blur-xl transition-all active:scale-95 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label={resolvedTheme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
              >
                {resolvedTheme === "dark" ? <Sun className="h-[1.1rem] w-[1.1rem]" /> : <Moon className="h-[1.1rem] w-[1.1rem]" />}
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-xl border border-white/70 bg-white/72 text-slate-700 backdrop-blur-xl transition-all active:scale-95 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-300"
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
                className="flex size-11 items-center justify-center rounded-xl border border-white/70 bg-white/72 text-slate-700 backdrop-blur-xl transition-all active:scale-95 hover:bg-white"
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
                <button
                  type="button"
                  onClick={() => {
                    setGuideUserData(getUserData());
                    setIsGuideOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/78 px-4 py-3 text-left text-sm font-semibold text-slate-700"
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
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      onFocus={() => handlePrefetch(item.path)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition-all active:scale-[0.98] ${
                        active
                          ? "text-white"
                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
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

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 main-content-mobile-pad" id="main-content" aria-label="Nội dung trang">
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
      <nav className="bottom-nav md:hidden" aria-label="Điều hướng chính" style={{ animation: "bottom-nav-rise 0.38s cubic-bezier(0.22,1,0.36,1) both" }}>
        <div className="bottom-nav-inner">
          {primaryNavItems.concat(secondaryNavItems.filter(item => item.path === "/life-balance" || item.path === "/journal")).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className="bottom-nav-item"
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.path)}
                onPointerEnter={() => handlePrefetch(item.path)}
              >
                <div className="bottom-nav-icon">
                  <Icon
                    className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`}
                    strokeWidth={active ? 2.25 : 1.8}
                  />
                </div>
                <span
                  className={`bottom-nav-label ${active ? "nav-label-active" : "text-slate-400"}`}
                >
                  {item.compactLabel ?? item.label}
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
          >
            <div className="bottom-nav-icon">
              <Menu className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
            </div>
            <span className="bottom-nav-label text-slate-400">Thêm</span>
          </button>
        </div>
      </nav>

      <MotivationalReminder />
      <NewUserGuideDialog
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
        userData={guideUserData}
      />
      <Toaster />
    </div>
  );
}
