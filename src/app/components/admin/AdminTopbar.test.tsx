import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AdminSearchProvider, useAdminSearch } from "./AdminSearchContext";
import { AdminTopbar } from "./AdminTopbar";

function RegisteredSearch() {
  const [value, setValue] = useState("");
  useAdminSearch(value, setValue, "Tìm người dùng");
  return <AdminTopbar onOpenSidebar={vi.fn()} />;
}

describe("AdminTopbar", () => {
  it("omits search when the page has no registered handler", () => {
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AdminSearchProvider>
          <AdminTopbar onOpenSidebar={vi.fn()} />
        </AdminSearchProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Tổng quan");
  });

  it("binds a registered page search handler", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <AdminSearchProvider>
          <RegisteredSearch />
        </AdminSearchProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByRole("searchbox", { name: "Tìm kiếm trên trang admin" });
    await user.type(input, "an@example.com");
    expect(input).toHaveValue("an@example.com");
  });
});
