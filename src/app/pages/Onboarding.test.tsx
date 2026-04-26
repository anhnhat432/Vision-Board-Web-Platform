import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Onboarding } from "./Onboarding";

describe("Onboarding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses a lighter primary CTA and starts the assessment at the top of the page", async () => {
    const scrollToMock = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    const startButton = await screen.findByRole("button", { name: /Bắt đầu đánh giá/i });
    expect(startButton).toHaveClass("bg-violet-50");
    expect(startButton).not.toHaveClass("bg-slate-950");

    scrollToMock.mockClear();
    await user.click(startButton);

    expect(await screen.findByRole("heading", { name: /Chấm điểm hiện tại/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    });

    scrollToMock.mockRestore();
  });
});
