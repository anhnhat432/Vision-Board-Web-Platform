import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

export type EmailSendStatus = "sent" | "skipped" | "failed";

export interface EmailSendResult {
  status: EmailSendStatus;
  reason?: string;
  provider?: string;
}

export interface EmailRuntimeStatus {
  provider: string;
  configured: boolean;
  reason?: string;
}

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

interface BillingPaymentEmailInput {
  to?: string | null;
  displayName?: string | null;
  orderId: string;
  amount: number;
  currency: string;
  currentPeriodEnd?: Date | string | null;
}

interface BillingExpirationReminderEmailInput {
  to?: string | null;
  displayName?: string | null;
  planCode: string;
  currentPeriodEnd: Date | string;
}

function getEmailProvider(): string {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "disabled";
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function getSmtpPort(): number {
  const parsed = Number.parseInt(process.env.SMTP_PORT?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

function getSmtpHost(): string {
  return process.env.SMTP_HOST?.trim() ?? "";
}

function getSmtpUser(): string {
  return process.env.SMTP_USER?.trim() ?? "";
}

function getSmtpPassword(): string {
  return process.env.SMTP_PASS?.trim() ?? "";
}

function isSmtpSecure(): boolean {
  return parseBooleanEnv(process.env.SMTP_SECURE, getSmtpPort() === 465);
}

function shouldRequireSmtpTls(): boolean {
  return parseBooleanEnv(process.env.SMTP_REQUIRE_TLS, true);
}

function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.VITE_BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.BILLING_SUPPORT_EMAIL?.trim() ||
    ""
  );
}

function getEmailReplyTo(): string {
  return (
    process.env.EMAIL_REPLY_TO?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.VITE_BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.BILLING_SUPPORT_EMAIL?.trim() ||
    ""
  );
}

function getFrontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN?.trim().replace(/\/$/, "") || "";
}

function isConfiguredEmailAddress(value: string | null | undefined): value is string {
  return Boolean(value && value.includes("@") && value.trim().length <= 254);
}

function formatVnd(amount: number, currency: string): string {
  if (currency.toUpperCase() !== "VND") return `${amount.toLocaleString("vi-VN")} ${currency}`;
  return `${amount.toLocaleString("vi-VN")}đ`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "chưa có";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtmlEmail(title: string, lines: string[], action?: { label: string; url: string }): string {
  const safeTitle = escapeHtml(title);
  const safeLines = lines.map((line) => `<p style="margin:0 0 12px;color:#334155;line-height:1.6">${escapeHtml(line)}</p>`).join("");
  const actionHtml = action
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;border-radius:10px;background:#4f46e5;color:white;padding:12px 16px;text-decoration:none;font-weight:600">${escapeHtml(action.label)}</a></p>`
    : "";

  return [
    '<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">',
    '<div style="max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;background:white;padding:24px">',
    '<p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Dear Our Future</p>',
    `<h1 style="margin:0 0 16px;color:#0f172a;font-size:22px">${safeTitle}</h1>`,
    safeLines,
    actionHtml,
    '<p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">Email này được gửi tự động cho tài khoản Dear Our Future của bạn.</p>',
    "</div>",
    "</div>",
  ].join("");
}

export function hashEmailPayload(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function getEmailRuntimeStatus(): EmailRuntimeStatus {
  const provider = getEmailProvider();
  if (provider === "disabled" || provider === "off" || provider === "none") {
    return { provider, configured: false, reason: "email_provider_disabled" };
  }

  if (provider !== "resend" && provider !== "smtp") {
    return { provider, configured: false, reason: "unsupported_email_provider" };
  }

  if (!isConfiguredEmailAddress(getEmailFrom())) {
    return { provider, configured: false, reason: "missing_email_from" };
  }

  if (provider === "resend" && !process.env.RESEND_API_KEY?.trim()) {
    return { provider, configured: false, reason: "missing_resend_api_key" };
  }

  if (provider === "smtp") {
    if (!getSmtpHost()) return { provider, configured: false, reason: "missing_smtp_host" };
    if (!getSmtpUser()) return { provider, configured: false, reason: "missing_smtp_user" };
    if (!getSmtpPassword()) return { provider, configured: false, reason: "missing_smtp_pass" };
    if (!isSmtpSecure() && !shouldRequireSmtpTls()) {
      return { provider, configured: false, reason: "smtp_tls_required" };
    }
  }

  return { provider, configured: true };
}

export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  if (provider === "disabled" || provider === "off" || provider === "none") {
    return { status: "skipped", reason: "email_provider_disabled", provider };
  }

  if (!isConfiguredEmailAddress(input.to)) {
    return { status: "skipped", reason: "missing_recipient", provider };
  }

  const from = getEmailFrom();
  if (!isConfiguredEmailAddress(from)) {
    return { status: "skipped", reason: "missing_email_from", provider };
  }

  if (provider === "smtp") {
    if (!getSmtpHost()) return { status: "skipped", reason: "missing_smtp_host", provider };
    if (!getSmtpUser()) return { status: "skipped", reason: "missing_smtp_user", provider };
    if (!getSmtpPassword()) return { status: "skipped", reason: "missing_smtp_pass", provider };
    if (!isSmtpSecure() && !shouldRequireSmtpTls()) {
      return { status: "skipped", reason: "smtp_tls_required", provider };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: getSmtpHost(),
        port: getSmtpPort(),
        secure: isSmtpSecure(),
        requireTLS: shouldRequireSmtpTls(),
        auth: {
          user: getSmtpUser(),
          pass: getSmtpPassword(),
        },
      });

      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: input.replyTo || getEmailReplyTo() || undefined,
      });

      return { status: "sent", provider };
    } catch (error) {
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "email_send_failed",
        provider,
      };
    }
  }

  if (provider !== "resend") {
    return { status: "skipped", reason: "unsupported_email_provider", provider };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { status: "skipped", reason: "missing_resend_api_key", provider };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        reply_to: input.replyTo || getEmailReplyTo() || undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        status: "failed",
        reason: `resend_http_${response.status}${body ? `:${body.slice(0, 160)}` : ""}`,
        provider,
      };
    }

    return { status: "sent", provider };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "email_send_failed",
      provider,
    };
  }
}

export async function sendBillingPaymentConfirmedEmail(input: BillingPaymentEmailInput): Promise<EmailSendResult> {
  if (!isConfiguredEmailAddress(input.to)) {
    return { status: "skipped", reason: "missing_recipient", provider: getEmailProvider() };
  }

  const firstLine = input.displayName?.trim()
    ? `Chào ${input.displayName.trim()}, thanh toán của bạn đã được xác nhận.`
    : "Thanh toán của bạn đã được xác nhận.";
  const amountLabel = formatVnd(input.amount, input.currency);
  const periodEndLabel = formatDate(input.currentPeriodEnd);
  const frontendOrigin = getFrontendOrigin();
  const billingUrl = frontendOrigin ? `${frontendOrigin}/billing/plan` : "";
  const lines = [
    firstLine,
    `Mã đơn: ${input.orderId}`,
    `Số tiền: ${amountLabel}`,
    `Gói Plus đang hoạt động đến: ${periodEndLabel}`,
    "Bạn có thể mở lại trang gói để kiểm tra quyền Plus và lịch sử thanh toán.",
  ];

  return sendEmail({
    to: input.to,
    subject: `Dear Our Future - Thanh toán Plus đã xác nhận (${input.orderId})`,
    text: lines.join("\n"),
    html: buildHtmlEmail("Thanh toán Plus đã xác nhận", lines, billingUrl ? { label: "Mở trang gói", url: billingUrl } : undefined),
  });
}

export async function sendBillingExpirationReminderEmail(
  input: BillingExpirationReminderEmailInput,
): Promise<EmailSendResult> {
  if (!isConfiguredEmailAddress(input.to)) {
    return { status: "skipped", reason: "missing_recipient", provider: getEmailProvider() };
  }

  const periodEndLabel = formatDate(input.currentPeriodEnd);
  const frontendOrigin = getFrontendOrigin();
  const billingUrl = frontendOrigin ? `${frontendOrigin}/billing/plan` : "";
  const firstLine = input.displayName?.trim()
    ? `Chào ${input.displayName.trim()}, gói ${input.planCode} của bạn sắp hết hạn.`
    : `Gói ${input.planCode} của bạn sắp hết hạn.`;
  const lines = [
    firstLine,
    `Ngày hết hạn hiện tại: ${periodEndLabel}`,
    "Nếu muốn tiếp tục dùng quyền Plus, bạn có thể gia hạn bằng VietQR trên trang gói.",
    "Nếu bạn đã thanh toán nhưng quyền chưa mở, hãy gửi mã đơn và ảnh chuyển khoản cho email hỗ trợ.",
  ];

  return sendEmail({
    to: input.to,
    subject: "Dear Our Future - Nhắc gia hạn gói Plus",
    text: lines.join("\n"),
    html: buildHtmlEmail("Nhắc gia hạn gói Plus", lines, billingUrl ? { label: "Mở trang gia hạn", url: billingUrl } : undefined),
  });
}
