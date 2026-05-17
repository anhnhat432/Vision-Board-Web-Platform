import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { getUserData } from "../utils/storage";
import { AspirationalVision } from "./AspirationalVision";

function renderVisionPage() {
  const router = createMemoryRouter(
    [
      { path: "/vision", element: <AspirationalVision /> },
      { path: "/", element: <div data-testid="dashboard-page">Dashboard</div> },
    ],
    { initialEntries: ["/vision"] },
  );

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}

beforeEach(() => {
  localStorage.clear();
});

const UI_TEST_TIMEOUT_MS = 10_000;

describe("AspirationalVision page", () => {
  it("saves a 3-year vision locally without requiring login", async () => {
    const user = userEvent.setup();
    const { router } = renderVisionPage();

    await user.type(
      screen.getByLabelText("Tóm tắt tầm nhìn 3 năm"),
      "Ba năm tới tôi muốn khỏe mạnh, làm việc sâu và có tài chính vững vàng.",
    );
    await user.type(
      screen.getByLabelText("Sức khoẻ"),
      "Tôi duy trì tập luyện đều và ngủ đủ.",
    );
    await user.click(screen.getByRole("button", { name: "Lưu tầm nhìn" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
    expect(getUserData().aspirationalVision).toMatchObject({
      horizonYears: 3,
      summary: "Ba năm tới tôi muốn khỏe mạnh, làm việc sâu và có tài chính vững vàng.",
      lifeAreas: [{ area: "health", statement: "Tôi duy trì tập luyện đều và ngủ đủ." }],
    });
  }, UI_TEST_TIMEOUT_MS);
});
