import { Button } from "@/app/components/ui/button";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";

import { CatalogThumbnail } from "./CatalogThumbnail";

export interface StickerAddonProps {
  sticker: CatalogItem | null;
  value: { itemId: string; qty: number } | null;
  onChange: (next: { itemId: string; qty: number } | null) => void;
}

export function StickerAddon({ sticker, value, onChange }: StickerAddonProps) {
  if (!sticker) return null;
  const expanded = Boolean(value);
  const maxQty = sticker.maxQty ?? 10;

  function setQty(raw: number) {
    if (!sticker) return;
    const safe = Number.isFinite(raw) ? raw : 1;
    const clamped = Math.max(1, Math.min(maxQty, Math.floor(safe)));
    onChange({ itemId: sticker.itemId, qty: clamped });
  }

  return (
    <div className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CatalogThumbnail item={sticker} className="h-16 w-16 shrink-0" compact />
          <div>
            <div className="font-medium">{sticker.label}</div>
            <div className="text-xs text-[var(--order-text-muted)]">{formatVnd(sticker.priceVnd)} / tờ</div>
          </div>
        </div>
        {expanded ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Bỏ
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ itemId: sticker.itemId, qty: 1 })}
          >
            Thêm sticker
          </Button>
        )}
      </div>
      {expanded && value && (
        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm text-[var(--order-text-muted)]" htmlFor="sticker-qty">
            Số lượng
          </label>
          <input
            id="sticker-qty"
            type="number"
            min={1}
            max={maxQty}
            value={value.qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-20 rounded border border-[var(--order-border)] px-2 py-1 text-sm"
          />
          <div className="text-xs text-[var(--order-text-muted)]">Tối đa {maxQty}</div>
        </div>
      )}
    </div>
  );
}
