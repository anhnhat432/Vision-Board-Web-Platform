import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authedFetch: vi.fn(),
  isDemoMode: vi.fn(() => false),
}));

vi.mock("@/app/utils/app-mode", () => ({
  isDemoMode: mocks.isDemoMode,
}));

vi.mock("@/lib/auth/authedFetch", () => ({
  AuthError: class AuthError extends Error {
    public readonly status = 401;
    public readonly code = "AUTH_FORCE_LOGOUT";
  },
  authedFetch: mocks.authedFetch,
}));

import { addResponseErrorInterceptor, get, getFile } from "./apiClient";

describe("apiClient getFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDemoMode.mockReturnValue(false);
  });

  it("returns the authenticated response Blob and sanitized download filename", async () => {
    const expectedBlob = new Blob(["orderId,amount\\nVB-1,99000"], { type: "text/csv" });
    const blob = vi.fn().mockResolvedValue(expectedBlob);
    mocks.authedFetch.mockResolvedValueOnce({
      ok: true,
      blob,
      headers: new Headers({
        "Content-Disposition": "attachment; filename*=UTF-8''sales%2F2026%5C07.csv",
      }),
    } as unknown as Response);

    const result = await getFile("/admin/reports/sales/export");

    expect(result.blob).toBe(expectedBlob);
    expect(result.filename).toBe("sales-2026-07.csv");
    expect(blob).toHaveBeenCalledOnce();
    expect(mocks.authedFetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/admin/reports/sales/export",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("runs shared error interceptors and never materializes an error response as a Blob", async () => {
    const blob = vi.fn();
    const interceptor = vi.fn();
    const removeInterceptor = addResponseErrorInterceptor(interceptor);
    mocks.authedFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue(JSON.stringify({ message: "Export failed" })),
      blob,
    } as unknown as Response);

    try {
      await expect(getFile("/admin/reports/sales/export")).rejects.toMatchObject({
        message: "Export failed",
        status: 500,
      });
    } finally {
      removeInterceptor();
    }

    expect(blob).not.toHaveBeenCalled();
    expect(interceptor).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
  });

  it("normalizes authedFetch rejections as network errors and runs shared interceptors", async () => {
    const networkError = new Error("connection reset");
    const interceptor = vi.fn();
    const removeInterceptor = addResponseErrorInterceptor(interceptor);
    mocks.authedFetch.mockRejectedValueOnce(networkError);

    try {
      await expect(getFile("/admin/reports/sales/export")).rejects.toMatchObject({
        message: "Lỗi kết nối mạng. Kiểm tra mạng rồi thử lại.",
        isNetworkError: true,
        details: networkError,
      });
    } finally {
      removeInterceptor();
    }

    expect(interceptor).toHaveBeenCalledWith(
      expect.objectContaining({ isNetworkError: true, details: networkError }),
    );
  });

  it("normalizes Blob read rejections as network errors and runs shared interceptors", async () => {
    const blobError = new Error("download stream interrupted");
    const interceptor = vi.fn();
    const removeInterceptor = addResponseErrorInterceptor(interceptor);
    mocks.authedFetch.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockRejectedValue(blobError),
      headers: new Headers(),
    } as unknown as Response);

    try {
      await expect(getFile("/admin/reports/sales/export")).rejects.toMatchObject({
        message: "Lỗi kết nối mạng. Kiểm tra mạng rồi thử lại.",
        isNetworkError: true,
        details: blobError,
      });
    } finally {
      removeInterceptor();
    }

    expect(interceptor).toHaveBeenCalledWith(
      expect.objectContaining({ isNetworkError: true, details: blobError }),
    );
  });

  it("normalizes failed-response body read errors for file downloads", async () => {
    const bodyReadError = new Error("response body unavailable");
    const interceptor = vi.fn();
    const removeInterceptor = addResponseErrorInterceptor(interceptor);
    mocks.authedFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: vi.fn().mockRejectedValue(bodyReadError),
    } as unknown as Response);

    try {
      await expect(getFile("/admin/reports/sales/export")).rejects.toMatchObject({
        message: "Lỗi kết nối mạng. Kiểm tra mạng rồi thử lại.",
        isNetworkError: true,
        details: bodyReadError,
      });
    } finally {
      removeInterceptor();
    }

    expect(interceptor).toHaveBeenCalledWith(
      expect.objectContaining({ isNetworkError: true, details: bodyReadError }),
    );
  });

  it("normalizes failed-response body read errors for the shared JSON client", async () => {
    const bodyReadError = new Error("response body unavailable");
    const interceptor = vi.fn();
    const removeInterceptor = addResponseErrorInterceptor(interceptor);
    mocks.authedFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: vi.fn().mockRejectedValue(bodyReadError),
    } as unknown as Response);

    try {
      await expect(get("/admin/reports/sales")).rejects.toMatchObject({
        message: "Lỗi kết nối mạng. Kiểm tra mạng rồi thử lại.",
        isNetworkError: true,
        details: bodyReadError,
      });
    } finally {
      removeInterceptor();
    }

    expect(interceptor).toHaveBeenCalledWith(
      expect.objectContaining({ isNetworkError: true, details: bodyReadError }),
    );
  });
});
