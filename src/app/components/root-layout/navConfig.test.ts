import { describe, expect, it } from "vitest";

import { getNavItemsForState, NAV_ITEMS } from "./navConfig";

describe("root layout navigation config", () => {
  it("keeps order history out of the default sidebar navigation", () => {
    expect(NAV_ITEMS.some((item) => item.path === "/order-status")).toBe(false);
    expect(getNavItemsForState(false).secondaryNavItems.some((item) => item.path === "/order-status")).toBe(false);
    expect(getNavItemsForState(false).mobileMenuNavItems.some((item) => item.path === "/order-status")).toBe(false);
  });
});
