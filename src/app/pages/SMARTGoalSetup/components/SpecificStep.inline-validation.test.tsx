import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { SMARTData } from "../types";
import { SpecificStep } from "./SpecificStep";

/**
 * Task 17.2 — inline validation cạnh field + không mất dữ liệu (Req 13.1, 13.3, 13.6).
 *
 * SpecificStep nối `resolveFieldErrorDisplay` (bọc `resolveFieldValidationState`)
 * vào slot lỗi cạnh field. Quá trình phân giải lỗi là *đồng bộ* trong cùng chu kỳ
 * render với thay đổi giá trị/blur (không có debounce/timer), nên ngưỡng ≤ 500ms
 * của Req 13.1/13.3 luôn được thoả với biên độ lớn — test khẳng định lỗi
 * xuất hiện/gỡ ngay sau tương tác, đồng thời giá trị đã nhập không bị reset.
 */
const INLINE_ERROR = "Mục tiêu cụ thể cần ít nhất 10 ký tự có nghĩa.";

function makeSmartData(overrides: Partial<SMARTData> = {}): SMARTData {
  return {
    specific: { goal_statement: "" },
    measurable: { metric_name: "", baseline_value: "", target_value: "" },
    achievable: { weekly_time_commitment_hours: "", required_skills: "", support_resources: "" },
    relevant: { motivation_reason: "", life_dimension_alignment: "" },
    timeBound: { mode: "weeks", target_date: "", target_weeks: "" },
    ...overrides,
  };
}

function SpecificStepHarness() {
  const [smartData, setSmartData] = useState<SMARTData>(makeSmartData());
  return <SpecificStep smartData={smartData} setSmartData={setSmartData} showError={false} />;
}

describe("SpecificStep — inline validation + giữ dữ liệu", () => {
  it("hiện lỗi cạnh field ngay sau khi blur field không hợp lệ, trong ≤ 500ms (Req 13.1, 13.2)", async () => {
    const user = userEvent.setup();
    render(<SpecificStepHarness />);

    const textarea = screen.getByLabelText(/Mục tiêu cụ thể/i);
    expect(screen.queryByText(INLINE_ERROR)).toBeNull();

    // Blur field khi còn rỗng → không đạt điều kiện hợp lệ.
    await user.click(textarea);
    await user.tab();

    // Lỗi phân giải đồng bộ khi blur (không debounce) → hiện tức thì < 500ms.
    expect(screen.getByText(INLINE_ERROR)).toBeInTheDocument();
    // Lỗi được gắn cạnh field qua aria-describedby + aria-invalid.
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea.getAttribute("aria-describedby")).toContain("smart-specific-error");
    expect(screen.getByText(INLINE_ERROR).closest("#smart-specific-error")).not.toBeNull();
  });

  it("gỡ lỗi ngay khi người dùng sửa field thành hợp lệ, trong ≤ 500ms (Req 13.3)", async () => {
    const user = userEvent.setup();
    render(<SpecificStepHarness />);

    const textarea = screen.getByLabelText(/Mục tiêu cụ thể/i);
    await user.click(textarea);
    await user.tab();
    expect(screen.getByText(INLINE_ERROR)).toBeInTheDocument();

    // Sửa thành giá trị hợp lệ (≥ 10 ký tự có nghĩa) → lỗi gỡ đồng bộ.
    await user.click(textarea);
    await user.type(textarea, "Hoàn thành khóa học React nâng cao trong 12 tuần");

    expect(screen.queryByText(INLINE_ERROR)).toBeNull();
    expect(textarea).toHaveAttribute("aria-invalid", "false");
  });

  it("validation fail không reset/clear giá trị người dùng đã nhập (Req 13.6)", async () => {
    const user = userEvent.setup();
    render(<SpecificStepHarness />);

    const textarea = screen.getByLabelText<HTMLTextAreaElement>(/Mục tiêu cụ thể/i);
    // Nhập giá trị chưa đủ điều kiện (dưới 10 ký tự) → sẽ vi phạm rule minLength.
    await user.type(textarea, "ngắn");

    // Lỗi hiển thị nhưng giá trị đã nhập được giữ nguyên, không bị xóa.
    expect(screen.getByText(INLINE_ERROR)).toBeInTheDocument();
    expect(textarea.value).toBe("ngắn");
  });
});
