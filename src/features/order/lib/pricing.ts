import type { CatalogItem } from "@/features/order/catalog/types";
import type { OrderLine } from "@/features/order/storage/order";

export interface OrderDraft {
  frameItemId: string | null;
  themeItemIds: string[];
  stickerSelection: { itemId: string; qty: number } | null;
}

function toLine(item: CatalogItem, qty: number): OrderLine {
  return {
    itemId: item.itemId,
    label: item.label,
    type: item.type,
    qty,
    unitPriceVnd: item.priceVnd,
    lineTotalVnd: item.priceVnd * qty,
  };
}

export function buildOrderLines(draft: OrderDraft, catalog: CatalogItem[]): OrderLine[] {
  const byId = new Map(catalog.map((item) => [item.itemId, item]));
  const lines: OrderLine[] = [];

  if (draft.frameItemId) {
    const frame = byId.get(draft.frameItemId);
    if (frame) lines.push(toLine(frame, 1));
  }

  for (const themeId of draft.themeItemIds) {
    const theme = byId.get(themeId);
    if (theme) lines.push(toLine(theme, 1));
  }

  if (draft.stickerSelection) {
    const sticker = byId.get(draft.stickerSelection.itemId);
    if (sticker) lines.push(toLine(sticker, draft.stickerSelection.qty));
  }

  return lines;
}

export function calcSubtotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotalVnd, 0);
}

/** TODO: cấu hình sau khi có bảng giá vận chuyển. Cần sync với backend `orderService.ts`. */
const SHIPPING_COST_VND = 0;

export function calcShipping(_draft: OrderDraft): number {
  return SHIPPING_COST_VND;
}

export function calcTotal(subtotal: number, shipping: number): number {
  return subtotal + shipping;
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}
