import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { CatalogItem } from "@/features/order/catalog/types";

import { ThemePicker } from "./ThemePicker";

const themes: CatalogItem[] = [
  {
    itemId: "theme:money",
    type: "theme",
    label: "MONEY",
    priceVnd: 18000,
    sortOrder: 1,
    isActive: true,
  },
  {
    itemId: "theme:travel",
    type: "theme",
    label: "TRAVEL",
    priceVnd: 18000,
    sortOrder: 2,
    isActive: true,
  },
];

describe("ThemePicker", () => {
  it("toggles selection on click", () => {
    const onChange = vi.fn();
    render(<ThemePicker themes={themes} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("MONEY"));
    expect(onChange).toHaveBeenCalledWith(["theme:money"]);
  });

  it("filters by search query", () => {
    render(<ThemePicker themes={themes} selected={[]} onChange={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Tìm chủ đề/i), {
      target: { value: "trav" },
    });
    expect(screen.queryByText("MONEY")).not.toBeInTheDocument();
    expect(screen.getByText("TRAVEL")).toBeInTheDocument();
  });

  it("shows selected count", () => {
    render(<ThemePicker themes={themes} selected={["theme:money"]} onChange={() => {}} />);
    expect(screen.getByText(/Đã chọn 1 set/i)).toBeInTheDocument();
  });

  it("renders thumbnail image when provided", () => {
    const withImg: CatalogItem[] = [{ ...themes[0], thumbnail: "/img/money.png" }];
    render(<ThemePicker themes={withImg} selected={[]} onChange={() => {}} />);
    const img = screen.getByAltText("MONEY") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("/img/money.png");
  });

  it("renders placeholder when thumbnail missing", () => {
    render(<ThemePicker themes={themes} selected={[]} onChange={() => {}} />);
    expect(screen.getAllByTestId("catalog-thumbnail-placeholder")).toHaveLength(2);
  });
});
