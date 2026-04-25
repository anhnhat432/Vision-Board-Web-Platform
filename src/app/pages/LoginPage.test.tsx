import { render, screen } from "@testing-library/react";
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
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
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

  it("redirects an authenticated user back to the requested route", async () => {
    setAuthContext({ user: { uid: "user_test" } });

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
    setAuthContext({ user: { uid: "user_test" } });

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

  it("ignores unsafe login next redirects", async () => {
    setAuthContext({ user: { uid: "user_test" } });

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
});
