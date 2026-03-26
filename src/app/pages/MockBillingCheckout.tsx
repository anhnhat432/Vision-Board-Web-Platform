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
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(49,46,129,0.92)_100%)] text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.52)]">
          <CardContent className="p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Mock provider</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em]">Phiên checkout này không còn hợp lệ.</h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-white/74">
              Có thể bạn đã hoàn tất, hủy phiên này trước đó, hoặc tab checkout được mở quá lâu.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="bg-white text-slate-900 hover:bg-white/92" onClick={() => navigate("/12-week-system?tab=settings")}>
                Quay về cài đặt gói
              </Button>
              <Button variant="outline" className="border-white/18 bg-white/10 text-white hover:bg-white/18" onClick={() => navigate("/")}>
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
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(49,46,129,0.92)_100%)] text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.52)]">
        <CardContent className="grid gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
              <CreditCard className="h-3.5 w-3.5" />
              Mock provider checkout
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-[-0.05em]">Xác nhận gói {plan.name}</h1>
              <p className="mt-3 max-w-2xl text-base leading-8 text-white/74">
                Đây là cổng thanh toán giả lập để bạn test end-to-end flow checkout, restore access và entitlement sync trước khi nối backend thật.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-white/15 bg-white/10 px-4 py-2 text-white">
                Context: {paywallCopy.title}
              </Badge>
              <Badge variant="outline" className="border-white/15 bg-white/10 px-4 py-2 text-white">
                Return: {returnPath}
              </Badge>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/14 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Tóm tắt giao dịch</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[22px] border border-white/12 bg-black/12 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/56">Gói đang mở</p>
                <p className="mt-2 text-3xl font-bold text-white">{plan.name}</p>
                <p className="mt-1 text-sm text-white/72">{plan.priceLabel}</p>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/8 p-4 text-sm text-white/72">
                {existingAccount ? (
                  <>
                    Tài khoản mock hiện có gói <strong className="text-white">{getPlanLabel(existingAccount.planCode)}</strong>. Xác nhận tiếp sẽ nâng hoặc ghi đè trạng thái này.
                  </>
                ) : (
                  "Chưa có giao dịch mock nào trước đó cho thiết bị này."
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-0 bg-[linear-gradient(180deg,_rgba(245,243,255,0.96)_0%,_rgba(237,233,254,0.86)_100%)] shadow-[0_28px_70px_-40px_rgba(124,58,237,0.2)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Bạn sẽ mở được gì ngay sau khi xác nhận</CardTitle>
            <CardDescription className="text-slate-700">
              Mock provider sẽ tạo subscription giả lập, cấp entitlement tương ứng và đồng bộ về app.
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

        <Card className="border-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(241,245,249,0.94)_100%)] shadow-[0_28px_70px_-40px_rgba(15,23,42,0.14)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Xác nhận mock checkout</CardTitle>
            <CardDescription className="text-slate-600">
              Sau khi xác nhận, app sẽ quay lại đường dẫn trước đó và trạng thái gói sẽ được cập nhật ngay.
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
