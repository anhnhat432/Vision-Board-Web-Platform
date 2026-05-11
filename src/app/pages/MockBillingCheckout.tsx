import { CreditCard, Crown, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { BillingPlusIllustration } from "../components/illustrations";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getAppMode } from "../utils/app-mode";
import {
  cancelMockCheckoutSession,
  completeMockCheckoutSession,
  getBillingProviderStatus,
  getMockBillingAccount,
  getMockCheckoutSession,
  resolveAppReturnPath,
} from "../utils/production";
import { getPaywallCopy, getPlanDefinition, getPlanLabel } from "../utils/twelve-week-premium";

export function MockBillingCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const appMode = getAppMode();
  const billingProviderMode = getBillingProviderStatus().mode;
  const sessionId = searchParams.get("session") ?? "";
  const session = useMemo(() => getMockCheckoutSession(sessionId), [sessionId]);
  const existingAccount = useMemo(() => getMockBillingAccount(), []);

  if (appMode !== "demo" && billingProviderMode !== "mock_provider") {
    return <Navigate to="/billing/plan" replace />;
  }

  const returnPath = resolveAppReturnPath(session?.returnUrl);

  const handleCancel = () => {
    if (sessionId) {
      cancelMockCheckoutSession(sessionId);
    }
    navigate(returnPath);
  };

  const handleConfirm = () => {
    setIsSubmitting(true);

    try {
      const result = completeMockCheckoutSession(sessionId);
      const resolvedReturnPath = resolveAppReturnPath(session?.returnUrl ?? result.returnUrl);

      if (!result.ok) {
        toast.error(result.message);
        navigate(resolvedReturnPath);
        return;
      }

      toast.success(result.message);
      navigate(resolvedReturnPath);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="stack-section pb-12">
        {/* Demo banner */}
        <div className="rounded-[var(--r-control)] border-2 border-amber-400 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-amber-200">
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <p className="font-semibold text-amber-900">Bản dùng thử thanh toán</p>
              <p className="text-sm text-amber-800">
                Không có khoản thanh toán nào được xử lý trên màn này.
              </p>
            </div>
          </div>
        </div>
        <Card className="overflow-hidden border-0 gradient-dark-indigo text-white shadow-2xl">
          <CardContent className="p-8 lg:p-10">
            <BillingPlusIllustration className="mb-4 w-28 text-white opacity-50" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Thanh toán dùng thử</p>
            <h1 className="mt-[var(--space-inline)] text-4xl font-bold tracking-normal">Phiên thanh toán này không còn hợp lệ.</h1>
            <p className="mt-[var(--space-inline)] max-w-2xl text-base leading-8 text-white/74">
              Có thể bạn đã hoàn tất, hủy phiên này trước đó, hoặc tab đã mở quá lâu.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="hero-cta bg-white text-slate-900 hover:bg-white/92"
                onClick={() => navigate("/12-week-system?tab=settings")}
              >
                Quay về cài đặt gói
              </Button>
              <Button
                variant="outline"
                className="border-white/18 bg-white/10 text-white hover:bg-white/18"
                onClick={() => navigate("/")}
              >
                Về Trang chính
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = getPlanDefinition(session.planCode);
  const paywallCopy = getPaywallCopy(session.context);

  return (
    <div className="stack-section pb-12">
      {/* Demo banner */}
      <div className="rounded-[var(--r-control)] border-2 border-amber-400 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-amber-200">
            <span className="text-lg">⚡</span>
          </div>
          <div>
            <p className="font-semibold text-amber-900">Bản dùng thử thanh toán</p>
            <p className="text-sm text-amber-800">
              Không có khoản thanh toán nào được xử lý. Gói chỉ được mở trên trình duyệt này.
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-0 gradient-dark-indigo text-white shadow-2xl">
        <CardContent className="grid gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-10">
          <div className="stack-stack">
            <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
              <CreditCard className="h-3.5 w-3.5" />
              Thanh toán dùng thử
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-normal">Xác nhận mở gói {plan.name}</h1>
              <p className="mt-[var(--space-inline)] max-w-2xl text-base leading-8 text-white/74">
                Xác nhận để mở quyền Plus trên trình duyệt này. Không cần thẻ và không xử lý khoản thu thật.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-white/15 bg-white/10 px-4 py-2 text-white">
                Ngữ cảnh: {paywallCopy.title}
              </Badge>
              <Badge variant="outline" className="border-white/15 bg-white/10 px-4 py-2 text-white">
                Quay lại: {returnPath}
              </Badge>
            </div>
          </div>

          <div className="rounded-[var(--r-card)] border border-white/14 bg-white/10 p-5 shadow-sm">
            <BillingPlusIllustration className="mb-3 w-24 text-white opacity-55" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Tóm tắt nâng cấp</p>
            <div className="mt-4 stack-stack">
              <div className="rounded-[var(--r-card)] border border-white/12 bg-black/12 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Gói sẽ mở</p>
                <p className="mt-2 text-3xl font-bold text-white">{plan.name}</p>
                <p className="mt-1 text-sm text-white/72">{plan.priceLabel}</p>
              </div>
              <div className="rounded-[var(--r-card)] border border-white/12 bg-white/8 p-4 text-sm text-white/72">
                {existingAccount ? (
                  <>
                    Thiết bị này đang có gói{" "}
                    <strong className="text-white">{getPlanLabel(existingAccount.planCode)}</strong>. Xác nhận tiếp sẽ
                    cập nhật lại trạng thái gói hiện tại.
                  </>
                ) : (
                  "Thiết bị này chưa có gói Plus trước đó."
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-0 gradient-violet shadow-xl">
          <CardHeader>
            <CardTitle className="text-slate-950">Bạn sẽ mở được gì ngay sau khi xác nhận</CardTitle>
            <CardDescription className="text-slate-700">
              Bản dùng thử chỉ cập nhật trạng thái gói và quyền trên trình duyệt này.
            </CardDescription>
          </CardHeader>
          <CardContent className="stack-tight">
            {plan.highlights.map((feature) => (
              <div key={feature} className="flex gap-3 rounded-[var(--r-tile)] border border-white/70 bg-white/86 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <p className="text-sm leading-7 text-slate-700">{feature}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 gradient-white-panel shadow-xl">
          <CardHeader>
            <CardTitle className="text-slate-950">Xác nhận mở gói</CardTitle>
            <CardDescription className="text-slate-600">
              Sau khi xác nhận, web sẽ quay lại màn trước đó và cập nhật trạng thái Plus trên thiết bị này. Không có
              khoản thu thật trên màn dùng thử.
            </CardDescription>
          </CardHeader>
          <CardContent className="stack-stack">
            <div className="rounded-[var(--r-card)] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gói sẽ được mở</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{getPlanLabel(session.planCode)}</p>
            </div>
            <div className="rounded-[var(--r-card)] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nguồn yêu cầu</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{session.source === "paywall_dialog" || !session.source ? "Từ màn nâng cấp" : session.source === "settings" ? "Từ cài đặt" : session.source === "12_week_setup" ? "Từ thiết lập 12 tuần" : "Khác"}</p>
            </div>
            <div className="grid gap-2">
              <Button className="w-full" onClick={handleConfirm} disabled={isSubmitting}>
                <Crown className="h-4 w-4" />
                {isSubmitting ? "Đang mở gói..." : "Xác nhận mở gói"}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleCancel} disabled={isSubmitting}>
                Huỷ bỏ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
