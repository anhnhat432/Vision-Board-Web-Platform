import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppErrorBoundary } from "./AppErrorBoundary";

const monitoringMock = vi.hoisted(() => ({
  captureFrontendException: vi.fn(),
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  captureFrontendException: monitoringMock.captureFrontendException,
}));

function renderRouteError(error: unknown) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <div>Route should not render</div>,
        loader: () => {
          throw error;
        },
        errorElement: <AppErrorBoundary />,
        HydrateFallback: () => null,
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    monitoringMock.captureFrontendException.mockReset();
  });

  it("does not expose raw server error details in the production-facing UI", async () => {
    renderRouteError(
      new Response("database password leaked: internal.example", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    expect(await screen.findByText("Lỗi 500")).toBeInTheDocument();
    expect(screen.getByText(/Trang đang gặp sự cố tạm thời/i)).toBeInTheDocument();
    expect(screen.queryByText(/database password leaked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal\.example/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(monitoringMock.captureFrontendException).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a useful not-found message without sending expected 404s to monitoring", async () => {
    renderRouteError(
      new Response("private route map detail", {
        status: 404,
        statusText: "Not Found",
      }),
    );

    expect(await screen.findByText("Lỗi 404")).toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy trang này/i)).toBeInTheDocument();
    expect(screen.queryByText(/private route map detail/i)).not.toBeInTheDocument();
    expect(monitoringMock.captureFrontendException).not.toHaveBeenCalled();
  });
});
