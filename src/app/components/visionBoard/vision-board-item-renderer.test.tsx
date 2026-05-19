import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { VisionBoardItem } from "@/app/utils/storage-types";
import { VisionBoardItemRenderer } from "./VisionBoardItemRenderer";

const BASE_ITEM: VisionBoardItem = {
  id: "item_1",
  type: "quote",
  content: "Tôi là bình minh",
  x: 0,
  y: 0,
  width: 220,
  height: 140,
};

describe("VisionBoardItemRenderer", () => {
  it("renders handwriting quote font family", () => {
    render(<VisionBoardItemRenderer item={{ ...BASE_ITEM, style: { quoteFont: "handwriting" } }} goalsById={{}} />);

    expect(screen.getByText("Tôi là bình minh").style.fontFamily).toContain("Caveat");
  });

  it("renders large icon at 128px", () => {
    const { container } = render(
      <VisionBoardItemRenderer
        item={{ ...BASE_ITEM, type: "icon", content: "Star", style: { sizePreset: "L" } }}
        goalsById={{}}
      />,
    );

    expect(container.firstElementChild).toHaveStyle({ width: "128px", height: "128px" });
  });

  it("renders goal card chip for goal_card items", () => {
    render(
      <VisionBoardItemRenderer
        item={{ ...BASE_ITEM, type: "goal_card", content: "goal_1", lifeAreaId: "Health" }}
        goalsById={{
          goal_1: { title: "Chạy 5km", category: "Health", deadline: "2026-12-31", progress: 60 },
        }}
      />,
    );

    expect(screen.getByText("Chạy 5km")).toBeInTheDocument();
  });
});
