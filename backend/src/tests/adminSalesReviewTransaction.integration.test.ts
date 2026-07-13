import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import mongoose from "mongoose";

const transactionUri = process.env.MONGODB_TRANSACTION_TEST_URI;
process.env.MONGODB_URI ??= transactionUri ?? "mongodb://127.0.0.1:27017/admin-sales-review-transaction-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-sales-review-transaction-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import { AuditLogModel } from "../models/auditLogModel";
import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import { initializeAdminAuditPersistence } from "../services/adminAuditOutboxService";
import { reviewAdminSalesOrder } from "../services/adminSalesReportService";
import { ApiError } from "../utils/apiError";

it("atomically commits or rolls back the sales review and outbox", { skip: !transactionUri }, async () => {
  const appName = "admin-sales-review-transaction-test";
  await mongoose.connect(transactionUri!, { appName });
  const suffix = Date.now().toString(36).slice(-8).toUpperCase();
  const orderId = `VB${suffix}`;
  const userId = `audit_tx_${suffix}`;
  const commitRequestId = randomUUID();
  const rollbackRequestId = randomUUID();
  const noDispatch = { triggerAuditDispatch() {} };

  try {
    await initializeAdminAuditPersistence();
    const [outboxIndexes, auditIndexes] = await Promise.all([
      AdminAuditOutboxModel.collection.indexes(),
      AuditLogModel.collection.indexes(),
    ]);
    assert.ok(outboxIndexes.some((index) => index.key.eventId === 1 && index.unique === true));
    assert.ok(outboxIndexes.some((index) =>
      index.key.completedAt === 1 && index.expireAfterSeconds === 2_592_000,
    ));
    assert.ok(auditIndexes.some((index) =>
      index.key.eventId === 1 && index.unique === true && index.sparse === true,
    ));

    await UserModel.create({
      firebaseUid: userId,
      email: `${userId}@example.test`,
      displayName: "Audit transaction fixture",
      role: "user",
    });
    await PaymentOrderModel.create({
      orderId,
      userId,
      planCode: "PLUS",
      billingCycle: "twelve_week",
      amount: 99000,
      currency: "VND",
      status: "completed",
      provider: "payos",
      purpose: "plus_subscription",
      bankAccount: "payos",
      bankName: "payos",
      accountName: "PayOS",
      description: orderId,
      qrDataUrl: "https://example.test/qr",
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    await reviewAdminSalesOrder({
      orderId,
      reviewerUid: "admin_uid",
      reviewRequestId: commitRequestId,
      kpiStatus: "included",
    }, noDispatch);
    assert.equal(await PaymentOrderModel.countDocuments({ orderId, "reporting.kpiStatus": "included" }), 1);
    assert.equal(await AdminAuditOutboxModel.countDocuments({ targetId: orderId }), 1);

    const adminDb = mongoose.connection.db!.admin();
    await adminDb.command({
      configureFailPoint: "failCommand",
      mode: { times: 1 },
      data: { failCommands: ["insert"], appName, errorCode: 121 },
    });
    await assert.rejects(
      reviewAdminSalesOrder({
        orderId,
        reviewerUid: "admin_uid",
        reviewRequestId: rollbackRequestId,
        kpiStatus: "excluded",
        exclusionReason: "test",
      }, noDispatch),
      (error: unknown) => error instanceof ApiError &&
        error.statusCode === 503 &&
        error.errorCode === "admin_audit_unavailable",
    );
    const unchanged = await PaymentOrderModel.findOne({ orderId }).lean();
    assert.equal(unchanged?.reporting?.kpiStatus, "included");
    assert.equal(await AdminAuditOutboxModel.countDocuments({ targetId: orderId }), 1);
  } finally {
    await mongoose.connection.db?.admin().command({ configureFailPoint: "failCommand", mode: "off" }).catch(() => undefined);
    await Promise.all([
      AdminAuditOutboxModel.deleteMany({ targetId: orderId }),
      AuditLogModel.deleteMany({ targetId: orderId }),
      PaymentOrderModel.deleteMany({ orderId }),
      RefundRequestModel.deleteMany({ orderId }),
      UserModel.deleteMany({ firebaseUid: userId }),
    ]);
    await mongoose.disconnect();
  }
});
