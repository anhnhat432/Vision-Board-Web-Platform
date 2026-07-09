import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicVisitorDeferredFooter } from "./PublicVisitorDeferredSections";
import { PublicVisitorView } from "./PublicVisitorView";

describe("PublicVisitorDeferredFooter", () => {
  it("shows legal and support links for signed-out landing visitors", () => {
    render(<PublicVisitorDeferredFooter />);

    expect(screen.getByRole("link", { name: /Điều khoản dịch vụ/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Chính sách bảo mật/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /Chính sách hoàn tiền/i })).toHaveAttribute("href", "/refund-policy");
    expect(screen.getByRole("link", { name: /Liên hệ/i })).toHaveAttribute("href", "/contact");
  });

  it("does not create a nested main landmark when rendered inside the public landing layout", () => {
    render(
      <main id="main-content" aria-label="Nội dung trang">
        <PublicVisitorView
          isDemo={false}
          hasLocalData={false}
          onStart={() => {}}
          onSignIn={() => {}}
          onSignUp={() => {}}
        />
      </main>,
    );

    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(screen.getByRole("main", { name: "Nội dung trang" })).toHaveAttribute("id", "main-content");
  });
});
