import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSubscriptionsPage } from "./AdminSubscriptionsPage";

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined,
});

const authMock = vi.hoisted(() => ({ useAuthContext: vi.fn() }));
const adminServiceMock = vi.hoisted(() => ({ adminListSubscriptions: vi.fn() }));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: authMock.useAuthContext }));
vi.mock("@/services/adminService", () => ({ adminListSubscriptions: adminServiceMock.adminListSubscriptions }));

const response = {
  page: 1,
  limit: 30,
  total: 1,
  totalPages: 2,
  items: [{
    id: "sub-1",
    userId: "user-1",
    userEmail: "member@example.test",
    userDisplayName: "Member",
    planCode: "PLUS",
    status: "active",
    provider: "payos",
    billingCycle: "month",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    canceledAt: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    operationalClassification: { effectiveCategory: "test" as const, source: "user" as const },
  }],
};

describe("AdminSubscriptionsPage operational classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuthContext.mockReturnValue({
      authLoading: false,
      user: { uid: "admin" },
      userProfile: { role: "admin" },
      userProfileLoading: false,
    });
    adminServiceMock.adminListSubscriptions.mockResolvedValue(response);
  });

  it("defaults subscriptions to real users and labels inherited exclusions", async () => {
    const user = userEvent.setup();
    render(<AdminSubscriptionsPage />);

    await waitFor(() => expect(adminServiceMock.adminListSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({ operationalScope: "real", page: 1, limit: 30 }),
    ));
    await user.click(screen.getByRole("combobox", { name: "Phạm vi dữ liệu" }));
    await user.click(await screen.findByRole("option", { name: "Test & nội bộ" }));
    await waitFor(() => expect(adminServiceMock.adminListSubscriptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ operationalScope: "excluded", page: 1, limit: 30 }),
    ));
    expect(await screen.findByText("Theo phân loại tài khoản")).toBeInTheDocument();
  });

  it("renders labelled filters, a named table, and shared pagination", async () => {
    render(<AdminSubscriptionsPage />);

    expect(await screen.findByRole("region", { name: "Bộ lọc subscription" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Trạng thái subscription" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Gói subscription" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Danh sách subscription" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Phân loại" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("navigation", { name: "Phân trang subscription" })).toBeInTheDocument();
  });

  it("retains safe subscription rows when refresh fails and retries the same view", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminListSubscriptions
      .mockResolvedValueOnce(response)
      .mockRejectedValueOnce(new Error("Subscription timeout"))
      .mockResolvedValueOnce(response);
    render(<AdminSubscriptionsPage />);

    expect(await screen.findByText("member@example.test")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tải lại" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Subscription timeout");
    expect(screen.getByText("member@example.test")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(adminServiceMock.adminListSubscriptions).toHaveBeenCalledTimes(3));
  });
});
