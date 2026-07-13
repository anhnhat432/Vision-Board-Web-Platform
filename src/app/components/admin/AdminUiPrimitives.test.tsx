import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminDataPanel } from "./AdminDataPanel";
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
});
