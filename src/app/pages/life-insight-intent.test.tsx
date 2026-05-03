import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LifeInsight } from "./LifeInsight";
import { LIFE_AREAS, saveUserData } from "../utils/storage";
import { CURRENT_STORAGE_VERSION } from "../utils/storage-constants";
import type { UserData } from "../utils/storage-types";

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

    const picker = await screen.findByTestId("life-insight-intent-picker");
    expect(picker).toBeInTheDocument();
    expect(picker.querySelector('[data-intent-id="complete_project"]')).not.toBeNull();
    expect(picker.querySelector('[data-intent-id="build_habit"]')).not.toBeNull();
    expect(picker.querySelector('[data-intent-id="learn_skill"]')).not.toBeNull();
    expect(picker.querySelector('[data-intent-id="improve_health"]')).not.toBeNull();
    expect(picker.querySelector('[data-intent-id="prepare_exam"]')).not.toBeNull();
    expect(picker.querySelector('[data-intent-id="grow_finance"]')).not.toBeNull();
    expect(picker.querySelector('[data-intent-id="find_direction"]')).not.toBeNull();
    expect(picker.querySelector('[data-intent-id="unsure"]')).not.toBeNull();
  });

  it("lets the user choose an intent and persists it with native radio state", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const target = (await screen.findByTestId("life-insight-intent-picker")).querySelector(
      '[data-intent-id="learn_skill"]',
    ) as HTMLLabelElement;
    const radio = target.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(radio.checked).toBe(false);

    await user.click(target);

    expect(radio.checked).toBe(true);
    const raw = localStorage.getItem("user_intent");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ intent: "learn_skill" });
  });

  it("lets the user skip by not choosing (default state is nothing stored)", async () => {
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    // Picker renders but nothing is selected, nothing stored.
    await screen.findByTestId("life-insight-intent-picker");
    expect(localStorage.getItem("user_intent")).toBeNull();
  });

  it("lets the user explicitly pick 'Chưa chắc' without storing an archetype-actionable intent", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LifeInsight />
      </MemoryRouter>,
    );

    const unsure = (await screen.findByTestId("life-insight-intent-picker")).querySelector(
      '[data-intent-id="unsure"]',
    ) as HTMLLabelElement;
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

    const target = (await screen.findByTestId("life-insight-intent-picker")).querySelector(
      '[data-intent-id="improve_health"]',
    ) as HTMLLabelElement;
    await user.click(target);
    expect(localStorage.getItem("user_intent")).toBeTruthy();

    const clearButton = await screen.findByRole("button", { name: /Bỏ chọn/i });
    await user.click(clearButton);
    expect(localStorage.getItem("user_intent")).toBeNull();
  });
});
