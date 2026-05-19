import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LIFE_AREAS } from "@/app/utils/storage-constants";
import type { VisionBoardItem } from "@/app/utils/storage-types";
import { VisionBoardSidebar } from "./VisionBoardSidebar";

const BASE_ITEM: VisionBoardItem = {
  id: "item_1",
  type: "image",
  content: "https://example.com/image.jpg",
  x: 10,
  y: 12,
  width: 220,
  height: 140,
};

function createItem(overrides: Partial<VisionBoardItem>): VisionBoardItem {
  return { ...BASE_ITEM, id: overrides.id ?? BASE_ITEM.id, ...overrides };
}

describe("VisionBoardSidebar", () => {
  it("renders all empty area counts and suggestions", () => {
    render(<VisionBoardSidebar items={[]} />);

    LIFE_AREAS.forEach((area) => {
      const row = screen.getByTestId(`life-area-row-${area.name}`);
      expect(within(row).getByText("0")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Thêm 1 ảnh hoặc câu nói cho vùng này.")).toHaveLength(LIFE_AREAS.length);
  });

  it("renders area count and total for mixed items", () => {
    render(
      <VisionBoardSidebar
        items={[
          createItem({ id: "item_1", type: "image", lifeAreaId: "Health" }),
          createItem({ id: "item_2", type: "image" }),
          createItem({ id: "item_3", type: "quote", content: "Tôi khỏe hơn mỗi ngày" }),
        ]}
      />,
    );

    expect(within(screen.getByTestId("life-area-row-Health")).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/phần tử đang có trên bảng/)).toBeInTheDocument();
  });

  it("sorts focus areas first and renders focus badges", () => {
    render(
      <VisionBoardSidebar
        items={[createItem({ id: "item_1", lifeAreaId: "Health" })]}
        focusAreaIds={["Health", "Career"]}
      />,
    );

    const rows = screen.getAllByTestId(/life-area-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "life-area-row-Health");
    expect(rows[1]).toHaveAttribute("data-testid", "life-area-row-Career");
    expect(screen.getAllByText("Trọng tâm")).toHaveLength(2);
  });

  it("renders stat breakdown", () => {
    render(
      <VisionBoardSidebar
        items={[
          createItem({ id: "item_1", type: "image" }),
          createItem({ id: "item_2", type: "image" }),
          createItem({ id: "item_3", type: "quote", content: "Tập trung" }),
        ]}
      />,
    );

    const imageStat = screen.getByText("Hình ảnh").closest("div");
    const quoteStat = screen.getByText("Câu nói").closest("div");

    expect(imageStat).not.toBeNull();
    expect(quoteStat).not.toBeNull();
    expect(within(imageStat as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(within(quoteStat as HTMLElement).getByText("1")).toBeInTheDocument();
  });

  it("fills progress bar by area count capped at four items", () => {
    render(
      <VisionBoardSidebar
        items={[createItem({ id: "item_1", lifeAreaId: "Health" }), createItem({ id: "item_2", lifeAreaId: "Health" })]}
      />,
    );

    expect(screen.getByTestId("life-area-fill-Health")).toHaveStyle({ width: "50%" });
  });
});
