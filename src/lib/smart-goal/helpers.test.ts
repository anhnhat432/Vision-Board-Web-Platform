import { describe, expect, it } from "vitest";

import { hasOutcomeIndicator } from "./helpers";

describe("hasOutcomeIndicator", () => {
  it("recognizes Vietnamese outcome verbs used by the SMART goal setup copy", () => {
    expect(hasOutcomeIndicator("Hoàn thành một hệ thống review cá nhân trong 12 tuần.")).toBe(true);
    expect(hasOutcomeIndicator("Ra mắt một dashboard theo dõi tiến độ tuần.")).toBe(true);
    expect(hasOutcomeIndicator("Duy trì 3 buổi tập mỗi tuần.")).toBe(true);
    expect(hasOutcomeIndicator("Đạt mốc tiết kiệm đầu tiên trước cuối quý.")).toBe(true);
  });

  it("keeps vague statements from passing the clarity check", () => {
    expect(hasOutcomeIndicator("Tôi muốn tốt hơn trong công việc.")).toBe(false);
  });
});
