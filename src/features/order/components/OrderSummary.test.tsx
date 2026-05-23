import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { OrderSummary } from "./OrderSummary";

describe("OrderSummary", () => {
  it("renders lines + total + included items", () => {
    render(
      <OrderSummary
        lines={[
          {
            itemId: "frame:30x40",
            label: "Khung 30×40",
            type: "frame",
            qty: 1,
            unitPriceVnd: 119000,
            lineTotalVnd: 119000,
          },
        ]}
        subtotalVnd={119000}
        shippingVnd={0}
        totalVnd={119000}
        isSubmittable
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText(/Khung 30×40/)).toBeInTheDocument();
    expect(screen.getByText(/Tổng đơn/)).toBeInTheDocument();
    expect(screen.getByText(/Tờ hướng dẫn SMART Goal/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt đơn/ })).toBeEnabled();
  });

  it("disables CTA when not submittable", () => {
    render(
      <OrderSummary
        lines={[]}
        subtotalVnd={0}
        shippingVnd={0}
        totalVnd={0}
        isSubmittable={false}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Đặt đơn/ })).toBeDisabled();
  });
});
