import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminDataPanel } from "./AdminDataPanel";
import { AdminPagination } from "./AdminPagination";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminToolbar } from "./AdminToolbar";

describe("Admin UI primitives", () => {
  it("exposes page metadata, labelled tools, and a busy data region", () => {
    render(
      <>
        <AdminPageHeader title="Người dùng" description="Quản lý tài khoản" meta="20 kết quả" />
        <AdminToolbar
          label="Bộ lọc người dùng"
          meta="Đang xem dữ liệu thật"
          actions={<button type="button">Xuất CSV</button>}
        >
          <label>
            Tìm kiếm <input />
          </label>
        </AdminToolbar>
        <AdminDataPanel
          title="Danh sách người dùng"
          description="Dữ liệu vận hành"
          busy
          footer="Trang 1 / 2"
        >
          <p>Nội dung bảng</p>
        </AdminDataPanel>
      </>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Người dùng" })).toBeInTheDocument();
    expect(screen.getByText("20 kết quả")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bộ lọc người dùng" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Danh sách người dùng" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();
  });

  it("labels page navigation and emits only the requested adjacent page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <AdminPagination
        page={2}
        totalPages={4}
        itemLabel="đơn in"
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Phân trang đơn in" })).toBeInTheDocument();
    expect(screen.getByText("Trang 2 / 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Trang trước" }));
    await user.click(screen.getByRole("button", { name: "Trang sau" }));

    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });

  it("disables pagination at boundaries and while the page request is busy", () => {
    const { rerender } = render(
      <AdminPagination page={1} totalPages={3} onPageChange={() => undefined} />,
    );

    expect(screen.getByRole("button", { name: "Trang trước" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Trang sau" })).toBeEnabled();

    rerender(
      <AdminPagination page={3} totalPages={3} onPageChange={() => undefined} />,
    );

    expect(screen.getByRole("button", { name: "Trang trước" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();

    rerender(
      <AdminPagination page={2} totalPages={3} disabled onPageChange={() => undefined} />,
    );

    expect(screen.getByRole("button", { name: "Trang trước" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();
  });
});
