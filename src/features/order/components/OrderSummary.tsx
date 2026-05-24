import { Package } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";
import type { OrderLine } from "@/features/order/storage/order";

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
  const previewFrame = selectedFrame?.thumbnail ? selectedFrame : null;
  const previewThemes = selectedThemes.filter((t) => t.thumbnail);
  const previewSticker = selectedSticker?.thumbnail ? selectedSticker : null;
  const hasPreview = Boolean(
    previewFrame || previewThemes.length > 0 || previewSticker,
  );

  return (
    <aside className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--order-eyebrow)]">
        Kit của bạn
      </h3>
      <div className="mt-3">
        {!hasPreview ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[var(--r-card-sm)] bg-[var(--order-bg)] text-center">
            <Package className="h-8 w-8 text-[var(--order-accent)]" />
            <p className="px-4 text-xs text-[var(--order-text-muted)]">
              Chọn khung và set ảnh để xem trước
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {previewFrame && (
              <img
                src={previewFrame.thumbnail}
                alt={previewFrame.label}
                className="aspect-[3/4] w-full rounded-[var(--r-card-sm)] object-cover"
                loading="lazy"
              />
            )}
            {previewThemes.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewThemes.map((t) => (
                  <img
                    key={t.itemId}
                    src={t.thumbnail}
                    alt={t.label}
                    className="aspect-square w-full rounded-[var(--r-card-sm)] object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            {previewSticker && (
              <img
                src={previewSticker.thumbnail}
                alt={previewSticker.label}
                className="h-16 w-16 rounded-[var(--r-card-sm)] object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-[var(--order-border)] pt-4">
        <h3 className="text-base font-semibold">Đơn hàng của bạn</h3>
        <div className="mt-3 space-y-2 text-sm">
          {lines.length === 0 && (
            <p className="text-[var(--order-text-muted)]">Chưa chọn sản phẩm.</p>
          )}
          {lines.map((line) => (
            <div
              key={`${line.itemId}-${line.qty}`}
              className="flex items-start justify-between gap-2"
            >
              <div>
                <div>{line.label}</div>
                {line.qty > 1 && (
                  <div className="text-xs text-[var(--order-text-muted)]">
                    × {line.qty}
                  </div>
                )}
              </div>
              <div className="shrink-0 tabular-nums">
                {formatVnd(line.lineTotalVnd)}
              </div>
            </div>
          ))}
          {INCLUDED_DOCS.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between gap-2 text-[var(--order-text-muted)]"
            >
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
              <span className="ml-1 text-xs">
                (báo sau khi xác nhận địa chỉ)
              </span>
            </span>
            <span className="tabular-nums">
              {shippingVnd === 0 ? "Tính sau" : formatVnd(shippingVnd)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-lg font-semibold">
            <span>Tổng tạm tính</span>
            <span className="tabular-nums text-[var(--order-accent)]">
              {formatVnd(totalVnd)}
            </span>
          </div>
          <p className="pt-1 text-[11px] text-[var(--order-text-muted)]">
            Tổng đơn cuối cùng = tạm tính + phí ship. Shop sẽ chốt phí ship qua
            email/điện thoại trước khi gửi kit.
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
          onClick={onSubmit}
        >
          {isSubmitting ? "Đang gửi..." : `Đặt đơn — ${formatVnd(totalVnd)}`}
        </Button>
      </div>
    </aside>
  );
}
