import { describe, expect, it } from "vitest";

import type { TimeBlock } from "@/app/utils/storage-types";
import { getDefaultTimeBlocks, getUpcomingStrategicBlock, validateTimeBlocks } from "./timeBlocks";

describe("timeBlocks", () => {
  it("returns the MVP default weekly Performance Time Blocking template", () => {
    expect(getDefaultTimeBlocks()).toEqual([
      expect.objectContaining({
        type: "strategic",
        dayOfWeek: "Tuesday",
        startTime: "09:00",
        durationMinutes: 180,
      }),
      expect.objectContaining({
        type: "buffer",
        dayOfWeek: "Wednesday",
        startTime: "14:00",
        durationMinutes: 45,
      }),
      expect.objectContaining({
        type: "buffer",
        dayOfWeek: "Friday",
        startTime: "14:00",
        durationMinutes: 45,
      }),
      expect.objectContaining({
        type: "breakout",
        dayOfWeek: "Saturday",
        startTime: "15:00",
        durationMinutes: 180,
      }),
    ]);
  });

  it("rejects overlapping blocks on the same day", () => {
    const blocks: TimeBlock[] = [
      {
        id: "block_1",
        type: "strategic",
        dayOfWeek: "Tuesday",
        startTime: "09:00",
        durationMinutes: 180,
      },
      {
        id: "block_2",
        type: "buffer",
        dayOfWeek: "Tuesday",
        startTime: "10:30",
        durationMinutes: 45,
      },
    ];

    const result = validateTimeBlocks(blocks);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tuesday có khung bị trùng giờ.");
  });

  it("finds a Strategic Block that starts within the next two hours", () => {
    const blocks: TimeBlock[] = [
      {
        id: "strategic_1",
        type: "strategic",
        dayOfWeek: "Tuesday",
        startTime: "09:00",
        durationMinutes: 180,
      },
    ];

    expect(getUpcomingStrategicBlock(blocks, new Date(2026, 4, 5, 7, 0))?.id).toBe("strategic_1");
    expect(getUpcomingStrategicBlock(blocks, new Date(2026, 4, 5, 6, 59))).toBeNull();
    expect(getUpcomingStrategicBlock(blocks, new Date(2026, 4, 5, 9, 1))).toBeNull();
  });
});
