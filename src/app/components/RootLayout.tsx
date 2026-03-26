import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  BookOpen,
  CalendarDays,
  Compass,
  Images,
  LayoutDashboard,
  Menu,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useOutlet } from "react-router";
import { maybeShowBrowserReminderNotification, syncPendingOutbox } from "../utils/production";
import { getPageTourMeta, startPageTour } from "../utils/page-tour";
import { getUserData, initializeUserData } from "../utils/storage";
import { getNewUserGuideProgress, hasSeenNewUserGuide, isNewUserGuideDismissed, markNewUserGuideSeen } from "../utils/new-user-guide";
import { isDemoMode } from "../utils/app-mode";
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
    tagline: "Thấy rõ quỹ đạo phát triển của mình, không chỉ những việc cần làm hôm nay.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/goals"),
    label: "Mục tiêu",
    tagline: "Biến ý định thành nhịp thực thi đều, rõ và đo được.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/12-week"),
    label: "Hệ 12 tuần",
    tagline: "Giữ đà 12 tuần như đang điều hành một chiến dịch thật sự.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/vision-board"),
    label: "Bảng tầm nhìn",
    tagline: "Dựng tương lai theo cách đủ đẹp để bạn muốn quay lại mỗi ngày.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/gallery"),
    label: "Thư viện",
    tagline: "Những phiên bản tương lai của bạn đang được lưu lại theo từng mùa phát triển.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/life-balance"),
    label: "Cân bằng cuộc sống",
    tagline: "Nhìn toàn cảnh để biết nơi nào nên được chăm lại trước tiên.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/achievements"),
    label: "Thành tựu",
    tagline: "Mọi cột mốc nhỏ đều xứng đáng được nhìn thấy và ăn mừng.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/journal"),
    label: "Nhật ký",
    tagline: "Giữ lại cảm xúc, bài học và những chuyển động tinh tế của hành trình.",
  },
];

const NAV_ITEMS = [
  { path: "/", label: "Bảng điều khiển", icon: LayoutDashboard },
  { path: "/goals", label: "Mục tiêu", icon: Target },
  { path: "/12-week-system", label: "Hệ thống 12 tuần", icon: CalendarDays },
  { path: "/vision-board", label: "Bảng tầm nhìn", icon: Sparkles },
  { path: "/gallery", label: "Thư viện", icon: Images },
  { path: "/life-balance", label: "Cân bằng cuộc sống", icon: TrendingUp },
  { path: "/achievements", label: "Thành tựu", icon: Award },
  { path: "/journal", label: "Nhật ký", icon: BookOpen },
];

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
    }
  }, [location.pathname]);

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

  const pageMeta =
    ROUTE_META.find((item) => item.match(location.pathname)) ?? ROUTE_META[0];
  const currentPageTour = getPageTourMeta(location.pathname);
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

  const pageTransition = {
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
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="ambient-orb ambient-orb--rose" />
      <div className="pointer-events-none fixed inset-x-0 top-[-9rem] z-0 mx-auto h-[26rem] max-w-6xl rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.96)_0%,_rgba(255,255,255,0)_70%)] blur-3xl" />

      <header className="sticky top-4 z-40 px-4 sm:px-6 lg:px-8">
        <div className="glass-surface mx-auto max-w-7xl rounded-[32px] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-start gap-4 rounded-[24px] text-left transition-all hover:-translate-y-0.5 hover:opacity-100"
            >
              <div
                className="flex size-12 items-center justify-center rounded-[18px]"
                style={shellBadgeStyle}
              >
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-slate-400">
                  Vision Board OS
                </p>
                <h1 className="truncate text-lg font-bold text-slate-900 lg:text-xl">
                  Vision Board
                </h1>
                <p className="hidden text-sm text-slate-500 lg:block">
                  {pageMeta.tagline}
                </p>
              </div>
            </button>

            <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-white/68 px-4 py-2.5 text-left shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl xl:hidden">
              <div className="h-2.5 w-2.5 rounded-full" style={shellIndicatorStyle} />
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  Nhịp hiện tại
                </p>
                <p className="text-sm font-semibold text-slate-700">{pageMeta.label}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGuideUserData(getUserData());
                setIsGuideOpen(true);
              }}
              className="hidden md:inline-flex rounded-full border-white/70 bg-white/72 text-slate-700 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)] hover:bg-white"
            >
              <Compass className="h-4 w-4" />
              Hướng dẫn
            </Button>

            <nav className="hidden basis-full items-center gap-4 border-t border-white/55 pt-4 md:flex">
              <div className="flex shrink-0 items-center gap-3 rounded-full border border-white/70 bg-white/68 px-4 py-2.5 text-left shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl">
                <div className="h-2.5 w-2.5 rounded-full" style={shellIndicatorStyle} />
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-slate-400">
                    Nhịp hiện tại
                  </p>
                  <p className="text-sm font-semibold text-slate-700">{pageMeta.label}</p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-[24px] border border-white/60 bg-white/58 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(item.path)}
                      className={
                        active
                          ? "text-white hover:text-white"
                          : "bg-transparent text-slate-600 shadow-none hover:bg-white/78 hover:text-slate-900"
                      }
                      style={active ? activeNavStyle : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </nav>

            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-2xl border border-white/70 bg-white/72 text-slate-700 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white"
                onClick={() => {
                  setGuideUserData(getUserData());
                  setIsGuideOpen(true);
                }}
                aria-label="Mở hướng dẫn sử dụng"
              >
                <Compass className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-2xl border border-white/70 bg-white/72 text-slate-700 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mx-auto mt-3 max-w-7xl md:hidden">
            <div className="glass-surface rounded-[28px] p-3">
              <nav className="space-y-1">
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
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                        active
                          ? "text-white"
                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                      }`}
                      style={active ? activeNavStyle : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} className="page-transition-shell" {...pageTransition}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <MotivationalReminder />
      <NewUserGuideDialog
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
        userData={guideUserData}
        currentPageTourLabel={currentPageTour?.label ?? null}
        onStartPageTour={
          currentPageTour
            ? () => {
                setGuideUserData(getUserData());
                setIsGuideOpen(false);
                startPageTour(currentPageTour.id);
              }
            : undefined
        }
      />
      <Toaster />
    </div>
  );
}
