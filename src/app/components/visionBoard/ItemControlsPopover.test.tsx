import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { VisionBoardItem } from "@/app/utils/storage-types";
import { SIZE_PRESETS } from "@/app/utils/vision-board-config";
import { ItemControlsPopover } from "./ItemControlsPopover";

const BASE_ITEM: VisionBoardItem = {
  id: "item_1",
  type: "image",
  content: "https://example.com/image.jpg",
  x: 10,
  y: 12,
  width: SIZE_PRESETS.M.width,
  height: 140,
  lifeAreaId: "Career",
  style: { sizePreset: "M", imageFrame: "shadow" },
};

function renderPopover(item: VisionBoardItem = BASE_ITEM) {
  return {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    user: userEvent.setup(),
    ...render(<ItemControlsPopover item={item} onUpdate={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />),
  };
}

function renderPopoverWithHandlers(item: VisionBoardItem = BASE_ITEM) {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const onClose = vi.fn();
  return {
    onUpdate,
    onDelete,
    onClose,
    user: userEvent.setup(),
    ...render(<ItemControlsPopover item={item} onUpdate={onUpdate} onDelete={onDelete} onClose={onClose} />),
  };
}

describe("ItemControlsPopover", () => {
  it("renders image controls", () => {
    renderPopover();

    expect(screen.getByText("Kích thước")).toBeInTheDocument();
    expect(screen.getByText("Life area")).toBeInTheDocument();
    expect(screen.getByText("Khung ảnh")).toBeInTheDocument();
    expect(screen.queryByText("Kiểu chữ")).not.toBeInTheDocument();
  });

  it("renders quote controls", () => {
    renderPopover({
      ...BASE_ITEM,
      type: "quote",
      content: "Tập trung",
      style: { sizePreset: "M", quoteFont: "default" },
    });

    expect(screen.getByText("Kích thước")).toBeInTheDocument();
    expect(screen.getByText("Life area")).toBeInTheDocument();
    expect(screen.getByText("Kiểu chữ")).toBeInTheDocument();
    expect(screen.queryByText("Khung ảnh")).not.toBeInTheDocument();
  });

  it("renders goal card controls", () => {
    renderPopover({ ...BASE_ITEM, type: "goal_card", content: "goal_1", style: { sizePreset: "M" } });

    expect(screen.getByText("Kích thước")).toBeInTheDocument();
    expect(screen.getByText("Life area")).toBeInTheDocument();
    expect(screen.queryByText("Khung ảnh")).not.toBeInTheDocument();
    expect(screen.queryByText("Kiểu chữ")).not.toBeInTheDocument();
  });

  it("updates size and width", async () => {
    const { onUpdate, user } = renderPopoverWithHandlers();

    await user.click(screen.getByRole("button", { name: "Lớn" }));

    expect(onUpdate).toHaveBeenCalledWith("item_1", {
      style: { sizePreset: "L", imageFrame: "shadow" },
      width: SIZE_PRESETS.L.width,
    });
  });

  it("updates life area", async () => {
    const { onUpdate, user } = renderPopoverWithHandlers();

    await user.click(screen.getByRole("button", { name: "Sức khỏe" }));

    expect(onUpdate).toHaveBeenCalledWith("item_1", { lifeAreaId: "Health" });
  });

  it("clears life area", async () => {
    const { onUpdate, user } = renderPopoverWithHandlers();

    await user.click(screen.getByRole("button", { name: "Không" }));

    expect(onUpdate).toHaveBeenCalledWith("item_1", { lifeAreaId: undefined });
  });

  it("deletes item and closes", async () => {
    const { onDelete, onClose, user } = renderPopoverWithHandlers();

    await user.click(screen.getByRole("button", { name: "Xóa khỏi bảng" }));

    expect(onDelete).toHaveBeenCalledWith("item_1");
    expect(onClose).toHaveBeenCalled();
  });
});
