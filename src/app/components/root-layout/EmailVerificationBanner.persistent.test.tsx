import { render, screen } from "@testing-library/react";
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
    authContextMock.useAuthContext.mockReturnValue({
      user: {
        uid: "user_unverified",
        email: "buyer@example.test",
        emailVerified: false,
        providerData: [{ providerId: "password" }],
      },
    });
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
