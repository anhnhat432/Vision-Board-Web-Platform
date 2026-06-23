import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LIFE_AREAS, saveUserData } from "../utils/storage";
import { CURRENT_STORAGE_VERSION } from "../utils/storage-constants";
import type { UserData } from "../utils/storage-types";
import { LifeInsight } from "./LifeInsight";

function seedRealLifeBalance(): void {
  const base: UserData = {
    visionBoards: [],
    goals: [],
    reflections: [],
    achievements: [],
    eventLog: [],
    dismissedAnnouncements: [],
    onboardingCompleted: true,
    dataVersion: CURRENT_STORAGE_VERSION,
    currentWheelOfLife: LIFE_AREAS.map((area, index) => ({
      ...area,
      score: index === 0 ? 3 : 7, // Career low → recommended focus
    })),
    appPreferences: {
      theme: "light",
      analyticsConsent: "off",
      localEventLog: "off",
      locale: "vi",
    },
    billingState: { planCode: "FREE", entitlements: [], updatedAt: new Date().toISOString() },
    mockCheckout: { status: "idle" },
    pushSubscription: null,
    outbox: [],
    syncOutbox: [],
  } as unknown as UserData;
  saveUserData(base);
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

beforeEach(() => {
  localStorage.clear();
  seedRealLifeBalance();
});

afterEach(() => {
  localStorage.clear();
});

describe("LifeInsight — intent picker", () => {
  it("renders the optional intent picker with the 8 choices including 'Chưa chắc'", async () => {
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Mục đích chính của bạn với lĩnh vực này" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hoàn thành một dự án/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xây một thói quen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Học một kỹ năng/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cải thiện sức khỏe/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chuẩn bị thi hoặc chứng chỉ/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tăng thu nhập hoặc tiết kiệm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tìm lại định hướng/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chưa chắc, cứ đi tiếp/i })).toBeInTheDocument();
  });

  it("lets the user choose an intent, marks it selected, and persists it", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const target = await screen.findByRole("button", { name: /Học một kỹ năng/i });
    expect(target).not.toHaveClass("bg-app-accent-soft");
    expect(target).toHaveAttribute("aria-pressed", "false");

    await user.click(target);

    expect(target).toHaveClass("bg-app-accent-soft");
    expect(target).toHaveAttribute("aria-pressed", "true");
    const raw = localStorage.getItem("user_intent");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ intent: "learn_skill" });
  });

  it("exposes pressed state for the selected focus area card", async () => {
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const recommendedFocus = await screen.findByRole("button", { name: /Sự nghiệp/i });
    expect(recommendedFocus).toHaveAttribute("aria-pressed", "true");
  });

  it("lets the user skip by not choosing (default state is nothing stored)", async () => {
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    // Picker renders but nothing is selected, nothing stored.
    await screen.findByRole("heading", { name: "Mục đích chính của bạn với lĩnh vực này" });
    expect(localStorage.getItem("user_intent")).toBeNull();
  });

  it("lets the user explicitly pick 'Chưa chắc' without storing an archetype-actionable intent", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const unsure = await screen.findByRole("button", { name: /Chưa chắc, cứ đi tiếp/i });
    await user.click(unsure);

    const raw = localStorage.getItem("user_intent");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ intent: "unsure" });
  });

  it("clears the stored intent when 'Bỏ chọn' is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const target = await screen.findByRole("button", { name: /Cải thiện sức khỏe/i });
    await user.click(target);
    expect(localStorage.getItem("user_intent")).toBeTruthy();

    const clearButton = await screen.findByRole("button", { name: /Bỏ chọn/i });
    await user.click(clearButton);
    expect(localStorage.getItem("user_intent")).toBeNull();
  });

  it("renders a mobile action bar with focus status and reserved bottom space", async () => {
    setViewportWidth(375);

    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const shell = document.querySelector("[data-life-insight-shell]");
    const actionBar = document.querySelector("[data-life-insight-mobile-action-bar]");

    expect(shell).toHaveClass("pb-[calc(8.5rem+env(safe-area-inset-bottom))]", "lg:pb-0");
    expect(actionBar).toHaveClass(
      "fixed",
      "bottom-0",
      "bg-app-surface/95",
      "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
    );
    expect(within(actionBar as HTMLElement).getByRole("button", { name: /Tiếp → Viết mục tiêu/i })).toHaveClass(
      "min-h-11",
    );

    expect(within(actionBar as HTMLElement).getByText(/Bước 2\/6 · Trọng tâm/i)).toBeInTheDocument();
    expect(within(actionBar as HTMLElement).getByText("Đề xuất tự động")).toBeInTheDocument();
    expect(
      within(actionBar as HTMLElement).getByText("Bạn có thể chọn định hướng bây giờ hoặc viết mục tiêu ngay."),
    ).toBeInTheDocument();
    expect(within(actionBar as HTMLElement).getByRole("button", { name: /Tiếp → Viết mục tiêu/i })).toBeInTheDocument();
  });

  it("uses a specific mobile toggle label and exposes its expanded state", async () => {
    const user = userEvent.setup();
    setViewportWidth(375);

    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const toggle = await screen.findByRole("button", { name: /Mở danh sách lĩnh vực/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(await screen.findByRole("button", { name: /Ẩn danh sách lĩnh vực/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
