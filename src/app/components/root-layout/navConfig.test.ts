import { describe, expect, it } from "vitest";

import { getNavItemsForState, NAV_ITEMS, WARM_PREFETCH_ROUTE_PATHS } from "./navConfig";

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

  it("does not warm-prefetch the heaviest 12-week system route after shell mount", () => {
    expect(WARM_PREFETCH_ROUTE_PATHS).not.toContain("/12-week-system");
    expect(WARM_PREFETCH_ROUTE_PATHS).toContain("/goals");
    expect(WARM_PREFETCH_ROUTE_PATHS).toContain("/life-balance");
  });
});
