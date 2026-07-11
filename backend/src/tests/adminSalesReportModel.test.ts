import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PaymentOrderModel } from "../models/PaymentOrderModel";

describe("PaymentOrder reporting schema", () => {
  it("keeps reporting optional for legacy orders and validates persisted review metadata", () => {
    const legacy = new PaymentOrderModel({
      orderId: "VBLEGACY01",
      userId: "user_legacy",
      planCode: "PLUS",
      billingCycle: "twelve_week",
      amount: 99000,
      currency: "VND",
      status: "completed",
      provider: "payos",
      purpose: "plus_subscription",
      bankAccount: "payos",
      bankName: "PayOS",
      accountName: "PayOS",
      description: "VBLEGACY01",
      qrDataUrl: "https://example.test/qr",
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      expiresAt: new Date("2026-07-10T04:00:00.000Z"),
    });

    assert.equal(legacy.reporting, undefined);
    assert.equal(legacy.validateSync(), undefined);

    legacy.reporting = {
      kpiStatus: "excluded",
      exclusionReason: "test",
      reviewNote: "Giao dịch kiểm thử nội bộ.",
      reviewedBy: "admin_uid",
      reviewedAt: new Date("2026-07-11T02:00:00.000Z"),
    };
    assert.equal(legacy.validateSync(), undefined);

    legacy.reporting.kpiStatus = "invalid" as "included";
    assert.match(legacy.validateSync()?.message ?? "", /reporting\.kpiStatus/);
  });

  it("registers the two sales-reporting indexes", () => {
    const indexes = PaymentOrderModel.schema.indexes().map(([fields]) => fields);
    assert.ok(
      indexes.some(
        (fields) =>
          fields.status === 1 &&
          fields.purpose === 1 &&
          fields.provider === 1 &&
          fields.completedAt === -1,
      ),
    );
    assert.ok(
      indexes.some(
        (fields) => fields["reporting.kpiStatus"] === 1 && fields.completedAt === -1,
      ),
    );
  });
});
