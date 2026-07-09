import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
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

describe("UpgradePaywallDialog unverified email checkout", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_APP_MODE", "real");
    vi.stubEnv("VITE_BILLING_PROVIDER_MODE", "api_contract");
    vi.stubEnv("VITE_BILLING_PROVIDER_LABEL", "Nhà cung cấp thanh toán");
    authContextMock.useOptionalAuthContext.mockReturnValue({
      user: {
        uid: "user_unverified",
        email: "buyer@example.test",
        emailVerified: false,
      },
    });
  });

  it("allows checkout before email verification", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        {
          path: "/paywall-test",
          element: <UpgradePaywallDialog open onOpenChange={() => undefined} context="plan" currentPlan="FREE" />,
        },
        { path: "/billing/confirm", element: <div data-testid="billing-confirm-page">Confirm checkout</div> },
      ],
      { initialEntries: ["/paywall-test"] },
    );
    render(<RouterProvider router={router} />);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText("Vui lòng xác thực email trước khi thanh toán.")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Gửi email xác thực" })).not.toBeInTheDocument();

    const cta = within(dialog).getByRole("button", { name: "Tiếp tục thanh toán" });
    expect(cta).not.toBeDisabled();

    await user.click(cta);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/billing/confirm");
    });
    expect(await screen.findByTestId("billing-confirm-page")).toBeInTheDocument();
  });

  it("keeps initial focus on the heading so payment content opens from the top", async () => {
    render(
      <MemoryRouter>
        <UpgradePaywallDialog open onOpenChange={() => undefined} context="plan" currentPlan="FREE" />
      </MemoryRouter>,
    );

    const dialog = await screen.findByRole("dialog");
    const heading = within(dialog).getByRole("heading", { name: "Mở Plus để đi nhanh và chắc hơn" });

    await waitFor(() => expect(heading).toHaveFocus());
    expect(within(dialog).queryByRole("button", { name: "Gửi email xác thực" })).not.toBeInTheDocument();
  });
});
