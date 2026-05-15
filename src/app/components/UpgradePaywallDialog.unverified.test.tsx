import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpgradePaywallDialog } from "./UpgradePaywallDialog";

const authContextMock = vi.hoisted(() => ({
  useOptionalAuthContext: vi.fn(),
}));
const firebaseMock = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
}));

vi.mock("@/lib/auth/firebase", () => ({
  sendVerificationEmail: firebaseMock.sendVerificationEmail,
}));

describe("UpgradePaywallDialog unverified email guard", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_BILLING_PROVIDER_MODE", "api_contract");
    vi.stubEnv("VITE_BILLING_PROVIDER_LABEL", "Casso + VietQR");
    authContextMock.useOptionalAuthContext.mockReturnValue({
      user: {
        uid: "user_unverified",
        email: "buyer@example.test",
        emailVerified: false,
      },
    });
  });

  it("disables checkout and explains verification before payment", async () => {
    render(
      <MemoryRouter>
        <UpgradePaywallDialog open onOpenChange={() => undefined} context="plan" currentPlan="FREE" />
      </MemoryRouter>,
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Vui lòng xác thực email trước khi thanh toán.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Email là cách chúng tôi gửi biên nhận/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Gửi email xác thực" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Tiếp tục thanh toán" })).toBeDisabled();
  });
});
