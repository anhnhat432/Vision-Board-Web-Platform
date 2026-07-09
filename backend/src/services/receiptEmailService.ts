import { sendEmail, type EmailSendResult } from "./emailNotificationService";

export interface SendPaymentReceiptInput {
  orderId: string;
  userEmail: string;
  userName?: string | null;
  amount: number;
  currency: string;
  planName: string;
  paidAt: Date | string;
  paymentRef?: string | null;
}

export interface RenderedPaymentReceiptEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

const HTML_ESCAPE: Record<string, string> = {
  "&": `&${"amp"};`,
  "<": `&${"lt"};`,
  ">": `&${"gt"};`,
  "\"": `&${"quot"};`,
  "'": `&${"#039"};`,
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char);
}

function isConfiguredEmailAddress(value: string | null | undefined): value is string {
  return Boolean(value && value.includes("@") && value.trim().length <= 254);
}

function getSupportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.VITE_BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "support@dearourfuture.com"
  );
}

function formatAmount(amount: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase() || "VND";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${normalizedCurrency}`;
  }
}

function formatPaidAt(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.valueOf())) return String(value);

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function renderPaymentReceiptEmail(input: SendPaymentReceiptInput): RenderedPaymentReceiptEmail {
  const to = input.userEmail.trim().toLowerCase();
  const supportEmail = getSupportEmail();
  const amountLabel = formatAmount(input.amount, input.currency);
  const paidAtLabel = formatPaidAt(input.paidAt);
  const paymentRef = input.paymentRef?.trim() || "Không có";
  const greeting = input.userName?.trim() ? `Chào ${input.userName.trim()},` : "Chào bạn,";
  const subject = `Biên nhận thanh toán #${input.orderId} — Dear Our Future`;
  const lines = [
    greeting,
    "Dear Our Future đã xác nhận thanh toán của bạn. Đây là biên nhận thanh toán đơn giản cho giao dịch mua gói trong ứng dụng.",
    `Mã đơn: ${input.orderId}`,
    `Gói: ${input.planName}`,
    `Số tiền: ${amountLabel}`,
    `Ngày thanh toán: ${paidAtLabel}`,
    `Mã giao dịch thanh toán: ${paymentRef}`,
    `Email nhận biên nhận: ${to}`,
    `Nếu cần hỗ trợ hoặc hoàn tiền, liên hệ ${supportEmail}.`,
    "Lưu ý: email này không phải hóa đơn VAT điện tử.",
  ];

  const rows = [
    ["Mã đơn", input.orderId],
    ["Gói", input.planName],
    ["Số tiền", amountLabel],
    ["Ngày thanh toán", paidAtLabel],
    ["Mã giao dịch thanh toán", paymentRef],
    ["Email nhận biên nhận", to],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;text-align:right">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = [
    '<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">',
    '<div style="max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:18px;background:white;padding:28px">',
    '<p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Dear Our Future</p>',
    '<h1 style="margin:0 0 16px;color:#0f172a;font-size:24px;line-height:1.3">Biên nhận thanh toán</h1>',
    `<p style="margin:0 0 12px;color:#334155;line-height:1.6">${escapeHtml(greeting)}</p>`,
    '<p style="margin:0 0 18px;color:#334155;line-height:1.6">Dear Our Future đã xác nhận thanh toán của bạn. Đây là biên nhận thanh toán đơn giản cho giao dịch mua gói trong ứng dụng.</p>',
    '<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">',
    htmlRows,
    '</table>',
    `<p style="margin:20px 0 0;color:#334155;line-height:1.6">Nếu cần hỗ trợ hoặc hoàn tiền, liên hệ <a href="mailto:${escapeHtml(supportEmail)}" style="color:#4f46e5;text-decoration:none;font-weight:600">${escapeHtml(supportEmail)}</a>.</p>`,
    '<p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.5">Email này không phải hóa đơn VAT điện tử và chỉ chứa thông tin giao dịch của chính tài khoản nhận biên nhận.</p>',
    "</div>",
    "</div>",
  ].join("");

  return {
    to,
    subject,
    text: lines.join("\n"),
    html,
    replyTo: isConfiguredEmailAddress(supportEmail) ? supportEmail : undefined,
  };
}

export async function sendPaymentReceipt(input: SendPaymentReceiptInput): Promise<EmailSendResult> {
  if (!isConfiguredEmailAddress(input.userEmail)) {
    return { status: "skipped", reason: "missing_recipient", provider: process.env.EMAIL_PROVIDER?.trim() || "disabled" };
  }

  const rendered = renderPaymentReceiptEmail(input);
  return sendEmail(rendered);
}
