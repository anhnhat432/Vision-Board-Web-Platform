import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { AlertTriangle, Loader2, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useAuthContext } from "@/lib/auth/AuthContext";

function AdminStatusCard({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <Card className="w-full max-w-md border-white/10 bg-white/[0.06] shadow-[0_30px_90px_-50px_rgba(15,23,42,0.75)] backdrop-blur">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            {icon}
          </div>
          <h1 className="mt-5 text-xl font-bold text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    authLoading,
    isConfigured,
    logout,
    refreshUserProfile,
    user,
    userProfile,
    userProfileError,
    userProfileLoading,
  } = useAuthContext();
  const destination = `${location.pathname}${location.search}${location.hash}`;
  const loginPath = `/login?next=${encodeURIComponent(destination)}`;

  if (!isConfigured) {
    return (
      <AdminStatusCard
        icon={<AlertTriangle className="h-7 w-7 text-amber-300" />}
        title="Chưa cấu hình đăng nhập"
        description="Admin console cần Firebase Auth và backend production để kiểm soát hệ thống."
      />
    );
  }

  if (authLoading) {
    return (
      <AdminStatusCard
        icon={<Loader2 className="h-7 w-7 animate-spin text-slate-300" />}
        title="Đang kiểm tra đăng nhập"
        description="Hệ thống đang xác thực phiên admin hiện tại."
      />
    );
  }

  if (!user) {
    return <Navigate to={loginPath} state={{ from: destination }} replace />;
  }

  if (userProfileLoading) {
    return (
      <AdminStatusCard
        icon={<Loader2 className="h-7 w-7 animate-spin text-slate-300" />}
        title="Đang tải quyền admin"
        description="Backend đang kiểm tra profile và role của tài khoản này."
      />
    );
  }

  if (!userProfile) {
    return (
      <AdminStatusCard
        icon={<AlertTriangle className="h-7 w-7 text-amber-300" />}
        title="Không tải được profile"
        description={
          userProfileError ||
          "Không thể tải profile admin. Kiểm tra Render backend đã deploy và biến ADMIN_EMAILS đã set đúng email admin."
        }
        action={
          <Button type="button" variant="secondary" className="gap-2" onClick={refreshUserProfile}>
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </Button>
        }
      />
    );
  }

  if (userProfile.role !== "admin") {
    return (
      <AdminStatusCard
        icon={<AlertTriangle className="h-7 w-7 text-rose-300" />}
        title="Không có quyền admin"
        description="Tài khoản này không nằm trong ADMIN_EMAILS trên Render, hoặc profile chưa được refresh sau khi bạn set env."
        action={
          <>
            <Button type="button" variant="secondary" className="gap-2" onClick={refreshUserProfile}>
              <RefreshCw className="h-4 w-4" />
              Cập nhật quyền
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => void logout()}
            >
              Đăng xuất
            </Button>
          </>
        }
      />
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login?next=/admin/orders", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Dear Our Future Admin</p>
              <p className="truncate text-xs text-slate-400">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="hidden text-slate-300 hover:bg-white/10 hover:text-white sm:inline-flex"
              onClick={() => navigate("/admin/orders")}
            >
              Vận hành
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
