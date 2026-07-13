import { describe, expect, it } from "vitest";

import { getAdminNavItems } from "./AdminSidebar";

describe("getAdminNavItems", () => {
  it("shows the sales report exactly once in real mode and never in demo mode", () => {
    const realModeSalesLinks = getAdminNavItems("real").filter(
      (item) => item.label === "Báo cáo kinh doanh",
    );
    const demoModeSalesLinks = getAdminNavItems("demo").filter(
      (item) => item.label === "Báo cáo kinh doanh",
    );

    expect(realModeSalesLinks).toEqual([
      expect.objectContaining({ to: "/admin/reports/sales" }),
    ]);
    expect(demoModeSalesLinks).toEqual([]);
  });
});
