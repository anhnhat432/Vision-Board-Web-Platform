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
  adminClassifyPaymentOrder,
  adminClassifyUsers,
  adminExportSalesReport,
  adminGetSalesReport,
  adminListPaymentOrders,
  adminListUsers,
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

describe("adminService operational classification", () => {
  beforeEach(() => {
    apiClientMock.get.mockReset();
    apiClientMock.patch.mockReset();
  });

  it("serializes user category filters and sends bounded bulk classification payloads", async () => {
    await adminListUsers({ operationalCategory: "real", page: 1, limit: 30 });
    expect(apiClientMock.get).toHaveBeenCalledWith("/admin/users?operationalCategory=real&page=1&limit=30");

    const payload = {
      category: "test" as const,
      reason: "test_account" as const,
      changes: [{ userUid: "u1", requestId: "11111111-1111-4111-8111-111111111111" }],
    };
    await adminClassifyUsers(payload);

    expect(apiClientMock.patch).toHaveBeenCalledWith("/admin/users/operational-classification", payload);
  });

  it("serializes payment scope filters and targets the payment classification route", async () => {
    await adminListPaymentOrders({ operationalScope: "excluded", page: 2, limit: 30 });
    expect(apiClientMock.get).toHaveBeenCalledWith(
      "/admin/billing/payment-orders?operationalScope=excluded&page=2&limit=30",
    );

    const payload = {
      requestId: "11111111-1111-4111-8111-111111111111",
      category: "internal" as const,
      reason: "internal_team" as const,
    };
    await adminClassifyPaymentOrder("VB TEST/1", payload);

    expect(apiClientMock.patch).toHaveBeenCalledWith(
      "/admin/billing/payment-orders/VB%20TEST%2F1/operational-classification",
      payload,
    );
  });
});
