import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  getFile: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/api/apiClient", () => ({
  get: apiClientMock.get,
  getFile: apiClientMock.getFile,
  patch: apiClientMock.patch,
}));

import {
  adminExportSalesReport,
  adminGetSalesReport,
  adminReviewSalesOrder,
  type AdminSalesReportRow,
} from "./adminService";

describe("adminService sales reporting", () => {
  beforeEach(() => {
    apiClientMock.get.mockReset();
    apiClientMock.getFile.mockReset();
    apiClientMock.patch.mockReset();
  });

  it("serializes list filters including pagination", async () => {
    await adminGetSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      provider: "payos",
      kpiStatus: "included",
      page: 2,
      limit: 20,
    });

    expect(apiClientMock.get).toHaveBeenCalledWith(
      "/admin/reports/sales?from=2026-07-01&to=2026-07-11&provider=payos&kpiStatus=included&page=2&limit=20",
    );
  });

  it("encodes an order ID before reviewing its sales status", async () => {
    const payload = {
      kpiStatus: "excluded" as const,
      exclusionReason: "test" as const,
      reviewNote: "Bản kiểm thử.",
      reviewRequestId: "6d884b3c-b7f1-44bd-9b17-d5527a8db734",
    };

    await adminReviewSalesOrder("VB REPORT/01", payload);

    expect(apiClientMock.patch).toHaveBeenCalledWith(
      "/admin/reports/sales/VB%20REPORT%2F01/review",
      payload,
    );
  });

  it("exports without pagination and omits the all-provider sentinel", async () => {
    await adminExportSalesReport({
      from: "2026-07-01",
      to: "2026-07-11",
      provider: "all",
      kpiStatus: "pending",
      page: 2,
      limit: 20,
    });

    expect(apiClientMock.getFile).toHaveBeenCalledWith(
      "/admin/reports/sales/export?from=2026-07-01&to=2026-07-11&kpiStatus=pending",
    );
  });

  it("does not expose private sales-review or raw customer identity fields in report rows", () => {
    type PrivateSalesFields = Extract<keyof AdminSalesReportRow, "reviewNote" | "reviewedBy" | "userId" | "email">;

    expectTypeOf<PrivateSalesFields>().toEqualTypeOf<never>();
  });
});
