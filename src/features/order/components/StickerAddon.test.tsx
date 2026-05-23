import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { CatalogItem } from "@/features/order/catalog/types";

import { StickerAddon } from "./StickerAddon";

const sticker: CatalogItem = {
  itemId: "sticker:hynbee-round-v1",
  type: "sticker",
  label: "Sticker tròn HynBee",
  priceVnd: 15000,
  sortOrder: 1,
  isActive: true,
  maxQty: 5,
};

describe("StickerAddon", () => {
  it("collapsed by default; expand on toggle", () => {
    render(<StickerAddon sticker={sticker} value={null} onChange={() => {}} />);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /thêm sticker/i }));
  });

  it("clamps qty within [1, maxQty]", () => {
    const onChange = vi.fn();
    render(
      <StickerAddon
        sticker={sticker}
        value={{ itemId: sticker.itemId, qty: 1 }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith({ itemId: sticker.itemId, qty: 5 });
  });

  it("renders thumbnail image when provided", () => {
    const withImg: CatalogItem = { ...sticker, thumbnail: "/img/sticker.png" };
    render(<StickerAddon sticker={withImg} value={null} onChange={() => {}} />);
    const img = screen.getByAltText("Sticker tròn HynBee") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("/img/sticker.png");
  });

  it("renders placeholder when thumbnail missing", () => {
    render(<StickerAddon sticker={sticker} value={null} onChange={() => {}} />);
    expect(screen.getByTestId("catalog-thumbnail-placeholder")).toBeInTheDocument();
  });
});
