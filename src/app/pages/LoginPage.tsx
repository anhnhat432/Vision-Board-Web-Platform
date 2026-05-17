import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
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

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Toaster } from "../components/ui/sonner";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { resetPassword } from "@/lib/auth/firebase";
import { isDemoMode } from "@/app/utils/app-mode";
import { Label } from "../components/ui/label";
import { inputClass, labelClass, errorTextClass } from "../features/auth/shared/formStyles";

type LoginMode = "signin" | "signup";

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

  const isDesktop = !prefersReducedMotion;

  if (!isConfigured) {
    // Sign-in not configured — show a notice instead of a broken form
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-4">
        <div className="w-full max-w-sm rounded-card border border-app-line bg-app-surface p-7">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-app-accent">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-app-ink">Vision Board</span>
          </div>
          <h2 className="mt-4 font-serif text-xl font-medium text-app-ink">Chưa cấu hình xác thực</h2>
          <p className="mt-1 text-sm text-app-ink-muted">Xác thực chưa được thiết lập trong môi trường này.</p>
          <Button
            className="mt-5 w-full bg-app-accent text-white hover:bg-[#284f45]"
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
  const heroTitle = isSignIn
    ? "Tiếp tục kế hoạch 12 tuần của bạn."
    : "Tạo không gian phát triển bản thân của riêng bạn.";
  const heroSubline = isSignIn
    ? "Lưu tiến độ và tiếp tục trên thiết bị khác."
    : "Khoảng 30 giây để bắt đầu.";
  const formTitle = isSignIn ? "Đăng nhập" : "Tạo tài khoản";
  const formDescription = isSignIn ? "Tiếp tục hành trình bạn đã bắt đầu." : "Khoảng 30 giây.";

  return (
    <div className="flex min-h-screen flex-col bg-app-bg">
      {/* Top bar */}
      <header className="flex w-full items-center justify-center px-4 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-app-accent">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-app-ink">Vision Board</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12">
            {/* Left column - Hero panel (desktop only) */}
            <div className="hidden lg:block">
              <div className="rounded-[14px] border border-app-line bg-app-surface p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                  {captionText}
                </p>
                <h1 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight text-app-ink max-w-md">
                  {heroTitle}
                </h1>
                <p className="mt-3 text-sm text-app-ink-soft max-w-md">
                  {heroSubline}
                </p>

                {/* Trust features */}
                <div className="mt-8 grid grid-cols-1 gap-3 max-w-sm">
                  {TRUST_FEATURES.map(({ icon: Icon, title, sub }) => (
                    <div key={title} className="flex items-start gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-app-ink">{title}</p>
                        <p className="mt-0.5 text-xs text-app-ink-soft">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="mt-10 font-serif italic text-sm text-app-ink-soft max-w-md leading-relaxed">
                  "Kỷ luật là cây cầu giữa mục tiêu và thành quả." — Jim Rohn
                </blockquote>
              </div>
            </div>

            {/* Right column - Form card */}
            <div className="w-full">
              <div className="w-full max-w-md mx-auto lg:mx-0">
                {/* Mobile hero - simplified */}
                <div className="lg:hidden text-center mb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                    {captionText}
                  </p>
                  <h1 className="mt-2 font-serif text-2xl font-medium leading-tight text-app-ink">
                    {isSignIn ? "Chào mừng quay lại" : "Bắt đầu hành trình"}
                  </h1>
                </div>

                <div className="rounded-[14px] border border-app-line bg-app-surface p-6 md:p-8">
                  {/* Form header */}
                  <div>
                    <h2 className="font-serif text-2xl font-medium text-app-ink">{formTitle}</h2>
                    <p className="text-[13px] text-app-ink-soft mt-1">{formDescription}</p>
                  </div>

                  {/* Mode switch */}
                  <div className="mt-5 inline-flex w-full gap-1 p-1 rounded-full border border-app-line bg-app-bg">
                    <Link
                      to={{ pathname: "/login", search: isSignIn ? "" : "?mode=signup" }}
                      className={`flex-1 text-[13px] font-medium text-center py-1.5 px-4 rounded-full transition-colors duration-150 ${
                        isSignIn
                          ? "bg-app-surface text-app-ink shadow-sm"
                          : "text-app-ink-soft hover:text-app-ink"
                      }`}
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to={{ pathname: "/login", search: isSignIn ? "?mode=signup" : "" }}
                      className={`flex-1 text-[13px] font-medium text-center py-1.5 px-4 rounded-full transition-colors duration-150 ${
                        !isSignIn
                          ? "bg-app-surface text-app-ink shadow-sm"
                          : "text-app-ink-soft hover:text-app-ink"
                      }`}
                    >
                      Đăng ký
                    </Link>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
                    {/* Email field */}
                    <div>
                      <Label htmlFor="login-email" className={labelClass}>
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting || authLoading}
                        className={inputClass}
                        required
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
                            type="button"
                            onClick={() => {
                              setShowResetPassword(true);
                              setResetEmail(email);
                              setResetSent(false);
                              setResetError(null);
                            }}
                            className="text-[12px] text-app-accent hover:underline"
                          >
                            Quên mật khẩu?
                          </button>
                        ) : null}
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete={isSignIn ? "current-password" : "new-password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={submitting || authLoading}
                          className={`${inputClass} pr-11`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-app-ink-muted hover:text-app-ink"
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
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={submitting || authLoading}
                            className={`${inputClass} pr-11`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((current) => !current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-app-ink-muted hover:text-app-ink"
                            disabled={submitting || authLoading}
                            aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {/* Password requirements */}
                        <div className="mt-3 space-y-1.5" aria-live="polite">
                          {passwordRequirementItems.map((item) => (
                            <div
                              key={item.label}
                              className={`flex items-center gap-2 text-[12px] ${
                                item.passed ? "text-green-700" : "text-app-ink-soft"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  item.passed ? "bg-green-600" : "border border-app-line bg-transparent"
                                }`}
                              />
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Error message */}
                    {error ? (
                      <div
                        role="alert"
                        className={`flex gap-2 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 ${
                          prefersReducedMotion ? "" : ""
                        }`}
                      >
                        <AlertCircle className="h-4 w-4 text-[color:var(--color-danger-fg)] shrink-0 mt-0.5" />
                        <p className="text-[13px] text-[color:var(--color-danger-fg)] leading-relaxed">{error}</p>
                      </div>
                    ) : null}

                    {/* Submit button */}
                    <Button
                      type="submit"
                      className="w-full bg-app-accent text-white py-2.5 text-[14px] font-medium hover:bg-[#284f45] disabled:bg-app-ink-muted disabled:cursor-not-allowed transition-colors duration-150"
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
                      <p className="text-center text-[12px] text-app-ink-soft leading-5">
                        Khi tạo tài khoản, bạn đồng ý với{" "}
                        <Link
                          to="/terms"
                          className="font-medium text-app-accent hover:underline"
                        >
                          Điều khoản
                        </Link>{" "}
                        và{" "}
                        <Link
                          to="/privacy"
                          className="font-medium text-app-accent hover:underline"
                        >
                          Chính sách bảo mật
                        </Link>
                        .
                      </p>
                    ) : null}
                  </form>
                </div>

                {/* Reset password card */}
                {showResetPassword ? (
                  <div className="mt-4 rounded-[14px] border border-app-line bg-app-surface p-5">
                    {resetSent ? (
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-app-ink">
                          Đã gửi email đặt lại mật khẩu
                        </p>
                        <p className="mt-1 text-[13px] text-app-ink-soft">
                          Kiểm tra hộp thư <strong>{resetEmail}</strong> và làm theo hướng dẫn. Nếu không thấy, hãy kiểm tra thư mục spam.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-3 border-app-line text-app-ink hover:bg-app-bg"
                          onClick={() => {
                            setShowResetPassword(false);
                            setResetSent(false);
                          }}
                        >
                          Quay lại đăng nhập
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                          <h3 className="font-serif text-base font-medium text-app-ink">Quên mật khẩu?</h3>
                          <p className="text-[13px] text-app-ink-soft mt-1">
                            Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="reset-email" className={labelClass}>
                            Email
                          </Label>
                          <Input
                            id="reset-email"
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
                            <p className="text-[13px] text-[color:var(--color-danger-fg)]">{resetError}</p>
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            className="bg-app-accent text-white hover:bg-[#284f45]"
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
                            onClick={() => setShowResetPassword(false)}
                          >
                            Đóng
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : null}

                {/* Bottom switch link */}
                <p className="mt-4 text-center text-[13px] text-app-ink-soft">
                  {isSignIn ? (
                    <>
                      Chưa có tài khoản?{" "}
                      <Link
                        to={{ pathname: "/login", search: "?mode=signup" }}
                        className="font-medium text-app-accent hover:underline"
                      >
                        Tạo mới →
                      </Link>
                    </>
                  ) : (
                    <>
                      Đã có tài khoản?{" "}
                      <Link
                        to={{ pathname: "/login" }}
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
      <div className="w-full max-w-sm rounded-[14px] border border-app-line bg-app-surface p-7 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-app-accent shadow-lg">
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