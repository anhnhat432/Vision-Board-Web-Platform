import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
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
  adminListUsers: vi.fn(),
  adminClassifyUsers: vi.fn(),
}));

vi.mock("@/services/adminService", () => ({
  adminListUsers: adminServiceMock.adminListUsers,
  adminClassifyUsers: adminServiceMock.adminClassifyUsers,
}));

function makeUsersResponse(category: "real" | "test" | "internal" = "real") {
  const now = new Date().toISOString();
  return {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    items: ["u1", "u2"].map((firebaseUid) => ({
      firebaseUid,
      email: `${firebaseUid}@example.test`,
      displayName: firebaseUid.toUpperCase(),
      role: "user" as const,
      onboardingCompletedAt: null,
      locale: "vi-VN",
      createdAt: now,
      updatedAt: now,
      subscription: null,
      goalCount: 0,
      operationalClassification: { effectiveCategory: category, source: "default" as const },
    })),
  };
}

function UsersNavigationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/admin/users?operationalCategory=test")}>Mở dữ liệu Test</button>
      <output data-testid="location-search">{location.search}</output>
    </>
  );
}

async function renderPage(entry = "/admin/users", withNavigationControls = false) {
  const { AdminUsersPage } = await import("./AdminUsersPage");
  render(
    <MemoryRouter initialEntries={[entry]}>
      {withNavigationControls ? <UsersNavigationControls /> : null}
      <AdminUsersPage />
    </MemoryRouter>,
  );
}

async function selectUsers(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("checkbox", { name: /u1@example\.test/ }));
  await user.click(screen.getByRole("checkbox", { name: /u2@example\.test/ }));
}

async function confirmTestClassification(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Phân loại 2 người dùng/ }));
  await user.click(await screen.findByLabelText("Phân loại"));
  await user.click(await screen.findByRole("option", { name: "Test" }));
  await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
}

describe("AdminUsersPage operational cleanup", () => {
  beforeEach(() => {
    vi.resetModules();
    adminServiceMock.adminListUsers.mockResolvedValue(makeUsersResponse());
    adminServiceMock.adminClassifyUsers.mockResolvedValue({ category: "test", results: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads real users by default and forwards every selected category to the service", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() =>
      expect(adminServiceMock.adminListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ operationalCategory: "real", page: 1 }),
      ),
    );
    await user.selectOptions(screen.getByLabelText("Phân loại vận hành"), "test");

    await waitFor(() =>
      expect(adminServiceMock.adminListUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ operationalCategory: "test", page: 1 }),
      ),
    );
    await user.selectOptions(screen.getByLabelText("Phân loại vận hành"), "all");

    await waitFor(() =>
      expect(adminServiceMock.adminListUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ operationalCategory: "all", page: 1 }),
      ),
    );
  });

  it("normalizes an invalid URL category to real", async () => {
    await renderPage("/admin/users?operationalCategory=invalid", true);

    await waitFor(() =>
      expect(adminServiceMock.adminListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ operationalCategory: "real", page: 1 }),
      ),
    );
    expect(await screen.findByTestId("location-search")).toHaveTextContent("operationalCategory=real");
  });

  it("classifies explicit selections and announces partial failures without exposing user details", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminClassifyUsers.mockResolvedValueOnce({
      category: "test",
      results: [
        { userUid: "u1", status: "updated" },
        { userUid: "u2", status: "failed", errorCode: "user_not_found" },
      ],
    });
    await renderPage();
    await selectUsers(user);
    await confirmTestClassification(user);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 thành công, 1 thất bại"));
    expect(screen.getByRole("status")).not.toHaveTextContent("@example.test");
  });

  it("retries only unknown-commit targets with their original request ids", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminClassifyUsers
      .mockResolvedValueOnce({
        category: "test",
        results: [
          { userUid: "u1", status: "updated" },
          { userUid: "u2", status: "failed", errorCode: "admin_audit_commit_unknown" },
        ],
      })
      .mockResolvedValueOnce({ category: "test", results: [{ userUid: "u2", status: "updated" }] });
    await renderPage();
    await selectUsers(user);
    await confirmTestClassification(user);

    await waitFor(() => expect(screen.getByRole("button", { name: "Thử lại mục chưa rõ kết quả" })).toBeEnabled());
    const originalChange = adminServiceMock.adminClassifyUsers.mock.calls[0][0].changes.find(
      (change: { userUid: string }) => change.userUid === "u2",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại mục chưa rõ kết quả" }));

    await waitFor(() => expect(adminServiceMock.adminClassifyUsers).toHaveBeenCalledTimes(2));
    expect(adminServiceMock.adminClassifyUsers.mock.calls[1][0].changes).toEqual([originalChange]);
  });

  it("clears pending selection when navigation changes the URL category", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminClassifyUsers.mockResolvedValueOnce({
      category: "real",
      results: [
        { userUid: "u1", status: "failed", errorCode: "admin_audit_commit_unknown" },
        { userUid: "u2", status: "failed", errorCode: "admin_audit_commit_unknown" },
      ],
    });
    await renderPage("/admin/users", true);
    await selectUsers(user);
    await user.click(screen.getByRole("button", { name: /Phân loại 2 người dùng/ }));
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
    await screen.findByRole("button", { name: "Thử lại mục chưa rõ kết quả" });

    fireEvent.click(screen.getByRole("button", { name: "Mở dữ liệu Test", hidden: true }));

    await waitFor(() =>
      expect(adminServiceMock.adminListUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ operationalCategory: "test", page: 1 }),
      ),
    );
    expect(screen.getByText("Đã chọn 0/100 người dùng.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử lại mục chưa rõ kết quả" })).not.toBeInTheDocument();
  });

  it("does not restore stale bulk retry state or reload the previous view after navigation", async () => {
    const user = userEvent.setup();
    const response = {
      category: "real",
      results: [{ userUid: "u1", status: "failed" as const, errorCode: "admin_audit_commit_unknown" }],
    };
    let resolveClassification: (value: typeof response) => void = () => undefined;
    adminServiceMock.adminClassifyUsers.mockReturnValueOnce(new Promise<typeof response>((resolve) => {
      resolveClassification = resolve;
    }));
    await renderPage("/admin/users", true);
    await selectUsers(user);
    await user.click(screen.getByRole("button", { name: /Phân loại 2 người dùng/ }));
    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));
    fireEvent.click(screen.getByRole("button", { name: "Mở dữ liệu Test", hidden: true }));
    await waitFor(() =>
      expect(adminServiceMock.adminListUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ operationalCategory: "test", page: 1 }),
      ),
    );

    resolveClassification(response);

    await waitFor(() => expect(adminServiceMock.adminListUsers).toHaveBeenCalledTimes(3));
    expect(adminServiceMock.adminListUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ operationalCategory: "test", page: 1 }),
    );
    expect(screen.getByText("Đã chọn 0/100 người dùng.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử lại mục chưa rõ kết quả" })).not.toBeInTheDocument();
  });

  it("keeps all request ids available when the bulk request fails before results", async () => {
    const user = userEvent.setup();
    adminServiceMock.adminClassifyUsers.mockRejectedValueOnce(new Error("network unavailable")).mockResolvedValueOnce({
      category: "test",
      results: [
        { userUid: "u1", status: "updated" },
        { userUid: "u2", status: "updated" },
      ],
    });
    await renderPage();
    await selectUsers(user);
    await confirmTestClassification(user);

    await waitFor(() => expect(screen.getByRole("button", { name: "Thử lại phân loại" })).toBeEnabled());
    const originalChanges = adminServiceMock.adminClassifyUsers.mock.calls[0][0].changes;
    await user.click(screen.getByRole("button", { name: "Thử lại phân loại" }));

    await waitFor(() => expect(adminServiceMock.adminClassifyUsers).toHaveBeenCalledTimes(2));
    expect(adminServiceMock.adminClassifyUsers.mock.calls[1][0].changes).toEqual(originalChanges);
  });
});
