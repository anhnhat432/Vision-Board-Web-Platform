import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ adminListAuditLogs: vi.fn() }));

vi.mock("@/services/adminService", () => service);

const auditLog = {
  _id: "audit-1",
  actorUid: "admin-1",
  actorEmail: "admin@example.test",
  action: "admin.user.role",
  target: "user",
  targetId: "user-1",
  payload: { role: "admin", source: "manual" },
  timestamp: "2026-07-13T00:00:00.000Z",
  success: true,
};

const secondPageLog = {
  ...auditLog,
  _id: "audit-2",
  action: "admin.user.subscription",
  targetId: "user-2",
};

function responseFor(page: number) {
  return {
    page,
    limit: 30,
    total: 31,
    items: [page === 2 ? secondPageLog : auditLog],
  };
}

async function renderPage() {
  const { AdminAuditLogsPage } = await import("./AdminAuditLogsPage");
  const result = render(
    <MemoryRouter>
      <AdminAuditLogsPage />
    </MemoryRouter>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

describe("AdminAuditLogsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.adminListAuditLogs.mockImplementation((params: { page?: number }) =>
      Promise.resolve(responseFor(params.page ?? 1)),
    );
  });

  it("loads existing filter parameters and exposes toolbar/table semantics", async () => {
    await renderPage();
    expect(await screen.findByText("admin.user.role")).toBeInTheDocument();

    expect(service.adminListAuditLogs).toHaveBeenCalledWith({
      page: 1,
      action: undefined,
      actorUid: undefined,
      limit: 30,
    });
    expect(screen.getByRole("region", { name: "Bộ lọc audit logs" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Lọc theo action" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Lọc theo actor UID" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Danh sách audit logs" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Phân trang audit logs" })).toBeInTheDocument();
  });

  it("resets page on filters and exposes payload disclosure state", async () => {
    const user = userEvent.setup();
    await renderPage();
    expect(await screen.findByText("admin.user.role")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    await waitFor(() =>
      expect(service.adminListAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Lọc theo action" }), {
      target: { value: "admin.user.role" },
    });
    await waitFor(() =>
      expect(service.adminListAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: "admin.user.role", page: 1 }),
      ),
    );

    const toggle = screen.getByRole("button", { name: "Xem payload admin.user.role" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"role": "admin"/)).toBeInTheDocument();
  });

  it("keeps stale rows after a filtered refresh failure and retries current parameters", async () => {
    const user = userEvent.setup();
    service.adminListAuditLogs
      .mockResolvedValueOnce(responseFor(1))
      .mockRejectedValueOnce(new Error("audit service offline"))
      .mockResolvedValueOnce(responseFor(1));
    await renderPage();
    expect(await screen.findByText("admin.user.role")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Lọc theo actor UID" }), {
      target: { value: "admin-2" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("audit service offline");
    expect(screen.getByText("admin.user.role")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() =>
      expect(service.adminListAuditLogs).toHaveBeenLastCalledWith({
        page: 1,
        action: undefined,
        actorUid: "admin-2",
        limit: 30,
      }),
    );
  });
});
