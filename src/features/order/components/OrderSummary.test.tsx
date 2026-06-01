import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
        selectedFrame={null}
        selectedThemes={[]}
        selectedSticker={null}
      />,
    );
    expect(screen.getByText(/Khung 30×40/)).toBeInTheDocument();
    expect(screen.getByText(/Tổng tạm tính/)).toBeInTheDocument();
    expect(screen.getByText(/Tờ hướng dẫn SMART Goal/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt đơn/ })).toBeEnabled();
  });

  it("shows missing fields warning when not submittable", () => {
    render(
      <OrderSummary
        lines={[]}
        subtotalVnd={0}
        shippingVnd={0}
        totalVnd={0}
        isSubmittable={false}
        missingFields={["kích thước khung", "địa chỉ"]}
        onSubmit={() => {}}
        selectedFrame={null}
        selectedThemes={[]}
        selectedSticker={null}
      />,
    );
    expect(screen.getByText(/Còn thiếu/)).toHaveTextContent("kích thước khung");
    expect(screen.getByText(/Còn thiếu/)).toHaveTextContent("địa chỉ");
  });

  it("shows preview empty state when no thumbnail-bearing item is selected", () => {
    render(
      <OrderSummary
        lines={[]}
        subtotalVnd={0}
        shippingVnd={0}
        totalVnd={0}
        isSubmittable={false}
        onSubmit={() => {}}
        selectedFrame={null}
        selectedThemes={[]}
        selectedSticker={null}
      />,
    );
    expect(screen.getByText(/Chọn khung và set ảnh để xem trước/)).toBeInTheDocument();
  });

  it("renders preview thumbnails when selected items have thumbnails", () => {
    render(
      <OrderSummary
        lines={[]}
        subtotalVnd={0}
        shippingVnd={0}
        totalVnd={0}
        isSubmittable={false}
        onSubmit={() => {}}
        selectedFrame={{
          itemId: "frame:30x40",
          type: "frame",
          label: "Khung 30×40",
          priceVnd: 119000,
          sortOrder: 1,
          isActive: true,
          thumbnail: "/img/frame.png",
        }}
        selectedThemes={[
          {
            itemId: "theme:money",
            type: "theme",
            label: "MONEY",
            priceVnd: 50000,
            sortOrder: 1,
            isActive: true,
            thumbnail: "/img/money.png",
          },
        ]}
        selectedSticker={null}
      />,
    );
    expect(screen.getByAltText("Khung 30×40")).toBeInTheDocument();
    expect(screen.getByAltText("MONEY")).toBeInTheDocument();
  });
});
