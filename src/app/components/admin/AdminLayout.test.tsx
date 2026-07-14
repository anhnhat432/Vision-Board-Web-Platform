import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLayout } from "./AdminLayout";

const auth = vi.hoisted(() => ({ useAuthContext: vi.fn() }));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: auth.useAuthContext }));

function renderLayout() {
  render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AdminLayout />
    </MemoryRouter>,
  );
}

describe("AdminLayout status gates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("announces authentication loading as a polite status", () => {
    auth.useAuthContext.mockReturnValue({
      authLoading: true,
      isConfigured: true,
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      user: null,
      userProfile: null,
      userProfileError: null,
      userProfileLoading: false,
    });

    renderLayout();

    expect(screen.getByRole("status")).toHaveTextContent("Đang kiểm tra đăng nhập");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("announces profile loading as a polite status", () => {
    auth.useAuthContext.mockReturnValue({
      authLoading: false,
      isConfigured: true,
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      user: { uid: "admin" },
      userProfile: null,
      userProfileError: null,
      userProfileLoading: true,
    });

    renderLayout();

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải quyền quản trị");
  });
});
