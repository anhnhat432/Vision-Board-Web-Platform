import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function makeUserDetail(role: "user" | "admin" = "user") {
  const now = new Date().toISOString();
  return {
    user: {
      firebaseUid: "user_1",
      email: "user1@example.test",
      displayName: "User 1",
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
    paymentOrders: [],
    physicalOrders: [],
  };
}

async function renderPage() {
  const { AdminUserDetailPage } = await import("./AdminUserDetailPage");
  render(
    <MemoryRouter initialEntries={["/admin/users/user_1"]}>
      <Routes>
        <Route path="/admin/users/:uid" element={<AdminUserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminUserDetailPage role confirmation", () => {
  beforeEach(() => {
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
    classified.user.operationalClassification = { effectiveCategory: "test", source: "user", reason: "test_account" };
    adminServiceMock.adminGetUserDetail.mockResolvedValueOnce(makeUserDetail("user")).mockResolvedValueOnce(classified);
    adminServiceMock.adminClassifyUsers.mockReturnValueOnce(classificationPending);

    await renderPage();
    await user.click(await screen.findByRole("button", { name: "Phân loại dữ liệu" }));
    await user.click(screen.getByLabelText("Phân loại"));
    await user.click(await screen.findByRole("option", { name: "Test" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));

    const classificationRow = screen.getByText("Phân loại vận hành").parentElement;
    expect(within(classificationRow as HTMLElement).getByText("Dữ liệu thật")).toBeInTheDocument();
    expect(adminServiceMock.adminGetUserDetail).toHaveBeenCalledTimes(1);
    resolveClassification(classificationResult);

    await waitFor(() => expect(adminServiceMock.adminGetUserDetail).toHaveBeenCalledTimes(2));
    const reloadedClassificationRow = (await screen.findByText("Phân loại vận hành")).parentElement;
    expect(within(reloadedClassificationRow as HTMLElement).getByText("Test")).toBeInTheDocument();
  });
});
