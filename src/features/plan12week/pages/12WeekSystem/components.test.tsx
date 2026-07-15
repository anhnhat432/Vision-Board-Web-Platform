import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TwelveWeekTabFallback } from "./components";

describe("TwelveWeekTabFallback", () => {
  it("reserves the tab shape with reduced-motion-safe skeleton rows", () => {
    const { container } = render(
      <TwelveWeekTabFallback
        title="Đang mở tab Tuần"
        description="Review tuần sẽ xuất hiện ngay sau khi tải xong."
      />,
    );

    expect(screen.getByRole("status", { name: "Đang mở tab Tuần" })).toHaveTextContent(
      "Review tuần sẽ xuất hiện ngay sau khi tải xong.",
    );
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
  });
});
