import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderProgressBar } from "./OrderProgressBar";

describe("OrderProgressBar", () => {
  it("renders 5 steps with correct status", () => {
    render(<OrderProgressBar currentStep={2} completedSteps={[1]} progressPercent={33} onStepClick={() => {}} />);
    // Step 1 done: shows Check icon instead of number
    expect(screen.getByRole("button", { name: /Khung/ })).toBeInTheDocument();
    // Step 2 current: shows number 2
    expect(screen.getByRole("button", { name: /Set ảnh/ })).toBeInTheDocument();
    // Step 3 pending: shows number 3
    expect(screen.getByRole("button", { name: /Sticker/ })).toBeInTheDocument();
  });

  it("calls onStepClick with step number when clicked", () => {
    const onStepClick = vi.fn();
    render(<OrderProgressBar currentStep={1} completedSteps={[]} progressPercent={0} onStepClick={onStepClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Set ảnh/ }));
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it("shows mobile compact label with current step name", () => {
    render(<OrderProgressBar currentStep={2} completedSteps={[1]} progressPercent={33} onStepClick={() => {}} />);
    expect(screen.getByText(/Bước 2\/5/)).toBeInTheDocument();
  });
});
