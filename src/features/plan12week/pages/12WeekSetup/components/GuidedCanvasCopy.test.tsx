import { describe, expect, it } from "vitest";

import { STEPS } from "../constantsLab";

describe("12-week setup Guided Canvas copy", () => {
  it("uses plain-language four-step labels", () => {
    expect(STEPS.map((step) => step.label)).toEqual(["Đích đến", "Hành động", "Lịch tuần", "Kích hoạt"]);
    expect(STEPS.map((step) => step.title)).toEqual([
      "Bạn muốn thấy điều gì sau 12 tuần?",
      "Chọn 2–3 việc sẽ kéo bạn tới đó",
      "Đặt nhịp cho tuần đầu",
      "Xem trước và kích hoạt",
    ]);
  });
});
