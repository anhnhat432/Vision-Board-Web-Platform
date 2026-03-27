import { CreditCard, Crown, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  cancelMockCheckoutSession,
  completeMockCheckoutSession,
  getMockBillingAccount,
  getMockCheckoutSession,
  resolveAppReturnPath,
} from "../utils/production";
import { getPaywallCopy, getPlanDefinition, getPlanLabel } from "../utils/twelve-week-premium";

export function MockBillingCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionId = searchParams.get("session") ?? "";
  const session = useMemo(() => getMockCheckoutSession(sessionId), [sessionId]);
  const existingAccount = useMemo(() => getMockBillingAccount(), []);

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

      if (!result.ok) {
        toast.error(result.message);
        navigate(result.returnUrl);
        return;
      }

      toast.success(result.message);
      navigate(result.returnUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="space-y-6 pb-12">
        <Card className="overflow-hidden border-0 gradient-dark-indigo text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.52)]">
          <CardContent className="p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Bản demo thanh toán</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em]">Phiên checkout này không còn hợp lệ.</h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-white/74">
              Có thể bạn đã hoàn tất, hủy phiên này trước đó, hoặc tab checkout đã mở quá lâu.
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
                Về bảng điều khiển
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
    <div className="space-y-8 pb-12">
      <Card className="overflow-hidden border-0 gradient-dark-indigo text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.52)]">
        <CardContent className="grid gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
              <CreditCard className="h-3.5 w-3.5" />
              Checkout mô phỏng
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-[-0.05em]">Xác nhận mở gói {plan.name}</h1>
              <p className="mt-3 max-w-2xl text-base leading-8 text-white/74">
                Đây là bước mô phỏng checkout để bạn test trọn flow nâng cấp, khôi phục quyền và quay lại app
                mà chưa cần nối backend thanh toán thật.
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

          <div className="rounded-[28px] border border-white/14 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Tóm tắt giao dịch</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[22px] border border-white/12 bg-black/12 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Gói sẽ mở</p>
                <p className="mt-2 text-3xl font-bold text-white">{plan.name}</p>
                <p className="mt-1 text-sm text-white/72">{plan.priceLabel}</p>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/8 p-4 text-sm text-white/72">
                {existingAccount ? (
                  <>
                    Thiết bị này đang có gói{" "}
                    <strong className="text-white">{getPlanLabel(existingAccount.planCode)}</strong>. Xác nhận tiếp sẽ
                    cập nhật lại trạng thái gói hiện tại.
                  </>
                ) : (
                  "Thiết bị này chưa có giao dịch mô phỏng nào trước đó."
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-0 gradient-violet shadow-[0_28px_70px_-40px_rgba(124,58,237,0.2)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Bạn sẽ mở được gì ngay sau khi xác nhận</CardTitle>
            <CardDescription className="text-slate-700">
              Bản demo sẽ tạo subscription mô phỏng, cấp quyền tương ứng và đồng bộ ngay về app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.highlights.map((feature) => (
              <div key={feature} className="flex gap-3 rounded-[20px] border border-white/70 bg-white/86 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <p className="text-sm leading-7 text-slate-700">{feature}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 gradient-white-panel shadow-[0_28px_70px_-40px_rgba(15,23,42,0.14)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Xác nhận bước mô phỏng</CardTitle>
            <CardDescription className="text-slate-600">
              Sau khi xác nhận, app sẽ quay lại màn trước đó và cập nhật trạng thái gói ngay trên thiết bị này.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gói sẽ được mở</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{getPlanLabel(session.planCode)}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nguồn gọi</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{session.source ?? "paywall_dialog"}</p>
            </div>
            <div className="grid gap-2">
              <Button className="w-full" onClick={handleConfirm} disabled={isSubmitting}>
                <Crown className="h-4 w-4" />
                {isSubmitting ? "Đang xác nhận..." : `Xác nhận mở ${plan.name}`}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleCancel} disabled={isSubmitting}>
                Hủy và quay lại
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
