import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "./Dashboard";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({
    authLoading: false,
    isConfigured: true,
    user: null,
  }),
}));

describe("Dashboard public visitor state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not render demo/local personal goals or wheel scores for signed-out visitors", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Luồng mục tiêu sau khi đăng ký/i)).toBeInTheDocument();
    expect(screen.getByText(/Sau khi đăng ký, bạn sẽ đi qua Life Insight/i)).toBeInTheDocument();
    expect(screen.getByText(/Chưa có dữ liệu bánh xe cuộc sống/i)).toBeInTheDocument();

    expect(screen.queryByText(/Ra mắt portfolio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Duy trì thói quen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dữ liệu đang hiển thị là ví dụ demo/i)).not.toBeInTheDocument();
  });
});
