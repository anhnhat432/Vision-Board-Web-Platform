import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  patch: apiClientMock.patch,
  post: apiClientMock.post,
}));

import { recordSignupTermsAcceptance, resolveAuthErrorMessage } from "./useAuth";

beforeEach(() => {
  apiClientMock.patch.mockReset();
  apiClientMock.post.mockReset();
});

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

describe("recordSignupTermsAcceptance", () => {
  it("bootstraps the profile and writes termsAcceptedAt", async () => {
    const acceptedAt = new Date("2026-05-14T12:34:56.000Z");
    const profile = {
      id: "profile_1",
      firebaseUid: "firebase_uid",
      email: "user@example.com",
      displayName: "User",
      role: "user",
      onboardingCompletedAt: null,
      termsAcceptedAt: acceptedAt.toISOString(),
      avatarUrl: null,
      locale: "vi",
      createdAt: acceptedAt.toISOString(),
      updatedAt: acceptedAt.toISOString(),
    };

    apiClientMock.post.mockResolvedValue(profile);
    apiClientMock.patch.mockResolvedValue(profile);

    await expect(recordSignupTermsAcceptance(acceptedAt)).resolves.toEqual(profile);
    expect(apiClientMock.post).toHaveBeenCalledWith("/auth/profile");
    expect(apiClientMock.patch).toHaveBeenCalledWith("/auth/profile", {
      termsAcceptedAt: acceptedAt.toISOString(),
    });
  });
});
