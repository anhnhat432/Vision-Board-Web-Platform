import { describe, expect, it } from "vitest";

import { getNavItemsForState, NAV_ITEMS } from "./navConfig";

describe("root layout navigation config", () => {
  it("exposes the order page from the sidebar navigation", () => {
    const nav = getNavItemsForState(false);

    expect(nav.secondaryNavItems.some((item) => item.path === "/order")).toBe(true);
    expect(nav.mobileMenuNavItems.some((item) => item.path === "/order")).toBe(true);
    expect(nav.primaryNavItems.some((item) => item.path === "/order")).toBe(false);
    expect(nav.bottomNavItems.some((item) => item.path === "/order")).toBe(false);
  });

  it("keeps order history out of the default sidebar navigation", () => {
    expect(NAV_ITEMS.some((item) => item.path === "/order-status")).toBe(false);
    expect(getNavItemsForState(false).secondaryNavItems.some((item) => item.path === "/order-status")).toBe(false);
    expect(getNavItemsForState(false).mobileMenuNavItems.some((item) => item.path === "/order-status")).toBe(false);
  });
});
