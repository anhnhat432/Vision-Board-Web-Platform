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

    assert.equal(legacyUser.validateSync(), undefined);

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
});
