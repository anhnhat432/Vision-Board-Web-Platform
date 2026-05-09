import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionBlock } from "./SectionBlock";

describe("SectionBlock", () => {
  it("uses tokenized default spacing for the section and content stack", () => {
    render(
      <SectionBlock title="Nhịp làm việc" description="Một nhóm nội dung">
        <div>Nội dung chính</div>
      </SectionBlock>,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Nhịp làm việc" });
    const section = heading.closest("section");
    const content = screen.getByText("Nội dung chính").parentElement;

    expect(section).toHaveClass("stack-stack");
    expect(content).toHaveClass("stack-stack");
  });

  it("allows compact and loose density overrides without changing callers' structure", () => {
    const { rerender } = render(
      <SectionBlock title="Gọn" density="compact">
        <div>Nội dung gọn</div>
      </SectionBlock>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Gọn" }).closest("section")).toHaveClass("stack-tight");

    rerender(
      <SectionBlock title="Thoáng" density="loose">
        <div>Nội dung thoáng</div>
      </SectionBlock>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Thoáng" }).closest("section")).toHaveClass(
      "stack-section",
    );
  });
});
