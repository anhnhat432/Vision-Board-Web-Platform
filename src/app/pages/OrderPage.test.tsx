import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetTestStorage, updateUserData } from "../../test/app-flow-helpers";
import type { Goal } from "../utils/storage";
import { OrderPage } from "./OrderPage";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({ user: null }),
}));

function createGoal(id: string, title: string): Goal {
  return {
    id,
    category: "Career",
    focusArea: "Career",
    title,
    description: "Order page sync test goal",
    deadline: "2026-07-01",
    tasks: [],
    createdAt: "2026-04-01T00:00:00.000Z",
  };
}

function seedGoals(goals: Goal[]): void {
  updateUserData((data) => {
    data.goals = goals;
    data.visionBoards = [];
  });
}

function renderOrderPage() {
  return render(
    <MemoryRouter initialEntries={["/order"]}>
      <OrderPage />
    </MemoryRouter>,
  );
}

function getInput(container: HTMLElement, selector: string): HTMLInputElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected ${selector} to be an input.`);
  }
  return element;
}

function getTextarea(container: HTMLElement, selector: string): HTMLTextAreaElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Expected ${selector} to be a textarea.`);
  }
  return element;
}

describe("OrderPage synced user data", () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it("refreshes generated prefill but preserves manual order copy", async () => {
    seedGoals([createGoal("goal_primary", "Initial order goal")]);

    const { container } = renderOrderPage();
    const keywordsInput = getInput(container, "#order-keywords");
    const noteInput = getTextarea(container, "#order-note");

    await waitFor(() => {
      expect(keywordsInput.value).toContain("Initial order goal");
      expect(noteInput.value).toContain("Initial order goal");
    });

    seedGoals([createGoal("goal_primary", "Synced order goal")]);

    await waitFor(() => {
      expect(keywordsInput.value).toContain("Synced order goal");
      expect(noteInput.value).toContain("Synced order goal");
    });

    const user = userEvent.setup();
    await user.clear(keywordsInput);
    await user.type(keywordsInput, "manual keyword");
    await user.clear(noteInput);
    await user.type(noteInput, "manual note");

    seedGoals([createGoal("goal_primary", "Second synced order goal")]);

    await waitFor(() => {
      expect(keywordsInput).toHaveValue("manual keyword");
      expect(noteInput).toHaveValue("manual note");
    });
  });
});
