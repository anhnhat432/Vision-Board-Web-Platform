import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    isConfigured: true,
    ...overrides,
  });
}

describe("LoginPage", () => {
  beforeEach(() => {
    setAuthContext();
  });

  it("keeps authentication setup errors visible in the form", () => {
    const message =
      "Firebase Authentication chưa được bật cho project này. Vào Firebase Console > Authentication > Get started.";
    setAuthContext({ error: message });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });
});
