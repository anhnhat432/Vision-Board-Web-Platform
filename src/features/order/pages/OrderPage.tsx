import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
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
import { createLocalOrder } from "@/features/order/storage/order";
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
  const [touched, setTouched] = useState<Partial<Record<ValidateErrorKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const frames = useMemo(() => catalog.filter((i) => i.type === "frame"), [catalog]);
  const themes = useMemo(() => catalog.filter((i) => i.type === "theme"), [catalog]);
  const sticker = useMemo(() => catalog.find((i) => i.type === "sticker") ?? null, [catalog]);

  const lines = useMemo(() => buildOrderLines(draft, catalog), [draft, catalog]);
  const subtotal = calcSubtotal(lines);
  const shippingCost = calcShipping(draft);
  const total = calcTotal(subtotal, shippingCost);
  const validation = validateOrderDraft({ draft, shipping, catalog });

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

  // Required steps for the mobile progress bar fill — sticker (3) and notes (5) are optional.
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

  async function handleSubmit() {
    if (!validation.ok) {
      setSubmitAttempted(true);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
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
      };
      const order = createLocalOrder({
        lines,
        subtotalVnd: subtotal,
        shippingVnd: shippingCost,
        totalVnd: total,
        fullName: shipping.fullName,
        email: shipping.email,
        phone: shipping.phone,
        shippingAddress: shipping.shippingAddress,
        goalId: shipping.goalId,
        goalTitle: shipping.goalTitle,
        keywords: notes.keywords,
        note: notes.note,
      });
      try {
        const backendOrder = await createOrder(payload);
        saveOrderLink(order.id, backendOrder.id);
      } catch {
        // offline: fall through to local-only status page
      }
      navigate(`/order-status/${order.id}`);
    } catch {
      setSubmitError("Không thể tạo đơn lúc này. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="order-page bg-[var(--order-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <OrderHero />

        <OrderProgressBar
          currentStep={currentStep}
          completedSteps={completedSteps.filter((s) => s !== currentStep)}
          progressPercent={progressPercent}
          onStepClick={scrollToStep}
        />

        {isFromFallback && (
          <div className="mb-4 rounded border border-[var(--order-accent)]/40 bg-[var(--order-accent-soft)] px-3 py-2 text-xs text-[var(--order-eyebrow)]">
            Đang dùng giá đã lưu — vui lòng kiểm tra lại trước khi đặt.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5 pb-28 lg:pb-0">
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
              title="Sticker (tuỳ chọn)"
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

          <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <OrderSummary
              lines={lines}
              subtotalVnd={subtotal}
              shippingVnd={shippingCost}
              totalVnd={total}
              isSubmittable={validation.ok}
              isSubmitting={submitting}
              missingFields={missingFields}
              onSubmit={handleSubmit}
              selectedFrame={selectedFrame}
              selectedThemes={selectedThemes}
              selectedSticker={selectedSticker}
            />
            {submitError && <p className="mt-2 text-xs text-destructive">{submitError}</p>}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--order-border)] bg-[var(--order-bg)]/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wide text-[var(--order-text-muted)]">Tổng đơn</div>
              <div className="truncate text-base font-semibold tabular-nums text-[var(--order-accent)]">
                {formatVnd(total)}
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
              onClick={handleSubmit}
            >
              {submitting ? "Đang gửi..." : validation.ok ? "Đặt đơn" : "Kiểm tra lại"}
            </Button>
          </div>
          {submitError && <p className="mx-auto mt-1 max-w-6xl text-xs text-destructive">{submitError}</p>}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="h-20 animate-pulse rounded bg-[var(--order-border)]" />
      <div className="h-20 animate-pulse rounded bg-[var(--order-border)]" />
      <div className="h-20 animate-pulse rounded bg-[var(--order-border)]" />
    </div>
  );
}

export default OrderPage;
