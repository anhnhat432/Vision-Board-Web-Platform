import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

function setAuthContext(overrides: Record<string, unknown> = {}) {
  authContextMock.useAuthContext.mockReturnValue({
    user: null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
    ...overrides,
  });
}

function DestinationProbe() {
  const location = useLocation();

  return <div data-testid="destination">{`${location.pathname}${location.search}${location.hash}`}</div>;
}

describe("LoginPage", () => {
  beforeEach(() => {
    setAuthContext();
  });

  it("keeps authentication setup errors visible in the form", () => {
    const message = "Đăng nhập hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
    setAuthContext({ error: message });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it("redirects an authenticated user back to the requested route", async () => {
    setAuthContext({
      user: { uid: "user_test" },
      userProfile: { id: "profile_test", email: "test@example.com", role: "user" },
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: "/order?kit=vision#recipient" } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/order" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("destination")).toHaveTextContent("/order?kit=vision#recipient");
  });

  it("uses the login next query when navigation state is unavailable", async () => {
    setAuthContext({
      user: { uid: "user_test" },
      userProfile: { id: "profile_test", email: "test@example.com", role: "user" },
    });

    render(
      <MemoryRouter initialEntries={["/login?next=%2Forder%3Fkit%3Dvision%23recipient"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/order" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("destination")).toHaveTextContent("/order?kit=vision#recipient");
  });

  it("opens in sign-up mode from the mode query", () => {
    render(
      <MemoryRouter initialEntries={["/login?mode=signup&next=%2F"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tạo tài khoản để lưu, đồng bộ và bắt đầu an toàn.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo tài khoản" })).toBeInTheDocument();
  });

  it("shows two password fields in sign-up mode", () => {
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const passwordFields = screen.getAllByPlaceholderText("••••••••");
    expect(passwordFields).toHaveLength(2);
    expect(passwordFields.every((field) => field instanceof HTMLInputElement && field.type === "password")).toBe(true);
    expect(screen.getByLabelText("Xác nhận mật khẩu")).toBeInTheDocument();
    expect(screen.getByText("Ít nhất 8 ký tự")).toBeInTheDocument();
    expect(screen.getByText("Có ít nhất 1 chữ số")).toBeInTheDocument();
    expect(screen.getByText("Khớp với mật khẩu xác nhận")).toBeInTheDocument();
  });

  it("keeps sign-up disabled until password confirmation matches", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const submitButton = screen.getByRole("button", { name: "Tạo tài khoản" });
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "matkhau1");
    await user.type(screen.getByLabelText("Xác nhận mật khẩu"), "matkhau2");

    expect(submitButton).toBeDisabled();

    await user.clear(screen.getByLabelText("Xác nhận mật khẩu"));
    await user.type(screen.getByLabelText("Xác nhận mật khẩu"), "matkhau1");

    expect(submitButton).toBeEnabled();
  });

  it("toggles sign-up password field visibility", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByLabelText("Mật khẩu") as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText("Xác nhận mật khẩu") as HTMLInputElement;

    expect(passwordInput.type).toBe("password");
    expect(confirmPasswordInput.type).toBe("password");

    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(passwordInput.type).toBe("text");
    expect(confirmPasswordInput.type).toBe("password");

    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu xác nhận" }));
    expect(confirmPasswordInput.type).toBe("text");

    await user.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(passwordInput.type).toBe("password");

    await user.click(screen.getByRole("button", { name: "Ẩn mật khẩu xác nhận" }));
    expect(confirmPasswordInput.type).toBe("password");
  });

  it("does not show confirmation requirements in sign-in mode", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(1);
    expect(screen.queryByLabelText("Xác nhận mật khẩu")).not.toBeInTheDocument();
    expect(screen.queryByText("Ít nhất 8 ký tự")).not.toBeInTheDocument();
  });

  it("ignores unsafe login next redirects", async () => {
    setAuthContext({
      user: { uid: "user_test" },
      userProfile: { id: "profile_test", email: "test@example.com", role: "user" },
    });

    render(
      <MemoryRouter initialEntries={["/login?next=%2F%2Fevil.example"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("destination")).toHaveTextContent("/");
  });

  it("sends authenticated admin users directly to the admin console", async () => {
    setAuthContext({
      user: { uid: "admin_test" },
      userProfile: { id: "profile_admin", email: "admin@example.com", role: "admin" },
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/orders" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("destination")).toHaveTextContent("/admin/orders");
  });

  it("redirects authenticated users while profile routing is still loading", async () => {
    setAuthContext({
      user: { uid: "user_pending_profile" },
      userProfile: null,
      userProfileLoading: true,
      userProfileError: null,
    });

    render(
      <MemoryRouter initialEntries={["/login?next=%2F12-week-system"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/12-week-system" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("destination")).toHaveTextContent("/12-week-system");
  });
});
