import type { CatalogItem } from "@/features/order/catalog/types";

import type { OrderDraft } from "./pricing";

export interface ShippingInput {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
}

export interface ValidateInput {
  draft: OrderDraft;
  shipping: ShippingInput;
  catalog: CatalogItem[];
}

export type ValidateErrorKey =
  | "frame"
  | "themes"
  | "sticker"
  | "fullName"
  | "email"
  | "phone"
  | "shippingAddress"
  | "catalog";

export type ValidateResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<ValidateErrorKey, string>> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrderDraft({ draft, shipping, catalog }: ValidateInput): ValidateResult {
  const errors: Partial<Record<ValidateErrorKey, string>> = {};
  const byId = new Map(catalog.map((item) => [item.itemId, item]));

  if (!draft.frameItemId) {
    errors.frame = "Vui lòng chọn kích thước khung";
  } else if (!byId.has(draft.frameItemId)) {
    errors.frame = "Khung không còn khả dụng";
  }

  if (draft.themeItemIds.length === 0) {
    errors.themes = "Chọn ít nhất 1 set ảnh";
  } else {
    const missing = draft.themeItemIds.filter((id) => !byId.has(id));
    if (missing.length) errors.themes = "Một số set ảnh không còn khả dụng";
  }

  if (draft.stickerSelection) {
    const sticker = byId.get(draft.stickerSelection.itemId);
    if (!sticker) {
      errors.sticker = "Sticker không còn khả dụng";
    } else {
      const max = sticker.maxQty ?? 10;
      if (draft.stickerSelection.qty < 1 || draft.stickerSelection.qty > max) {
        errors.sticker = `Số lượng phải từ 1 đến ${max}`;
      }
    }
  }

  if (!shipping.fullName.trim()) errors.fullName = "Vui lòng nhập họ tên";
  if (!EMAIL_RE.test(shipping.email)) errors.email = "Email không hợp lệ";
  if (!shipping.phone.trim()) errors.phone = "Vui lòng nhập số điện thoại";
  if (!shipping.shippingAddress.trim()) errors.shippingAddress = "Vui lòng nhập địa chỉ giao hàng";

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
