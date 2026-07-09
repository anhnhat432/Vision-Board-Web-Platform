import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SMARTData } from "../types";
import { MeasurableStep } from "./MeasurableStep";

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

describe("MeasurableStep — intent metric hint", () => {
  it("renders nothing extra when no intentMetricHint is provided (backwards-compat)", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep smartData={makeSmartData()} setSmartData={setSmartData} currentStepHasDraftContent={false} />,
    );
    expect(screen.queryByTestId("smart-intent-metric-hint")).toBeNull();
    const input = screen.getByLabelText(/Tên chỉ số đo lường/i);
    expect(input.getAttribute("aria-describedby")).toBe("smart-metric-name-hint");
  });

  it("renders the hint banner when intentMetricHint is provided, extending aria-describedby", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep
        smartData={makeSmartData()}
        setSmartData={setSmartData}
        currentStepHasDraftContent={false}
        intentMetricHint="Số đề thi thử hoàn thành + điểm thử"
      />,
    );
    const hint = screen.getByTestId("smart-intent-metric-hint");
    expect(hint).toHaveTextContent(/Gợi ý đo lường/i);
    expect(hint).toHaveTextContent(/đề thi thử/i);
    const input = screen.getByLabelText(/Tên chỉ số đo lường/i);
    const described = input.getAttribute("aria-describedby") ?? "";
    expect(described.split(/\s+/)).toEqual(
      expect.arrayContaining(["smart-metric-name-hint", "smart-metric-intent-hint"]),
    );
  });

  it("marks target invalid and shows copy when target is not larger than baseline", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep
        smartData={makeSmartData({
          measurable: {
            metric_name: "Số bài viết",
            baseline_value: "10",
            target_value: "10",
          },
        })}
        setSmartData={setSmartData}
        currentStepHasDraftContent
      />,
    );

    const targetInput = screen.getByLabelText(/Mức đích/i);
    expect(targetInput).toHaveAttribute("aria-invalid", "true");
    expect(targetInput.getAttribute("aria-describedby")).toContain("smart-target-error");
    expect(targetInput.getAttribute("aria-describedby")).toContain("smart-target-hint");
    expect(screen.getByText("Mục tiêu cần lớn hơn mốc hiện tại")).toBeInTheDocument();
  });

  it("connects invalid baseline copy to the baseline field", () => {
    const setSmartData = vi.fn();
    render(
      <MeasurableStep
        smartData={makeSmartData({
          measurable: {
            metric_name: "Số bài viết",
            baseline_value: "abc",
            target_value: "12",
          },
        })}
        setSmartData={setSmartData}
        currentStepHasDraftContent
      />,
    );

    const baselineInput = screen.getByLabelText(/Mức xuất phát/i);
    expect(baselineInput).toHaveAttribute("aria-invalid", "true");
    expect(baselineInput.getAttribute("aria-describedby")).toContain("smart-baseline-error");
    expect(baselineInput.getAttribute("aria-describedby")).toContain("smart-baseline-hint");
    expect(screen.getByText("Nhập con số hợp lệ.")).toBeInTheDocument();
  });

  it("shows required hints after first blur without waiting for submit", async () => {
    const user = userEvent.setup();
    const setSmartData = vi.fn();
    render(
      <MeasurableStep smartData={makeSmartData()} setSmartData={setSmartData} currentStepHasDraftContent={false} />,
    );

    const metricInput = screen.getByLabelText(/Tên chỉ số đo lường/i);
    expect(screen.queryByText("Chọn một chỉ số cụ thể để bắt đầu đo lường.")).toBeNull();

    await user.click(metricInput);
    await user.tab();

    expect(metricInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Chọn một chỉ số cụ thể để bắt đầu đo lường.")).toBeInTheDocument();
    expect(metricInput.getAttribute("aria-describedby")).toContain("smart-metric-name-error");
  });
});
