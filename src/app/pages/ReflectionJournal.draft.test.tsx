import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { getUserData, saveUserData } from "../utils/storage";
import { ReflectionJournal } from "./ReflectionJournal";

const REFLECTION_DRAFT_KEY = "pendingReflectionDraft_freeform";

function seedFreshJournal() {
  const data = getUserData();
  data.onboardingCompleted = false;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }));
  data.goals = [];
  data.reflections = [];
  saveUserData(data);
}

function renderJournal() {
  const router = createMemoryRouter(
    [
      { path: "/journal", element: <ReflectionJournal /> },
      { path: "/onboarding", element: <div data-testid="onboarding-page">Onboarding page</div> },
    ],
    { initialEntries: ["/journal"] },
  );

  return render(<RouterProvider router={router} />);
}

async function openFreeformJournal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Viết nhật ký tự do/i }));
  return screen.findByPlaceholderText(/Viết về trải nghiệm/i);
}

describe("ReflectionJournal bản nháp", () => {
  beforeEach(() => {
    localStorage.clear();
    seedFreshJournal();
  });

  it("lưu, hiển thị, khôi phục và xoá bản nháp sau khi submit thành công", async () => {
    const user = userEvent.setup();
    const content = "Hôm nay tôi viết một đoạn nhìn lại dài để kiểm tra bản nháp được giữ lại.";
    const view = renderJournal();

    const textarea = await openFreeformJournal(user);
    await user.type(textarea, content);

    await waitFor(
      () => {
        expect(localStorage.getItem(REFLECTION_DRAFT_KEY)).toContain(content);
      },
      { timeout: 1000 },
    );

    view.unmount();
    renderJournal();

    await openFreeformJournal(user);
    expect(await screen.findByText(/Có bản nháp/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Khôi phục" }));
    expect(screen.getByPlaceholderText(/Viết về trải nghiệm/i)).toHaveValue(content);

    await user.click(screen.getByRole("button", { name: /Lưu nhật ký/i }));

    await waitFor(() => {
      expect(localStorage.getItem(REFLECTION_DRAFT_KEY)).toBeNull();
    });
    expect(getUserData().reflections.some((reflection) => reflection.content === content)).toBe(true);
  });
});
