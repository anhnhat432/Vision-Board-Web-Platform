import { AlertCircle, ArrowLeft, Compass, Eye, EyeOff, Loader2, LogOut, RefreshCw, ShieldCheck, Target } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { isDemoMode } from "@/app/utils/app-mode";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { applyRouteDocumentMetadata } from "../components/root-layout/routeMeta";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Toaster } from "../components/ui/sonner";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { inputClass, labelClass } from "../features/auth/shared/formStyles";

type LoginMode = "signin" | "signup";

const SIGNUP_DOCUMENT_TITLE = "Tạo tài khoản – Dear Our Future";
const SIGNUP_DOCUMENT_DESCRIPTION = "Tạo tài khoản để lưu kế hoạch 12 tuần và đồng bộ giữa các thiết bị.";

const TRUST_FEATURES = [
  {
    icon: Target,
    title: "Mục tiêu rõ",
    sub: "Theo dõi tiến độ 12 tuần",
  },
  {
    icon: Compass,
    title: "Lộ trình có hướng",
    sub: "Từ onboarding đến phản tư",
  },
  {
    icon: ShieldCheck,
    title: "Dữ liệu an toàn",
    sub: "Local-first, không bị mất",
  },
];

const LOGIN_REVEAL_ANIMATION = "login-rise 0.65s cubic-bezier(0.22, 0.7, 0.24, 1) both";

const LOGIN_MOTION_CSS = `
@keyframes login-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes login-glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.08); }
}
`;

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

function buildLoginModeSearch(mode: LoginMode, currentSearch: string): string {
  const currentParams = new URLSearchParams(currentSearch);
  const safeNext = normalizeRedirectPath(currentParams.get("next"));
  const nextParams = new URLSearchParams();

  if (mode === "signup") {
    nextParams.set("mode", "signup");
  }
  if (safeNext) {
    nextParams.set("next", safeNext);
  }

  const search = nextParams.toString();
  return search ? `?${search}` : "";
}

function setMetaContent(selector: string, content: string): void {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

function applyLoginDocumentMetadata(pathname: string, mode: LoginMode): void {
  applyRouteDocumentMetadata(pathname);
  if (mode !== "signup" || typeof document === "undefined") return;

  document.title = SIGNUP_DOCUMENT_TITLE;
  setMetaContent('meta[name="description"]', SIGNUP_DOCUMENT_DESCRIPTION);
  setMetaContent('meta[property="og:title"]', SIGNUP_DOCUMENT_TITLE);
  setMetaContent('meta[property="og:description"]', SIGNUP_DOCUMENT_DESCRIPTION);
  setMetaContent('meta[name="twitter:title"]', SIGNUP_DOCUMENT_TITLE);
  setMetaContent('meta[name="twitter:description"]', SIGNUP_DOCUMENT_DESCRIPTION);
}

export function LoginPage() {
  const prefersReducedMotion = useReducedMotion();
  const {
    user,
    userProfile,
    userProfileLoading,
    userProfileError,
    authLoading,
    error: authError,
    login,
    logout,
    refreshUserProfile,
    isConfigured,
  } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const stateRedirect = normalizeRedirectPath((location.state as Record<string, unknown> | null)?.from);
  const queryRedirect = normalizeRedirectPath(new URLSearchParams(location.search).get("next"));
  const hasExplicitRedirect = Boolean(stateRedirect ?? queryRedirect);
  const redirectTo = stateRedirect ?? queryRedirect ?? "/";

  useEffect(() => {
    if (authError) toast.error(authError);
  }, [authError]);

  const [mode, setMode] = useState<LoginMode>(() => getInitialLoginMode(location.search));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const forgotPasswordButtonRef = useRef<HTMLButtonElement | null>(null);
  const resetEmailInputRef = useRef<HTMLInputElement | null>(null);
  const resetBackButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMode(getInitialLoginMode(location.search));
  }, [location.search]);

  useEffect(() => {
    applyLoginDocumentMetadata(location.pathname, mode);
  }, [location.pathname, mode]);

  useEffect(() => {
    setShowPassword(false);
    if (mode !== "signup") {
      setConfirmPassword("");
      setShowConfirmPassword(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!showResetPassword || resetSent) return;
    resetEmailInputRef.current?.focus();
  }, [resetSent, showResetPassword]);

  useEffect(() => {
    if (!showResetPassword || !resetSent) return;
    resetBackButtonRef.current?.focus();
  }, [resetSent, showResetPassword]);

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
  const confirmPasswordError =
    mode === "signup" && confirmPassword.length > 0 && !passwordChecks.matchesConfirmation
      ? "Mật khẩu xác nhận chưa khớp."
      : null;
  const confirmPasswordDescriptionIds = [
    confirmPasswordError ? "login-confirm-password-error" : null,
    localError ?? authError ? "login-form-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const handleGoogleLogin = useCallback(async () => {
    if (googleSubmitting || authLoading) return;

    setGoogleSubmitting(true);
    setLocalError(null);

    try {
      const credential = await login({ provider: "google" });
      if (!credential) {
        setLocalError("Đăng nhập Google chưa sẵn sàng. Kiểm tra lại cấu hình.");
        return;
      }

      toast.success("Đăng nhập Google thành công!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng nhập Google thất bại";
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes("popup-closed") || normalizedMessage.includes("cancelled")) {
        return;
      }

      setLocalError(message);
    } finally {
      setGoogleSubmitting(false);
    }
  }, [authLoading, googleSubmitting, login]);

  // If already signed in, route based on profile state.
  // Admin users with a fully loaded profile go to the admin console.
  // Other users (including profiles still loading) go to the requested destination immediately
  // — AdminLayout will guard /admin routes if a non-admin lands there. Blocking on profile
  // load here regressed the post-login redirect (see commit 5ab779f9).
  if (!authLoading && user) {
    if (userProfile?.role === "admin") {
      return <Navigate to={redirectTo.startsWith("/admin/") ? redirectTo : "/admin/dashboard"} replace />;
    }

    const shouldWaitForDefaultProfileRoute =
      !hasExplicitRedirect && (userProfileLoading || (!userProfile && !userProfileError));

    if (shouldWaitForDefaultProfileRoute) {
      return (
        <LoginStatusCard
          icon={<Loader2 className="h-5 w-5 animate-spin text-white" />}
          title="Đang kiểm tra quyền truy cập"
          description="Đang tải hồ sơ tài khoản để chuyển bạn đến đúng khu vực."
        />
      );
    }

    if (userProfile) {
      return <Navigate to={redirectTo} replace />;
    }

    if (userProfileError) {
      return (
        <LoginStatusCard
          icon={<AlertCircle className="h-5 w-5 text-app-status-warning" />}
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

    // Explicit redirect from a protected route can continue while profile loads;
    // guards on that route will handle the final access decision.
    return <Navigate to={redirectTo} replace />;
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetSubmitting(true);
    setResetError(null);
    if (isDemoMode()) {
      toast.info(
        "Demo đang chạy trên thiết bị này, chưa cần đặt lại mật khẩu. Trên phiên bản đầy đủ bạn sẽ nhận email đặt lại.",
      );
      setResetSent(true);
      setResetSubmitting(false);
      return;
    }
    try {
      const { resetPassword } = await import("@/lib/auth/firebase");
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

  function openResetPassword() {
    setShowResetPassword(true);
    setResetEmail(email);
    setResetSent(false);
    setResetError(null);
  }

  function closeResetPassword() {
    setShowResetPassword(false);
    setResetSent(false);
    forgotPasswordButtonRef.current?.focus();
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitSignup) return;

    setLocalError(null);
    setSubmitting(true);

    const result = await login({ provider: "email", email, password, mode });
    setSubmitting(false);

    if (result) {
      refreshUserProfile();
    }
  }

  if (!isConfigured) {
    // Sign-in not configured — show a notice instead of a broken form
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-4">
        <div className="w-full max-w-md surface-raised rounded-card border border-app-line bg-app-surface p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-app-accent shadow-app-sm ring-1 ring-app-accent/20">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-app-ink">Vision Board</span>
          </div>
          <h2 className="mt-4 font-serif text-xl font-medium text-app-ink">Chưa cấu hình xác thực</h2>
          <p className="mt-1 text-sm text-app-ink-muted">Xác thực chưa được thiết lập trong môi trường này.</p>
          <Button
            className="mt-5 w-full bg-app-accent text-white hover:bg-app-accent-hover"
            onClick={() => navigate("/", { replace: true })}
          >
            Quay về trang chủ
          </Button>
        </div>
        <Toaster />
      </div>
    );
  }

  const isSignIn = mode === "signin";
  const captionText = isSignIn ? "CHÀO BẠN QUAY LẠI" : "BẮT ĐẦU HÀNH TRÌNH";
  const heroTitle = isSignIn ? "Quay lại với 12 tuần của bạn" : "Mở không gian 12 tuần đầu tiên";
  const heroSubline = isSignIn
    ? "Đăng nhập để tiếp tục theo dõi tiến độ và đồng bộ giữa các thiết bị."
    : "Tạo tài khoản để lưu kế hoạch 12 tuần và đồng bộ giữa các thiết bị.";
  const formTitle = isSignIn ? "Đăng nhập" : "Tạo tài khoản";
  const formDescription = isSignIn ? "Tiếp tục hành trình bạn đã bắt đầu." : "Khoảng 30 giây.";
  const displayError = localError ?? authError;
  const signInSearch = buildLoginModeSearch("signin", location.search);
  const signUpSearch = buildLoginModeSearch("signup", location.search);

  const reveal = (delayMs: number): React.CSSProperties | undefined =>
    prefersReducedMotion ? undefined : { animation: LOGIN_REVEAL_ANIMATION, animationDelay: `${delayMs}ms` };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-app-bg">
      <style>{LOGIN_MOTION_CSS}</style>
      {/* Ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full opacity-[0.13] blur-3xl"
          style={{ background: "var(--grad-aspire)" }}
        />
        <div
          className="absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full opacity-[0.09] blur-3xl"
          style={{ background: "var(--grad-aspire)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--app-ink) 7%, transparent) 1px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 85% 55% at 50% 0%, black, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 55% at 50% 0%, black, transparent 78%)",
          }}
        />
      </div>
      <a href="#login-main" className="skip-to-content">
        Bỏ qua điều hướng
      </a>
      {/* Top bar */}
      <header className="relative flex w-full items-center justify-center px-4 py-7" style={reveal(0)}>
        <Link
          to="/"
          aria-label="Quay về trang chủ"
          className="absolute left-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-app-ink-soft transition-colors hover:bg-app-accent-soft hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Quay về trang chủ</span>
        </Link>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-app-accent text-white shadow-app-sm ring-1 ring-app-accent/25">
              <Target className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-app-ink">Dear Our Future</span>
          </div>
          <p className="text-xs text-app-ink-soft">Nhật ký 12 tuần để sống có chủ đích hơn</p>
        </div>
      </header>

      <main
        id="login-main"
        aria-label="Đăng nhập"
        className="relative flex w-full flex-1 items-center justify-center overflow-x-hidden px-4 pb-12"
      >
        <div className="w-full max-w-6xl min-w-0">
          <h1 className="sr-only">{heroTitle}</h1>
          <div className="grid min-w-0 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
            {/* Left column - Hero panel (desktop only) */}
            <div className="hidden lg:block" style={reveal(80)}>
              <div
                className="relative flex h-full flex-col overflow-hidden rounded-card-lg border border-white/10 p-9 text-white shadow-[0_40px_90px_-50px_rgba(12,55,38,0.85)]"
                style={{
                  background:
                    "linear-gradient(150deg, var(--app-accent-active) 0%, var(--app-accent) 55%, var(--app-accent-hover) 100%)",
                }}
              >
                {/* Decorative orbit rings — evoke the 12-week journey */}
                <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 h-80 w-80">
                  <div className="absolute inset-0 rounded-full border border-white/10" />
                  <div className="absolute inset-8 rounded-full border border-white/10" />
                  <div className="absolute inset-16 rounded-full border border-white/[0.07]" />
                  <div className="absolute inset-24 rounded-full border border-white/[0.05]" />
                </div>
                {/* Soft breathing glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-12 bottom-4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
                  style={prefersReducedMotion ? undefined : { animation: "login-glow-pulse 7s ease-in-out infinite" }}
                />
                {/* Grain texture */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                  }}
                />

                <div className="relative flex h-full flex-col">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                    Hành trình 12 tuần
                  </div>

                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65">
                    {captionText}
                  </p>
                  <p
                    aria-hidden="true"
                    className="mt-3 max-w-md font-serif text-[2.1rem] font-medium leading-[1.12] tracking-tight text-white"
                  >
                    {heroTitle}
                  </p>
                  <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">{heroSubline}</p>

                  {/* Trust features */}
                  <div className="mt-9 max-w-sm">
                    {TRUST_FEATURES.map(({ icon: Icon, title, sub }) => (
                      <div
                        key={title}
                        className="flex items-start gap-3.5 border-t border-white/10 py-3.5 first:border-t-0 first:pt-0"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.12] text-white ring-1 ring-inset ring-white/15">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{title}</p>
                          <p className="mt-0.5 text-[13px] text-white/65">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="mt-auto max-w-md border-l-2 border-white/20 pl-4 pt-10 font-serif text-sm italic leading-relaxed text-white/70">
                    "Kỷ luật là cây cầu giữa mục tiêu và thành quả." — Jim Rohn
                  </blockquote>
                </div>
              </div>
            </div>

            {/* Right column - Form card */}
            <div className="w-full min-w-0">
              <div className="mx-auto w-full max-w-full sm:max-w-md lg:mx-0">
                {/* Mobile hero - simplified */}
                <div className="lg:hidden mb-6" style={reveal(120)}>
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                      {captionText}
                    </p>
                    <p aria-hidden="true" className="mt-2 font-serif text-2xl font-medium leading-tight text-app-ink">
                      {isSignIn ? "Quay lại với 12 tuần của bạn" : "Mở không gian 12 tuần đầu tiên"}
                    </p>
                  </div>

                  {/* 3 trust chip trên mobile */}
                  <div data-testid="login-mobile-trust-chips" className="mt-5">
                    <ul className="flex flex-wrap justify-center gap-2">
                      {TRUST_FEATURES.map(({ icon: Icon, title }) => (
                        <li
                          key={title}
                          className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1.5 text-xs text-app-ink-soft whitespace-nowrap"
                        >
                          <Icon className="h-3.5 w-3.5 text-app-accent" />
                          {title}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  className="rounded-[20px] border border-app-line bg-app-surface p-6 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.30)] ring-1 ring-black/[0.02] md:p-8"
                  style={reveal(180)}
                >
                  {/* Form header */}
                  <div>
                    <h2 className="font-serif text-2xl font-medium text-app-ink">{formTitle}</h2>
                    <p className="text-sm text-app-ink-soft mt-1">{formDescription}</p>
                  </div>

                  {/* Mode switch */}
                  <div className="mt-5 inline-flex w-full gap-1 p-1 rounded-full border border-app-line bg-app-bg">
                    <Link
                      to={{ pathname: "/login", search: signInSearch }}
                      className={`flex-1 text-sm font-medium text-center py-1.5 px-4 rounded-full transition-colors duration-150 ${
                        isSignIn ? "bg-app-surface text-app-ink shadow-app-sm" : "text-app-ink-soft hover:text-app-ink"
                      }`}
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to={{ pathname: "/login", search: signUpSearch }}
                      className={`flex-1 text-sm font-medium text-center py-1.5 px-4 rounded-full transition-colors duration-150 ${
                        !isSignIn ? "bg-app-surface text-app-ink shadow-app-sm" : "text-app-ink-soft hover:text-app-ink"
                      }`}
                    >
                      Đăng ký
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleSubmitting || authLoading}
                    className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-app-line bg-app-surface px-4 py-3 text-sm font-medium text-app-ink shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[background-color,border-color,box-shadow] duration-150 hover:border-app-accent/40 hover:bg-app-bg hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:bg-app-line disabled:text-app-ink-muted disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                    aria-label="Tiếp tục với Google"
                  >
                    {googleSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    {googleSubmitting ? "Đang mở Google..." : "Tiếp tục với Google"}
                  </button>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-app-line" />
                    <span className="text-xs text-app-ink-muted">hoặc dùng email</span>
                    <div className="h-px flex-1 bg-app-line" />
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    {/* Email field */}
                    <div>
                      <Label htmlFor="login-email" className={labelClass}>
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting || authLoading}
                        className={inputClass}
                        required
                        aria-required="true"
                        aria-invalid={displayError ? true : undefined}
                        aria-describedby={displayError ? "login-form-error" : undefined}
                      />
                    </div>

                    {/* Password field */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className={labelClass}>
                          Mật khẩu
                        </Label>
                        {isSignIn ? (
                          <button
                            ref={forgotPasswordButtonRef}
                            type="button"
                            onClick={openResetPassword}
                            className="text-xs text-app-accent hover:underline"
                          >
                            Quên mật khẩu?
                          </button>
                        ) : null}
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete={isSignIn ? "current-password" : "new-password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={submitting || authLoading}
                          className={`${inputClass} pr-14`}
                          required
                          aria-required="true"
                          aria-invalid={displayError ? true : undefined}
                          aria-describedby={displayError ? "login-form-error" : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md p-2 text-app-ink-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                          disabled={submitting || authLoading}
                          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Signup: Confirm password */}
                    {!isSignIn ? (
                      <div>
                        <Label htmlFor="login-confirm-password" className={labelClass}>
                          Xác nhận mật khẩu
                        </Label>
                        <div className="relative">
                          <Input
                            id="login-confirm-password"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={submitting || authLoading}
                            className={`${inputClass} pr-14`}
                            required
                            aria-required="true"
                            aria-invalid={confirmPasswordError || displayError ? true : undefined}
                            aria-describedby={confirmPasswordDescriptionIds || undefined}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((current) => !current)}
                            className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md p-2 text-app-ink-muted hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                            disabled={submitting || authLoading}
                            aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPasswordError ? (
                          <p id="login-confirm-password-error" className="text-xs text-[color:var(--color-danger-fg)]">
                            {confirmPasswordError}
                          </p>
                        ) : null}
                        {/* Password requirements */}
                        <div className="mt-3 space-y-1.5" aria-live="polite">
                          {passwordRequirementItems.map((item) => (
                            <div
                              key={item.label}
                              className={`flex items-center gap-2 text-xs ${
                                item.passed ? "text-app-status-success" : "text-app-ink-soft"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  item.passed ? "bg-app-status-success" : "border border-app-line bg-transparent"
                                }`}
                              />
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Error message */}
                    {displayError ? (
                      <div
                        id="login-form-error"
                        role="alert"
                        className={`flex gap-2 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 ${
                          prefersReducedMotion ? "" : ""
                        }`}
                      >
                        <AlertCircle className="h-4 w-4 text-[color:var(--color-danger-fg)] shrink-0 mt-0.5" />
                        <p className="text-sm text-[color:var(--color-danger-fg)] leading-relaxed">{displayError}</p>
                      </div>
                    ) : null}

                    {/* Submit button */}
                    <Button
                      type="submit"
                      className="w-full bg-app-accent text-white py-2.5 text-sm font-medium hover:bg-app-accent-hover transition-colors duration-150 disabled:bg-app-line disabled:text-app-ink-muted disabled:shadow-none disabled:cursor-not-allowed"
                      disabled={submitting || authLoading || !email || !password || !canSubmitSignup}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </span>
                      ) : isSignIn ? (
                        "Đăng nhập"
                      ) : (
                        "Tạo tài khoản"
                      )}
                    </Button>

                    {/* Terms text (signup only) */}
                    {!isSignIn ? (
                      <p className="text-center text-xs text-app-ink-soft leading-5">
                        Khi tạo tài khoản, bạn đồng ý với{" "}
                        <Link to="/terms" className="font-medium text-app-accent hover:underline">
                          Điều khoản
                        </Link>{" "}
                        và{" "}
                        <Link to="/privacy" className="font-medium text-app-accent hover:underline">
                          Chính sách bảo mật
                        </Link>
                        .
                      </p>
                    ) : null}
                  </form>

                  <p className="mt-4 text-xs leading-5 text-app-ink-muted">
                    Nếu trước đây bạn đăng nhập bằng Google, hãy dùng button trên thay vì email/mật khẩu.
                  </p>
                </div>

                {/* Reset password card */}
                {showResetPassword ? (
                  <div className="mt-4 rounded-[14px] border border-app-line bg-app-surface p-5">
                    {resetSent ? (
                      <div role="status" aria-live="polite" className="text-center">
                        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-app-ink">Đã gửi email đặt lại mật khẩu</p>
                        <p className="mt-1 text-sm text-app-ink-soft">
                          Kiểm tra hộp thư <strong>{resetEmail}</strong> và làm theo hướng dẫn. Nếu không thấy, hãy kiểm
                          tra thư mục spam.
                        </p>
                        <Button
                          ref={resetBackButtonRef}
                          type="button"
                          variant="outline"
                          className="mt-3 border-app-line text-app-ink hover:bg-app-bg"
                          onClick={closeResetPassword}
                        >
                          Quay lại đăng nhập
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                          <h3 className="font-serif text-base font-medium text-app-ink">Quên mật khẩu?</h3>
                          <p className="mt-1 text-sm text-app-ink-soft">
                            Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="reset-email" className={labelClass}>
                            Email
                          </Label>
                          <Input
                            ref={resetEmailInputRef}
                            id="reset-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            disabled={resetSubmitting}
                            className={inputClass}
                            required
                          />
                        </div>
                        {resetError ? (
                          <div
                            role="alert"
                            className="flex gap-2 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3"
                          >
                            <AlertCircle className="h-4 w-4 text-[color:var(--color-danger-fg)] shrink-0 mt-0.5" />
                            <p className="text-sm text-[color:var(--color-danger-fg)]">{resetError}</p>
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            className="bg-app-accent text-white hover:bg-app-accent-hover"
                            disabled={resetSubmitting || !resetEmail.trim()}
                          >
                            {resetSubmitting ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang gửi...
                              </span>
                            ) : (
                              "Gửi link"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-app-line text-app-ink hover:bg-app-bg"
                            onClick={closeResetPassword}
                          >
                            Đóng
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : null}

                {/* Bottom switch link */}
                <p className="mt-4 text-center text-sm text-app-ink-soft" style={reveal(240)}>
                  {isSignIn ? (
                    <>
                      Chưa có tài khoản?{" "}
                      <Link
                        to={{ pathname: "/login", search: signUpSearch }}
                        className="font-medium text-app-accent hover:underline"
                      >
                        Tạo mới →
                      </Link>
                    </>
                  ) : (
                    <>
                      Đã có tài khoản?{" "}
                      <Link
                        to={{ pathname: "/login", search: signInSearch }}
                        className="font-medium text-app-accent hover:underline"
                      >
                        Đăng nhập →
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-md rounded-[14px] border border-app-line bg-app-surface p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-app-accent shadow-app-lg">
          {icon}
        </div>
        <h1 className="mt-4 font-serif text-xl font-medium tracking-tight text-app-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-app-ink-soft">{description}</p>
        {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
      </div>
      <Toaster />
    </div>
  );
}
