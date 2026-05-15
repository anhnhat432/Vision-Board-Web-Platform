import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailVerificationBanner } from "./EmailVerificationBanner";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));
const firebaseMock = vi.hoisted(() => ({
  changeEmailWithPassword: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/lib/auth/firebase", () => ({
  changeEmailWithPassword: firebaseMock.changeEmailWithPassword,
  sendVerificationEmail: firebaseMock.sendVerificationEmail,
}));

vi.mock("@/app/utils/app-mode", () => ({
  isDemoMode: () => false,
}));

describe("EmailVerificationBanner persistent behavior", () => {
  beforeEach(() => {
    window.localStorage.clear();
    firebaseMock.sendVerificationEmail.mockReset();
    firebaseMock.changeEmailWithPassword.mockReset();
    authContextMock.useAuthContext.mockReturnValue({
      user: {
        uid: "user_unverified",
        email: "buyer@example.test",
        emailVerified: false,
        providerData: [{ providerId: "password" }],
      },
    });
  });

  it("restores resend cooldown after refresh", async () => {
    firebaseMock.sendVerificationEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();

    const { unmount } = render(<EmailVerificationBanner />);
    await user.click(screen.getByRole("button", { name: "Gửi lại email xác thực" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Gửi lại sau/ })).toBeDisabled();
    });
    expect(window.localStorage.getItem("emailVerificationLastSentAt:user_unverified")).toBeTruthy();

    unmount();
    render(<EmailVerificationBanner />);

    expect(screen.getByRole("button", { name: /Gửi lại sau/ })).toBeDisabled();
    expect(screen.getByText(/Gần nhất đã gửi:/)).toBeInTheDocument();
  });

  it("stays visible for an unverified email and has no dismiss button", () => {
    const { rerender } = render(<EmailVerificationBanner />);

    expect(screen.getByRole("alert")).toHaveTextContent("Email chưa xác thực");
    expect(screen.getByText(/buyer@example\.test/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi lại email xác thực" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi email" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ẩn thông báo/i)).not.toBeInTheDocument();

    rerender(<EmailVerificationBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
