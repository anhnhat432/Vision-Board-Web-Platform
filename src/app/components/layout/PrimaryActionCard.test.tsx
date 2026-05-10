import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PrimaryActionCard } from "./PrimaryActionCard";

describe("PrimaryActionCard", () => {
  it("renders the default hero shell with tokenized card spacing", () => {
    const { container } = render(
      <PrimaryActionCard
        title="Việc quan trọng nhất"
        description="Chỉ cần xong việc này là hôm nay đã đủ."
        action={<button type="button">Đánh dấu xong</button>}
        hero
      >
        <p>Chi tiết hành động chính.</p>
      </PrimaryActionCard>,
    );

    const card = screen.getByRole("heading", { name: "Việc quan trọng nhất" }).closest("[data-slot='card']");
    expect(card).toHaveClass("border-2", "border-primary", "hero-surface", "rounded-[var(--r-card)]");
    expect(screen.getByText("Chi tiết hành động chính.")).toBeInTheDocument();

    // visual change PR-UX-5 hero card pattern
    expect(container.firstChild).toMatchSnapshot();
  });

  it("supports tone, density, eyebrow and icon props without losing the action", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <PrimaryActionCard
        title="Nhịp tuần này"
        description="Một thẻ hero duy nhất cho màn hình."
        eyebrow="Trạng thái nhịp"
        icon={<span aria-hidden="true">Icon</span>}
        tone="emerald"
        density="compact"
        titleAs="h2"
        action={
          <button type="button" onClick={onClick}>
            Mở tab Hôm nay
          </button>
        }
      />,
    );

    const card = screen.getByRole("heading", { level: 2, name: "Nhịp tuần này" }).closest("[data-slot='card']");
    expect(screen.getByText("Trạng thái nhịp")).toBeInTheDocument();
    expect(card).toHaveClass("border-emerald-300", "p-[var(--space-stack)]");
    expect(card).not.toHaveClass("hero-surface");

    await user.click(screen.getByRole("button", { name: "Mở tab Hôm nay" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
