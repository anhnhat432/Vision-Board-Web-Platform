import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  getFile: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  get: apiClientMock.get,
  getFile: apiClientMock.getFile,
  patch: apiClientMock.patch,
  post: vi.fn(),
}));

import {
  adminClassifyPhysicalOrder,
  adminExportOrders,
  adminGetOrders,
} from "./orderService";

describe("admin physical-order classification contracts", () => {
  beforeEach(() => {
    apiClientMock.get.mockReset();
    apiClientMock.getFile.mockReset();
    apiClientMock.patch.mockReset();
    apiClientMock.get.mockResolvedValue({ items: [] });
  });

  it("serializes every physical-order filter once for list and export", async () => {
    const params = {
      q: "abc",
      status: "pending" as const,
      frame: "Khung gỗ",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      operationalScope: "excluded" as const,
      page: 2,
      limit: 30,
    };

    await adminGetOrders(params);
    expect(apiClientMock.get).toHaveBeenCalledWith(
      "/admin/orders?q=abc&status=pending&frame=Khung+g%E1%BB%97&dateFrom=2026-07-01&dateTo=2026-07-31&operationalScope=excluded&page=2&limit=30",
    );

    await adminExportOrders(params);
    expect(apiClientMock.getFile).toHaveBeenCalledWith(
      "/admin/orders/export?q=abc&status=pending&frame=Khung+g%E1%BB%97&dateFrom=2026-07-01&dateTo=2026-07-31&operationalScope=excluded",
    );
  });

  it("sends the record payload without adding customer fields", async () => {
    const payload = {
      requestId: "11111111-1111-4111-8111-111111111111",
      category: "test" as const,
      reason: "automated_qa" as const,
    };

    await adminClassifyPhysicalOrder("507f1f77bcf86cd799439011", payload);

    expect(apiClientMock.patch).toHaveBeenCalledWith(
      "/admin/orders/507f1f77bcf86cd799439011/operational-classification",
      payload,
    );
  });
});
