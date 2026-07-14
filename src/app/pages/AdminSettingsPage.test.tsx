import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ useAuthContext: vi.fn() }));
const service = vi.hoisted(() => ({ adminGetOverview: vi.fn() }));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: auth.useAuthContext }));
vi.mock("@/services/adminService", () => service);

const overview = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  email: { provider: "resend", configured: true },
  summary: {
    totalUsers: 20,
    adminUsers: 1,
    excludedUsers: { test: 15, internal: 2 },
    activePlusSubscriptions: 3,
    expiringSoonSubscriptions: 0,
    pendingPaymentOrders: 1,
    completedPaymentOrders: 2,
    physicalOrders: 4,
    revenueTotalVnd: 198000,
    revenueLast30DaysVnd: 99000,
  },
  recentUsers: [],
  recentPayments: [],
};

async function renderPage() {
  const { AdminSettingsPage } = await import("./AdminSettingsPage");
  const result = render(
    <MemoryRouter>
      <AdminSettingsPage />
    </MemoryRouter>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

describe("AdminSettingsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.useAuthContext.mockReturnValue({
      authLoading: false,
      user: { uid: "admin" },
      userProfile: { role: "admin" },
      userProfileLoading: false,
    });
    service.adminGetOverview.mockResolvedValue(overview);
  });

  it("renders named read-only system panels with explicit status text", async () => {
    await renderPage();

    const emailPanel = await screen.findByRole("region", { name: "Email Provider" });
    expect(screen.getByRole("region", { name: "Payment Provider" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Thông tin ứng dụng" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nhắc hạn tự động" })).toBeInTheDocument();
    expect(within(emailPanel).getByText("Đã cấu hình")).toBeInTheDocument();
    expect(screen.queryByText(/cron đang chạy/i)).not.toBeInTheDocument();
  });

  it("keeps loaded status visible after refresh failure", async () => {
    const user = userEvent.setup();
    service.adminGetOverview
      .mockResolvedValueOnce(overview)
      .mockRejectedValueOnce(new Error("overview offline"));
    await renderPage();
    expect(await screen.findByText("resend")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tải lại" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("overview offline");
    expect(screen.getByText("resend")).toBeInTheDocument();
  });
});
