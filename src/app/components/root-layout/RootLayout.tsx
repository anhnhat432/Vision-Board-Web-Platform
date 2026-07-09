import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { useAuthContext } from "@/lib/auth/AuthContext";

const AppShellLayout = lazy(() =>
  import("./AppShellLayout").then((module) => ({
    default: module.RootLayout,
  })),
);

function AppShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-ink" role="status">
      <div className="w-full max-w-sm rounded-card border border-app-line bg-app-surface p-5 text-center shadow-app-sm">
        <p className="text-sm font-semibold">Đang mở ứng dụng...</p>
      </div>
    </div>
  );
}

function PublicLandingLayout() {
  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Bỏ qua điều hướng
      </a>
      <main id="main-content" aria-label="Nội dung trang">
        <Outlet />
      </main>
    </>
  );
}

export function RootLayout() {
  const location = useLocation();
  const { user } = useAuthContext();

  if (location.pathname === "/" && !user) {
    return <PublicLandingLayout />;
  }

  return (
    <Suspense fallback={<AppShellFallback />}>
      <AppShellLayout />
    </Suspense>
  );
}
