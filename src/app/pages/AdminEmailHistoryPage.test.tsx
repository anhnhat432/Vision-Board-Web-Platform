import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ useAuthContext: vi.fn() }));
const service = vi.hoisted(() => ({ adminListEmailEvents: vi.fn() }));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: auth.useAuthContext }));
vi.mock("@/services/adminService", () => service);

const event = {
  id: "email-1",
  userId: "user-1",
  userEmail: "member@example.test",
  userDisplayName: "Member",
  status: "sent",
  providerEventId: "provider-1",
  processedAt: "2026-07-10T02:00:00.000Z",
  error: null,
  createdAt: "2026-07-10T01:00:00.000Z",
};

const emailResponse = {
  items: [event],
  total: 31,
  page: 1,
  limit: 30,
  totalPages: 2,
};

async function renderPage() {
  const { AdminEmailHistoryPage } = await import("./AdminEmailHistoryPage");
  const result = render(
    <MemoryRouter>
      <AdminEmailHistoryPage />
    </MemoryRouter>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

describe("AdminEmailHistoryPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.useAuthContext.mockReturnValue({
      authLoading: false,
      user: { uid: "admin" },
      userProfile: { role: "admin" },
      userProfileLoading: false,
    });
    service.adminListEmailEvents.mockImplementation((params: { page?: number }) =>
      Promise.resolve({ ...emailResponse, page: params.page ?? 1 }),
    );
  });

  it("loads page one and exposes a named email-event table and pagination", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => expect(service.adminListEmailEvents).toHaveBeenCalledWith({ page: 1, limit: 30 }));
    expect(screen.getByRole("region", { name: "Email đã xử lý" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Lịch sử email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Người nhận" })).toHaveAttribute("scope", "col");
    expect(await screen.findByText("Đã gửi")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Phân trang email" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    await waitFor(() => expect(service.adminListEmailEvents).toHaveBeenLastCalledWith({ page: 2, limit: 30 }));
  });

  it("keeps stale rows after refresh failure and retries the active page", async () => {
    const user = userEvent.setup();
    service.adminListEmailEvents
      .mockResolvedValueOnce(emailResponse)
      .mockRejectedValueOnce(new Error("email history unavailable"))
      .mockResolvedValueOnce(emailResponse);
    await renderPage();
    expect(await screen.findByText("member@example.test")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tải lại" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("email history unavailable");
    expect(screen.getByText("member@example.test")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(service.adminListEmailEvents).toHaveBeenLastCalledWith({ page: 1, limit: 30 }));
  });
});
