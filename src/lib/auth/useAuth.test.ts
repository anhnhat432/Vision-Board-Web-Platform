import { describe, expect, it } from "vitest";

import { resolveAuthErrorMessage } from "./useAuth";

describe("resolveAuthErrorMessage", () => {
  it("explains missing Firebase Authentication setup", () => {
    expect(resolveAuthErrorMessage({ code: "auth/configuration-not-found" })).toContain(
      "Firebase Authentication chưa được bật",
    );
  });

  it("explains disabled sign-in providers", () => {
    expect(resolveAuthErrorMessage({ code: "auth/operation-not-allowed" })).toContain(
      "Phương thức đăng nhập này chưa được bật",
    );
  });

  it("explains unauthorized Firebase domains", () => {
    expect(resolveAuthErrorMessage({ code: "auth/unauthorized-domain" })).toContain(
      "Domain hiện tại chưa nằm trong Authorized domains",
    );
  });

  it("keeps useful unknown error messages", () => {
    expect(resolveAuthErrorMessage(new Error("Custom auth failure"))).toBe("Custom auth failure");
  });
});
