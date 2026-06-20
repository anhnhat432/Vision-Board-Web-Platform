import { AlertTriangle, Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthContext } from "@/lib/auth/AuthContext";

export function ProtectedRoute() {
  const { user, authLoading, isConfigured } = useAuthContext();
  const location = useLocation();
  const destination = `${location.pathname}${location.search}${location.hash}`;
  const loginPath = `/login?next=${encodeURIComponent(destination)}`;

  // Firebase not configured (missing env vars) — block access entirely
  if (!isConfigured) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div
          role="alert"
          className="w-full max-w-md rounded-[var(--r-card)] border border-app-status-warning/30 bg-app-status-warning/10 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)] bg-app-status-warning/15">
            <AlertTriangle className="h-7 w-7 text-app-status-warning" />
          </div>
          <h2 className="text-lg font-semibold text-app-status-warning">Lỗi cấu hình hệ thống</h2>
          <p className="mt-2 text-sm leading-relaxed text-app-status-warning/80">
            Ứng dụng chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên để được hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  // Still resolving Firebase auth state — hold the layout space with a spinner
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-app-ink-muted" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPath} state={{ from: destination }} replace />;
  }

  return <Outlet />;
}
