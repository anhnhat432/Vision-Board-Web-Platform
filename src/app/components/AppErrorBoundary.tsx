import { AlertTriangle, Home, RefreshCw, Sparkles } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === "string" && error.data.trim()) return error.data;
    return error.statusText || "Đã có lỗi xảy ra khi tải trang này.";
  }

  if (error instanceof Error) {
    return error.message || "Ứng dụng vừa gặp lỗi ngoài dự kiến.";
  }

  return "Ứng dụng vừa gặp lỗi ngoài dự kiến.";
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

  return (
    <div className="app-shell min-h-screen" data-route-tone="system">
      <div className="cursor-glow" />
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="ambient-orb ambient-orb--rose" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="hero-surface w-full overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Sparkles className="h-4 w-4" />
                  Dear Our Future
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Trang này vừa gặp lỗi, nhưng mình vẫn có thể quay lại flow chính ngay.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Mình đã chặn màn lỗi mặc định để trải nghiệm đỡ gắt hơn. Bạn có thể tải lại trang
                    hoặc quay về bảng điều khiển rồi tiếp tục từ đó.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="hero-cta border-white/18 bg-white text-slate-900 hover:bg-white/92"
                    onClick={() => navigate("/")}
                  >
                    <Home className="h-4 w-4" />
                    Về bảng điều khiển
                  </Button>
                  <Button
                    variant="secondary"
                    className="border-white/18 bg-white/12 text-white hover:bg-white/18"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại trang
                  </Button>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14 text-white">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                      Trạng thái
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {errorCode ? `Lỗi ${errorCode}` : "Lỗi runtime"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-white/12 bg-black/12 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                    Mô tả
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/82">{errorMessage}</p>
                </div>

                {import.meta.env.DEV && error instanceof Error ? (
                  <div className="mt-4 rounded-[24px] border border-white/12 bg-black/18 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                      Chi tiết dev
                    </p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-white/72">
                      {error.stack || error.message}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
