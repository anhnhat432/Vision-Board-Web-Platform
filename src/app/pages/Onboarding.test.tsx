import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserData, LIFE_AREAS, saveUserData } from "../utils/storage";
import { Onboarding } from "./Onboarding";

function mockMobileViewport() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("Onboarding", () => {
  beforeEach(() => {
    localStorage.clear();
    const data = getUserData();
    data.onboardingCompleted = false;
    data.currentWheelOfLife = LIFE_AREAS.map((area) => ({ ...area, score: 0 }));
    data.wheelOfLifeHistory = [];
    saveUserData(data);
    mockMobileViewport();
  });

  it("uses a clear primary CTA and starts the assessment at the top of the page", async () => {
    const scrollToMock = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    const startButton = await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i });
    const breathingStartButton = await screen.findByRole("button", { name: /Tập thở thư giãn/i });
    expect(breathingStartButton).toHaveClass("bg-white");
    expect(breathingStartButton).not.toHaveClass("gradient-brand");

    scrollToMock.mockClear();
    await user.click(startButton);

    expect(await screen.findByRole("heading", { name: /Rà 8 lĩnh vực để mở Life Insight/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });
    });

    scrollToMock.mockRestore();
  });

  it("treats a completed zero-score wheel as returning onboarding data", async () => {
    const data = getUserData();
    data.onboardingCompleted = true;
    data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }));
    saveUserData(data);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Cập nhật điểm hiện tại/i)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i }));
    expect(await screen.findByRole("button", { name: /Chọn trọng tâm/i })).toBeEnabled();
  });

  it("frames onboarding as a short eight-area scoring step", async () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText(/8 lĩnh vực/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 phút/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Mở bản đồ cuộc sống/i })).toBeInTheDocument();
  });

  it("shows returning users that existing scores will be updated", async () => {
    const data = getUserData();
    data.onboardingCompleted = true;
    data.currentWheelOfLife = data.currentWheelOfLife.map((area, index) => ({
      ...area,
      score: index === 0 ? 8 : 6,
    }));
    saveUserData(data);

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Cập nhật điểm hiện tại/i)).toBeInTheDocument();
    expect(screen.getByText(/không tạo lại từ đầu/i)).toBeInTheDocument();
  });

  it("does not save default scores when clicking 'Để sau' without reviewing any area", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    // Click return button on the welcome step without reviewing any areas
    const saveButton = await screen.findByRole("button", { name: /Để sau/i });
    await user.click(saveButton);

    // Verify the wheel of life data was NOT persisted with default scores
    const data = getUserData();
    expect(data.currentWheelOfLife.every((area) => area.score === 0)).toBe(true);
  });

  it("saves adjusted scores when clicking 'Để sau' after modifying sliders", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    // Go to assessment step first
    await user.click(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i }));

    // Modify first slider
    const firstSlider = screen.getAllByRole("slider")[0];
    fireEvent.change(firstSlider, { target: { value: "8" } });

    // Go back to welcome step and save
    await user.click(await screen.findByRole("button", { name: /Quay lại chào mừng/i }));
    await user.click(await screen.findByRole("button", { name: /Để sau/i }));

    // Verify the adjusted score was persisted
    const data = getUserData();
    expect(data.currentWheelOfLife[0].score).toBe(8);
  });

  it("returning user sees previously saved scores after save-and-return", async () => {
    // Simulate a previous save: set real scores
    const data = getUserData();
    data.currentWheelOfLife = LIFE_AREAS.map((area, index) => ({
      ...area,
      score: index + 2, // scores 2-9
    }));
    data.onboardingCompleted = true;
    saveUserData(data);

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    // Should show returning banner
    expect(await screen.findByText(/Cập nhật điểm hiện tại/i)).toBeInTheDocument();

    // Go to assessment and verify first slider value
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i }));

    // Verify the scores from storage are loaded (first area should show score 2)
    const sliders = screen.getAllByRole("slider");
    expect(sliders[0]).toHaveValue("2");
  });

  it("shows live assessment summary and reviewed count", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i }));
    const summary = await screen.findByTestId("onboarding-assessment-summary");
    expect(summary).toHaveTextContent("0/8");

    const firstSlider = screen.getAllByRole("slider")[0];
    fireEvent.change(firstSlider, { target: { value: "6" } });

    expect(summary).toHaveTextContent("1/8");
    expect(summary).toHaveTextContent(/Điểm trung bình/i);
    expect(summary).toHaveTextContent(/Cần chăm sóc/i);
    expect(screen.getByText(/Quan hệ/)).toBeInTheDocument();
  });

  it("uses a compact mobile assessment layout for area grid, score grid and bottom actions", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i }));

    expect(document.querySelector("[data-onboarding-area-grid]")).toHaveClass("grid-cols-2", "sm:grid-cols-4");
    expect(document.querySelector("[data-onboarding-score-grid]")).toHaveClass("grid", "grid-cols-4", "sm:flex");
    expect(document.querySelector("[data-onboarding-bottom-nav]")).toHaveClass("flex-col", "sm:flex-row");
    expect(screen.getByRole("button", { name: "Giảm 1 điểm" })).toHaveClass("h-11", "w-11", "sm:h-10", "sm:w-10");
    expect(screen.getByRole("button", { name: "Tăng 1 điểm" })).toHaveClass("h-11", "w-11", "sm:h-10", "sm:w-10");
  });

  it("allows skipping an individual area without changing its score", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i }));
    const summary = await screen.findByTestId("onboarding-assessment-summary");
    expect(summary).toHaveTextContent("0/8");

    const skipButtons = screen.getAllByRole("button", { name: "Bỏ qua" });
    await user.click(skipButtons[0]);

    expect(summary).toHaveTextContent("1/8");
    expect(screen.getByText("Đã rà")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Bỏ qua" })).toHaveLength(1);
  });

  it("lets users continue from assessment with default scores when areas remain unreviewed", async () => {
    const user = userEvent.setup();

    const router = createMemoryRouter(
      [
        { path: "/onboarding", element: <Onboarding /> },
        { path: "/life-balance", element: <div data-testid="life-balance-page">Life Balance page</div> },
      ],
      { initialEntries: ["/onboarding"] },
    );
    render(<RouterProvider router={router} />);

    await user.click(await screen.findByRole("button", { name: /Mở bản đồ cuộc sống/i }));
    const continueButton = await screen.findByRole("button", { name: /Chọn trọng tâm/i });
    await user.click(continueButton);

    const data = getUserData();
    expect(data.onboardingCompleted).toBe(true);
    expect(data.currentWheelOfLife.every((area) => area.score === 5)).toBe(true);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/life-balance");
    });
    expect(router.state.location.search).toBe("?tab=focus");
  });
});
