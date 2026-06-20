import { AlertTriangle, Loader2, LogOut, RefreshCw } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Sheet, SheetContent } from "../ui/sheet";
import { AdminPendingCountsProvider, useAdminPendingCounts } from "./AdminPendingCountsContext";
import { AdminSearchProvider } from "./AdminSearchContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

function AdminStatusCard({
  action,
  description,
  icon,
  secondaryAction,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10 text-app-ink">
      <Card
        className="w-full max-w-md border-app-line text-app-ink shadow-lg backdrop-blur"
        style={{ backgroundColor: "var(--app-surface)" }}
      >
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-ink">
            {icon}
          </div>
          <h1 className="mt-5 text-xl font-bold text-app-ink">{title}</h1>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-app-ink-soft">{description}</p>
          {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
          {secondaryAction ? <div className="mt-3 flex flex-wrap justify-center gap-3">{secondaryAction}</div> : null}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const destination = `${location.pathname}${location.search}${location.hash}`;
  const loginPath = `/login?next=${encodeURIComponent(destination)}`;

  if (!isConfigured) {
    return (
      <AdminStatusCard
        icon={<AlertTriangle className="h-7 w-7 text-amber-300" />}
        title="Chưa cấu hình đăng nhập"
        description="Trang quản trị cần đăng nhập và máy chủ sản xuất để kiểm soát hệ thống."
      />
    );
  }

  if (authLoading) {
    return (
      <AdminStatusCard
        icon={<Loader2 className="h-7 w-7 animate-spin text-app-ink-soft" />}
        title="Đang kiểm tra đăng nhập"
        description="Hệ thống đang xác thực phiên quản trị hiện tại."
      />
    );
  }

  if (!user) {
    return <Navigate to={loginPath} state={{ from: destination }} replace />;
  }

  if (userProfileLoading) {
    return (
      <AdminStatusCard
        icon={<Loader2 className="h-7 w-7 animate-spin text-app-ink-soft" />}
        title="Đang tải quyền quản trị"
        description="Hệ thống đang kiểm tra hồ sơ và vai trò của tài khoản này."
      />
    );
  }

  if (!userProfile) {
    return (
      <AdminStatusCard
        icon={<AlertTriangle className="h-7 w-7 text-amber-300" />}
        title="Không tải được hồ sơ"
        description={
          userProfileError ||
          "Không thể tải hồ sơ quản trị. Kiểm tra máy chủ đã sẵn sàng và quyền quản trị đã được cấu hình."
        }
        action={
          <Button type="button" variant="secondary" className="gap-2" onClick={refreshUserProfile}>
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </Button>
        }
        secondaryAction={
          <Button
            type="button"
            variant="ghost"
            className="gap-2 text-app-ink-soft hover:bg-app-accent-soft hover:text-app-ink"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        }
      />
    );
  }

  if (userProfile.role !== "admin") {
    return (
      <AdminStatusCard
        icon={<AlertTriangle className="h-7 w-7 text-rose-300" />}
        title="Không có quyền quản trị"
        description="Tài khoản này chưa có quyền quản trị, hoặc hồ sơ chưa được làm mới sau khi bạn cập nhật quyền."
        action={
          <>
            <Button type="button" variant="secondary" className="gap-2" onClick={refreshUserProfile}>
              <RefreshCw className="h-4 w-4" />
              Cập nhật quyền
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-app-line-strong bg-transparent text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
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
    navigate("/login?next=/admin/dashboard", { replace: true });
  };

  return (
    <AdminPendingCountsProvider>
      <AdminSearchProvider>
        <AdminLayoutShell
          email={userProfile.email}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          onLogout={() => void handleLogout()}
        />
      </AdminSearchProvider>
    </AdminPendingCountsProvider>
  );
}

function AdminLayoutShell({
  email,
  mobileOpen,
  onMobileOpenChange,
  onLogout,
}: {
  email: string;
  mobileOpen: boolean;
  onMobileOpenChange: (next: boolean) => void;
  onLogout: () => void;
}) {
  const { counts } = useAdminPendingCounts();
  const pendingCounts = {
    "/admin/orders": counts.orders,
    "/admin/payments": counts.payments,
    "/admin/refunds": counts.refunds,
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-ink">
      <div className="flex min-h-screen">
        <div className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-0 h-screen">
            <AdminSidebar email={email} onLogout={onLogout} pendingCounts={pendingCounts} />
          </div>
        </div>

        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent side="left" className="w-72 border-r border-app-line bg-app-bg p-0 text-app-ink">
            <AdminSidebar
              email={email}
              onLogout={onLogout}
              onNavigate={() => onMobileOpenChange(false)}
              pendingCounts={pendingCounts}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar onOpenSidebar={() => onMobileOpenChange(true)} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
