import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { useOrderCatalog } from "@/features/order/hooks/useOrderCatalog";
import {
  buildOrderLines,
  calcShipping,
  calcSubtotal,
  calcTotal,
  type OrderDraft,
} from "@/features/order/lib/pricing";
import { validateOrderDraft } from "@/features/order/lib/validators";
import { createLocalOrder } from "@/features/order/storage/order";

import { FrameSizePicker } from "../components/FrameSizePicker";
import { IncludedItemsCard } from "../components/IncludedItemsCard";
import { NotesField, type NotesFieldValue } from "../components/NotesField";
import { OrderSummary } from "../components/OrderSummary";
import { ShippingForm, type ShippingFormValue } from "../components/ShippingForm";
import { StickerAddon } from "../components/StickerAddon";
import { ThemePicker } from "../components/ThemePicker";

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

  const frames = useMemo(() => catalog.filter((i) => i.type === "frame"), [catalog]);
  const themes = useMemo(() => catalog.filter((i) => i.type === "theme"), [catalog]);
  const sticker = useMemo(() => catalog.find((i) => i.type === "sticker") ?? null, [catalog]);

  const lines = useMemo(() => buildOrderLines(draft, catalog), [draft, catalog]);
  const subtotal = calcSubtotal(lines);
  const shippingCost = calcShipping(draft);
  const total = calcTotal(subtotal, shippingCost);
  const validation = validateOrderDraft({ draft, shipping, catalog });

  async function handleSubmit() {
    if (!validation.ok) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        itemIds: [
          ...(draft.frameItemId ? [draft.frameItemId] : []),
          ...draft.themeItemIds,
        ],
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
      let serverId: string | null = null;
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = (await res.json()) as { data: { id: string } };
          serverId = json.data.id;
        }
      } catch {
        // offline: fall through to local-only save
      }
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
      navigate(`/order-status/${serverId ?? order.id}`);
    } catch {
      setSubmitError("Không thể tạo đơn lúc này. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold">Đặt kit Vision Board</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Chọn khung gỗ, set ảnh chủ đề và sticker (tuỳ chọn).
      </p>

      {isFromFallback && (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Đang dùng giá đã lưu — vui lòng kiểm tra lại trước khi đặt.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <IncludedItemsCard />

          <section>
            <h2 className="mb-3 text-base font-semibold">1. Chọn kích thước khung</h2>
            {isLoading ? (
              <Skeleton />
            ) : (
              <FrameSizePicker
                frames={frames}
                selected={draft.frameItemId}
                onChange={(id) => setDraft((d) => ({ ...d, frameItemId: id }))}
              />
            )}
            {validation.ok === false && validation.errors.frame && (
              <p className="mt-1 text-xs text-destructive">{validation.errors.frame}</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">2. Chọn set ảnh chủ đề</h2>
            {isLoading ? (
              <Skeleton />
            ) : (
              <ThemePicker
                themes={themes}
                selected={draft.themeItemIds}
                onChange={(ids) => setDraft((d) => ({ ...d, themeItemIds: ids }))}
              />
            )}
            {validation.ok === false && validation.errors.themes && (
              <p className="mt-1 text-xs text-destructive">{validation.errors.themes}</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">3. Sticker (tuỳ chọn)</h2>
            <StickerAddon
              sticker={sticker}
              value={draft.stickerSelection}
              onChange={(v) => setDraft((d) => ({ ...d, stickerSelection: v }))}
            />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">4. Thông tin giao hàng</h2>
            <ShippingForm
              value={shipping}
              onChange={setShipping}
              errors={validation.ok === false ? validation.errors : undefined}
            />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">5. Ghi chú</h2>
            <NotesField value={notes} onChange={setNotes} />
          </section>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <OrderSummary
            lines={lines}
            subtotalVnd={subtotal}
            shippingVnd={shippingCost}
            totalVnd={total}
            isSubmittable={validation.ok}
            isSubmitting={submitting}
            onSubmit={handleSubmit}
          />
          {submitError && <p className="mt-2 text-xs text-destructive">{submitError}</p>}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="h-20 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default OrderPage;
