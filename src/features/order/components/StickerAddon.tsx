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
    <div className="flex items-center gap-[15px] bg-[var(--order-surface)] border border-[var(--order-border)] rounded-[13px] p-[14px_16px]">
      {sticker.thumbnail ? (
        <CatalogThumbnail
          item={sticker}
          className="w-[52px] h-[52px] rounded-[10px] shrink-0"
          compact
          loading="eager"
        />
      ) : (
        <div
          className="w-[52px] h-[52px] rounded-[10px] flex items-center justify-center shrink-0 text-[22px]"
          style={{ background: "linear-gradient(135deg, #F6D8E4, #FCEFC7)", border: "1px solid rgba(23,21,15,0.08)" }}
        >
          🌸
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-[var(--order-text)]">{sticker.label}</div>
        <div className="font-mono text-xs text-[var(--order-text-muted)] mt-[2px]">{formatVnd(sticker.priceVnd)} / tờ</div>
        {expanded && value && (
          <div className="flex items-center gap-3 mt-3">
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
              className="w-20 rounded-md border border-[var(--order-border)] px-2 py-1 text-sm bg-white"
            />
            <span className="text-xs text-[var(--order-text-muted)]">Tối đa {maxQty}</span>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant={expanded ? "ghost" : "outline"}
        size="sm"
        onClick={() => {
          if (expanded) {
            onChange(null);
          } else {
            onChange({ itemId: sticker.itemId, qty: 1 });
          }
        }}
        className={expanded ? "" : "bg-[var(--order-accent)] text-white border-[var(--order-accent)] hover:bg-[var(--order-accent)]/90"}
      >
        {expanded ? "Bỏ" : "Thêm sticker"}
      </Button>
    </div>
  );
}
