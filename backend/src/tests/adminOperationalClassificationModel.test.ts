import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OrderModel } from "../models/OrderModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";

describe("operational classification model contract", () => {
  it("keeps legacy documents valid and registers classification indexes", () => {
    const legacyUser = new UserModel({
      firebaseUid: "u1",
      email: "u1@example.test",
      displayName: "U1",
    });

    const legacyPaymentOrder = new PaymentOrderModel({
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
    const legacyOrder = new OrderModel({
      userId: "user_legacy",
      fullName: "Legacy User",
      email: "legacy@example.test",
      phone: "0000000000",
      shippingAddress: { line1: "Legacy address" },
    });

    assert.equal(legacyUser.validateSync(), undefined);
    assert.equal(legacyPaymentOrder.validateSync(), undefined);
    assert.equal(legacyOrder.validateSync(), undefined);

    const userIndexes = UserModel.schema.indexes().map(([fields]) => fields);
    const paymentIndexes = PaymentOrderModel.schema.indexes().map(([fields]) => fields);
    const orderIndexes = OrderModel.schema.indexes().map(([fields]) => fields);

    assert.ok(
      userIndexes.some(
        (fields) =>
          fields["operationalClassification.category"] === 1 && fields.createdAt === -1,
      ),
    );
    assert.ok(
      paymentIndexes.some(
        (fields) =>
          fields["operationalClassification.category"] === 1 &&
          fields.status === 1 &&
          fields.completedAt === -1,
      ),
    );
    assert.ok(
      orderIndexes.some(
        (fields) =>
          fields["operationalClassification.category"] === 1 && fields.createdAt === -1,
      ),
    );
  });

  it("rejects persisted classification category and reason mismatches", () => {
    const invalidDocument = new UserModel({
      firebaseUid: "u2",
      email: "u2@example.test",
      displayName: "U2",
      operationalClassification: {
        category: "real",
        reason: "test_account",
        classifiedBy: "admin_uid",
        classifiedAt: new Date(),
      },
    });

    assert.match(invalidDocument.validateSync()?.message ?? "", /classification reason/i);
  });

  it("requires a non-blank persisted note when the reason is other", () => {
    const baseClassification = {
      category: "test",
      reason: "other",
      classifiedBy: "admin_uid",
      classifiedAt: new Date(),
    } as const;
    const missingNote = new UserModel({
      firebaseUid: "u3",
      email: "u3@example.test",
      displayName: "U3",
      operationalClassification: baseClassification,
    });
    const blankNote = new UserModel({
      firebaseUid: "u4",
      email: "u4@example.test",
      displayName: "U4",
      operationalClassification: { ...baseClassification, note: "   " },
    });
    const confirmedRealWithoutNote = new UserModel({
      firebaseUid: "u5",
      email: "u5@example.test",
      displayName: "U5",
      operationalClassification: {
        category: "real",
        reason: "confirmed_real",
        classifiedBy: "admin_uid",
        classifiedAt: new Date(),
      },
    });

    assert.match(missingNote.validateSync()?.message ?? "", /note/i);
    assert.match(blankNote.validateSync()?.message ?? "", /note/i);
    assert.equal(confirmedRealWithoutNote.validateSync(), undefined);
  });
});
