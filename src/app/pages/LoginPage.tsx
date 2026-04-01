import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Toaster } from "../components/ui/sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";

type LoginMode = "signin" | "signup";

function getRedirectPath(from: unknown): string {
  if (typeof from === "string" && from.startsWith("/") && !from.startsWith("/login")) {
    return from;
  }
  return "/";
}

export function LoginPage() {
  const { user, authLoading, error, login, isConfigured } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getRedirectPath((location.state as Record<string, unknown> | null)?.from);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const [mode, setMode] = useState<LoginMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, send to destination immediately
  if (!authLoading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const result = await login({ provider: "email", email, password, mode });
    setSubmitting(false);

    if (result) {
      navigate(redirectTo, { replace: true });
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    const result = await login({ provider: "google" });
    setSubmitting(false);

    if (result) {
      navigate(redirectTo, { replace: true });
    }
  }

  if (!isConfigured) {
    // Firebase not configured — show a notice instead of a broken form
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="ambient-orb ambient-orb--violet" />
        <div className="ambient-orb ambient-orb--cyan" />
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <CardTitle>Dear Our Future</CardTitle>
            <CardDescription>
              Xác thực chưa được cấu hình trong môi trường này.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate("/", { replace: true })}
            >
              Về trang chủ
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="ambient-orb ambient-orb--rose" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
            <Sparkles className="h-5.5 w-5.5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dear Our Future</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signin" ? "Đăng nhập để tiếp tục hành trình." : "Tạo tài khoản để bắt đầu."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 pb-5">
            <div className="space-y-4">
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
              <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || authLoading || !email || !password}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "signin" ? (
                    "Đăng nhập"
                  ) : (
                    "Tạo tài khoản"
                  )}
                </Button>
              </form>
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
                className="font-medium text-violet-600 hover:underline"
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
                className="font-medium text-violet-600 hover:underline"
              >
                Đăng nhập
              </button>
            </>
          )}
        </p>
      </div>

      <Toaster />
    </div>
  );
}
