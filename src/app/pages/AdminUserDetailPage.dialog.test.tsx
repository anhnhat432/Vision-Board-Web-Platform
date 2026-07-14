import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AdminPhysicalOrderSummary,
  AdminUserPaymentOrderSummary,
} from "@/services/adminService";

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined,
});

const adminServiceMock = vi.hoisted(() => ({
  adminClassifyUsers: vi.fn(),
  adminGetUserDetail: vi.fn(),
  adminUpdateUserRole: vi.fn(),
  adminUpdateUserSubscription: vi.fn(),
}));

vi.mock("@/services/adminService", () => ({
  adminClassifyUsers: adminServiceMock.adminClassifyUsers,
  adminGetUserDetail: adminServiceMock.adminGetUserDetail,
  adminUpdateUserRole: adminServiceMock.adminUpdateUserRole,
  adminUpdateUserSubscription: adminServiceMock.adminUpdateUserSubscription,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeUserDetail(role: "user" | "admin" = "user", firebaseUid = "user_1") {
  const now = new Date().toISOString();
  return {
    user: {
      firebaseUid,
      email: `${firebaseUid}@example.test`,
      displayName: `User ${firebaseUid.slice(-1)}`,
      role,
      onboardingCompletedAt: null,
      termsAcceptedAt: null,
      avatarUrl: null,
      locale: "vi-VN",
      createdAt: now,
      updatedAt: now,
      operationalClassification: { effectiveCategory: "real", source: "default" },
    },
    subscription: null,
    goals: [],
    paymentOrders: [] as AdminUserPaymentOrderSummary[],
    physicalOrders: [] as AdminPhysicalOrderSummary[],
  };
}

function DetailNavigationControls() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/admin/users/user_2")}>Mở người dùng 2</button>;
}

async function renderPage(withNavigationControls = false) {
  const { AdminUserDetailPage } = await import("./AdminUserDetailPage");
  render(
    <MemoryRouter initialEntries={["/admin/users/user_1"]}>
      <Routes>
        <Route path="/admin/users/:uid" element={<>{withNavigationControls ? <DetailNavigationControls /> : null}<AdminUserDetailPage /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminUserDetailPage role confirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    adminServiceMock.adminGetUserDetail.mockResolvedValue(makeUserDetail("user"));
    adminServiceMock.adminClassifyUsers.mockResolvedValue({
      category: "test",
      results: [{ userUid: "user_1", status: "updated" }],
    });
    adminServiceMock.adminUpdateUserRole.mockResolvedValue({
      firebaseUid: "user_1",
      email: "user1@example.test",
      displayName: "User 1",
      role: "admin",
    });
    adminServiceMock.adminUpdateUserSubscription.mockResolvedValue(makeUserDetail("user"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders legacy user details without operational classification", async () => {
    const detail = makeUserDetail("user");
    const legacyUser: Record<string, unknown> = { ...detail.user };
    delete legacyUser.operationalClassification;
    adminServiceMock.adminGetUserDetail.mockResolvedValueOnce({ ...detail, user: legacyUser });

    await renderPage();

    expect(await screen.findByRole("heading", { name: "User 1" })).toBeInTheDocument();
    const classificationRow = screen.getByText("Phân loại vận hành").parentElement;
    expect(within(classificationRow as HTMLElement).getByText(/Dữ liệu thật/)).toBeInTheDocument();
  });

  it("uses an in-app dialog and cancels without calling the role API", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const user = userEvent.setup();

    await renderPage();

    const roleButton = await screen.findByRole("button", { name: /Admin/ });
    await user.click(roleButton);

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Hủy" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(adminServiceMock.adminUpdateUserRole).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("confirms role changes through the admin role API", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const user = userEvent.setup();

    await renderPage();

    const roleButton = await screen.findByRole("button", { name: /Admin/ });
    await user.click(roleButton);

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cấp quyền Admin" }));

    await waitFor(() => {
      expect(adminServiceMock.adminUpdateUserRole).toHaveBeenCalledWith("user_1", "admin");
    });
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("reloads the detail before showing a classification badge", async () => {
    const user = userEvent.setup();
    const classificationResult = { category: "test", results: [{ userUid: "user_1", status: "updated" as const }] };
    let resolveClassification: (value: typeof classificationResult) => void = () => undefined;
    const classificationPending = new Promise<typeof classificationResult>((resolve) => {
      resolveClassification = resolve;
    });
    const classified = makeUserDetail("user");
    classified.user.operationalClassification = { effectiveCategory: "test", source: "user" };
    adminServiceMock.adminGetUserDetail.mockResolvedValueOnce(makeUserDetail("user")).mockResolvedValueOnce(classified);
    adminServiceMock.adminClassifyUsers.mockReturnValueOnce(classificationPending);

    await renderPage();
    await user.click(await screen.findByRole("button", { name: "Phân loại dữ liệu" }));
    await user.click(screen.getByLabelText("Phân loại"));
    await user.click(await screen.findByRole("option", { name: "Test" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));

    const classificationRow = screen.getByText("Phân loại vận hành").parentElement;
    expect(within(classificationRow as HTMLElement).getByText(/Dữ liệu thật/)).toBeInTheDocument();
    expect(adminServiceMock.adminGetUserDetail).toHaveBeenCalledTimes(1);
    resolveClassification(classificationResult);

    await waitFor(() => expect(adminServiceMock.adminGetUserDetail).toHaveBeenCalledTimes(2));
    const reloadedClassificationRow = (await screen.findByText("Phân loại vận hành")).parentElement;
    expect(within(reloadedClassificationRow as HTMLElement).getByText("Test")).toBeInTheDocument();
  });

  it("does not reload the previous user when a classification resolves after navigation", async () => {
    const user = userEvent.setup();
    const classificationResult = { category: "test", results: [{ userUid: "user_1", status: "updated" as const }] };
    let resolveClassification: (value: typeof classificationResult) => void = () => undefined;
    adminServiceMock.adminClassifyUsers.mockReturnValueOnce(new Promise<typeof classificationResult>((resolve) => {
      resolveClassification = resolve;
    }));
    adminServiceMock.adminGetUserDetail.mockImplementation((uid: string) => Promise.resolve(makeUserDetail("user", uid)));

    await renderPage(true);
    await user.click(await screen.findByRole("button", { name: "Phân loại dữ liệu" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
    fireEvent.click(screen.getByRole("button", { name: "Mở người dùng 2", hidden: true }));
    expect(await screen.findByRole("heading", { name: "User 2" })).toBeInTheDocument();

    resolveClassification(classificationResult);

    await waitFor(() => expect(adminServiceMock.adminGetUserDetail).toHaveBeenCalledWith("user_2"));
    expect(adminServiceMock.adminGetUserDetail.mock.calls.filter(([uid]) => uid === "user_1")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "User 2" })).toBeInTheDocument();
  });

  it("reuses the detail request id after an unknown commit response", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminClassifyUsers.mockResolvedValue({
      category: "test",
      results: [{ userUid: "user_1", status: "failed", errorCode: "admin_audit_commit_unknown" }],
    });
    await renderPage();
    await user.click(await screen.findByRole("button", { name: "Phân loại dữ liệu" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
    await screen.findByText(/Kết quả phân loại chưa rõ/);
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));

    await waitFor(() => expect(adminServiceMock.adminClassifyUsers).toHaveBeenCalledTimes(2));
    expect(adminServiceMock.adminClassifyUsers.mock.calls[1][0].changes).toEqual(
      adminServiceMock.adminClassifyUsers.mock.calls[0][0].changes,
    );
  });

  it("renders named user panels and accessible history tables", async () => {
    const detail = makeUserDetail("user");
    detail.paymentOrders = [
      {
        orderId: "pay-1",
        planCode: "PLUS",
        billingCycle: "twelve_weeks",
        amount: 99000,
        currency: "VND",
        status: "completed",
        provider: "payos",
        createdAt: detail.user.createdAt,
        operationalClassification: { effectiveCategory: "real", source: "default" },
      },
    ];
    detail.physicalOrders = [
      {
        id: "physical-1",
        status: "pending",
        totalVnd: 149000,
        fullName: "User 1",
        createdAt: detail.user.createdAt,
        operationalClassification: { effectiveCategory: "real", source: "default" },
      },
    ];
    adminServiceMock.adminGetUserDetail.mockResolvedValueOnce(detail);

    await renderPage();

    expect(await screen.findByRole("region", { name: "Thông tin cá nhân" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Gói dịch vụ" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Lịch sử thanh toán" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Đơn hàng vật lý" })).toBeInTheDocument();
  });

  it("keeps role failure visible inside the confirmation dialog", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminUpdateUserRole.mockRejectedValueOnce(new Error("role update failed"));
    await renderPage();
    await user.click(await screen.findByRole("button", { name: /Cấp quyền Admin/ }));
    const dialog = await screen.findByRole("alertdialog", { name: "Cấp quyền Admin?" });

    await user.click(within(dialog).getByRole("button", { name: "Cấp quyền Admin" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("role update failed");
    expect(dialog).toBeInTheDocument();
  });

  it("keeps subscription failure persistent after the existing dialog closes", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminUpdateUserSubscription.mockRejectedValueOnce(
      new Error("subscription update failed"),
    );
    await renderPage();
    await user.click(await screen.findByRole("button", { name: "Nâng lên gói Plus" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Nâng lên gói Plus?" });

    await user.click(within(dialog).getByRole("button", { name: "Nâng lên Plus" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("subscription update failed");
    expect(screen.queryByRole("alertdialog", { name: "Nâng lên gói Plus?" })).not.toBeInTheDocument();
  });
});
