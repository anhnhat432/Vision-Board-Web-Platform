import { Button } from "@/app/components/ui/button";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";
import { formatVnd } from "@/features/order/lib/pricing";
import type { OrderLine } from "@/features/order/storage/order";

export interface OrderSummaryProps {
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  isSubmittable: boolean;
  isSubmitting?: boolean;
  onSubmit: () => void;
}

export function OrderSummary({
  lines,
  subtotalVnd,
  shippingVnd,
  totalVnd,
  isSubmittable,
  isSubmitting,
  onSubmit,
}: OrderSummaryProps) {
  return (
    <aside className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Đơn hàng của bạn</h3>
      <div className="mt-3 space-y-2 text-sm">
        {lines.length === 0 && <p className="text-muted-foreground">Chưa chọn sản phẩm.</p>}
        {lines.map((line) => (
          <div
            key={`${line.itemId}-${line.qty}`}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <div>{line.label}</div>
              {line.qty > 1 && (
                <div className="text-xs text-muted-foreground">× {line.qty}</div>
              )}
            </div>
            <div className="shrink-0 tabular-nums">{formatVnd(line.lineTotalVnd)}</div>
          </div>
        ))}
        {INCLUDED_DOCS.map((doc) => (
          <div
            key={doc.id}
            className="flex items-start justify-between gap-2 text-muted-foreground"
          >
            <div>{doc.label}</div>
            <div className="shrink-0">Tặng kèm — 0đ</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1 border-t border-[color:var(--border)] pt-3 text-sm">
        <div className="flex justify-between">
          <span>Tạm tính</span>
          <span className="tabular-nums">{formatVnd(subtotalVnd)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Phí ship</span>
          <span className="tabular-nums">
            {shippingVnd === 0 ? "Liên hệ" : formatVnd(shippingVnd)}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-base font-semibold">
          <span>Tổng đơn</span>
          <span className="tabular-nums">{formatVnd(totalVnd)}</span>
        </div>
      </div>
      <Button
        type="button"
        className="mt-4 w-full"
        disabled={!isSubmittable || isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? "Đang gửi..." : `Đặt đơn — ${formatVnd(totalVnd)}`}
      </Button>
    </aside>
  );
}
