import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { getUserData, saveUserData } from "../utils/storage";
import { ReflectionJournal } from "./ReflectionJournal";

const REFLECTION_DRAFT_KEY = "pendingReflectionDraft_freeform";
const DRAFT_CONTENT = "Hôm nay tôi viết một đoạn nhìn lại dài để kiểm tra bản nháp được giữ lại.";

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

async function openJournal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Viết entry đầu tiên/i }));
  return screen.findByPlaceholderText(/Viết về trải nghiệm/i);
}

function seedDraft(content = DRAFT_CONTENT) {
  localStorage.setItem(
    REFLECTION_DRAFT_KEY,
    JSON.stringify({
      content,
      savedAt: new Date().toISOString(),
    }),
  );
}

// Note: Tests updated after UI refactoring with app tokens
// The draft functionality logic remains unchanged, selectors adapted to new markup
describe("ReflectionJournal bản nháp", () => {
  beforeEach(() => {
    localStorage.clear();
    seedFreshJournal();
  });

  it("lưu nội dung vào bản nháp sau 500ms", async () => {
    const user = userEvent.setup();
    renderJournal();

    const textarea = await openJournal(user);
    await user.type(textarea, DRAFT_CONTENT);

    await waitFor(
      () => {
        expect(localStorage.getItem(REFLECTION_DRAFT_KEY)).toContain(DRAFT_CONTENT);
      },
      { timeout: 1000 },
    );
  });

  it("hiển thị banner khi mở lại và có bản nháp", async () => {
    const user = userEvent.setup();
    seedDraft();
    renderJournal();

    await openJournal(user);

    expect(await screen.findByText(/Tìm thấy bản nháp chưa lưu lúc/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khôi phục" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bỏ qua" })).toBeInTheDocument();
  });

  it("khôi phục bản nháp vào form", async () => {
    const user = userEvent.setup();
    seedDraft();
    renderJournal();

    await openJournal(user);
    await user.click(await screen.findByRole("button", { name: "Khôi phục" }));

    expect(screen.getByPlaceholderText(/Viết về trải nghiệm/i)).toHaveValue(DRAFT_CONTENT);
  });

  it("xoá bản nháp sau khi submit thành công", async () => {
    const user = userEvent.setup();
    seedDraft();
    renderJournal();

    await openJournal(user);
    await user.click(await screen.findByRole("button", { name: "Khôi phục" }));
    await user.click(screen.getByRole("button", { name: /Lưu nhật ký/i }));

    await waitFor(() => {
      expect(localStorage.getItem(REFLECTION_DRAFT_KEY)).toBeNull();
    });
    expect(getUserData().reflections.some((reflection) => reflection.content === DRAFT_CONTENT)).toBe(true);
  });
});