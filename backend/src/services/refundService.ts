import { BillingEventModel } from "../models/BillingEventModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel, type RefundRequestDocument, type RefundRequestStatus } from "../models/refundRequestModel";
import { ApiError } from "../utils/apiError";
import { hashEmailPayload, sendEmail } from "./emailNotificationService";

const DEFAULT_REFUND_WINDOW_DAYS = 7;
const DEFAULT_REFUND_MAX_USED_PERCENT = 25;
const TWELVE_WEEKS_DAYS = 84;

export interface CreateRefundRequestInput {
  orderId: string;
  userId: string;
  userEmail?: string | null;
  emailVerified?: boolean;
  contactEmail: string;
  reason: string;
  refundAccount: string;
}

export interface ResolveRefundRequestInput {
  requestId: string;
  adminUserId: string;
  status: Extract<RefundRequestStatus, "completed" | "rejected">;
  adminNote?: string;
}

function getRefundWindowDays(): number {
  const parsed = Number.parseInt(process.env.REFUND_WINDOW_DAYS?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFUND_WINDOW_DAYS;
}

function getRefundMaxUsedPercent(): number {
  const parsed = Number.parseInt(process.env.REFUND_MAX_USED_PERCENT?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : DEFAULT_REFUND_MAX_USED_PERCENT;
}

function getSupportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.VITE_BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    ""
  );
}

function isEmail(value: string | null | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} is required.`, undefined, `invalid_${fieldName}`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `${fieldName} is required.`, undefined, `invalid_${fieldName}`);
  }
  return trimmed.slice(0, maxLength);
}

function toIso(value: Date | null | undefined): string | null {
  return value instanceof Date && Number.isFinite(value.valueOf()) ? value.toISOString() : null;
}

function isRefundEligible(completedAt: Date | null | undefined): boolean {
  if (!completedAt) return false;
  const refundWindowDays = getRefundWindowDays();
  const maxUsedPercent = getRefundMaxUsedPercent();
  const elapsedMs = Date.now() - completedAt.getTime();
  if (elapsedMs < 0) return true;
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
  const usedPercent = (elapsedDays / TWELVE_WEEKS_DAYS) * 100;
  return elapsedDays <= refundWindowDays && usedPercent <= maxUsedPercent;
}

function serializeRefundRequest(request: RefundRequestDocument) {
  return {
    id: String(request._id),
    orderId: request.orderId,
    userId: request.userId,
    userEmail: request.userEmail,
    contactEmail: request.contactEmail,
    reason: request.reason,
    refundAccount: request.refundAccount,
    status: request.status,
    adminNote: request.adminNote ?? null,
    resolvedBy: request.resolvedBy ?? null,
    resolvedAt: toIso(request.resolvedAt ?? null),
    createdAt: toIso(request.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(request.updatedAt) ?? new Date().toISOString(),
  };
}

async function auditRefundAction(input: {
  action: string;
  refundRequestId: string;
  orderId: string;
  userId: string;
  actorUserId?: string;
  status: RefundRequestStatus;
}): Promise<void> {
  const providerEventId = ["refund", input.action, input.refundRequestId, input.status].join(":");
  await BillingEventModel.create({
    provider: "admin",
    providerEventId,
    eventType: input.action,
    userId: input.actorUserId ?? input.userId,
    status: "processed",
    payloadHash: hashEmailPayload(
      JSON.stringify({
        refundRequestId: input.refundRequestId,
        orderId: input.orderId,
        userId: input.userId,
        actorUserId: input.actorUserId,
        status: input.status,
      }),
    ),
    processedAt: new Date(),
  });
}

async function sendSupportRefundRequestEmail(request: RefundRequestDocument): Promise<void> {
  const supportEmail = getSupportEmail();
  if (!isEmail(supportEmail)) return;

  const lines = [
    "Có yêu cầu hoàn tiền mới từ Dear Our Future.",
    `Mã yêu cầu: ${String(request._id)}`,
    `Mã đơn hàng: ${request.orderId}`,
    `User ID: ${request.userId}`,
    `Email liên hệ: ${request.contactEmail}`,
    `Lý do: ${request.reason}`,
    `Tài khoản nhận hoàn tiền: ${request.refundAccount}`,
    "Lưu ý: xử lý thủ công, admin duyệt rồi chuyển khoản hoàn tiền. Không log nội dung tài khoản ngân hàng ra console/Sentry.",
  ];

  await sendEmail({
    to: supportEmail,
    subject: `Yêu cầu hoàn tiền #${request.orderId} — Dear Our Future`,
    text: lines.join("\n"),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>Yêu cầu hoàn tiền</h1>${lines
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("")}</div>`,
    replyTo: request.contactEmail,
  });
}

async function sendUserRefundResolvedEmail(request: RefundRequestDocument): Promise<void> {
  if (!isEmail(request.contactEmail)) return;
  const isCompleted = request.status === "completed";
  const lines = [
    isCompleted
      ? "Yêu cầu hoàn tiền của bạn đã được xử lý."
      : "Yêu cầu hoàn tiền của bạn đã được xem xét nhưng chưa được duyệt.",
    `Mã đơn hàng: ${request.orderId}`,
    `Trạng thái: ${isCompleted ? "Đã hoàn tiền" : "Từ chối"}`,
    request.adminNote ? `Ghi chú: ${request.adminNote}` : "Nếu cần thêm thông tin, vui lòng phản hồi email này.",
  ];

  await sendEmail({
    to: request.contactEmail,
    subject: isCompleted
      ? `Yêu cầu hoàn tiền đã được xử lý #${request.orderId} — Dear Our Future`
      : `Cập nhật yêu cầu hoàn tiền #${request.orderId} — Dear Our Future`,
    text: lines.join("\n"),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>${isCompleted ? "Hoàn tiền đã xử lý" : "Cập nhật hoàn tiền"}</h1>${lines
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("")}</div>`,
  });
}

export async function createRefundRequest(input: CreateRefundRequestInput) {
  if (!input.emailVerified) {
    throw new ApiError(403, "Bạn cần xác minh email trước khi yêu cầu hoàn tiền.", undefined, "email_not_verified");
  }
  if (!isEmail(input.userEmail)) {
    throw new ApiError(400, "Tài khoản chưa có email hợp lệ.", undefined, "missing_verified_email");
  }
  if (!isEmail(input.contactEmail)) {
    throw new ApiError(400, "Email liên hệ không hợp lệ.", undefined, "invalid_contact_email");
  }

  const order = await PaymentOrderModel.findOne({ orderId: input.orderId, userId: input.userId });
  if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng.", undefined, "order_not_found");
  if (order.status !== "completed" || !order.completedAt) {
    throw new ApiError(409, "Chỉ đơn đã thanh toán mới có thể yêu cầu hoàn tiền.", undefined, "order_not_completed");
  }
  if (!isRefundEligible(order.completedAt)) {
    throw new ApiError(409, "Đơn hàng đã quá thời hạn hoàn tiền.", undefined, "refund_window_expired");
  }

  const existing = await RefundRequestModel.findOne({
    orderId: order.orderId,
    userId: input.userId,
    status: "pending",
  });
  if (existing) return serializeRefundRequest(existing);

  const request = await RefundRequestModel.create({
    orderId: order.orderId,
    userId: input.userId,
    userEmail: input.userEmail.trim().toLowerCase(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    reason: normalizeText(input.reason, "reason", 1000),
    refundAccount: normalizeText(input.refundAccount, "refundAccount", 300),
    status: "pending",
  });

  await auditRefundAction({
    action: "refund_request_created",
    refundRequestId: String(request._id),
    orderId: request.orderId,
    userId: request.userId,
    status: request.status,
  });
  await sendSupportRefundRequestEmail(request);
  return serializeRefundRequest(request);
}

export async function listRefundRequests(status: RefundRequestStatus | "all" = "pending") {
  const query = status === "all" ? {} : { status };
  const requests = await RefundRequestModel.find(query).sort({ createdAt: -1 }).limit(100);
  return requests.map(serializeRefundRequest);
}

export async function resolveRefundRequest(input: ResolveRefundRequestInput) {
  const request = await RefundRequestModel.findById(input.requestId);
  if (!request) throw new ApiError(404, "Không tìm thấy yêu cầu hoàn tiền.", undefined, "refund_request_not_found");
  if (request.status !== "pending") {
    return serializeRefundRequest(request);
  }

  const resolvedStatus: Extract<RefundRequestStatus, "completed" | "rejected"> = input.status;
  request.status = resolvedStatus;
  request.adminNote = input.adminNote?.trim().slice(0, 1000) || undefined;
  request.resolvedBy = input.adminUserId;
  request.resolvedAt = new Date();
  await request.save();

  await auditRefundAction({
    action: resolvedStatus === "completed" ? "refund_request_completed" : "refund_request_rejected",
    refundRequestId: String(request._id),
    orderId: request.orderId,
    userId: request.userId,
    actorUserId: input.adminUserId,
    status: resolvedStatus,
  });
  await sendUserRefundResolvedEmail(request);
  return serializeRefundRequest(request);
}

export function getRefundPolicyConfig() {
  return {
    refundWindowDays: getRefundWindowDays(),
    refundMaxUsedPercent: getRefundMaxUsedPercent(),
  };
}
