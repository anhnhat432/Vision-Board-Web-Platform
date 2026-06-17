import { Package } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import type { OrderLine } from "@/features/order/storage/order";

import { CatalogThumbnail } from "./CatalogThumbnail";

export interface OrderSummaryProps {
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
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
  isSubmittable,
  isSubmitting,
  missingFields = [],
  onSubmit,
  selectedFrame,
  selectedThemes,
  selectedSticker,
}: OrderSummaryProps) {
  const hasSelectedPreview = Boolean(selectedFrame || selectedThemes.length > 0 || selectedSticker);

  return (
    <aside className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--order-eyebrow)]">Kit của bạn</h3>
      <div className="mt-3">
        {!hasSelectedPreview ? (
          <div className="relative flex aspect-[4/3] w-full flex-col justify-end overflow-hidden rounded-[var(--r-card-sm)] border border-[var(--order-border)] bg-[var(--order-bg)] text-center">
            <img
              src="/printed_vision_kit.png"
              alt="Bộ Vision Board Kit vật lý"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="relative bg-[var(--order-card)]/90 px-4 py-3 text-left backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--order-accent)]">
                <Package className="h-4 w-4" />
                Vision Board Kit
              </div>
              <p className="mt-1 text-xs text-[var(--order-text-muted)]">Chọn khung và set ảnh để xem trước</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedFrame && <CatalogThumbnail item={selectedFrame} className="aspect-[3/4] w-full" showLabel />}
            {selectedThemes.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selectedThemes.map((theme) => (
                  <CatalogThumbnail
                    key={theme.itemId}
                    item={theme}
                    className="aspect-square w-full"
                    compact
                    showLabel
                  />
                ))}
              </div>
            )}
            {selectedSticker && <CatalogThumbnail item={selectedSticker} className="h-16 w-16" compact showLabel />}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-[var(--order-border)] pt-4">
        <h3 className="text-base font-semibold">Đơn hàng của bạn</h3>
        <div className="mt-3 space-y-2 text-sm">
          {lines.length === 0 && <p className="text-[var(--order-text-muted)]">Chưa chọn sản phẩm.</p>}
          {lines.map((line) => (
            <div key={`${line.itemId}-${line.qty}`} className="flex items-start justify-between gap-2">
              <div>
                <div>{line.label}</div>
                {line.qty > 1 && <div className="text-xs text-[var(--order-text-muted)]">× {line.qty}</div>}
              </div>
              <div className="shrink-0 tabular-nums">{formatVnd(line.lineTotalVnd)}</div>
            </div>
          ))}
          {INCLUDED_DOCS.map((doc) => (
            <div key={doc.id} className="flex items-start justify-between gap-2 text-[var(--order-text-muted)]">
              <div>{doc.label}</div>
              <div className="shrink-0">Tặng kèm — 0đ</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-[var(--order-border)] pt-3 text-sm">
          <div className="flex justify-between">
            <span>Tạm tính</span>
            <span className="tabular-nums">{formatVnd(subtotalVnd)}</span>
          </div>
          <div className="flex justify-between text-[var(--order-text-muted)]">
            <span>
              Phí ship
              <span className="ml-1 text-xs">(báo sau khi xác nhận địa chỉ)</span>
            </span>
            <span className="tabular-nums">{shippingVnd === 0 ? "Tính sau" : formatVnd(shippingVnd)}</span>
          </div>
          <div className="mt-2 flex justify-between text-lg font-semibold">
            <span>Tổng tạm tính</span>
            <span className="tabular-nums text-[var(--order-accent)]">{formatVnd(totalVnd)}</span>
          </div>
          <p className="pt-1 text-xs text-[var(--order-text-muted)]">
            Tổng đơn cuối cùng = tạm tính + phí ship. Shop sẽ chốt phí ship qua email/điện thoại trước khi gửi kit.
          </p>
        </div>
        {!isSubmittable && missingFields.length > 0 && (
          <div className="mt-3 rounded border border-[var(--order-accent)]/30 bg-[var(--order-accent-soft)] px-3 py-2 text-xs text-[var(--order-eyebrow)]">
            Còn thiếu: {missingFields.join(", ")}.
          </div>
        )}
        <Button
          type="button"
          className="mt-4 w-full bg-[var(--order-accent)] text-white shadow-sm transition-all hover:-translate-y-[1px] hover:bg-[var(--order-accent)]/90 hover:shadow-md"
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
