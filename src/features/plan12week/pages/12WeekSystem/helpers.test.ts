import { describe, expect, it } from "vitest";

import { getBackendSyncIssueMessage, translateBackendErrorMessage } from "./helpers";

describe("translateBackendErrorMessage", () => {
  it("returns null for empty input", () => {
    expect(translateBackendErrorMessage(null)).toBeNull();
    expect(translateBackendErrorMessage(undefined)).toBeNull();
    expect(translateBackendErrorMessage("")).toBeNull();
    expect(translateBackendErrorMessage("   ")).toBeNull();
  });

  it("translates rate-limit errors", () => {
    expect(translateBackendErrorMessage("Too many requests. Please wait a moment and try again.")).toBe(
      "Bạn vừa đồng bộ liên tục. Hãy đợi một chút rồi thử lại.",
    );
    expect(translateBackendErrorMessage("Rate limit exceeded")).toBe(
      "Bạn vừa đồng bộ liên tục. Hãy đợi một chút rồi thử lại.",
    );
  });

  it("translates network errors", () => {
    expect(translateBackendErrorMessage("Network error: failed to fetch")).toBe(
      "Mạng đang chập chờn. Hãy kiểm tra kết nối rồi thử lại.",
    );
  });

  it("translates auth errors", () => {
    expect(translateBackendErrorMessage("Unauthorized")).toBe(
      "Phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.",
    );
    expect(translateBackendErrorMessage("Request failed with status 401")).toBe(
      "Phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.",
    );
  });

  it("translates timeouts", () => {
    expect(translateBackendErrorMessage("Request timeout")).toBe(
      "Yêu cầu mất quá nhiều thời gian. Hãy thử lại khi mạng ổn hơn.",
    );
  });

  it("falls back to generic message for unknown English text", () => {
    expect(translateBackendErrorMessage("Something completely unexpected went wrong")).toBe(
      "Máy chủ trả về lỗi. Hãy thử lại sau ít giây.",
    );
  });

  it("preserves Vietnamese messages as-is", () => {
    expect(translateBackendErrorMessage("Đã đồng bộ 3 mục lên backend.")).toBe("Đã đồng bộ 3 mục lên backend.");
  });
});

describe("getBackendSyncIssueMessage", () => {
  const baseStatus = {
    authConfigured: true,
    authLoading: false,
    signedIn: true,
    profileReady: true,
    displayName: "Test User",
    email: "test@example.com",
    syncing: false,
    syncStatus: "error" as const,
    lastSyncedAt: null,
    failedSyncCount: 1,
  };

  it("translates English syncMessage from backendConnectionStatus", () => {
    expect(
      getBackendSyncIssueMessage(
        { ...baseStatus, syncMessage: "Too many requests. Please wait a moment and try again." },
        null,
      ),
    ).toBe("Bạn vừa đồng bộ liên tục. Hãy đợi một chút rồi thử lại.");
  });

  it("uses fallback when no message is available", () => {
    expect(getBackendSyncIssueMessage({ ...baseStatus, syncMessage: null }, null)).toBe(
      "Dữ liệu trên thiết bị vẫn được giữ lại. Bạn có thể thử đồng bộ lại khi tài khoản hoặc mạng ổn định hơn.",
    );
  });

  it("falls back to hydration-result message when status has no message", () => {
    expect(
      getBackendSyncIssueMessage(
        { ...baseStatus, syncMessage: null },
        {
          status: "error",
          message: "Network error",
          hydratedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          failedCount: 1,
          conflictCount: 0,
          conflicts: [],
          latestGoalId: null,
        },
      ),
    ).toBe("Mạng đang chập chờn. Hãy kiểm tra kết nối rồi thử lại.");
  });
});
