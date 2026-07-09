import { describe, expect, it } from "vitest";

import { applyRouteDocumentMetadata, getBreadcrumbTrail, getRouteMeta } from "./routeMeta";

describe("route metadata", () => {
  it.each([
    ["/onboarding", "Bắt đầu"],
    ["/life-insight", "Góc nhìn cuộc sống"],
    ["/smart-goal-setup", "Mục tiêu SMART"],
    ["/feasibility", "Kiểm tra tính khả thi"],
    ["/12-week-setup", "Thiết lập 12 tuần"],
  ])("uses core-flow metadata for %s", (path, expectedTitle) => {
    const meta = getRouteMeta(path);

    expect(meta.title).toContain(expectedTitle);
    expect(meta.title).not.toContain("Bảng điều khiển");
  });

  it.each([
    ["/privacy", "Chính sách bảo mật"],
    ["/terms", "Điều khoản dịch vụ"],
    ["/contact", "Liên hệ hỗ trợ"],
    ["/refund-policy", "Chính sách hoàn tiền"],
    ["/billing/plan", "Gói Plus & thanh toán"],
    ["/billing/confirm", "Xác nhận thanh toán"],
    ["/login", "Đăng nhập"],
  ])("uses trust-surface metadata for %s", (path, expectedTitle) => {
    const meta = getRouteMeta(path);

    expect(meta.title).toContain(expectedTitle);
    expect(meta.title).not.toContain("Trang chính");
  });

  it("applies route metadata to browser head tags", () => {
    document.head.innerHTML = `
      <meta name="description" content="Landing description" />
      <link rel="canonical" href="https://dearourfuture.io.vn/" />
      <meta property="og:url" content="https://dearourfuture.io.vn/" />
      <meta property="og:title" content="Dear Our Future" />
      <meta property="og:description" content="Landing OG description" />
      <meta name="twitter:title" content="Dear Our Future" />
      <meta name="twitter:description" content="Landing Twitter description" />
    `;

    applyRouteDocumentMetadata("/privacy");

    const getMetaContent = (selector: string) => document.head.querySelector<HTMLMetaElement>(selector)?.content;

    expect(document.title).toBe("Chính sách bảo mật – Dear Our Future");
    expect(getMetaContent('meta[name="description"]')).toBe(
      "Cách Dear Our Future bảo vệ dữ liệu, quyền riêng tư và lựa chọn của bạn.",
    );
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      "https://dearourfuture.io.vn/privacy",
    );
    expect(getMetaContent('meta[property="og:url"]')).toBe("https://dearourfuture.io.vn/privacy");
    expect(getMetaContent('meta[property="og:title"]')).toBe("Chính sách bảo mật – Dear Our Future");
    expect(getMetaContent('meta[property="og:description"]')).toBe(
      "Cách Dear Our Future bảo vệ dữ liệu, quyền riêng tư và lựa chọn của bạn.",
    );
    expect(getMetaContent('meta[name="twitter:title"]')).toBe("Chính sách bảo mật – Dear Our Future");
    expect(getMetaContent('meta[name="twitter:description"]')).toBe(
      "Cách Dear Our Future bảo vệ dữ liệu, quyền riêng tư và lựa chọn của bạn.",
    );
  });
});

describe("getBreadcrumbTrail", () => {
  it("returns empty for shallow routes (depth < 3)", () => {
    expect(getBreadcrumbTrail("/")).toEqual([]);
    expect(getBreadcrumbTrail("/billing")).toEqual([]);
    expect(getBreadcrumbTrail("/billing/plan")).toEqual([]);
  });

  it("builds trail for /billing/checkout/:orderId", () => {
    const trail = getBreadcrumbTrail("/billing/checkout/abc123");
    expect(trail.length).toBeGreaterThanOrEqual(1);
    expect(trail[trail.length - 1].isCurrent).toBe(true);
    expect(trail.some((c) => c.label === "Thanh toán")).toBe(true);
  });

  it("builds trail for /admin/orders", () => {
    expect(getBreadcrumbTrail("/admin/orders")).toEqual([]);
  });
});
