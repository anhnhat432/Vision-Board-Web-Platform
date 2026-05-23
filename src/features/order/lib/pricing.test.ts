import { describe, it, expect } from "vitest";

import type { CatalogItem } from "@/features/order/catalog/types";

import { buildOrderLines, calcShipping, calcSubtotal, calcTotal, formatVnd } from "./pricing";

const catalog: CatalogItem[] = [
  { itemId: "frame:30x40", type: "frame", label: "F", priceVnd: 100, sortOrder: 1, isActive: true },
  { itemId: "theme:money", type: "theme", label: "MONEY", priceVnd: 20, sortOrder: 2, isActive: true },
  { itemId: "theme:travel", type: "theme", label: "TRAVEL", priceVnd: 20, sortOrder: 3, isActive: true },
  {
    itemId: "sticker:hynbee-round-v1",
    type: "sticker",
    label: "S",
    priceVnd: 10,
    sortOrder: 4,
    isActive: true,
    maxQty: 5,
  },
];

describe("buildOrderLines", () => {
  it("returns lines for frame + themes + sticker qty 2", () => {
    const lines = buildOrderLines(
      {
        frameItemId: "frame:30x40",
        themeItemIds: ["theme:money", "theme:travel"],
        stickerSelection: { itemId: "sticker:hynbee-round-v1", qty: 2 },
      },
      catalog,
    );
    expect(lines).toHaveLength(4);
    expect(lines[3]).toMatchObject({
      itemId: "sticker:hynbee-round-v1",
      qty: 2,
      lineTotalVnd: 20,
    });
  });

  it("skips frame when frameItemId null", () => {
    expect(
      buildOrderLines(
        { frameItemId: null, themeItemIds: [], stickerSelection: null },
        catalog,
      ),
    ).toEqual([]);
  });

  it("skips items missing from catalog", () => {
    expect(
      buildOrderLines(
        { frameItemId: "frame:nope", themeItemIds: [], stickerSelection: null },
        catalog,
      ),
    ).toEqual([]);
  });
});

describe("calcSubtotal/calcTotal", () => {
  it("sums lineTotalVnd", () => {
    const lines = buildOrderLines(
      { frameItemId: "frame:30x40", themeItemIds: ["theme:money"], stickerSelection: null },
      catalog,
    );
    expect(calcSubtotal(lines)).toBe(120);
    expect(
      calcShipping({ frameItemId: "frame:30x40", themeItemIds: [], stickerSelection: null }),
    ).toBe(0);
    expect(calcTotal(120, 0)).toBe(120);
  });
});

describe("formatVnd", () => {
  it("formats VN locale", () => {
    expect(formatVnd(119000)).toMatch(/119\.000/);
  });
});
