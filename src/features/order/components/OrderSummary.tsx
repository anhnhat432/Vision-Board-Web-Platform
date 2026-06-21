import { ShoppingBag } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import type { LocalOrderDiscount, OrderLine } from "@/features/order/storage/order";

import { CatalogThumbnail } from "./CatalogThumbnail";

export interface OrderSummaryProps {
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  discount?: LocalOrderDiscount;
  isSubmittable: boolean;
  isSubmitting?: boolean;
  missingFields?: string[];
  onSubmit: () => void;
  selectedFrame: CatalogItem | null;
  selectedThemes: CatalogItem[];
  selectedSticker: CatalogItem | null;
}

export function OrderSummary({
  lines,
  subtotalVnd,
  shippingVnd,
  totalVnd,
  discount,
  isSubmittable,
  isSubmitting,
  missingFields = [],
  onSubmit,
  selectedFrame,
  selectedThemes,
  selectedSticker,
}: OrderSummaryProps) {
  const hasSelectedPreview = Boolean(selectedFrame || selectedThemes.length > 0 || selectedSticker);
  const hasDiscount = Boolean(discount && discount.discountAmount > 0);
  const discountLabel = discount?.discountCode
    ? `Mã ${discount.discountCode}`
    : discount?.discountName ?? (discount?.source === "sale_event" ? "Ưu đãi đang áp dụng" : "Giảm giá");

  return (
    <aside className="rounded-[18px] border border-[var(--order-border)] bg-[var(--order-card)] p-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--order-eyebrow)] mb-3 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4" />
        Kit của bạn
      </h3>

      <div className="mb-4">
        {!hasSelectedPreview ? (
          <div className="relative flex aspect-[4/3] w-full flex-col justify-end overflow-hidden rounded-[11px] border border-[var(--order-border)] bg-[var(--order-surface)]">
            <img
              src="/printed_vision_kit.png"
              alt="Bộ Vision Board Kit vật lý"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="relative bg-white/90 px-4 py-3 text-left backdrop-blur">
              <p className="text-xs text-[var(--order-text-muted)]">Chọn khung và set ảnh để xem trước</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedFrame && (
              <div className="flex items-center gap-3">
                <CatalogThumbnail item={selectedFrame} className="h-16 w-16 rounded-lg shrink-0" showLabel />
                <div>
                  <div className="text-sm font-bold text-[var(--order-text)]">{selectedFrame.label}</div>
                  <div className="font-mono text-xs text-[var(--order-accent)]">{formatVnd(selectedFrame.priceVnd)}</div>
                </div>
              </div>
            )}
            {selectedThemes.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selectedThemes.map((theme) => (
                  <CatalogThumbnail
                    key={theme.itemId}
                    item={theme}
                    className="aspect-square w-full rounded-lg"
                    compact
                    showLabel
                  />
                ))}
              </div>
            )}
            {selectedSticker && (
              <div className="flex items-center gap-3">
                <CatalogThumbnail item={selectedSticker} className="h-12 w-12 rounded-lg shrink-0" compact showLabel />
                <div>
                  <div className="text-sm font-bold text-[var(--order-text)]">{selectedSticker.label}</div>
                  <div className="font-mono text-xs text-[var(--order-accent)]">{formatVnd(selectedSticker.priceVnd)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--order-border)] pt-4">
        <div className="space-y-[6px] text-[13px]">
          {lines.length === 0 && <p className="text-[var(--order-text-muted)]">Chưa chọn sản phẩm.</p>}
          {lines.map((line) => (
            <div key={`${line.itemId}-${line.qty}`} className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[var(--order-text)]">{line.label}</span>
                {line.qty > 1 && <span className="text-xs text-[var(--order-text-muted)] ml-1">× {line.qty}</span>}
              </div>
              <span className="shrink-0 tabular-nums text-[var(--order-text)]">{formatVnd(line.lineTotalVnd)}</span>
            </div>
          ))}
          {INCLUDED_DOCS.map((doc) => (
            <div key={doc.id} className="flex items-start justify-between gap-2 text-[var(--order-text-muted)]">
              <span>{doc.label}</span>
              <span className="shrink-0 text-xs">Tặng kèm — 0đ</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 border-t border-[var(--order-border)] pt-3 text-[13px]">
          <div className="flex justify-between">
            <span className="text-[var(--order-text-soft)]">Tạm tính</span>
            <span className="tabular-nums text-[var(--order-text)]">{formatVnd(subtotalVnd)}</span>
          </div>
          <div className="flex justify-between text-[var(--order-text-muted)]">
            <span>
              Phí ship
              <span className="ml-1 text-xs">(báo sau khi xác nhận địa chỉ)</span>
            </span>
            <span className="tabular-nums">{shippingVnd === 0 ? "Tính sau" : formatVnd(shippingVnd)}</span>
          </div>
          {hasDiscount && (
            <div className="flex justify-between text-[var(--order-success)] font-medium">
              <span>{discountLabel}</span>
              <span className="tabular-nums">-{formatVnd(discount!.discountAmount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-base font-bold border-t border-[var(--order-border)] pt-2">
            <span>Tổng tạm tính</span>
            <span className="tabular-nums text-[var(--order-accent)]">{formatVnd(totalVnd)}</span>
          </div>
          <p className="pt-1 text-[11px] text-[var(--order-text-muted)]">
            {hasDiscount
              ? "Tổng đơn đã bao gồm giảm giá. Phí ship sẽ được chốt qua email/điện thoại."
              : "Tổng đơn cuối cùng = tạm tính + phí ship. Shop sẽ chốt phí ship qua email/điện thoại trước khi gửi kit."}
          </p>
        </div>

        {!isSubmittable && missingFields.length > 0 && (
          <div className="mt-3 rounded-[11px] border border-[var(--order-accent)]/30 bg-[var(--order-accent-soft)] px-3 py-2 text-xs text-[var(--order-eyebrow)]">
            Còn thiếu: {missingFields.join(", ")}.
          </div>
        )}

        <Button
          type="button"
          className="mt-4 w-full bg-[var(--order-accent)] text-white shadow-[0_18px_38px_-14px_rgba(176,103,60,0.4)] transition-all duration-[0.18s] ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-[2px] hover:bg-[var(--order-accent)]/90 hover:shadow-[0_24px_46px_-14px_rgba(176,103,60,0.5)]"
          disabled={isSubmitting}
          aria-disabled={!isSubmittable || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting
            ? "Đang gửi..."
            : isSubmittable
              ? `Đặt đơn — ${formatVnd(totalVnd)}`
              : "Kiểm tra lại để đặt đơn"}
        </Button>
      </div>
    </aside>
  );
}
