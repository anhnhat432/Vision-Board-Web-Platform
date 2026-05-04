import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Sparkles } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title at the requested heading level", () => {
    render(<EmptyState title="Chưa có kế hoạch" headingLevel={2} />);
    const heading = screen.getByRole("heading", { level: 2, name: "Chưa có kế hoạch" });
    expect(heading).toBeInTheDocument();
  });

  it("defaults the heading to level 3 when not specified", () => {
    render(<EmptyState title="Chưa có việc" />);
    expect(screen.getByRole("heading", { level: 3, name: "Chưa có việc" })).toBeInTheDocument();
  });

  it("shows eyebrow, description and children slot content", () => {
    render(
      <EmptyState
        eyebrow="Workspace mới"
        title="Chưa có dữ liệu"
        description="Bắt đầu bằng Life Balance."
      >
        <p>Gợi ý 1</p>
      </EmptyState>,
    );
    expect(screen.getByText("Workspace mới")).toBeInTheDocument();
    expect(screen.getByText("Bắt đầu bằng Life Balance.")).toBeInTheDocument();
    expect(screen.getByText("Gợi ý 1")).toBeInTheDocument();
  });

  it("renders actions and lets them fire", async () => {
    const onStart = vi.fn();
    render(
      <EmptyState
        title="Chưa có dữ liệu"
        actions={<Button onClick={onStart}>Bắt đầu</Button>}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("forwards data-testid for targeted selection", () => {
    render(<EmptyState title="No data" testId="sample-empty" />);
    expect(screen.getByTestId("sample-empty")).toBeInTheDocument();
  });

  it("marks the decorative icon as aria-hidden", () => {
    const { container } = render(
      <EmptyState title="Chưa có dữ liệu" icon={<Sparkles data-testid="icon" />} />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    const iconWrapper = container.querySelector('[aria-hidden="true"]');
    expect(iconWrapper).not.toBeNull();
  });

  it("switches container style when variant=dashed", () => {
    const { container } = render(
      <EmptyState variant="dashed" title="Chưa có việc" testId="dashed" />,
    );
    const root = screen.getByTestId("dashed");
    expect(root.className).toContain("border-dashed");
    expect(container.querySelector(".rounded-\\[26px\\]")).toBeNull();
  });
});
