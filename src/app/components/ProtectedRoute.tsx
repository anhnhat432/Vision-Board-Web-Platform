import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuthContext } from "@/lib/auth/AuthContext";

export function ProtectedRoute() {
  const { user, authLoading, isConfigured } = useAuthContext();
  const location = useLocation();
  const destination = `${location.pathname}${location.search}${location.hash}`;

  // Firebase not configured (demo mode or missing env vars) — skip auth gate entirely
  if (!isConfigured) {
    return <Outlet />;
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
    return <Navigate to="/login" state={{ from: destination }} replace />;
  }

  return <Outlet />;
}
