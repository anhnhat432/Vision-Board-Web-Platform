import { describe, expect, it } from "vitest";

import { normalizeVisionBoard, normalizeVisionBoardItem } from "./storage-vision-board-ops";

describe("normalizeVisionBoardItem", () => {
  it("keeps old item shape valid with undefined style", () => {
    const normalized = normalizeVisionBoardItem({
      id: "item_1",
      type: "quote",
      content: "Keep going",
      x: 12,
      y: 24,
      width: 220,
      height: 180,
    });

    expect(normalized).toMatchObject({
      id: "item_1",
      type: "quote",
      content: "Keep going",
      x: 12,
      y: 24,
      width: 220,
      height: 180,
    });
    expect(normalized?.style).toBeUndefined();
  });

  it("keeps goal card type and goal id content", () => {
    const normalized = normalizeVisionBoardItem({
      id: "item_goal",
      type: "goal_card",
      content: "goal_123",
      x: 10,
      y: 10,
      width: 220,
      height: 220,
    });

    expect(normalized?.type).toBe("goal_card");
    expect(normalized?.content).toBe("goal_123");
  });

  it("keeps life area id", () => {
    const normalized = normalizeVisionBoardItem({
      id: "item_health",
      type: "image",
      content: "https://example.com/image.jpg",
      x: 10,
      y: 10,
      width: 220,
      height: 220,
      lifeAreaId: "Health",
    });

    expect(normalized?.lifeAreaId).toBe("Health");
  });

  it("returns null for null input", () => {
    expect(normalizeVisionBoardItem(null)).toBeNull();
  });

  it("falls back invalid type to image", () => {
    const normalized = normalizeVisionBoardItem({
      id: "item_invalid",
      type: "video",
      content: "https://example.com/video.mp4",
      x: 10,
      y: 10,
      width: 220,
      height: 220,
    });

    expect(normalized?.type).toBe("image");
  });
});

describe("normalizeVisionBoard", () => {
  it("keeps theme undefined when old board has no theme", () => {
    const normalized = normalizeVisionBoard({
      id: "board_1",
      name: "My Board",
      year: "2026",
      items: [],
      createdAt: "2026-05-17T00:00:00.000Z",
    });

    expect(normalized?.theme).toBeUndefined();
  });

  it("keeps theme undefined when board theme is invalid", () => {
    const normalized = normalizeVisionBoard({
      id: "board_1",
      name: "My Board",
      year: "2026",
      items: [],
      createdAt: "2026-05-17T00:00:00.000Z",
      theme: "neon",
    });

    expect(normalized?.theme).toBeUndefined();
  });

  it("falls back non-array items to an empty array", () => {
    const normalized = normalizeVisionBoard({
      id: "board_1",
      name: "My Board",
      year: "2026",
      items: "bad-items",
      createdAt: "2026-05-17T00:00:00.000Z",
    });

    expect(normalized?.items).toEqual([]);
  });

  it("returns null for null input", () => {
    expect(normalizeVisionBoard(null)).toBeNull();
  });
});
