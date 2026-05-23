import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { CatalogItem } from "@/features/order/catalog/types";

import { FrameSizePicker } from "./FrameSizePicker";

const frames: CatalogItem[] = [
  {
    itemId: "frame:20x30",
    type: "frame",
    label: "20×30",
    priceVnd: 79000,
    sortOrder: 1,
    isActive: true,
  },
  {
    itemId: "frame:30x40",
    type: "frame",
    label: "30×40",
    priceVnd: 119000,
    sortOrder: 2,
    isActive: true,
  },
];

describe("FrameSizePicker", () => {
  it("renders all frames with prices", () => {
    render(<FrameSizePicker frames={frames} selected={null} onChange={() => {}} />);
    expect(screen.getByText("20×30")).toBeInTheDocument();
    expect(screen.getByText(/79\.000/)).toBeInTheDocument();
  });

  it("calls onChange with itemId on click", () => {
    const onChange = vi.fn();
    render(<FrameSizePicker frames={frames} selected={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("30×40"));
    expect(onChange).toHaveBeenCalledWith("frame:30x40");
  });
});
