import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
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

async function renderPage(entry = "/admin/users") {
  const { AdminUsersPage } = await import("./AdminUsersPage");
  render(
    <MemoryRouter initialEntries={[entry]}>
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

  it("loads real users by default and changes excluded category from the filter", async () => {
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
