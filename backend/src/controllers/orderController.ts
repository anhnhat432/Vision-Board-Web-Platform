import type { Request, Response } from "express";

import { orderService } from "../services/orderService";
import type { OrderStatus } from "../models/OrderModel";
import type { AdminOrderListInput, OrderEntity } from "../repositories/mongo/MongoOrderRepository";
import { parseOperationalScopeQuery } from "../services/adminOperationalClassificationQuery";
import { recordCouponUsage } from "../services/discountService";
import { getPaymentProviderAdapter } from "../services/paymentProviderRegistry";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { getParam, getQuery, requireAuthUser } from "./controllerHelpers";

const ORDER_STATUSES = new Set<OrderStatus>(["pending", "confirmed", "printing", "shipping", "delivered", "cancelled"]);
const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  printing: "Đang in",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
const DEFAULT_ADMIN_ORDER_LIMIT = 30;
const MAX_ADMIN_ORDER_LIMIT = 100;
const MAX_ADMIN_ORDER_QUERY_LENGTH = 120;

function parsePositiveInteger(value: unknown, fallback: number, field: "page" | "limit"): number {
  if (value == null || value === "") return fallback;
  const parsed = typeof value === "string" ? Number(value.trim()) : Array.isArray(value) ? NaN : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `${field} must be a positive integer.`, undefined, `invalid_admin_order_${field}`);
  }
  return field === "limit" ? Math.min(parsed, MAX_ADMIN_ORDER_LIMIT) : parsed;
}

function parseBoundedText(value: unknown, field: "q" | "frame"): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string") {
    throw new ApiError(400, `${field} must be a string.`, undefined, `invalid_admin_order_${field}`);
  }
  return value.trim().slice(0, MAX_ADMIN_ORDER_QUERY_LENGTH);
}

function parseAdminOrderStatus(value: unknown): OrderStatus | "all" {
  if (value == null || value === "") return "all";
  if (typeof value !== "string") {
    throw new ApiError(400, "status must be a string.", undefined, "invalid_admin_order_status");
  }
  const status = value.trim().toLowerCase();
  if (status === "all" || ORDER_STATUSES.has(status as OrderStatus)) return status as OrderStatus | "all";
  throw new ApiError(400, "Order status is invalid.", undefined, "invalid_admin_order_status");
}

function parseOrderDate(value: unknown, field: "dateFrom" | "dateTo"): Date | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `${field} must use YYYY-MM-DD.`, undefined, "invalid_admin_order_date");
  }
  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new ApiError(400, `${field} must be a valid calendar date.`, undefined, "invalid_admin_order_date");
  }
  return new Date(`${value}T00:00:00+07:00`);
}

function nextCalendarDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

function parseAdminOrderListInput(query: Request["query"]): AdminOrderListInput {
  const dateFrom = parseOrderDate(query.dateFrom, "dateFrom");
  const dateTo = parseOrderDate(query.dateTo, "dateTo");
  if (dateFrom && dateTo && dateTo < dateFrom) {
    throw new ApiError(400, "dateTo must not be before dateFrom.", undefined, "invalid_admin_order_date");
  }
  const frame = parseBoundedText(query.frame, "frame");
  return {
    q: parseBoundedText(query.q, "q"),
    status: parseAdminOrderStatus(query.status),
    frame: frame || "all",
    dateFrom,
    dateToExclusive: dateTo ? nextCalendarDay(dateTo) : undefined,
    operationalScope: parseOperationalScopeQuery(query.operationalScope),
    page: parsePositiveInteger(query.page, 1, "page"),
    limit: parsePositiveInteger(query.limit, DEFAULT_ADMIN_ORDER_LIMIT, "limit"),
  };
}

function csvCell(value: string | number | Date | undefined): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildAdminOrderCsv(orders: OrderEntity[]): string {
  const headers = ["Mã đơn", "Họ tên", "Email", "SĐT", "Trạng thái", "Khung", "Set ảnh", "Tổng tiền", "Địa chỉ", "Ngày tạo", "Mục tiêu"];
  const rows = orders.map((order) => {
    const frame = order.lines.find((line) => line.type === "frame")?.label ?? order.kitType ?? "";
    const themes = order.lines.filter((line) => line.type === "theme").map((line) => line.label).join("; ");
    const address = [order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.city]
      .filter(Boolean)
      .join(", ");
    return [order.id, order.fullName, order.email, order.phone, ORDER_STATUS_LABELS[order.status], frame, themes, order.totalVnd, address, order.createdAt, order.goalSnapshot?.title]
      .map(csvCell)
      .join(",");
  });
  return `\uFEFF${headers.map(csvCell).join(",")}\n${rows.join("\n")}`;
}

function buildPhysicalOrderPaymentDiscount(physicalOrder: Awaited<ReturnType<typeof orderService.getOrder>>) {
  if (!physicalOrder.discount) return undefined;
  return {
    source: physicalOrder.discount.source,
    couponCode: physicalOrder.discount.discountCode,
    discountId: physicalOrder.discount.discountId,
    discountName: physicalOrder.discount.discountName,
    discountPercent: physicalOrder.discount.discountPercent,
    discountType: physicalOrder.discount.discountType,
    discountAmount: physicalOrder.discount.discountAmount,
    originalAmount: physicalOrder.discount.originalAmount,
    finalAmount: physicalOrder.discount.finalAmount,
  };
}

async function reservePhysicalOrderCouponUsage(
  physicalOrder: Awaited<ReturnType<typeof orderService.getOrder>>,
  userId: string,
): Promise<void> {
  const discount = physicalOrder.discount;
  if (discount?.source !== "coupon" || !discount.discountId || !discount.discountCode) return;

  const usageRecorded = await recordCouponUsage(discount.discountId, discount.discountCode, userId, physicalOrder.id);
  if (!usageRecorded) {
    throw new ApiError(429, "Mã giảm giá đã hết lượt sử dụng. Vui lòng thử lại.", undefined, "coupon_exhausted");
  }
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.createOrder(user.uid, req.body ?? {});
  res.status(201).json(successResponse(order));
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const orders = await orderService.getUserOrders(user.uid);
  res.status(200).json(successResponse(orders));
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.getOrder(user.uid, getParam(req, "id"));
  res.status(200).json(successResponse(order));
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.cancelOrder(user.uid, getParam(req, "id"));
  res.status(200).json(successResponse(order));
}

export async function adminGetOrders(req: Request, res: Response): Promise<void> {
  requireAuthUser(req);
  const input = parseAdminOrderListInput(req.query);
  const result = await orderService.adminGetOrders(input);
  res.status(200).json(successResponse({
    page: input.page,
    limit: input.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / input.limit),
    operationalScope: input.operationalScope,
    query: input.q,
    status: input.status,
    frame: input.frame,
    dateFrom: req.query.dateFrom ?? null,
    dateTo: req.query.dateTo ?? null,
    statusCounts: result.statusCounts,
    frameOptions: result.frameOptions,
    items: result.items,
  }));
}

export async function adminGetOrder(req: Request, res: Response): Promise<void> {
  requireAuthUser(req);
  const order = await orderService.adminGetOrder(getParam(req, "id"));
  res.status(200).json(successResponse(order));
}

export async function adminExportOrders(req: Request, res: Response): Promise<void> {
  requireAuthUser(req);
  const { page: _page, limit: _limit, ...input } = parseAdminOrderListInput(req.query);
  const orders = await orderService.adminExportOrders(input);
  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orders.csv"',
    })
    .send(buildAdminOrderCsv(orders));
}

export async function adminUpdateOrderStatus(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.adminUpdateStatus(user.uid, getParam(req, "id"), req.body ?? {});
  res.status(200).json(successResponse(order));
}

export async function adminUpdateOrder(req: Request, res: Response): Promise<void> {
  requireAuthUser(req);
  const order = await orderService.adminUpdateOrder(getParam(req, "id"), req.body ?? {});
  res.status(200).json(successResponse(order));
}

/**
 * POST /api/orders/:id/payment-session
 *
 * Creates a payment session (QR/bank transfer link) for a pending physical kit order.
 * Uses the active payment provider adapter with the order's server-authoritative totalVnd.
 * This is NOT for Plus subscription — it creates a PaymentOrder with purpose "physical_order".
 *
 * Auth + email verified required.
 */
export async function createKitPaymentSession(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const orderId = getParam(req, "id");

  const physicalOrder = await orderService.getOrder(user.uid, orderId);

  if (physicalOrder.status !== "pending") {
    throw new ApiError(409, "Chỉ có thể thanh toán đơn đang ở trạng thái chờ.", undefined, "order_not_pending");
  }

  const amount = physicalOrder.totalVnd;
  if (!amount || amount < 1000) {
    throw new ApiError(400, "Tổng giá trị đơn hàng không hợp lệ.", undefined, "invalid_order_total");
  }

  await reservePhysicalOrderCouponUsage(physicalOrder, user.uid);

  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || "";

  const adapter = getPaymentProviderAdapter();

  const session = await adapter.createCheckoutSession({
    userId: user.uid,
    planCode: "PLUS",
    billingCycle: "twelve_week",
    successUrl: frontendOrigin ? `${frontendOrigin}/order-status/__session_id__` : "",
    cancelUrl: frontendOrigin ? `${frontendOrigin}/order-status/${orderId}` : "",
    amount,
    purpose: "physical_order",
    physicalOrderId: orderId,
    receiptEmail: physicalOrder.email,
    receiptName: physicalOrder.fullName,
    discount: buildPhysicalOrderPaymentDiscount(physicalOrder),
  });

  res.status(200).json(
    successResponse({
      paymentOrderId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      provider: adapter.providerId,
      expiresAt: session.expiresAt,
      amount,
      currency: "VND",
    }),
  );
}
