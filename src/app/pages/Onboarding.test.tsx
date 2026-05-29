import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
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

    const startButton = await screen.findByRole("button", { name: /Bắt đầu nhanh/i });
    const breathingStartButton = await screen.findByRole("button", { name: /Tập thở & Bắt đầu/i });
    expect(breathingStartButton).toHaveClass("bg-app-accent");
    expect(breathingStartButton).not.toHaveClass("gradient-brand");

    scrollToMock.mockClear();
    await user.click(startButton);

    expect(await screen.findByRole("heading", { name: /Chấm 8 lĩnh vực của bạn/i })).toBeInTheDocument();
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

    await user.click(await screen.findByRole("button", { name: /Bắt đầu nhanh/i }));
    expect(await screen.findByRole("button", { name: /Tiếp → Chọn trọng tâm/i })).toBeEnabled();
  });

  it("frames onboarding as a short eight-area scoring step", async () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText(/8 lĩnh vực/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 phút/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Bắt đầu nhanh/i })).toBeInTheDocument();
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
    await user.click(await screen.findByRole("button", { name: /Bắt đầu nhanh/i }));

    // Modify first slider
    const firstSlider = screen.getAllByRole("slider")[0];
    firstSlider.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}"); // 5 → 8

    // Go back to welcome step and save
    await user.click(await screen.findByRole("button", { name: /Quay lại welcome/i }));
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
    await user.click(await screen.findByRole("button", { name: /Bắt đầu nhanh/i }));

    // Verify the scores from storage are loaded (first area should show score 2)
    const sliders = screen.getAllByRole("slider");
    expect(sliders[0]).toHaveAttribute("aria-valuenow", "2");
  });

  it("shows live assessment summary and reviewed count", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Bắt đầu nhanh/i }));
    const summary = await screen.findByTestId("onboarding-assessment-summary");
    expect(summary).toHaveTextContent("0/8");

    const firstSlider = screen.getAllByRole("slider")[0];
    firstSlider.focus();
    await user.keyboard("{ArrowRight}");

    expect(summary).toHaveTextContent("1/8");
    expect(summary).toHaveTextContent(/Điểm trung bình/i);
    expect(summary).toHaveTextContent(/Ưu tiên/i);
  });

  it("allows skipping an individual area without changing its score", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Bắt đầu nhanh/i }));
    const summary = await screen.findByTestId("onboarding-assessment-summary");
    expect(summary).toHaveTextContent("0/8");

    const skipButtons = screen.getAllByRole("button", { name: "Để sau" });
    await user.click(skipButtons[0]);

    expect(summary).toHaveTextContent("1/8");
    expect(screen.getByText("Đã rà")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Để sau" })).toHaveLength(8);
  });

  it("lets users continue from assessment with default scores when areas remain unreviewed", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /Bắt đầu nhanh/i }));
    const continueButtons = screen.getAllByRole("button", { name: "Để sau" });
    await user.click(continueButtons[continueButtons.length - 1]);

    const data = getUserData();
    expect(data.onboardingCompleted).toBe(true);
    expect(data.currentWheelOfLife.every((area) => area.score === 5)).toBe(true);
  });
});
