import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AppPublicFooter } from "./AppPublicFooter";

describe("AppPublicFooter", () => {
  it("keeps public legal, support, and social links reachable", () => {
    render(
      <MemoryRouter>
        <AppPublicFooter />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Điều khoản dịch vụ/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Chính sách bảo mật/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /Chính sách hoàn tiền/i })).toHaveAttribute("href", "/refund-policy");
    expect(screen.getByRole("link", { name: /Liên hệ/i })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "TikTok" })).toHaveAttribute("href", "https://www.tiktok.com/@dofexe201");
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/dearourfuture",
    );
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      "https://www.facebook.com/profile.php?id=61589773962146",
    );
  });
});
