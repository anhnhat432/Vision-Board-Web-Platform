import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCouponValidation } from "@/features/billing/useCouponValidation";

const mockPost = vi.fn();

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  toAppError: vi.fn(),
  isRateLimitError: vi.fn(),
  RateLimitError: class {},
  getApiBaseUrl: vi.fn(),
  isApiBaseUrlConfigured: vi.fn(),
}));

describe("useCouponValidation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("khởi tạo với trạng thái idle", () => {
    const { result } = renderHook(() => useCouponValidation());
    expect(result.current.status).toBe("idle");
    expect(result.current.discount).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("chuyển sang loading khi validate được gọi", () => {
    mockPost.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCouponValidation());

    act(() => {
      result.current.validate("TEST30");
    });

    expect(result.current.status).toBe("loading");
  });

  it("chuyển sang valid khi API trả về thành công", async () => {
    // apiClient.post unwraps the envelope, returns .data directly
    mockPost.mockResolvedValue({
      valid: true,
      discountPercent: 30,
      discountAmount: 29700,
      discountType: "percentage",
      discountCode: "TEST30",
      discountName: "Test 30%",
      originalAmount: 99000,
      finalAmount: 69300,
    });

    const { result } = renderHook(() => useCouponValidation());

    await act(async () => {
      result.current.validate("TEST30");
    });

    expect(result.current.status).toBe("valid");
    expect(result.current.discount?.discountCode).toBe("TEST30");
    expect(result.current.discount?.discountPercent).toBe(30);
    expect(result.current.error).toBeNull();
  });

  it("chuyển sang invalid khi API trả về valid: false", async () => {
    // apiClient.post unwraps, returns { valid: false, reason: "..." } directly
    mockPost.mockResolvedValue({
      valid: false,
      reason: "Mã giảm giá không tồn tại hoặc đã hết hạn.",
    });

    const { result } = renderHook(() => useCouponValidation());

    await act(async () => {
      result.current.validate("INVALID");
    });

    expect(result.current.status).toBe("invalid");
    expect(result.current.discount).toBeNull();
    expect(result.current.error).toBe("Mã giảm giá không tồn tại hoặc đã hết hạn.");
  });

  it("chuyển sang invalid khi API throw lỗi mạng", async () => {
    mockPost.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCouponValidation());

    await act(async () => {
      result.current.validate("ANYCODE");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("invalid");
    });

    expect(result.current.error).toBe("Network error");
  });

  it("về idle khi gọi validate với chuỗi rỗng", () => {
    const { result } = renderHook(() => useCouponValidation());

    act(() => {
      result.current.validate("");
    });

    expect(result.current.status).toBe("idle");
  });

  it("reset() đưa state về idle", async () => {
    mockPost.mockResolvedValue({ valid: true, discountPercent: 20, discountCode: "SALE20" });

    const { result } = renderHook(() => useCouponValidation());

    await act(async () => {
      result.current.validate("SALE20");
    });

    expect(result.current.status).toBe("valid");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
  });

  it("gửi planCode và purpose khi được cấu hình", async () => {
    mockPost.mockResolvedValue({ valid: true, discountPercent: 15 });

    const { result } = renderHook(() =>
      useCouponValidation({ planCode: "PLUS", purpose: "physical_order" }),
    );

    await act(async () => {
      result.current.validate("KIT20");
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/billing/validate-coupon",
      { code: "KIT20", planCode: "PLUS", purpose: "physical_order" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
