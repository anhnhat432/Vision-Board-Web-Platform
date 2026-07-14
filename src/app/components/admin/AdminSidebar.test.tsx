import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AdminSidebar, getAdminNavGroups, getAdminNavItems } from "./AdminSidebar";

describe("AdminSidebar", () => {
  it("groups every real-mode destination in the approved order", () => {
    expect(getAdminNavGroups("real").map((group) => [group.label, group.items.map((item) => item.label)])).toEqual([
      ["Tổng quan", ["Tổng quan"]],
      ["Khách hàng", ["Người dùng", "Subscription", "Email"]],
      ["Kinh doanh", ["Báo cáo kinh doanh", "Thanh toán", "Hoàn tiền", "Giảm giá"]],
      ["Vận hành", ["Đơn hàng", "Catalog"]],
      ["Hệ thống", ["Cài đặt", "Audit Logs"]],
    ]);

    expect(getAdminNavItems("demo").some((item) => item.to === "/admin/reports/sales")).toBe(false);
  });

  it("marks the current destination and shows pending counts", () => {
    render(
      <MemoryRouter initialEntries={["/admin/payments"]}>
        <AdminSidebar email="admin@example.test" onLogout={vi.fn()} pendingCounts={{ "/admin/payments": 3 }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Kinh doanh" })).toBeInTheDocument();
    const paymentLink = screen.getByRole("link", { name: /Thanh toán/ });
    expect(paymentLink).toHaveAttribute("aria-current", "page");
    expect(within(paymentLink).getByText("3")).toBeInTheDocument();
  });

  it("renders each group title as a distinct editorial marker", () => {
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AdminSidebar email="admin@example.com" onLogout={vi.fn()} />
      </MemoryRouter>,
    );

    for (const name of ["Tổng quan", "Khách hàng", "Kinh doanh", "Vận hành", "Hệ thống"]) {
      const heading = screen.getByRole("heading", { level: 2, name });
      expect(heading).toHaveClass("border-app-line/60", "bg-app-bg-subtle/70", "text-app-ink-soft");
      expect(heading.querySelector("span[aria-hidden='true']")).toHaveClass("bg-app-accent");
    }
  });
});
