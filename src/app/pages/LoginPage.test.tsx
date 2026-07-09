import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const firebaseAuthMock = vi.hoisted(() => ({
  loginWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
}));

const appModeMock = vi.hoisted(() => ({
  isDemoMode: vi.fn(() => false),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/lib/auth/firebase", () => ({
  loginWithGoogle: firebaseAuthMock.loginWithGoogle,
  resetPassword: firebaseAuthMock.resetPassword,
}));

vi.mock("@/app/utils/app-mode", () => ({
  isDemoMode: appModeMock.isDemoMode,
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

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase();
}

function findByNormalizedText(elements: HTMLElement[], needle: string) {
  return elements.find((element) => normalizeText(element.textContent ?? "").includes(needle));
}

describe("LoginPage", () => {
  beforeEach(() => {
    document.title = "Dear Our Future";
    setAuthContext();
    firebaseAuthMock.loginWithGoogle.mockReset();
    firebaseAuthMock.resetPassword.mockReset();
    appModeMock.isDemoMode.mockReturnValue(false);
  });

  it("applies account-bound login metadata to the browser title", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(document.title).toBe("Đăng nhập – Dear Our Future");
  });

  it("applies sign-up metadata to the browser title when opened from the mode query", () => {
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(document.title).toBe("Tạo tài khoản – Dear Our Future");
  });

  it("renders one document h1 while keeping the responsive login hero", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Quay lại với 12 tuần của bạn",
      }),
    ).toBeInTheDocument();
  });

  it("lets mobile trust chips wrap instead of relying on hidden horizontal scroll", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const trustChips = screen.getByTestId("login-mobile-trust-chips");
    const list = trustChips.querySelector("ul");

    expect(trustChips).not.toHaveClass("-mx-4");
    expect(trustChips).not.toHaveClass("overflow-x-auto");
    expect(list).toHaveClass("flex", "flex-wrap", "justify-center", "gap-2");
    expect(list).not.toHaveClass("w-max");
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

  it("exposes stable names and autocomplete metadata for password managers", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mật khẩu");

    expect(emailInput).toHaveAttribute("name", "email");
    expect(emailInput).toHaveAttribute("autocomplete", "email");
    expect(passwordInput).toHaveAttribute("name", "password");
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");

    await user.click(screen.getByRole("link", { name: "Đăng ký" }));

    expect(screen.getByLabelText("Email")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("name", "password");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Xác nhận mật khẩu")).toHaveAttribute("name", "confirmPassword");
    expect(screen.getByLabelText("Xác nhận mật khẩu")).toHaveAttribute("autocomplete", "new-password");

    await user.click(screen.getByRole("link", { name: "Đăng nhập" }));
    await user.click(screen.getByRole("button", { name: /Quên mật khẩu/i }));

    const resetEmailInput = document.querySelector("#reset-email");
    expect(resetEmailInput).toHaveAttribute("name", "email");
    expect(resetEmailInput).toHaveAttribute("autocomplete", "email");
  });

  it("keeps specific email auth errors visible in the form", () => {
    const message = "Không tìm thấy tài khoản với email này. Hãy kiểm tra lại email hoặc tạo tài khoản mới.";
    setAuthContext({ error: message });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Không tìm thấy tài khoản");
    expect(screen.getByRole("alert")).toHaveTextContent("tạo tài khoản mới");
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

    expect(screen.getAllByText("BẮT ĐẦU HÀNH TRÌNH").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Tạo tài khoản" })).toBeInTheDocument();
    expect(screen.getByText("Khoảng 30 giây.")).toBeInTheDocument();
  });

  it("preserves the safe next query when switching from sign-in to sign-up", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login?next=%2Forder%3Fkit%3Dvision%23recipient"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <>
                <LoginPage />
                <DestinationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Đăng ký" }));

    expect(screen.getByTestId("destination")).toHaveTextContent(
      "/login?mode=signup&next=%2Forder%3Fkit%3Dvision%23recipient",
    );
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

  it("can switch back from sign-up mode to sign-in mode", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Đăng nhập" }));

    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(1);
    expect(screen.queryByLabelText("Xác nhận mật khẩu")).not.toBeInTheDocument();
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

  it("links confirmation password mismatch copy to the confirmation field", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const confirmPasswordInput = screen.getByLabelText("Xác nhận mật khẩu");

    await user.type(screen.getByLabelText("Mật khẩu"), "matkhau1");
    await user.type(confirmPasswordInput, "matkhau2");

    expect(confirmPasswordInput).toHaveAttribute("aria-invalid", "true");
    expect(confirmPasswordInput.getAttribute("aria-describedby")).toContain("login-confirm-password-error");
    expect(screen.getByText("Mật khẩu xác nhận chưa khớp.")).toBeInTheDocument();

    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, "matkhau1");

    expect(confirmPasswordInput).not.toHaveAttribute("aria-invalid");
    expect(confirmPasswordInput).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Mật khẩu xác nhận chưa khớp.")).not.toBeInTheDocument();
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

  it("opens and closes reset-password card from sign-in mode", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const forgotPasswordButton = findByNormalizedText(screen.getAllByRole("button"), "quen mat khau");
    expect(forgotPasswordButton).toBeDefined();

    await user.click(forgotPasswordButton!);

    const resetEmailInput = document.querySelector("#reset-email") as HTMLInputElement | null;
    expect(resetEmailInput).toBeInTheDocument();
    expect(resetEmailInput).toHaveFocus();
    expect(findByNormalizedText(screen.getAllByRole("button"), "gui link")).toBeDefined();

    const closeButton = findByNormalizedText(screen.getAllByRole("button"), "dong");
    expect(closeButton).toBeDefined();

    await user.click(closeButton!);

    expect(document.querySelector("#reset-email")).not.toBeInTheDocument();
    expect(forgotPasswordButton).toHaveFocus();
  });

  it("submits reset-password request and shows success state", async () => {
    firebaseAuthMock.resetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const forgotPasswordButton = findByNormalizedText(screen.getAllByRole("button"), "quen mat khau");
    expect(forgotPasswordButton).toBeDefined();
    await user.click(forgotPasswordButton!);

    const resetEmailInput = document.querySelector("#reset-email") as HTMLInputElement | null;
    expect(resetEmailInput).not.toBeNull();
    await user.type(resetEmailInput!, "reset@example.test");

    const sendButton = findByNormalizedText(screen.getAllByRole("button"), "gui link");
    expect(sendButton).toBeDefined();
    await user.click(sendButton!);

    expect(firebaseAuthMock.resetPassword).toHaveBeenCalledWith("reset@example.test");
    expect(await screen.findByText("Đã gửi email đặt lại mật khẩu")).toBeInTheDocument();
    expect(screen.getByText(/reset@example\.test/i)).toBeInTheDocument();
    const successStatus = screen.getByRole("status");
    expect(successStatus).toHaveTextContent("Đã gửi email đặt lại mật khẩu");
    const backButton = screen.getByRole("button", { name: "Quay lại đăng nhập" });
    expect(backButton).toHaveFocus();
    await user.click(backButton);
    expect(forgotPasswordButton).toHaveFocus();
  });

  it("shows actionable missing-account feedback in reset-password card", async () => {
    firebaseAuthMock.resetPassword.mockRejectedValue({ code: "auth/user-not-found" });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const forgotPasswordButton = findByNormalizedText(screen.getAllByRole("button"), "quen mat khau");
    expect(forgotPasswordButton).toBeDefined();
    await user.click(forgotPasswordButton!);

    const resetEmailInput = document.querySelector("#reset-email") as HTMLInputElement | null;
    expect(resetEmailInput).not.toBeNull();
    await user.type(resetEmailInput!, "missing@example.test");

    const sendButton = findByNormalizedText(screen.getAllByRole("button"), "gui link");
    expect(sendButton).toBeDefined();
    await user.click(sendButton!);

    expect(firebaseAuthMock.resetPassword).toHaveBeenCalledWith("missing@example.test");
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy tài khoản với email này.");
  });

  it("shows throttling feedback in reset-password card", async () => {
    firebaseAuthMock.resetPassword.mockRejectedValue({ code: "auth/too-many-requests" });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const forgotPasswordButton = findByNormalizedText(screen.getAllByRole("button"), "quen mat khau");
    expect(forgotPasswordButton).toBeDefined();
    await user.click(forgotPasswordButton!);

    const resetEmailInput = document.querySelector("#reset-email") as HTMLInputElement | null;
    expect(resetEmailInput).not.toBeNull();
    await user.type(resetEmailInput!, "busy@example.test");

    const sendButton = findByNormalizedText(screen.getAllByRole("button"), "gui link");
    expect(sendButton).toBeDefined();
    await user.click(sendButton!);

    expect(firebaseAuthMock.resetPassword).toHaveBeenCalledWith("busy@example.test");
    expect(await screen.findByRole("alert")).toHaveTextContent("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
  });

  it("shows terms and privacy links in sign-up mode", () => {
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/terms")).toBe(true);
    expect(links.some((link) => link.getAttribute("href") === "/privacy")).toBe(true);
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
          <Route path="/admin/dashboard" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("destination")).toHaveTextContent("/admin/dashboard");
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

  it("waits for the profile before sending authenticated users to the default route", () => {
    setAuthContext({
      user: { uid: "user_pending_profile" },
      userProfile: null,
      userProfileLoading: true,
      userProfileError: null,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Đang kiểm tra quyền truy cập" })).toBeInTheDocument();
    expect(screen.getByText("Đang tải hồ sơ tài khoản để chuyển bạn đến đúng khu vực.")).toBeInTheDocument();
  });
});
