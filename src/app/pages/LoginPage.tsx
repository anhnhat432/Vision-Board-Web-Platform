import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { motion, type Variants } from "motion/react";
import {
  AlertCircle,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
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
import { resetPassword } from "@/lib/auth/firebase";
import { isDemoMode } from "@/app/utils/app-mode";

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
  "Giữ kế hoạch 12 tuần trong cùng tài khoản.",
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    setMode(getInitialLoginMode(location.search));
  }, [location.search]);

  useEffect(() => {
    setShowPassword(false);
    if (mode !== "signup") {
      setConfirmPassword("");
      setShowConfirmPassword(false);
    }
  }, [mode]);

  const passwordChecks = {
    hasMinimumLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    matchesConfirmation: confirmPassword.length > 0 && confirmPassword === password,
  };
  const canSubmitSignup =
    mode !== "signup" ||
    (passwordChecks.hasMinimumLength && passwordChecks.hasNumber && passwordChecks.matchesConfirmation);
  const passwordRequirementItems = [
    { label: "Ít nhất 8 ký tự", passed: passwordChecks.hasMinimumLength },
    { label: "Có ít nhất 1 chữ số", passed: passwordChecks.hasNumber },
    { label: "Khớp với mật khẩu xác nhận", passed: passwordChecks.matchesConfirmation },
  ];

  // If already signed in, wait for profile so admin accounts can
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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetSubmitting(true);
    setResetError(null);
    if (isDemoMode()) {
      toast.info("Demo đang chạy trên thiết bị này, chưa cần đặt lại mật khẩu. Trên phiên bản đầy đủ bạn sẽ nhận email đặt lại.");
      setResetSent(true);
      setResetSubmitting(false);
      return;
    }
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/user-not-found") {
        setResetError("Không tìm thấy tài khoản với email này.");
      } else if (code === "auth/invalid-email") {
        setResetError("Email không hợp lệ.");
      } else if (code === "auth/too-many-requests") {
        setResetError("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
      } else {
        setResetError("Không gửi được email đặt lại mật khẩu. Vui lòng thử lại.");
      }
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitSignup) return;

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
    // Sign-in not configured — show a notice instead of a broken form
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4" data-route-tone="vision">
        <div className="ambient-orb ambient-orb--violet" />
        <div className="ambient-orb ambient-orb--cyan" />
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-[var(--r-tile)] bg-app-accent p-1 shadow-lg">
              <img
                src="/favicon-192.png"
                alt=""
                aria-hidden="true"
                className="size-full rounded-md object-cover"
              />
            </span>
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
          className="page-enter relative hidden overflow-hidden rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-8 shadow-[var(--shadow-3)] lg:block"
        >
          <MotionParallaxLayer
            depth={0.22}
            className="pointer-events-none absolute -right-20 top-6 hidden w-[420px] text-[color:var(--tone-shell-primary)] opacity-12 xl:block"
            aria-hidden="true"
          >
            <HeroLoginScene className="w-full" />
          </MotionParallaxLayer>
          <ConstellationAccent className="pointer-events-none absolute right-4 top-4 w-28 text-[color:var(--tone-shell-primary)] opacity-25" />
          <RevealDiv {...revealMotionProps} className="relative z-10 mb-5 flex items-start justify-between gap-4">
            <span className="flex size-12 items-center justify-center rounded-[var(--r-tile)] bg-app-accent p-1 shadow-lg">
              <img
                src="/favicon-192.png"
                alt=""
                aria-hidden="true"
                className="size-full rounded-md object-cover"
              />
            </span>
            <HeroOrbitIllustration className="-mt-6 hidden w-32 shrink-0 text-[color:var(--tone-shell-primary)] opacity-60 xl:block" />
          </RevealDiv>
          <RevealParagraph
            {...revealMotionProps}
            className="relative z-10 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Dear Our Future
          </RevealParagraph>
          <RevealParagraph
            {...revealMotionProps}
            className="relative z-10 mt-[var(--space-inline)] text-3xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl lg:text-5xl"
          >
            Biến mục tiêu thành{" "}
            <span className="text-gradient-vibrant">12 tuần hành động</span>{" "}
            trong một không gian làm việc.
          </RevealParagraph>
          <RevealDiv {...revealMotionProps} className="relative z-10 mt-6 flex flex-wrap gap-2">
            {TRUST_FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 text-[color:var(--tone-shell-primary)]" />
                {label}
              </span>
            ))}
          </RevealDiv>
          <RevealDiv
            {...revealMotionProps}
            className="relative z-10 mt-6 grid gap-3 text-sm leading-6 text-muted-foreground"
          >
            {WORKSPACE_PROMISES.map((item) => (
              <div
                key={item}
                className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-4 py-3 shadow-sm"
              >
                {item}
              </div>
            ))}
          </RevealDiv>
          <RevealDiv
            {...revealMotionProps}
            className="relative z-10 mt-5 flex items-start gap-3 rounded-[var(--r-control)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--color-success-fg)]"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
            <p>Đăng nhập an toàn. Không lưu mật khẩu trên thiết bị.</p>
          </RevealDiv>
        </HeroPanel>

        <div className="w-full max-w-sm justify-self-center lg:max-w-md">
        <div className="mb-8 text-center">
          {/* Single hero illustration on mobile (was 2 stacked, took too much vertical space). */}
          <HeroLoginScene className="mx-auto mb-3 w-40 text-[color:var(--tone-shell-primary)] opacity-50 lg:hidden" />
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[var(--r-tile)] bg-app-accent p-1 shadow-lg">
            <img
              src="/favicon-192.png"
              alt=""
              aria-hidden="true"
              className="size-full rounded-md object-cover"
            />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {mode === "signin" ? "Chào mừng quay lại" : "Bắt đầu hành trình"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Đăng nhập để mở lại không gian làm việc và quyền tài khoản." : "Tạo tài khoản để lưu, đồng bộ và bắt đầu an toàn."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 lg:hidden">
            {TRUST_FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-1 text-xs font-semibold text-foreground"
              >
                <Icon className="h-3 w-3 text-[color:var(--tone-shell-primary)]" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-[var(--r-control)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--color-success-fg)] shadow-sm lg:hidden">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
          <p>Đăng nhập an toàn. Không lưu mật khẩu trên thiết bị.</p>
        </div>

        <Card>
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
                <div className="h-px flex-1 bg-[color:var(--border)]" />
                <span className="text-xs text-muted-foreground">hoặc</span>
                <div className="h-px flex-1 bg-[color:var(--border)]" />
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                    {mode === "signin" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetPassword(true);
                          setResetEmail(email);
                          setResetSent(false);
                          setResetError(null);
                        }}
                        className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline dark:text-violet-300 dark:hover:text-violet-200"
                      >
                        Quên mật khẩu?
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting || authLoading}
                      className="pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[var(--r-control)] p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      disabled={submitting || authLoading}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "signup" ? (
                    <div className="space-y-1 pt-1" aria-live="polite">
                      {passwordRequirementItems.map((item) => (
                        <div
                          key={item.label}
                          className={item.passed ? "flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300" : "flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"}
                        >
                          <span
                            className={item.passed ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full border border-slate-300 bg-transparent dark:border-slate-600"}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {mode === "signup" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="login-confirm-password">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="login-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={submitting || authLoading}
                        className="pr-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[var(--r-control)] p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        disabled={submitting || authLoading}
                        aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ) : null}

                <Button type="submit" className="w-full" disabled={submitting || authLoading || !email || !password || !canSubmitSignup}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "signin" ? (
                    "Đăng nhập"
                  ) : (
                    "Tạo tài khoản"
                  )}
                </Button>
                {mode === "signup" ? (
                  <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-300">
                    Khi tạo tài khoản, bạn đồng ý với{" "}
                    <Link
                      to="/terms"
                      className="font-medium text-violet-700 underline-offset-4 hover:text-violet-800 hover:underline dark:text-violet-200 dark:hover:text-violet-100"
                    >
                      Điều khoản
                    </Link>{" "}
                    và{" "}
                    <Link
                      to="/privacy"
                      className="font-medium text-violet-700 underline-offset-4 hover:text-violet-800 hover:underline dark:text-violet-200 dark:hover:text-violet-100"
                    >
                      Chính sách bảo mật
                    </Link>
                    .
                  </p>
                ) : null}
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

        {showResetPassword ? (
          <Card className="mt-4 border-violet-200/60 bg-violet-50/50 dark:border-violet-400/20 dark:bg-violet-950/30">
            <CardContent className="pt-5 pb-4">
              {resetSent ? (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-[var(--r-pill)] bg-emerald-100 dark:bg-emerald-900/50">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Đã gửi email đặt lại mật khẩu</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Kiểm tra hộp thư <strong>{resetEmail}</strong> và làm theo hướng dẫn. Nếu không thấy, hãy kiểm tra thư mục spam.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetSent(false);
                    }}
                  >
                    Quay lại đăng nhập
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="stack-tight">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Đặt lại mật khẩu</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={resetSubmitting}
                      required
                    />
                  </div>
                  {resetError ? (
                    <div role="alert" className="flex gap-2 rounded-[var(--r-control)] border border-rose-200/70 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700 dark:border-rose-400/25 dark:bg-rose-950/40 dark:text-rose-100">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                      <p>{resetError}</p>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={resetSubmitting || !resetEmail.trim()}>
                      {resetSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gửi email đặt lại"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResetPassword(false)}
                    >
                      Huỷ
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        ) : null}

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
