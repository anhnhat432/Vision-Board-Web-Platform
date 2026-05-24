import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { OrderProgressBar } from "./OrderProgressBar";

describe("OrderProgressBar", () => {
  it("renders 5 steps with correct status", () => {
    render(
      <OrderProgressBar
        currentStep={2}
        completedSteps={[1]}
        onStepClick={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Khung/ })).toHaveAttribute(
      "data-status",
      "done",
    );
    expect(screen.getByRole("button", { name: /Theme/ })).toHaveAttribute(
      "data-status",
      "current",
    );
    expect(screen.getByRole("button", { name: /Sticker/ })).toHaveAttribute(
      "data-status",
      "pending",
    );
  });

  it("calls onStepClick with step number when clicked", () => {
    const onStepClick = vi.fn();
    render(
      <OrderProgressBar
        currentStep={1}
        completedSteps={[]}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Theme/ }));
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it("shows mobile compact label with current step name", () => {
    render(
      <OrderProgressBar
        currentStep={2}
        completedSteps={[1]}
        onStepClick={() => {}}
      />,
    );
    expect(screen.getByText(/Bước 2\/5/)).toBeInTheDocument();
  });
});
