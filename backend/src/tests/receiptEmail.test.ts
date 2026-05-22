import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import * as emailNotificationService from "../services/emailNotificationService";
import { renderPaymentReceiptEmail, sendPaymentReceipt } from "../services/receiptEmailService";

afterEach(() => {
  mock.restoreAll();
  delete process.env.SUPPORT_EMAIL;
  delete process.env.VITE_BILLING_SUPPORT_EMAIL;
});

describe("receiptEmailService", () => {
  it("renders the Vietnamese payment receipt template", () => {
    process.env.SUPPORT_EMAIL = "support@example.test";

    const rendered = renderPaymentReceiptEmail({
      orderId: "VBRCPT001",
      userEmail: "Buyer@Example.Test",
      userName: "Người mua",
      amount: 99000,
      currency: "VND",
      planName: "Plus monthly",
      paidAt: "2026-05-14T10:00:00.000Z",
      paymentRef: "casso_tx_123",
    });

    assert.equal(rendered.to, "buyer@example.test");
    assert.equal(rendered.subject, "Biên nhận thanh toán #VBRCPT001 — Dear Our Future");
    assert.match(rendered.text, /Dear Our Future đã xác nhận thanh toán/);
    assert.match(rendered.text, /Gói: Plus monthly/);
    assert.match(rendered.text, /Số tiền: 99\.000\s?₫/);
    assert.match(rendered.text, /Mã giao dịch thanh toán: casso_tx_123/);
    assert.match(rendered.text, /Nếu cần hỗ trợ hoặc hoàn tiền, liên hệ support@example\.test/);
    assert.match(rendered.text, /không phải hóa đơn VAT điện tử/);
    assert.match(rendered.html, /Biên nhận thanh toán/);
    assert.match(rendered.html, /Dear Our Future/);
    assert.equal(rendered.replyTo, "support@example.test");
  });

  it("sends the rendered receipt through the configured email provider", async () => {
    process.env.VITE_BILLING_SUPPORT_EMAIL = "billing@example.test";
    const sendEmailMock = mock.method(emailNotificationService, "sendEmail", async () => ({
      status: "sent" as const,
      provider: "resend",
    }));

    const result = await sendPaymentReceipt({
      orderId: "VBRCPT002",
      userEmail: "buyer@example.test",
      amount: 199000,
      currency: "VND",
      planName: "Plus yearly",
      paidAt: new Date("2026-05-14T12:00:00.000Z"),
      paymentRef: "casso_ref_456",
    });

    assert.equal(result.status, "sent");
    assert.equal(sendEmailMock.mock.callCount(), 1);
    const firstCall = sendEmailMock.mock.calls[0];
    assert.ok(firstCall);
    const [payload] = firstCall.arguments;
    assert.ok(payload);
    assert.equal(payload.to, "buyer@example.test");
    assert.equal(payload.subject, "Biên nhận thanh toán #VBRCPT002 — Dear Our Future");
    assert.match(payload.text, /Plus yearly/);
    assert.match(payload.html ?? "", /casso_ref_456/);
    assert.equal(payload.replyTo, "billing@example.test");
  });
});
