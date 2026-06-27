import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adminServiceMock = vi.hoisted(() => ({
  adminGetUserDetail: vi.fn(),
  adminUpdateUserRole: vi.fn(),
  adminUpdateUserSubscription: vi.fn(),
}));

vi.mock("@/services/adminService", () => ({
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
});
