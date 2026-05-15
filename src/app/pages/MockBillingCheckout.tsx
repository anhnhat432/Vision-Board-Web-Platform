import { Crown, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getAppMode } from "../utils/app-mode";
import {
  cancelMockCheckoutSession,
  completeMockCheckoutSession,
  getBillingProviderStatus,
  getMockCheckoutSession,
  resolveAppReturnPath,
} from "../utils/production";
import { getPlanDefinition, getPlanLabel } from "../utils/twelve-week-premium";

export function MockBillingCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const appMode = getAppMode();
  const billingProviderMode = getBillingProviderStatus().mode;
  const sessionId = searchParams.get("session") ?? "";
  const session = useMemo(() => getMockCheckoutSession(sessionId), [sessionId]);

  if (appMode !== "demo" || billingProviderMode !== "mock_provider") {
    return <Navigate to="/billing/confirm" replace />;
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
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Phiên thanh toán này không còn hợp lệ.</CardTitle>
            <CardDescription>Có thể bạn đã hoàn tất, hủy phiên này trước đó, hoặc tab đã mở quá lâu.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/12-week-system?tab=settings")}>Quay về cài đặt gói</Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Về Trang chính
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = getPlanDefinition(session.planCode);

  return (
    <div className="stack-section pb-12">
      <div className="rounded-[var(--r-control)] border-2 border-amber-400 bg-amber-50 px-4 py-3">
        <p className="font-semibold text-amber-900">Thanh toán dùng thử</p>
        <p className="text-sm text-amber-800">
          Màn này chỉ dùng cho bản demo/preview, không xử lý khoản thu thật.
        </p>
      </div>

      <Card className="overflow-hidden border-0 gradient-dark-indigo text-white shadow-2xl">
        <CardContent className="grid gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-10">
          <div className="stack-stack">
            <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
              <Crown className="h-3.5 w-3.5" />
              Mở Plus demo
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-normal">Xác nhận mở gói {plan.name}</h1>
              <p className="mt-[var(--space-inline)] max-w-2xl text-base leading-8 text-white/74">
                Xác nhận để mở quyền Plus cho bản demo. Production sẽ dùng trang xác nhận thanh toán thật.
              </p>
            </div>
          </div>

          <div className="rounded-[var(--r-card)] border border-white/14 bg-white/10 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Tóm tắt nâng cấp</p>
            <p className="mt-2 text-3xl font-bold text-white">{getPlanLabel(session.planCode)}</p>
            <p className="mt-1 text-sm text-white/72">{plan.priceLabel}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 gradient-white-panel shadow-xl">
        <CardHeader>
          <CardTitle>Bạn sẽ mở được gì sau khi xác nhận</CardTitle>
          <CardDescription>Quyền Plus chỉ được mô phỏng trong môi trường demo/preview.</CardDescription>
        </CardHeader>
        <CardContent className="stack-stack">
          {plan.highlights.map((feature) => (
            <div key={feature} className="flex gap-3 rounded-[var(--r-tile)] border border-slate-200 bg-white px-4 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <p className="text-sm leading-7 text-slate-700">{feature}</p>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Đang mở gói..." : "Xác nhận mở gói"}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Huỷ bỏ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
