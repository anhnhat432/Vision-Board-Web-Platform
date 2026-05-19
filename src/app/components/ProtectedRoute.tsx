import { Navigate, Outlet, useLocation } from "react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
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
          className="w-full max-w-md rounded-[var(--r-card)] border border-amber-200 bg-amber-50/90 p-8 text-center shadow-lg"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)] bg-amber-100">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-amber-800">Lỗi cấu hình hệ thống</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-700">
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
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPath} state={{ from: destination }} replace />;
  }

  return <Outlet />;
}
