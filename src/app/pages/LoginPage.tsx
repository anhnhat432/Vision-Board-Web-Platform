import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { motion, type Variants } from "motion/react";
import { AlertCircle, Compass, Loader2, LogOut, RefreshCw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";

import { ConstellationAccent, HeroLoginScene, HeroOrbitIllustration } from "../components/illustrations";
import { MotionParallaxLayer } from "../components/motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Toaster } from "../components/ui/sonner";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { useAuthContext } from "@/lib/auth/AuthContext";

type LoginMode = "signin" | "signup";

const TRUST_FEATURES = [
  {
    icon: Target,
    label: "Mục tiêu rõ",
  },
  {
    icon: Compass,
    label: "Lộ trình 12 tuần",
  },
  {
    icon: ShieldCheck,
    label: "Dữ liệu an toàn",
  },
];

const WORKSPACE_PROMISES = [
  "Lưu tiến độ và tiếp tục trên thiết bị khác.",
  "Đồng bộ kế hoạch 12 tuần khi tài khoản sẵn sàng.",
  "Quản lý quyền Plus và thanh toán trong cùng tài khoản.",
];

const heroPanelVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: "easeOut", staggerChildren: 0.08 },
  },
};

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function getInitialLoginMode(search: string): LoginMode {
  return new URLSearchParams(search).get("mode") === "signup" ? "signup" : "signin";
}

function normalizeRedirectPath(from: unknown): string | null {
  if (typeof from !== "string") return null;

  const value = from.trim();
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") && !value.startsWith("/login")) {
    return value;
  }

  return null;
}

export function LoginPage() {
  const prefersReducedMotion = useReducedMotion();
  const {
    user,
    userProfile,
    userProfileError,
    userProfileLoading,
    authLoading,
    error,
    login,
    logout,
    refreshUserProfile,
    isConfigured,
  } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const stateRedirect = normalizeRedirectPath((location.state as Record<string, unknown> | null)?.from);
  const queryRedirect = normalizeRedirectPath(new URLSearchParams(location.search).get("next"));
  const redirectTo = stateRedirect ?? queryRedirect ?? "/";

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const [mode, setMode] = useState<LoginMode>(() => getInitialLoginMode(location.search));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMode(getInitialLoginMode(location.search));
  }, [location.search]);

  // If already authenticated, wait for backend profile so admin accounts can
  // land directly in the admin console instead of the normal user workspace.
  if (!authLoading && user) {
    if (userProfile?.role === "admin") {
      return <Navigate to="/admin/orders" replace />;
    }

    if (userProfile) {
      return <Navigate to={redirectTo} replace />;
    }

    if (userProfileLoading || !userProfileError) {
      return <Navigate to={redirectTo} replace />;
    }

    return (
      <LoginStatusCard
        icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
        title="Không tải được hồ sơ"
        description={userProfileError}
        action={
          <>
            <Button type="button" className="gap-2" onClick={refreshUserProfile}>
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
          </>
        }
      />
    );
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const result = await login({ provider: "email", email, password, mode });
    setSubmitting(false);

    if (result) {
      refreshUserProfile();
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    const result = await login({ provider: "google" });
    setSubmitting(false);

    if (result) {
      refreshUserProfile();
    }
  }

  const HeroPanel = prefersReducedMotion ? "section" : motion.section;
  const RevealDiv = prefersReducedMotion ? "div" : motion.div;
  const RevealParagraph = prefersReducedMotion ? "p" : motion.p;
  const heroPanelMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: "hidden",
        animate: "show",
        variants: heroPanelVariants,
      };
  const revealMotionProps = prefersReducedMotion
    ? {}
    : { variants: revealVariants };

  if (!isConfigured) {
    // Firebase not configured — show a notice instead of a broken form
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4" data-route-tone="vision">
        <div className="ambient-orb ambient-orb--violet" />
        <div className="ambient-orb ambient-orb--cyan" />
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="gradient-brand mx-auto mb-3 flex size-11 items-center justify-center rounded-[var(--r-tile)] shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <CardTitle>Bắt đầu hành trình</CardTitle>
            <CardDescription>Xác thực chưa được cấu hình trong môi trường này.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
              Về trang chủ
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-8 sm:py-12" data-route-tone="vision">
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="ambient-orb ambient-orb--rose" />

      <div className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-center">
        <HeroPanel
          {...heroPanelMotionProps}
          className="glass-surface-gradient-border surface-aurora ring-soft-glow page-enter relative hidden overflow-hidden p-8 shadow-2xl lg:block"
        >
          <MotionParallaxLayer
            depth={0.22}
            className="pointer-events-none absolute -right-20 top-6 hidden w-[420px] text-violet-500 opacity-18 xl:block dark:opacity-14"
            aria-hidden="true"
          >
            <HeroLoginScene className="w-full" />
          </MotionParallaxLayer>
          <ConstellationAccent className="pointer-events-none absolute right-4 top-4 w-28 text-violet-500 opacity-35 dark:opacity-25" />
          <RevealDiv {...revealMotionProps} className="relative z-10 mb-5 flex items-start justify-between gap-4">
            <div className="gradient-brand flex size-12 items-center justify-center rounded-[var(--r-tile)] shadow-lg">
              <Sparkles className="h-5.5 w-5.5 text-white" />
            </div>
            <HeroOrbitIllustration className="-mt-6 hidden w-32 shrink-0 text-violet-500 opacity-90 xl:block" />
          </RevealDiv>
          <RevealParagraph
            {...revealMotionProps}
            className="relative z-10 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300"
          >
            Dear Our Future
          </RevealParagraph>
          <RevealParagraph
            {...revealMotionProps}
            className="relative z-10 mt-[var(--space-inline)] text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white"
          >
            Biến mục tiêu thành{" "}
            <span className="text-gradient-aurora">
              12 tuần hành động
            </span>{" "}
            trong một không gian làm việc.
          </RevealParagraph>
          <RevealDiv {...revealMotionProps} className="relative z-10 mt-6 flex flex-wrap gap-2">
            {TRUST_FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-violet-200/70 bg-gradient-to-r from-violet-100 to-fuchsia-100 px-3 py-1.5 text-xs font-semibold text-violet-800 shadow-sm dark:border-violet-400/20 dark:from-violet-950/70 dark:to-fuchsia-950/60 dark:text-violet-100"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </RevealDiv>
          <RevealDiv
            {...revealMotionProps}
            className="relative z-10 mt-6 grid gap-3 text-sm leading-6 text-slate-600 dark:text-slate-200"
          >
            {WORKSPACE_PROMISES.map((item) => (
              <div
                key={item}
                className="rounded-[var(--r-control)] border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60"
              >
                {item}
              </div>
            ))}
          </RevealDiv>
          <RevealDiv
            {...revealMotionProps}
            className="relative z-10 mt-5 flex items-start gap-3 rounded-[var(--r-control)] border border-emerald-200/70 bg-emerald-50/85 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
            <p>Đăng nhập an toàn. Không lưu mật khẩu trên thiết bị.</p>
          </RevealDiv>
        </HeroPanel>

        <div className="w-full max-w-sm justify-self-center lg:max-w-md">
        <div className="mb-8 text-center">
          {/* Single hero illustration on mobile (was 2 stacked, took too much vertical space). */}
          <HeroLoginScene className="mx-auto mb-3 w-40 text-violet-500 opacity-80 lg:hidden" />
          <div className="gradient-brand mx-auto mb-3 flex size-12 items-center justify-center rounded-[var(--r-tile)] shadow-lg">
            <Sparkles className="h-5.5 w-5.5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {mode === "signin" ? "Chào mừng quay lại" : "Bắt đầu hành trình"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signin" ? "Đăng nhập để tiếp tục hành trình." : "Tạo tài khoản để bắt đầu."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 lg:hidden">
            {TRUST_FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-violet-200/60 bg-violet-50/80 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-200"
              >
                <Icon className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-[var(--r-control)] border border-emerald-200/70 bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-800 shadow-sm lg:hidden">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
          <p>Đăng nhập an toàn. Không lưu mật khẩu trên thiết bị.</p>
        </div>

        <Card className="glass-surface-gradient-border">
          <CardContent className="pt-6 pb-5">
            <div className="stack-stack">
              {/* Google */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={submitting || authLoading}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {submitting ? "Đang xử lý…" : "Tiếp tục với Google"}
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">hoặc</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailSubmit} className="stack-tight" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || authLoading}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Mật khẩu</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting || authLoading}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting || authLoading || !email || !password}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "signin" ? (
                    "Đăng nhập"
                  ) : (
                    "Tạo tài khoản"
                  )}
                </Button>
              </form>

              {error ? (
                <div
                  role="alert"
                  className="flex gap-2 rounded-[var(--r-control)] border border-rose-200/70 bg-gradient-to-br from-rose-50 to-red-50 px-3 py-2 text-sm leading-5 text-rose-700 dark:border-rose-400/25 dark:from-rose-950/40 dark:to-red-950/35 dark:text-rose-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                  <p className="min-w-0 break-words">{error}</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "signin" ? (
            <>
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-violet-700 hover:text-violet-800 hover:underline dark:text-violet-200 dark:hover:text-violet-100"
              >
                Đăng ký
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-violet-700 hover:text-violet-800 hover:underline dark:text-violet-200 dark:hover:text-violet-100"
              >
                Đăng nhập
              </button>
            </>
          )}
        </p>
        </div>
      </div>

      <Toaster />
    </div>
  );
}

function LoginStatusCard({
  action,
  description,
  icon,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-7 text-center">
          <div className="gradient-brand mx-auto flex size-12 items-center justify-center rounded-[var(--r-tile)] shadow-lg">
            {icon}
          </div>
          <h1 className="mt-[var(--space-stack)] text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
