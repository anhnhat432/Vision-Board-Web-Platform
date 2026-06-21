import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { isRealMode } from "@/app/utils/app-mode";
import { ENV_DISCOUNT_PERCENT } from "@/app/utils/billing-pricing";
import { apiClient, isRateLimitError } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { useOrderCatalog } from "@/features/order/hooks/useOrderCatalog";
import {
  buildOrderLines,
  calcShipping,
  calcSubtotal,
  calcTotal,
  formatVnd,
  type OrderDraft,
} from "@/features/order/lib/pricing";
import { type ValidateErrorKey, validateOrderDraft } from "@/features/order/lib/validators";
import { createLocalOrder, type LocalOrderDiscount } from "@/features/order/storage/order";
import { saveOrderLink } from "@/lib/api/orderLinkStore";
import { createOrder } from "@/services/orderService";

import { FrameSizePicker } from "../components/FrameSizePicker";
import { NotesField, type NotesFieldValue } from "../components/NotesField";
import { OrderHero } from "../components/OrderHero";
import { OrderProgressBar } from "../components/OrderProgressBar";
import { OrderSummary } from "../components/OrderSummary";
import { ShippingForm, type ShippingFormValue } from "../components/ShippingForm";
import { StepCard } from "../components/StepCard";
import { StickerAddon } from "../components/StickerAddon";
import { ThemePicker } from "../components/ThemePicker";
import { BillingDiscountSection } from "@/features/billing/BillingDiscountSection";
import type { DiscountInfo } from "@/features/billing/useCouponValidation";


interface OrderSaleEventInfo {
  active: boolean;
  id?: string;
  code?: string;
  name?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  originalAmount?: number;
  finalAmount?: number;
}

function safeFinalAmount(originalAmount: number, discountAmount: number): number {
  return discountAmount > 0 ? Math.max(originalAmount - discountAmount, 1000) : originalAmount;
}

function discountAmountFromInfo(discount: DiscountInfo | null, originalAmount: number): number {
  if (!discount || originalAmount <= 0) return 0;
  if (discount.minAmount !== undefined && originalAmount < discount.minAmount) return 0;
  if (discount.discountType === "percentage" && Number.isFinite(discount.discountValue)) {
    return Math.round(originalAmount * (discount.discountValue ?? 0) / 100);
  }
  if (discount.discountType === "fixed" && Number.isFinite(discount.discountValue)) {
    return Math.min(discount.discountValue ?? 0, originalAmount);
  }
  if (Number.isFinite(discount.discountPercent)) {
    return Math.round(originalAmount * (discount.discountPercent ?? 0) / 100);
  }
  return Number.isFinite(discount.discountAmount) ? Math.max(0, discount.discountAmount ?? 0) : 0;
}

function discountAmountFromSaleEvent(saleEvent: OrderSaleEventInfo | null, originalAmount: number): number {
  if (!saleEvent?.active || originalAmount <= 0) return 0;
  if (Number.isFinite(saleEvent.discountAmount)) return Math.max(0, saleEvent.discountAmount ?? 0);
  if (saleEvent.discountType === "percentage" && Number.isFinite(saleEvent.discountValue)) {
    return Math.round(originalAmount * (saleEvent.discountValue ?? 0) / 100);
  }
  if (saleEvent.discountType === "fixed" && Number.isFinite(saleEvent.discountValue)) {
    return Math.min(saleEvent.discountValue ?? 0, originalAmount);
  }
  return 0;
}

function buildCouponOrderDiscount(discount: DiscountInfo | null, originalAmount: number): LocalOrderDiscount | undefined {
  const discountAmount = discountAmountFromInfo(discount, originalAmount);
  if (!discount || discountAmount <= 0 || originalAmount - discountAmount < 1000) return undefined;
  return {
    source: "coupon",
    discountCode: discount.discountCode,
    discountId: discount.discountId,
    discountName: discount.discountName,
    discountPercent: discount.discountPercent,
    discountType: discount.discountType,
    discountAmount,
    originalAmount,
    finalAmount: safeFinalAmount(originalAmount, discountAmount),
  };
}

function buildSaleOrderDiscount(saleEvent: OrderSaleEventInfo | null, originalAmount: number): LocalOrderDiscount | undefined {
  const discountAmount = discountAmountFromSaleEvent(saleEvent, originalAmount);
  if (!saleEvent?.active || discountAmount <= 0) return undefined;
  return {
    source: "sale_event",
    discountCode: saleEvent.code,
    discountId: saleEvent.id,
    discountName: saleEvent.name,
    discountPercent: saleEvent.discountType === "percentage" ? saleEvent.discountValue : undefined,
    discountType: saleEvent.discountType,
    discountAmount,
    originalAmount,
    finalAmount: saleEvent.finalAmount ?? safeFinalAmount(originalAmount, discountAmount),
  };
}

function buildEnvFallbackDiscount(hasSaleEvent: boolean, originalAmount: number): LocalOrderDiscount | undefined {
  if (hasSaleEvent || !ENV_DISCOUNT_PERCENT || originalAmount <= 0) return undefined;
  const discountAmount = Math.round(originalAmount * ENV_DISCOUNT_PERCENT / 100);
  if (discountAmount <= 0) return undefined;
  return {
    source: "env_fallback",
    discountPercent: ENV_DISCOUNT_PERCENT,
    discountType: "percentage",
    discountAmount,
    originalAmount,
    finalAmount: safeFinalAmount(originalAmount, discountAmount),
  };
}

function pickBestOrderDiscount(
  coupon: LocalOrderDiscount | undefined,
  automatic: LocalOrderDiscount | undefined,
): LocalOrderDiscount | undefined {
  if (!coupon) return automatic;
  if (!automatic) return coupon;
  return coupon.discountAmount >= automatic.discountAmount ? coupon : automatic;
}

function mapSaleEventForDiscountSection(saleEvent: OrderSaleEventInfo | null) {
  if (!saleEvent?.active) return null;
  return {
    name: saleEvent.name ?? "Ưu đãi đang áp dụng",
    discountPercent: saleEvent.discountType === "percentage" ? saleEvent.discountValue : undefined,
    discountValue: saleEvent.discountType === "fixed" ? saleEvent.discountValue : undefined,
    discountType: saleEvent.discountType,
    discountAmount: saleEvent.discountAmount,
    finalAmount: saleEvent.finalAmount,
  };
}

const FIELD_LABELS: Record<ValidateErrorKey, string> = {
  frame: "kích thước khung",
  themes: "set ảnh chủ đề",
  sticker: "sticker",
  fullName: "họ tên",
  email: "email",
  phone: "số điện thoại",
  shippingAddress: "địa chỉ",
  catalog: "sản phẩm",
};

export function OrderPage() {
  const navigate = useNavigate();
  const { catalog, isLoading, isFromFallback } = useOrderCatalog();
  const [draft, setDraft] = useState<OrderDraft>({
    frameItemId: null,
    themeItemIds: [],
    stickerSelection: null,
  });
  const [shipping, setShipping] = useState<ShippingFormValue>({
    fullName: "",
    email: "",
    phone: "",
    shippingAddress: "",
    goalId: null,
    goalTitle: "",
  });
  const [notes, setNotes] = useState<NotesFieldValue>({ keywords: [], note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingLocalOrderId, setPendingLocalOrderId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<ValidateErrorKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<DiscountInfo | null>(null);
  const [saleEvent, setSaleEvent] = useState<OrderSaleEventInfo | null>(null);

  const { user } = useAuthContext();
  const emailVerified = isRealMode() ? (user?.emailVerified ?? false) : true;

  const frames = useMemo(() => catalog.filter((i) => i.type === "frame"), [catalog]);
  const themes = useMemo(() => catalog.filter((i) => i.type === "theme"), [catalog]);
  const sticker = useMemo(() => catalog.find((i) => i.type === "sticker") ?? null, [catalog]);

  const lines = useMemo(() => buildOrderLines(draft, catalog), [draft, catalog]);
  const subtotal = calcSubtotal(lines);
  const shippingCost = calcShipping(draft);
  const total = calcTotal(subtotal, shippingCost);
  const couponOrderDiscount = buildCouponOrderDiscount(couponDiscount, total);
  const saleOrderDiscount = buildSaleOrderDiscount(saleEvent, total);
  const envFallbackDiscount = buildEnvFallbackDiscount(Boolean(saleOrderDiscount), total);
  const orderDiscount = pickBestOrderDiscount(couponOrderDiscount, saleOrderDiscount ?? envFallbackDiscount);
  const orderTotal = orderDiscount?.finalAmount ?? total;
  const discountSectionSaleEvent = mapSaleEventForDiscountSection(saleEvent);
  const validation = validateOrderDraft({ draft, shipping, catalog });

  useEffect(() => {
    if (!Number.isFinite(total) || total <= 0) {
      setSaleEvent(null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ purpose: "physical_order", amount: String(total) });

    apiClient
      .get<OrderSaleEventInfo & { active: boolean }>(`/billing/active-sale-event?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setSaleEvent(data.active ? data : null);
      })
      .catch(() => {
        if (!cancelled) setSaleEvent(null);
      });

    return () => {
      cancelled = true;
    };
  }, [total]);

  function shouldShowError(key: ValidateErrorKey): boolean {
    return submitAttempted || Boolean(touched[key]);
  }

  function markTouched(key: ValidateErrorKey) {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }

  const errorMap = validation.ok ? {} : validation.errors;
  const visibleShippingErrors = (Object.keys(errorMap) as ValidateErrorKey[])
    .filter((k) => ["fullName", "email", "phone", "shippingAddress"].includes(k))
    .filter((k) => shouldShowError(k))
    .reduce<Partial<Record<keyof ShippingFormValue, string>>>((acc, k) => {
      acc[k as keyof ShippingFormValue] = errorMap[k];
      return acc;
    }, {});

  const missingFields = !validation.ok
    ? (Object.keys(validation.errors) as ValidateErrorKey[]).map((k) => FIELD_LABELS[k])
    : [];

  const completedSteps: number[] = [];
  if (draft.frameItemId) completedSteps.push(1);
  if (draft.themeItemIds.length > 0) completedSteps.push(2);
  completedSteps.push(3); // sticker optional
  const shippingFieldsOk =
    validation.ok || !(["fullName", "email", "phone", "shippingAddress"] as const).some((k) => k in errorMap);
  if (shippingFieldsOk && shipping.fullName && shipping.email && shipping.phone && shipping.shippingAddress) {
    completedSteps.push(4);
  }
  completedSteps.push(5); // notes optional

  const currentStep = [1, 2, 3, 4, 5].find((s) => !completedSteps.includes(s)) ?? 5;

  const REQUIRED_STEPS = [1, 2, 4] as const;
  const requiredDone = REQUIRED_STEPS.filter((s) => completedSteps.includes(s)).length;
  const progressPercent = Math.round((requiredDone / REQUIRED_STEPS.length) * 100);

  const selectedFrame = frames.find((f) => f.itemId === draft.frameItemId) ?? null;
  const selectedThemes = themes.filter((t) => draft.themeItemIds.includes(t.itemId));
  const selectedSticker = draft.stickerSelection ? sticker : null;

  function scrollToStep(step: number) {
    const el = document.getElementById(`step-${step}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function statusFor(step: number): "pending" | "current" | "done" {
    if (completedSteps.includes(step) && step !== currentStep) return "done";
    if (step === currentStep) return "current";
    return "pending";
  }

  function extractApiErrorMessage(err: unknown): string {
    if (isRateLimitError(err)) {
      return "Hệ thống đang bận, vui lòng thử lại sau giây lát.";
    }
    const e = err as { status?: number; message?: unknown };
    if (e.status === 401 || e.status === 403) {
      return "Bạn không có quyền hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (e.status !== undefined && e.status >= 500) {
      return "Máy chủ đang gặp sự cố. Đơn của bạn đã được lưu cục bộ, có thể thử lại sau.";
    }
    if (e.message && typeof e.message === "string" && e.message.length < 80 && e.status !== undefined) {
      return e.message;
    }
    return "Không thể gửi đơn lên máy chủ. Vui lòng thử lại.";
  }

  const handleCouponChange = useCallback((discount: DiscountInfo | null) => {
    setCouponDiscount(discount);
    try {
      if (discount?.discountCode) {
        sessionStorage.setItem("order:couponCode", discount.discountCode);
      } else {
        sessionStorage.removeItem("order:couponCode");
      }
    } catch {
      // noop: sessionStorage can be unavailable in private/embedded browsers.
    }
  }, []);

  function buildOrderPayload() {
    return {
      itemIds: [...(draft.frameItemId ? [draft.frameItemId] : []), ...draft.themeItemIds],
      sticker: draft.stickerSelection,
      fullName: shipping.fullName,
      email: shipping.email,
      phone: shipping.phone,
      shippingAddress: shipping.shippingAddress,
      goalId: shipping.goalId,
      goalTitle: shipping.goalTitle,
      keywords: notes.keywords,
      note: notes.note,
      ...(couponDiscount?.discountCode ? { couponCode: couponDiscount.discountCode } : {}),
    };
  }

  function isOfflineError(err: unknown): boolean {
    return (err as { status?: number }).status === undefined;
  }

  function handleBackendError(err: unknown) {
    setSubmitError(extractApiErrorMessage(err));
    setSubmitting(false);
  }

  function navigateToOrderStatus(orderId: string) {
    navigate(`/order-status/${orderId}`);
  }

  function handlePlaceOrder() {
    if (!validation.ok) {
      setSubmitAttempted(true);
      return;
    }
    setSubmitError(null);

    if (!emailVerified) {
      setSubmitError(
        "Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực email trước khi đặt đơn.",
      );
      return;
    }

    setShowConfirmDialog(true);
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    let order: ReturnType<typeof createLocalOrder>;
    try {
      order = createLocalOrder({
        lines,
        subtotalVnd: subtotal,
        shippingVnd: shippingCost,
        totalVnd: orderTotal,
        discount: orderDiscount,
        fullName: shipping.fullName,
        email: shipping.email,
        phone: shipping.phone,
        shippingAddress: shipping.shippingAddress,
        goalId: shipping.goalId,
        goalTitle: shipping.goalTitle,
        keywords: notes.keywords,
        note: notes.note,
      });
    } catch {
      setSubmitError("Không thể tạo đơn lúc này. Vui lòng thử lại.");
      setSubmitting(false);
      setShowConfirmDialog(false);
      return;
    }

    setPendingLocalOrderId(order.id);

    const payload = buildOrderPayload();
    try {
      const backendOrder = await createOrder(payload);
      saveOrderLink(order.id, backendOrder.id);
      setSubmitting(false);
      setShowConfirmDialog(false);
      toast.success("Đặt đơn thành công!");
      setTimeout(() => navigateToOrderStatus(order.id), 600);
    } catch (err: unknown) {
      if (isOfflineError(err)) {
        setSubmitting(false);
        setShowConfirmDialog(false);
        toast.info("Đơn đã được lưu cục bộ. Sẽ tự động đồng bộ khi có kết nối mạng.");
        setTimeout(() => navigateToOrderStatus(order.id), 400);
        return;
      }
      handleBackendError(err);
    }
  }

  async function retryBackendSync() {
    if (!pendingLocalOrderId) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = buildOrderPayload();
    try {
      const backendOrder = await createOrder(payload);
      saveOrderLink(pendingLocalOrderId, backendOrder.id);
      setSubmitting(false);
      navigateToOrderStatus(pendingLocalOrderId);
    } catch (err: unknown) {
      if (isOfflineError(err)) {
        setSubmitting(false);
        navigateToOrderStatus(pendingLocalOrderId);
        return;
      }
      handleBackendError(err);
    }
  }

  return (
    <div className="order-page bg-[var(--order-bg)] min-h-screen">
      <div className="mx-auto max-w-[1180px] px-4 py-[22px] sm:px-9 sm:py-[22px] flex flex-col gap-[18px]">
        <OrderHero />

        <OrderProgressBar
          currentStep={currentStep}
          completedSteps={completedSteps.filter((s) => s !== currentStep)}
          progressPercent={progressPercent}
          onStepClick={scrollToStep}
        />

        {isFromFallback && (
          <div className="rounded-[11px] border border-[var(--order-accent)]/40 bg-[var(--order-accent-soft)] px-3 py-2 text-xs text-[var(--order-eyebrow)]">
            Đang dùng giá đã lưu — vui lòng kiểm tra lại trước khi đặt.
          </div>
        )}

        <section className="grid gap-[18px] lg:grid-cols-[1fr_312px] items-start">
          <div className="flex flex-col gap-[18px] pb-28 lg:pb-0">
            <StepCard
              step={1}
              id="step-1"
              title="Chọn kích thước khung"
              status={statusFor(1)}
              hint={selectedFrame ? selectedFrame.label : undefined}
              errorText={shouldShowError("frame") && !validation.ok ? validation.errors.frame : undefined}
            >
              {isLoading ? (
                <Skeleton />
              ) : (
                <FrameSizePicker
                  frames={frames}
                  selected={draft.frameItemId}
                  onChange={(id) => {
                    setDraft((d) => ({ ...d, frameItemId: id }));
                    markTouched("frame");
                  }}
                />
              )}
            </StepCard>

            <StepCard
              step={2}
              id="step-2"
              title="Chọn set ảnh chủ đề"
              status={statusFor(2)}
              hint={draft.themeItemIds.length > 0 ? `đã chọn ${draft.themeItemIds.length} set` : undefined}
              errorText={shouldShowError("themes") && !validation.ok ? validation.errors.themes : undefined}
            >
              {isLoading ? (
                <Skeleton />
              ) : (
                <ThemePicker
                  themes={themes}
                  selected={draft.themeItemIds}
                  onChange={(ids) => {
                    setDraft((d) => ({ ...d, themeItemIds: ids }));
                    markTouched("themes");
                  }}
                />
              )}
            </StepCard>

            <StepCard
              step={3}
              id="step-3"
              title="Sticker"
              subtitle="(tuỳ chọn)"
              status={statusFor(3)}
              hint={draft.stickerSelection ? "đã thêm" : undefined}
            >
              <StickerAddon
                sticker={sticker}
                value={draft.stickerSelection}
                onChange={(v) => setDraft((d) => ({ ...d, stickerSelection: v }))}
              />
            </StepCard>

            <StepCard step={4} id="step-4" title="Thông tin giao hàng" status={statusFor(4)}>
              <ShippingForm
                value={shipping}
                onChange={(next) => {
                  setShipping(next);
                  if (next.fullName !== shipping.fullName) markTouched("fullName");
                  if (next.email !== shipping.email) markTouched("email");
                  if (next.phone !== shipping.phone) markTouched("phone");
                  if (next.shippingAddress !== shipping.shippingAddress) markTouched("shippingAddress");
                }}
                errors={visibleShippingErrors}
              />
            </StepCard>

            <StepCard step={5} id="step-5" title="Ghi chú" status={statusFor(5)}>
              <NotesField value={notes} onChange={setNotes} />
            </StepCard>
          </div>

          <div className="hidden lg:block lg:sticky lg:top-[100px] lg:self-start">
            <OrderSummary
              lines={lines}
              subtotalVnd={subtotal}
              shippingVnd={shippingCost}
              totalVnd={orderTotal}
              discount={orderDiscount}
              isSubmittable={validation.ok}
              isSubmitting={submitting}
              missingFields={missingFields}
              onSubmit={handlePlaceOrder}
              selectedFrame={selectedFrame}
              selectedThemes={selectedThemes}
              selectedSticker={selectedSticker}
            />
            <div className="mt-3">
              <BillingDiscountSection
                originalAmount={total}
                purpose="physical_order"
                saleEvent={discountSectionSaleEvent}
                onCouponChange={handleCouponChange}
              />
            </div>
            {submitError && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-destructive">{submitError}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={retryBackendSync}>
                    Thử lại
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mobile bottom bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--order-border)] bg-[var(--order-bg)]/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-[1180px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wide text-[var(--order-text-muted)]">Tổng đơn</div>
              <div className="truncate text-base font-bold tabular-nums text-[var(--order-accent)]">
                {formatVnd(orderTotal)}
              </div>
              {!validation.ok && missingFields.length > 0 && (
                <div className="truncate text-xs text-[var(--order-text-muted)]">
                  Còn thiếu: {missingFields.slice(0, 2).join(", ")}
                  {missingFields.length > 2 ? `, +${missingFields.length - 2}` : ""}
                </div>
              )}
            </div>
            <Button
              type="button"
              className="shrink-0 bg-[var(--order-accent)] text-white hover:bg-[var(--order-accent)]/90"
              disabled={submitting}
              onClick={handlePlaceOrder}
            >
              {submitting ? "Đang gửi..." : validation.ok ? "Đặt đơn" : "Kiểm tra lại"}
            </Button>
          </div>
          {submitError && (
            <div className="mx-auto mt-2 max-w-[1180px] space-y-2">
              <p className="text-xs text-destructive">{submitError}</p>
              <Button variant="outline" size="sm" onClick={retryBackendSync}>
                Thử lại
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-[420px] rounded-[18px] border border-[rgba(23,21,15,0.08)] bg-white p-0 shadow-[0_40px_80px_-30px_rgba(23,21,15,0.5)]">
          <div className="w-full" style={{ padding: "24px 26px" }}>
            <AlertDialogTitle style={{
              fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
              fontSize: 18,
              fontWeight: 800,
              margin: "0 0 8px",
              letterSpacing: "-0.01em",
              color: "#17150F",
            }}>
              Xác nhận đặt đơn
            </AlertDialogTitle>
            <AlertDialogDescription style={{
              fontSize: "12.5px",
              lineHeight: 1.55,
              color: "#7A6E5E",
              margin: "0 0 18px",
            }}>
              Vui lòng kiểm tra kỹ thông tin — đơn hàng sẽ được gửi đi và không thể thay đổi sau khi xác nhận.
            </AlertDialogDescription>

            {/* Sản phẩm */}
            <div style={{
              border: "1px solid rgba(23,21,15,0.1)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 13,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#A8A296",
                marginBottom: 11,
              }}>Sản phẩm</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedFrame ? (
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: "12.5px", color: "#5C574B" }}>Khung</span>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#17150F", textAlign: "right" }}>{selectedFrame.label}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: "12.5px", color: "#5C574B" }}>Khung</span>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#17150F", textAlign: "right" }}>—</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: "12.5px", color: "#5C574B" }}>Set ảnh</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#17150F", textAlign: "right", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedThemes.length > 0 ? selectedThemes.map((t) => t.label).join(", ") : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: "12.5px", color: "#5C574B" }}>Sticker</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#17150F", textAlign: "right" }}>
                    {selectedSticker ? `${selectedSticker.label} ×${draft.stickerSelection?.qty ?? 1}` : "Không"}
                  </span>
                </div>
              </div>
            </div>

            {/* Thanh toán */}
            <div style={{
              border: "1px solid rgba(23,21,15,0.1)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 13,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#A8A296",
                marginBottom: 11,
              }}>Thanh toán</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12.5px", color: "#5C574B" }}>Tạm tính</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12.5px", fontWeight: 600, color: "#17150F" }}>{formatVnd(subtotal)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12.5px", color: "#5C574B" }}>Vận chuyển</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12.5px", fontWeight: 600, color: "#17150F" }}>{formatVnd(shippingCost)}</span>
                </div>
                {orderDiscount && orderDiscount.discountAmount > 0 && (
                  <div style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    background: "#EDF7E0",
                    borderRadius: 8,
                    padding: "6px 8px",
                    margin: "0 -8px",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", fontWeight: 500, color: "#0C5E3A" }}>
                      <span style={{ display: "inline-flex", width: 16, height: 16, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(12,94,58,0.2)", fontSize: 10 }}>%</span>
                      {orderDiscount.discountCode ? `Mã ${orderDiscount.discountCode}` : orderDiscount.discountName ?? "Giảm giá"}
                    </span>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#0C5E3A" }}>-{formatVnd(orderDiscount.discountAmount)}</span>
                  </div>
                )}
                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  borderTop: "1px solid rgba(23,21,15,0.08)",
                  paddingTop: 10,
                  marginTop: 2,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#17150F" }}>Tổng thanh toán</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "#17150F" }}>{formatVnd(orderTotal)}</span>
                </div>
              </div>
            </div>

            {/* Địa chỉ giao hàng */}
            {shipping.shippingAddress && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: "#FAF8F3",
                border: "1px solid rgba(23,21,15,0.08)",
                borderRadius: 11,
                padding: "11px 14px",
                marginBottom: 20,
              }}>
                <MapPin style={{ width: 15, height: 15, flexShrink: 0, color: "#B0673C" }} />
                <span style={{ fontSize: "12.5px", color: "#5C574B" }}>
                  Giao đến: <span style={{ fontWeight: 600, color: "#17150F" }}>{shipping.shippingAddress}</span>
                </span>
              </div>
            )}

            {/* Nút */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 11 }}>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(23,21,15,0.14)",
                  color: "#5C574B",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  padding: "11px 20px",
                  borderRadius: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Xem lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#0C5E3A",
                  color: "#fff",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  padding: "11px 20px",
                  border: "none",
                  borderRadius: 11,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 12px 26px -14px rgba(12,94,58,0.8)",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>
                </svg>
                Xác nhận đặt đơn
              </button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-3 gap-[14px]">
      <div className="h-20 animate-pulse rounded-[var(--r-card)] bg-[var(--order-border)]" />
      <div className="h-20 animate-pulse rounded-[var(--r-card)] bg-[var(--order-border)]" />
      <div className="h-20 animate-pulse rounded-[var(--r-card)] bg-[var(--order-border)]" />
    </div>
  );
}

export default OrderPage;
