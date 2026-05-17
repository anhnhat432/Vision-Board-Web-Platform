import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisionBoardItem } from "@/app/utils/storage-types";
import { VisionBoardCanvas } from "./VisionBoardCanvas";

const BASE_ITEM: VisionBoardItem = {
  id: "item_1",
  type: "quote",
  content: "Tôi đang xây một cuộc sống rõ hướng.",
  x: 10,
  y: 12,
  width: 220,
  height: 140,
};

function renderCanvas(overrides: Partial<React.ComponentProps<typeof VisionBoardCanvas>> = {}) {
  return render(
    <VisionBoardCanvas
      items={[BASE_ITEM]}
      showZones={false}
      goalsById={{}}
      onItemPositionChange={vi.fn()}
      onItemDelete={vi.fn()}
      {...overrides}
    />,
  );
}

describe("VisionBoardCanvas", () => {
  beforeEach(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
  });

  it("renders aurora theme id on the root", () => {
    const { container } = renderCanvas({ themeId: "aurora" });

    expect(container.querySelector('[data-theme-id="aurora"]')).toBeInTheDocument();
  });

  it("changes background when theme changes to sunset", () => {
    const { container: auroraContainer } = renderCanvas({ themeId: "aurora" });
    const { container: sunsetContainer } = renderCanvas({ themeId: "sunset" });

    const aurora = auroraContainer.querySelector('[data-theme-id="aurora"]') as HTMLElement;
    const sunset = sunsetContainer.querySelector('[data-theme-id="sunset"]') as HTMLElement;

    expect(sunset.style.background).not.toBe(aurora.style.background);
  });

  it("renders focused life area zones with Vietnamese labels", () => {
    renderCanvas({ showZones: true, focusAreaIds: ["Health", "Career"] });

    expect(screen.getByText("Sức khỏe")).toBeInTheDocument();
    expect(screen.getByText("Sự nghiệp")).toBeInTheDocument();
  });

  it("renders polaroid image frame", () => {
    const item: VisionBoardItem = {
      ...BASE_ITEM,
      type: "image",
      content: "https://picsum.photos/seed/test/480/360",
      style: { imageFrame: "polaroid" },
    };
    const { container } = renderCanvas({ items: [item] });

    expect(container.querySelector(".vision-frame-polaroid")).toBeInTheDocument();
  });

  it("selects an item on pointer down", () => {
    const onItemSelect = vi.fn();
    renderCanvas({ onItemSelect });

    fireEvent.pointerDown(screen.getByText("Tôi đang xây một cuộc sống rõ hướng."), {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });

    expect(onItemSelect).toHaveBeenCalledWith("item_1");
  });

  it("clears selection when clicking canvas background", () => {
    const onItemSelect = vi.fn();
    renderCanvas({ onItemSelect, selectedItemId: "item_1" });

    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn phần tử" }));

    expect(onItemSelect).toHaveBeenCalledWith(null);
  });

  it("renders empty state slot when there are no items", () => {
    renderCanvas({ items: [], emptyStateSlot: <div>Chưa có phần tử nào</div> });

    expect(screen.getByText("Chưa có phần tử nào")).toBeInTheDocument();
  });
});
