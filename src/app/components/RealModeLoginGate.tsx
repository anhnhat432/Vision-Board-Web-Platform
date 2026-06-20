import { ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface RealModeLoginGateProps {
  target: "12WeekSetup";
}

const TARGET_LOGIN_PATH: Record<RealModeLoginGateProps["target"], string> = {
  "12WeekSetup": "/login?next=%2F12-week-setup",
};

export function RealModeLoginGate({ target }: RealModeLoginGateProps) {
  useEffect(() => {
    toast.info("Bạn cần đăng nhập để bắt đầu kế hoạch 12 tuần và đồng bộ dữ liệu tài khoản.");
  }, []);

  return (
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center">
        <Card
          data-testid="real-mode-login-gate"
          className="w-full overflow-hidden border border-app-line bg-app-surface shadow-app-sm"
        >
          <CardContent className="stack-stack p-6 text-center sm:p-8 lg:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-app-accent text-white shadow-app-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="stack-tight">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Tài khoản</p>
              <h1 className="text-2xl font-semibold tracking-normal text-app-ink sm:text-3xl">Đăng nhập để bắt đầu</h1>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-app-ink-soft sm:text-base">
                Tài khoản giúp lưu kế hoạch 12 tuần và đồng bộ giữa các thiết bị. Bạn cần đăng nhập trước khi bắt đầu.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link to={TARGET_LOGIN_PATH[target]}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Đăng nhập với Google
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Quay về trang chính
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
