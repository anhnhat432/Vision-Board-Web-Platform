import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocalOnlyNotice } from "./LocalOnlyNotice";

describe("LocalOnlyNotice", () => {
  it("renders the default message and uses role=status", () => {
    render(<LocalOnlyNotice testId="local" />);
    const node = screen.getByTestId("local");
    expect(node.getAttribute("role")).toBe("status");
    expect(node.textContent).toMatch(/lưu trên thiết bị này/i);
  });

  it("uses a custom message when provided", () => {
    render(<LocalOnlyNotice message="Chỉ lưu trên máy này." testId="local" />);
    expect(screen.getByTestId("local").textContent).toContain("Chỉ lưu trên máy này.");
  });

  it("renders a compact pill variant", () => {
    render(<LocalOnlyNotice variant="compact" message="Local only" testId="local" />);
    const node = screen.getByTestId("local");
    expect(node.tagName.toLowerCase()).toBe("span");
    expect(node.textContent).toContain("Local only");
  });

  it("renders optional action slot when provided", () => {
    render(<LocalOnlyNotice message="x" action={<button type="button">Xuất bản sao</button>} testId="local" />);
    expect(screen.getByRole("button", { name: "Xuất bản sao" })).toBeInTheDocument();
  });
});
