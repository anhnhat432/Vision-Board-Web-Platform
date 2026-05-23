import { describe, it, expect } from "vitest";

import type { CatalogItem } from "@/features/order/catalog/types";

import { validateOrderDraft } from "./validators";

const catalog: CatalogItem[] = [
  { itemId: "frame:30x40", type: "frame", label: "F", priceVnd: 100, sortOrder: 1, isActive: true },
  { itemId: "theme:money", type: "theme", label: "M", priceVnd: 20, sortOrder: 2, isActive: true },
  {
    itemId: "sticker:hynbee-round-v1",
    type: "sticker",
    label: "S",
    priceVnd: 10,
    sortOrder: 3,
    isActive: true,
    maxQty: 5,
  },
];

const validShipping = {
  fullName: "A",
  email: "a@b.c",
  phone: "0900000000",
  shippingAddress: "X",
};

describe("validateOrderDraft", () => {
  it("ok with frame + 1 theme + valid shipping", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:30x40", themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(true);
  });

  it("error when frame null", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: null, themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.frame).toBeTruthy();
  });

  it("error when no themes", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:30x40", themeItemIds: [], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.themes).toBeTruthy();
  });

  it("error when email invalid", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:30x40", themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: { ...validShipping, email: "bogus" },
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email).toBeTruthy();
  });

  it("error when sticker qty exceeds maxQty", () => {
    const r = validateOrderDraft({
      draft: {
        frameItemId: "frame:30x40",
        themeItemIds: ["theme:money"],
        stickerSelection: { itemId: "sticker:hynbee-round-v1", qty: 99 },
      },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.sticker).toBeTruthy();
  });

  it("error when itemId not in catalog", () => {
    const r = validateOrderDraft({
      draft: { frameItemId: "frame:nope", themeItemIds: ["theme:money"], stickerSelection: null },
      shipping: validShipping,
      catalog,
    });
    expect(r.ok).toBe(false);
  });
});
