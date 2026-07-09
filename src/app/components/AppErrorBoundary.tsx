import { type ComponentType, type LazyExoticComponent, lazy, Suspense, useEffect } from "react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";

import { captureFrontendException } from "@/lib/monitoring/sentry";
import { CelebrationBurst } from "./illustrations";

type DeferredIconProps = {
  className?: string;
};

type DeferredIconComponent = LazyExoticComponent<ComponentType<DeferredIconProps>>;

const AlertTriangleIcon = lazy(async (): Promise<{ default: ComponentType<DeferredIconProps> }> => {
  const { AlertTriangle } = await import("lucide-react");
  return {
    default: ({ className }) => <AlertTriangle aria-hidden="true" className={className} />,
  };
});

const HomeIcon = lazy(async (): Promise<{ default: ComponentType<DeferredIconProps> }> => {
  const { Home } = await import("lucide-react");
  return {
    default: ({ className }) => <Home aria-hidden="true" className={className} />,
  };
});

const RefreshCwIcon = lazy(async (): Promise<{ default: ComponentType<DeferredIconProps> }> => {
  const { RefreshCw } = await import("lucide-react");
  return {
    default: ({ className }) => <RefreshCw aria-hidden="true" className={className} />,
  };
});

const SparklesIcon = lazy(async (): Promise<{ default: ComponentType<DeferredIconProps> }> => {
  const { Sparkles } = await import("lucide-react");
  return {
    default: ({ className }) => <Sparkles aria-hidden="true" className={className} />,
  };
});

function DeferredIcon({ icon: Icon, className }: { icon: DeferredIconComponent; className: string }) {
  return (
    <Suspense fallback={<span aria-hidden="true" className={`inline-block ${className}`} />}>
      <Icon className={className} />
    </Suspense>
  );
}

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return "Không tìm thấy trang này. Kiểm tra lại đường dẫn hoặc quay về Trang chính để tiếp tục.";
    }

    if (error.status === 401) {
      return "Bạn cần đăng nhập lại để tiếp tục. Nếu vừa đăng nhập, hãy tải lại trang.";
    }

    if (error.status === 403) {
      return "Tài khoản này chưa có quyền truy cập trang này. Hãy quay về Trang chính để tiếp tục.";
    }

    if (error.status >= 500) {
      return "Trang đang gặp sự cố tạm thời. Hãy tải lại trang hoặc quay về Trang chính; lỗi đã được ghi nhận để xử lý.";
    }

    return "Yêu cầu này chưa thể hoàn tất. Hãy kiểm tra lại thao tác hoặc quay về Trang chính để tiếp tục.";
  }

  if (error instanceof Error) {
    return "Trang đang gặp sự cố tạm thời. Hãy tải lại trang hoặc quay về Trang chính để tiếp tục.";
  }

  return "Trang đang gặp sự cố tạm thời. Hãy tải lại trang hoặc quay về Trang chính để tiếp tục.";
}

function getErrorCode(error: unknown): string | null {
  if (isRouteErrorResponse(error)) return String(error.status);
  return null;
}

export function AppErrorBoundary() {
  const navigate = useNavigate();
  const error = useRouteError();
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error);

  useEffect(() => {
    if (isRouteErrorResponse(error) && error.status < 500) return;

    captureFrontendException(error, {
      boundary: "AppErrorBoundary",
      routeErrorCode: errorCode,
      pathname: window.location.pathname,
    });
  }, [error, errorCode]);

  return (
    <div className="min-h-screen bg-app-bg">
      <main className="relative mx-auto flex min-h-screen max-w-5xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-sm">
          <div className="relative p-8 lg:p-10">
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-app-line bg-app-accent-soft px-4 py-1.5 text-sm text-app-accent">
                  <DeferredIcon icon={SparklesIcon} className="h-4 w-4 text-app-accent" />
                  Dear Our Future
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-app-ink sm:text-4xl lg:text-5xl">
                    Trang này vừa gặp lỗi, nhưng mình vẫn có thể{" "}
                    <span className="text-app-accent">quay lại flow chính</span> ngay.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-app-ink-soft">
                    Mình đã chặn màn lỗi mặc định để trải nghiệm đỡ gắt hơn. Bạn có thể tải lại trang hoặc quay về Trang
                    chính rồi tiếp tục từ đó.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--r-control)] bg-app-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
                    onClick={() => navigate("/")}
                  >
                    <DeferredIcon icon={HomeIcon} className="h-4 w-4" />
                    Về Trang chính
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--r-control)] border border-app-line bg-transparent px-4 py-2 text-sm font-semibold text-app-ink transition-colors hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
                    onClick={() => window.location.reload()}
                  >
                    <DeferredIcon icon={RefreshCwIcon} className="h-4 w-4" />
                    Tải lại trang
                  </button>
                </div>
              </div>

              <div className="rounded-card border border-app-line bg-app-surface p-6 shadow-app-sm">
                <CelebrationBurst className="mx-auto mb-4 w-32 text-app-accent opacity-60" />
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-tile)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]">
                    <DeferredIcon icon={AlertTriangleIcon} className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Trạng thái
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {errorCode ? `Lỗi ${errorCode}` : "Trang gặp lỗi ngoài dự kiến"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-card border border-app-line bg-app-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Mô tả</p>
                  <p className="mt-2 text-sm leading-7 text-app-ink">{errorMessage}</p>
                </div>

                {import.meta.env.DEV && error instanceof Error ? (
                  <div className="mt-4 rounded-card border border-app-line bg-app-bg p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Chi tiết dev</p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-app-ink-soft">
                      {error.stack || error.message}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
