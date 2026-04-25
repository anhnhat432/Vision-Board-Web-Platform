import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "./ProtectedRoute";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

function setAuthContext(overrides: Record<string, unknown> = {}) {
  authContextMock.useAuthContext.mockReturnValue({
    user: null,
    authLoading: false,
    isConfigured: true,
    ...overrides,
  });
}

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "";

  return <div data-testid="login-from">{from}</div>;
}

function renderProtectedRoute(initialEntry = "/order?kit=vision#recipient") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/order" element={<div>Order form</div>} />
        </Route>
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    setAuthContext();
  });

  it("keeps the full protected destination for post-login redirect", async () => {
    renderProtectedRoute();

    expect(await screen.findByTestId("login-from")).toHaveTextContent("/order?kit=vision#recipient");
  });

  it("renders protected content when auth is unavailable for local demo mode", () => {
    setAuthContext({ isConfigured: false });

    renderProtectedRoute();

    expect(screen.getByText("Order form")).toBeInTheDocument();
  });
});
