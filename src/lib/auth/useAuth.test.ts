import { describe, expect, it } from "vitest";

import { resolveAuthErrorMessage } from "./useAuth";

describe("resolveAuthErrorMessage", () => {
  it("explains missing Firebase Authentication setup", () => {
    expect(resolveAuthErrorMessage({ code: "auth/configuration-not-found" })).toContain(
      "Đăng nhập hiện chưa sẵn sàng",
    );
  });

  it("explains disabled sign-in providers", () => {
    expect(resolveAuthErrorMessage({ code: "auth/operation-not-allowed" })).toContain(
      "Phương thức đăng nhập này chưa sẵn sàng",
    );
  });

  it("explains unauthorized Firebase domains", () => {
    expect(resolveAuthErrorMessage({ code: "auth/unauthorized-domain" })).toContain(
      "Trang này chưa được phép đăng nhập trên tên miền hiện tại",
    );
  });

  it("keeps useful unknown error messages", () => {
    expect(resolveAuthErrorMessage(new Error("Custom auth failure"))).toBe("Custom auth failure");
  });
});
