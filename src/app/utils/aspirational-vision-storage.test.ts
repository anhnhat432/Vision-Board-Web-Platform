import { beforeEach, describe, expect, it } from "vitest";

import { getUserData, saveUserData } from "./storage";
import type { AspirationalVision } from "./storage-types";

const VISION: AspirationalVision = {
  id: "vision_3y_1",
  horizonYears: 3,
  summary: "Ba năm tới tôi muốn khỏe hơn, làm việc sâu hơn và có nhịp sống bền vững hơn.",
  lifeAreas: [
    {
      area: "health",
      statement: "Tôi có sức bền tốt và duy trì vận động đều.",
    },
  ],
  createdAt: "2026-05-09T00:00:00.000Z",
  updatedAt: "2026-05-09T00:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
});

describe("aspirationalVision storage compatibility", () => {
  it("defaults to undefined for existing user data without a vision", () => {
    const data = getUserData();

    expect(data.aspirationalVision).toBeUndefined();
  });

  it("preserves a valid optional aspirational vision through save/load", () => {
    const data = getUserData();

    saveUserData({
      ...data,
      aspirationalVision: VISION,
    });

    expect(getUserData().aspirationalVision).toEqual(VISION);
  });
});
